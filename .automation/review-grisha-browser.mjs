import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const lesson=pathToFileURL(path.resolve('students/grisha_arkhipov/site/07.10.26.html')).href;
const home=pathToFileURL(path.resolve('students/grisha_arkhipov/site/index.html')).href;
const out='/tmp/grisha-browser';
fs.mkdirSync(out,{recursive:true});

const tabs=await fetch('http://127.0.0.1:9222/json').then(r=>r.json());
if(!tabs.length) throw new Error('No Chrome DevTools targets');
const ws=new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
let seq=0;
const pending=new Map();
let loadResolve=null;
const runtimeErrors=[];
const networkErrors=[];
ws.onmessage=event=>{
  const msg=JSON.parse(event.data);
  if(msg.id){
    const task=pending.get(msg.id);
    if(!task)return;
    pending.delete(msg.id);
    if(msg.error)task.reject(new Error(msg.error.message));
    else task.resolve(msg.result);
    return;
  }
  if(msg.method==='Page.loadEventFired'&&loadResolve){loadResolve();loadResolve=null;}
  if(msg.method==='Runtime.exceptionThrown')runtimeErrors.push(msg.params.exceptionDetails?.text||'Runtime exception');
  if(msg.method==='Runtime.consoleAPICalled'&&msg.params.type==='error'){
    runtimeErrors.push('console.error: '+msg.params.args.map(x=>x.value??x.description??'').join(' '));
  }
  if(msg.method==='Network.loadingFailed'&&!msg.params.canceled){
    networkErrors.push((msg.params.type||'resource')+': '+(msg.params.errorText||'failed'));
  }
  if(msg.method==='Network.responseReceived'&&msg.params.response?.status>=400){
    networkErrors.push(msg.params.response.status+' '+msg.params.response.url);
  }
};
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq;
  pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const evaluate=async expression=>{
  const res=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(res.exceptionDetails)throw new Error(res.exceptionDetails.text||'Runtime.evaluate failed');
  return res.result?.value;
};
const navigate=async url=>{
  for(let attempt=0;attempt<3;attempt+=1){
    const nav=await send('Page.navigate',{url});
    if(nav.errorText&&nav.errorText!=='net::ERR_ABORTED'){
      throw new Error('Navigation failed: '+nav.errorText);
    }
    for(let i=0;i<80;i+=1){
      try{
        const state=await evaluate("({href:location.href,ready:document.readyState})");
        if(state?.href===url&&state?.ready==='complete'){await delay(250);return;}
      }catch(_){}
      await delay(100);
    }
    await delay(250);
  }
  throw new Error('Page load timeout: '+url);
};
const screenshot=async name=>{
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(out+'/'+name+'.png',Buffer.from(shot.data,'base64'));
};
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

const cases=[
  ['desktop-light',1440,1100,false,'light'],
  ['desktop-dark',1440,1100,false,'dark'],
  ['mobile-light',390,844,true,'light'],
  ['mobile-dark',390,844,true,'dark']
];

for(const [name,width,height,mobile,theme] of cases){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  await navigate(lesson);
  await evaluate(`(()=>{document.documentElement.dataset.theme='${theme}';const b=document.getElementById('theme');b.setAttribute('aria-pressed',String('${theme}'==='dark'));b.textContent='${theme}'==='dark'?'Светлая тема':'Тёмная тема';return true})()`);
  const metrics=await evaluate(`(()=>{const d=document.documentElement;const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const focusables=[...document.querySelectorAll('a,button,input,summary')].filter(visible);return {width:innerWidth,scrollWidth:d.scrollWidth,overflow:d.scrollWidth-innerWidth,focusables:focusables.length,offscreen:focusables.filter(e=>{const r=e.getBoundingClientRect();return r.right<0||r.left>innerWidth}).length,theme:document.documentElement.dataset.theme,graph:[...document.querySelectorAll('.graph svg')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})}})()`);
  assert(metrics.overflow<=1,name+': horizontal overflow '+metrics.overflow);
  assert(metrics.offscreen===0,name+': focusable control is horizontally offscreen');
  assert(metrics.focusables>=15,name+': unexpectedly few focusable controls');
  assert(metrics.theme===theme,name+': theme mismatch');
  assert(metrics.graph[0][0]>250&&metrics.graph[0][1]>170,name+': graph collapsed');
  await screenshot(name);
}

for(const [name,width,height,mobile,theme] of [
  ['home-desktop-light',1440,1100,false,'light'],
  ['home-desktop-dark',1440,1100,false,'dark'],
  ['home-mobile-light',390,844,true,'light'],
  ['home-mobile-dark',390,844,true,'dark']
]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  await navigate(home);
  const current=await evaluate("document.documentElement.dataset.theme");
  if(current!==theme)await evaluate("document.getElementById('themeToggle').click()");
  const state=await evaluate(`(()=>{const d=document.documentElement;const evidence=window.COMPETENCY_MAP_DATA?.evidence?.func_08;const levels=window.COMPETENCY_MAP_DATA?.baselineLevels||{};const material=window.COMPETENCY_MAP_DATA?.materials?.[0];return {overflow:d.scrollWidth-innerWidth,theme:d.dataset.theme,latest:document.querySelector('.latest-card')?.textContent.includes('07.10.2026'),lessonLink:!!document.querySelector('a[href="07.10.26.html"]'),cells:document.querySelectorAll('[data-topic-id]').length,evidence:evidence?.lesson,ktp:evidence?.ktp,level:Object.hasOwn(levels,'func_08')?levels.func_08:null,materialDate:material?.date}})()`);
  assert(state.overflow<=1,name+': horizontal overflow '+state.overflow);
  assert(state.theme===theme,name+': theme mismatch');
  assert(state.latest&&state.lessonLink,name+': latest lesson integration missing');
  assert(state.cells>100,name+': competency map did not render');
  assert(state.evidence==='07.10.26.html#linear',name+': func_08 evidence link mismatch');
  assert(state.ktp==='ktp.html?lesson=ktp-002',name+': func_08 KTP link mismatch');
  assert(state.level===null,name+': practiced lesson incorrectly changed mastery');
  assert(state.materialDate==='07.10.2026',name+': latest map material missing');
  await screenshot(name);
}

await send('Emulation.setDeviceMetricsOverride',{width:1180,height:900,deviceScaleFactor:1,mobile:false});
await navigate(home);
const homeInteraction=await evaluate(`(()=>{const target=document.querySelector('[data-topic-id="func_08"]');target?.dispatchEvent(new MouseEvent('click',{bubbles:true}));const dlg=document.getElementById('topicDialog');return {open:dlg?.open===true,history:document.getElementById('dialogHistory')?.textContent||'',links:[...document.querySelectorAll('#dialogMaterialLinks a')].map(a=>a.getAttribute('href'))}})()`);
assert(homeInteraction.open,'home evidence dialog did not open');
assert(homeInteraction.history.includes('07.10.2026'),'home evidence history is stale');
assert(homeInteraction.links.includes('07.10.26.html#linear'),'home evidence lesson link missing');
await evaluate("document.getElementById('topicDialog')?.close()");

await send('Emulation.setDeviceMetricsOverride',{width:1180,height:900,deviceScaleFactor:1,mobile:false});
await navigate(lesson);
const interaction=await evaluate(`(()=>{const delta=document.querySelector('[data-layer="layerDelta"]');delta.click();const next=document.getElementById('nextStep');next.click();const reveal=document.querySelector('.reveal');reveal.click();const quiz=document.querySelector('.quiz-question button[data-choice="1"]');quiz.click();const check=document.querySelector('.check input');check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));const theme=document.getElementById('theme');const before=document.documentElement.dataset.theme;theme.click();return {deltaPressed:delta.getAttribute('aria-pressed'),deltaHidden:document.getElementById('layerDelta').hidden,current:document.querySelector('.step-item[aria-current="step"]')?.dataset.step,reveal:reveal.getAttribute('aria-expanded'),answerVisible:getComputedStyle(document.getElementById('intersectionAnswer')).display,feedback:document.querySelector('.feedback').textContent.trim(),progress:document.getElementById('progressText').textContent.trim(),themeChanged:document.documentElement.dataset.theme!==before,themePressed:theme.getAttribute('aria-pressed')}})()`);
assert(interaction.deltaPressed==='true'&&!interaction.deltaHidden,'graph layer toggle failed');
assert(interaction.current==='1','stepper next failed');
assert(interaction.reveal==='true'&&interaction.answerVisible!=='none','intersection reveal failed');
assert(interaction.feedback==='Верно.','quiz feedback failed');
assert(/^Отмечено 1 из 5\.$/.test(interaction.progress),'checklist progress failed: '+interaction.progress);
assert(interaction.themeChanged,'theme toggle failed');

await send('Emulation.setEmulatedMedia',{media:'print'});
const printState=await evaluate(`(()=>({toolbar:getComputedStyle(document.querySelector('.toolbar')).display,route:getComputedStyle(document.querySelector('.route')).display,poster:getComputedStyle(document.querySelector('.poster')).display,steps:[...document.querySelectorAll('.step-item')].every(e=>getComputedStyle(e).display!=='none'),answer:getComputedStyle(document.getElementById('intersectionAnswer')).display}))()`);
assert(printState.toolbar==='none'&&printState.route==='none'&&printState.poster==='none','print navigation is visible');
assert(printState.steps,'print hides stepper content');
assert(printState.answer!=='none','print hides revealed solution');
await send('Emulation.setEmulatedMedia',{media:'screen',features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const reduced=await evaluate(`(()=>({scroll:getComputedStyle(document.documentElement).scrollBehavior,transition:getComputedStyle(document.getElementById('bar')).transitionDuration}))()`);
assert(reduced.scroll==='auto','reduced motion keeps smooth scroll');

await delay(200);
if(runtimeErrors.length)throw new Error('Browser runtime errors: '+runtimeErrors.join(' | '));
if(networkErrors.length)throw new Error('Browser/network errors: '+networkErrors.join(' | '));
console.log('browser audit: PASS');
console.log(JSON.stringify({interaction,printState,reduced,screenshots:fs.readdirSync(out)},null,2));
ws.close();
