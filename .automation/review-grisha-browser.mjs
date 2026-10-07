import fs from 'node:fs';

const wd='http://127.0.0.1:9515';
const lesson='http://127.0.0.1:8000/students/grisha_arkhipov/site/07.10.26.html';
const home='http://127.0.0.1:8000/students/grisha_arkhipov/site/index.html';
const out='/tmp/grisha-browser';
fs.mkdirSync(out,{recursive:true});

async function request(endpoint,{method='GET',body=null}={}){
  const res=await fetch(wd+endpoint,{
    method,
    headers:body?{'content-type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data?.value?.error){
    throw new Error('WebDriver '+method+' '+endpoint+': '+JSON.stringify(data));
  }
  return data.value;
}
const session=await request('/session',{method:'POST',body:{capabilities:{alwaysMatch:{
  'goog:chromeOptions':{args:['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage']},
  'goog:loggingPrefs':{browser:'ALL',performance:'ALL'}
}}}});
const id=session.sessionId;
const api=endpoint=>'/session/'+id+endpoint;
const exec=script=>request(api('/execute/sync'),{method:'POST',body:{script,args:[]}});
const nav=url=>request(api('/url'),{method:'POST',body:{url}});
const rect=(width,height)=>request(api('/window/rect'),{method:'POST',body:{x:0,y:0,width,height}});
const cdp=(cmd,params={})=>request(api('/goog/cdp/execute'),{method:'POST',body:{cmd,params}});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const shot=async name=>{
  const data=await request(api('/screenshot'));
  fs.writeFileSync(out+'/'+name+'.png',Buffer.from(data,'base64'));
};

try{
  for(const [name,width,height,theme] of [
    ['desktop-light',1440,1100,'light'],
    ['desktop-dark',1440,1100,'dark'],
    ['mobile-light',390,844,'light'],
    ['mobile-dark',390,844,'dark']
  ]){
    await rect(width,height);
    await nav(lesson);
    await exec(`document.documentElement.dataset.theme='${theme}'; const b=document.getElementById('theme'); b.setAttribute('aria-pressed',String('${theme}'==='dark')); b.textContent='${theme}'==='dark'?'Светлая тема':'Тёмная тема'; return true;`);
    const metrics=await exec(`
      const d=document.documentElement;
      const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
      const focusables=[...document.querySelectorAll('a,button,input,summary')].filter(visible);
      const graph=document.querySelector('.graph svg').getBoundingClientRect();
      return {innerWidth,scrollWidth:d.scrollWidth,overflow:d.scrollWidth-innerWidth,
        offscreen:focusables.filter(e=>{const r=e.getBoundingClientRect();return r.right<0||r.left>innerWidth}).length,
        focusables:focusables.length,theme:d.dataset.theme,graph:[Math.round(graph.width),Math.round(graph.height)]};
    `);
    assert(metrics.overflow<=1,name+': horizontal overflow '+metrics.overflow);
    assert(metrics.offscreen===0,name+': focusable control horizontally offscreen');
    assert(metrics.focusables>=15,name+': unexpectedly few focusable controls');
    assert(metrics.theme===theme,name+': theme mismatch');
    assert(metrics.graph[0]>250&&metrics.graph[1]>170,name+': graph collapsed');
    await shot(name);
  }

  for(const [name,width,height,theme] of [
    ['home-desktop-light',1440,1100,'light'],
    ['home-desktop-dark',1440,1100,'dark'],
    ['home-mobile-light',390,844,'light'],
    ['home-mobile-dark',390,844,'dark']
  ]){
    await rect(width,height);
    await nav(home);
    await exec(`document.documentElement.dataset.theme='${theme}'; return true;`);
    const state=await exec(`
      const d=document.documentElement;
      const evidence=window.COMPETENCY_MAP_DATA?.evidence?.func_08;
      const levels=window.COMPETENCY_MAP_DATA?.baselineLevels||{};
      const material=window.COMPETENCY_MAP_DATA?.materials?.[0];
      return {overflow:d.scrollWidth-innerWidth,theme:d.dataset.theme,
        latest:document.querySelector('.latest-card')?.textContent.includes('07.10.2026'),
        lessonLink:!!document.querySelector('a[href="07.10.26.html"]'),
        cells:document.querySelectorAll('[data-topic-id]').length,
        evidence:evidence?.lesson,ktp:evidence?.ktp,
        level:Object.hasOwn(levels,'func_08')?levels.func_08:null,
        materialDate:material?.date};
    `);
    assert(state.overflow<=1,name+': horizontal overflow '+state.overflow);
    assert(state.theme===theme,name+': theme mismatch');
    assert(state.latest&&state.lessonLink,name+': latest lesson integration missing');
    assert(state.cells>100,name+': competency map did not render');
    assert(state.evidence==='07.10.26.html#linear',name+': func_08 evidence link mismatch');
    assert(state.ktp==='ktp.html?lesson=ktp-002',name+': func_08 KTP link mismatch');
    assert(state.level===null,name+': practiced lesson incorrectly changed mastery');
    assert(state.materialDate==='07.10.2026',name+': latest map material missing');
    await shot(name);
  }

  await rect(1180,900);
  await nav(home);
  const homeInteraction=await exec(`
    document.querySelector('[data-topic-id="func_08"]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const dlg=document.getElementById('topicDialog');
    return {open:dlg?.open===true,history:document.getElementById('dialogHistory')?.textContent||'',
      links:[...document.querySelectorAll('#dialogMaterialLinks a')].map(a=>a.getAttribute('href'))};
  `);
  assert(homeInteraction.open,'home evidence dialog did not open');
  assert(homeInteraction.history.includes('07.10.2026'),'home evidence history is stale');
  assert(homeInteraction.links.includes('07.10.26.html#linear'),'home evidence lesson link missing');

  await nav(lesson);
  const interaction=await exec(`
    const delta=document.querySelector('[data-layer="layerDelta"]'); delta.click();
    document.getElementById('nextStep').click();
    const reveal=document.querySelector('.reveal'); reveal.click();
    const quiz=document.querySelector('.quiz-question button[data-choice="1"]'); quiz.click();
    const check=document.querySelector('.check input'); check.checked=true; check.dispatchEvent(new Event('change',{bubbles:true}));
    const theme=document.getElementById('theme'); const before=document.documentElement.dataset.theme; theme.click();
    return {deltaPressed:delta.getAttribute('aria-pressed'),deltaHidden:document.getElementById('layerDelta').hidden,
      current:document.querySelector('.step-item[aria-current="step"]')?.dataset.step,
      reveal:reveal.getAttribute('aria-expanded'),answerVisible:getComputedStyle(document.getElementById('intersectionAnswer')).display,
      feedback:document.querySelector('.feedback').textContent.trim(),
      progress:document.getElementById('progressText').textContent.trim(),
      themeChanged:document.documentElement.dataset.theme!==before,themePressed:theme.getAttribute('aria-pressed')};
  `);
  assert(interaction.deltaPressed==='true'&&!interaction.deltaHidden,'graph layer toggle failed');
  assert(interaction.current==='1','stepper next failed');
  assert(interaction.reveal==='true'&&interaction.answerVisible!=='none','intersection reveal failed');
  assert(interaction.feedback==='Верно.','quiz feedback failed');
  assert(/^Отмечено 1 из 5\.$/.test(interaction.progress),'checklist progress failed: '+interaction.progress);
  assert(interaction.themeChanged,'theme toggle failed');

  await cdp('Emulation.setEmulatedMedia',{media:'print'});
  const printState=await exec(`
    return {toolbar:getComputedStyle(document.querySelector('.toolbar')).display,
      route:getComputedStyle(document.querySelector('.route')).display,
      poster:getComputedStyle(document.querySelector('.poster')).display,
      steps:[...document.querySelectorAll('.step-item')].every(e=>getComputedStyle(e).display!=='none'),
      answer:getComputedStyle(document.getElementById('intersectionAnswer')).display};
  `);
  assert(printState.toolbar==='none'&&printState.route==='none'&&printState.poster==='none','print navigation is visible');
  assert(printState.steps,'print hides stepper content');
  assert(printState.answer!=='none','print hides revealed solution');

  await cdp('Emulation.setEmulatedMedia',{media:'screen',features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await exec("return {scroll:getComputedStyle(document.documentElement).scrollBehavior,transition:getComputedStyle(document.getElementById('bar')).transitionDuration};");
  assert(reduced.scroll==='auto','reduced motion keeps smooth scroll');

  const browserLogs=await request(api('/se/log'),{method:'POST',body:{type:'browser'}});
  const severe=(browserLogs||[]).filter(x=>x.level==='SEVERE'&&!String(x.message).includes('favicon.ico'));
  assert(severe.length===0,'browser console errors: '+severe.map(x=>x.message).join(' | '));

  const perf=await request(api('/se/log'),{method:'POST',body:{type:'performance'}});
  const badNetwork=[];
  for(const entry of perf||[]){
    try{
      const message=JSON.parse(entry.message)?.message;
      if(message?.method==='Network.responseReceived'&&message.params?.response?.status>=400&&!message.params.response.url.includes('favicon.ico')){
        badNetwork.push(message.params.response.status+' '+message.params.response.url);
      }
    }catch(_){}
  }
  assert(badNetwork.length===0,'network errors: '+badNetwork.join(' | '));

  console.log('browser audit: PASS');
  console.log(JSON.stringify({interaction,homeInteraction,printState,reduced,screenshots:fs.readdirSync(out)},null,2));
}finally{
  await request(api(''),{method:'DELETE'}).catch(()=>{});
}
