import fs from 'node:fs';

const wd='http://127.0.0.1:9515';
const page='http://127.0.0.1:8000/students/grisha_arkhipov/site/07.10.26.html';
const out='/tmp/grisha-interactive';
fs.mkdirSync(out,{recursive:true});

async function req(endpoint,{method='GET',body=null}={}){
  const res=await fetch(wd+endpoint,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data?.value?.error)throw new Error(method+' '+endpoint+': '+JSON.stringify(data));
  return data.value;
}
const session=await req('/session',{method:'POST',body:{capabilities:{alwaysMatch:{
  'goog:chromeOptions':{args:['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage']},
  'goog:loggingPrefs':{browser:'ALL',performance:'ALL'}
}}}});
const id=session.sessionId,api=p=>'/session/'+id+p;
const exec=script=>req(api('/execute/sync'),{method:'POST',body:{script,args:[]}});
const nav=url=>req(api('/url'),{method:'POST',body:{url}});
const rect=(width,height)=>req(api('/window/rect'),{method:'POST',body:{x:0,y:0,width,height}});
const cdp=(cmd,params={})=>req(api('/goog/cdp/execute'),{method:'POST',body:{cmd,params}});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(x,m)=>{if(!x)throw new Error(m)};
const shot=async name=>{const data=await req(api('/screenshot'));fs.writeFileSync(out+'/'+name+'.png',Buffer.from(data,'base64'))};

try{
  await rect(1440,1100);
  await nav(page);
  await exec("document.querySelector('[data-line-lab]').scrollIntoView({block:'start'}); return true;");
  const initial=await exec(`
    const a=document.getElementById('labHandleA'),b=document.getElementById('labHandleB');
    const dx=+b.getAttribute('cx')-+a.getAttribute('cx');
    const dy=+a.getAttribute('cy')-+b.getAttribute('cy');
    return {
      formula:document.getElementById('labStateFormula').textContent,
      k:document.getElementById('labStateK').textContent,
      b:document.getElementById('labStateB').textContent,
      delta:document.getElementById('labStateDelta').textContent,
      slopePx:dy/dx,
      overflow:document.documentElement.scrollWidth-innerWidth,
      labWidth:document.querySelector('[data-line-lab]').getBoundingClientRect().width
    };
  `);
  assert(initial.formula==='f(x)=1,5x+1','initial formula mismatch: '+initial.formula);
  assert(initial.k==='1,5'&&initial.b==='b=1','initial state mismatch');
  assert(initial.delta.includes('Δy=3'),'initial delta mismatch');
  assert(Math.abs(initial.slopePx-1.5)<0.03,'visual slope scale is not mathematically faithful: '+initial.slopePx);
  assert(initial.overflow<=1,'desktop horizontal overflow '+initial.overflow);
  await shot('desktop-initial');

  const slider=await exec(`
    const k=document.getElementById('labK');k.value='-1.5';k.dispatchEvent(new Event('input',{bubbles:true}));
    const b=document.getElementById('labB');b.value='-2';b.dispatchEvent(new Event('input',{bubbles:true}));
    return {formula:document.getElementById('labStateFormula').textContent,labelB:document.getElementById('labLabelB').textContent,delta:document.getElementById('labStateDelta').textContent,probe:document.getElementById('labStateProbe').textContent};
  `);
  assert(slider.formula.includes('-1,5x')&&slider.formula.includes('−2'),'sliders do not update formula: '+slider.formula);
  assert(slider.labelB.includes('−5')||slider.labelB.includes('-5'),'B point not derived from k,b: '+slider.labelB);
  assert(slider.delta.includes('Δy=-3')||slider.delta.includes('Δy=−3'),'delta not derived from k');

  const flat=await exec(`
    document.querySelector('[data-lab-scenario="flat"]').click();
    const l=document.getElementById('labLine');
    return {k:document.getElementById('labStateK').textContent,y1:+l.getAttribute('y1'),y2:+l.getAttribute('y2'),insight:document.getElementById('labInsight').textContent};
  `);
  assert(flat.k==='0','flat scenario k mismatch');
  assert(Math.abs(flat.y1-flat.y2)<0.01,'k=0 line is not horizontal');
  assert(flat.insight.includes('горизонтальна'),'flat insight missing');

  const guide=await exec(`
    document.querySelector('[data-lab-mode="guide"]').click();document.getElementById('labGuideNext').click();document.getElementById('labGuideNext').click();
    return {panel:document.getElementById('labPanelGuide').hidden,index:document.getElementById('labGuideIndex').textContent,text:document.getElementById('labGuideText').textContent,deltaHidden:document.getElementById('labDeltaGroup').hidden};
  `);
  assert(!guide.panel&&guide.index.includes('3 из 4'),'guided mode did not advance');
  assert(guide.text.includes('k=Δy/Δx'),'guided math missing');
  assert(!guide.deltaHidden,'guided delta should be visible');

  const compare=await exec(`
    document.querySelector('[data-lab-mode="compare"]').click();document.getElementById('labSnapshot').click();
    const k=document.getElementById('labK');k.value='1';k.dispatchEvent(new Event('input',{bubbles:true}));
    return {ghost:document.getElementById('labGhost').hidden,k0:document.getElementById('labCmpK0').textContent,k1:document.getElementById('labCmpK1').textContent,kd:document.getElementById('labCmpKd').textContent};
  `);
  assert(!compare.ghost,'comparison ghost is hidden');
  assert(compare.k0==='0'&&compare.k1==='1','comparison state mismatch');
  assert(compare.kd.includes('+1'),'comparison delta mismatch: '+compare.kd);

  const predict=await exec(`
    document.querySelector('[data-lab-mode="predict"]').click();
    const buttons=[...document.querySelectorAll('#labPredictOptions button')];
    buttons.find(b=>b.dataset.prediction==='plus2').click();
    return {feedback:document.getElementById('labPredictFeedback').textContent,good:document.getElementById('labPredictFeedback').classList.contains('good'),formula:document.getElementById('labStateFormula').textContent,pressed:document.querySelector('#labPredictOptions button[data-prediction="plus2"]').getAttribute('aria-pressed')};
  `);
  assert(predict.good&&predict.feedback.startsWith('Верно.'),'prediction feedback failed');
  assert(predict.formula==='f(x)=1,5x+1','prediction experiment state mismatch');
  assert(predict.pressed==='true','prediction selected state not exposed');

  const challenge=await exec(`
    document.querySelector('[data-lab-mode="challenge"]').click();
    const k=document.getElementById('labK');k.value='-1.5';k.dispatchEvent(new Event('input',{bubbles:true}));
    const b=document.getElementById('labB');b.value='2';b.dispatchEvent(new Event('input',{bubbles:true}));
    return {feedback:document.getElementById('labChallengeFeedback').textContent,bar:document.getElementById('labChallengeBar').style.width,kOk:document.getElementById('labChallengeK').classList.contains('ok'),bOk:document.getElementById('labChallengeB').classList.contains('ok')};
  `);
  assert(challenge.feedback.startsWith('Готово.')&&challenge.bar==='100%'&&challenge.kOk&&challenge.bOk,'challenge autovalidation failed');

  const touch=await exec(`
    document.querySelector('[data-lab-scenario="rise"]').click();
    const svg=document.getElementById('labSvg'),h=document.getElementById('labHandleA'),r=svg.getBoundingClientRect();
    const py=10+(6-(-1))*(500/12),clientY=r.top+(py/520)*r.height;
    for(const type of ['pointerdown','pointermove','pointerup'])h.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:91,pointerType:'touch',clientY,clientX:r.left+r.width*.5}));
    return {b:document.getElementById('labStateB').textContent,label:document.getElementById('labLabelA').textContent};
  `);
  assert(touch.b==='b=-1'||touch.b==='b=−1','touch manipulation failed: '+JSON.stringify(touch));

  const keyboard=await exec(`
    const h=document.getElementById('labHandleB'),before=document.getElementById('labStateK').textContent;h.focus();h.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));return {before,after:document.getElementById('labStateK').textContent,active:document.activeElement===h};
  `);
  assert(keyboard.active&&keyboard.before!==keyboard.after,'keyboard alternative for drag failed');

  await exec("document.querySelector('[data-lab-mode="free"]').click();document.getElementById('labReplay').click();return document.getElementById('labStateK').textContent;");
  await delay(500);
  const animation=await exec("const v=document.getElementById('labStateK').textContent;document.getElementById('labPause').click();return {v,disabled:document.getElementById('labPause').disabled};");
  assert(animation.v!=='-2'&&animation.disabled,'parameter sweep did not animate/pause');

  await cdp('Emulation.setEmulatedMedia',{media:'screen',features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await exec("return {scroll:getComputedStyle(document.documentElement).scrollBehavior,transition:getComputedStyle(document.getElementById('labChallengeBar')).transitionDuration};");
  assert(reduced.scroll==='auto'&&reduced.transition==='0s','reduced-motion support failed');

  await rect(390,844);
  await nav(page);
  await exec("document.querySelector('[data-line-lab]').scrollIntoView({block:'start'});return true;");
  const mobile=await exec(`
    const d=document.documentElement,lab=document.querySelector('[data-line-lab]'),buttons=[...lab.querySelectorAll('button')].filter(b=>getComputedStyle(b).display!=='none');
    return {overflow:d.scrollWidth-innerWidth,labWidth:lab.getBoundingClientRect().width,minButton:Math.min(...buttons.map(b=>b.getBoundingClientRect().height)),modebarScroll:document.querySelector('.lab-modebar').scrollWidth>=document.querySelector('.lab-modebar').clientWidth};
  `);
  assert(mobile.overflow<=1,'mobile horizontal page overflow '+mobile.overflow);
  assert(mobile.labWidth<=innerWidth,'lab wider than mobile viewport');
  assert(mobile.minButton>=43,'mobile touch target too small '+mobile.minButton);
  await shot('mobile-light');

  await exec("document.documentElement.dataset.theme='dark';return true;");
  await shot('mobile-dark');
  await rect(1440,1100);await nav(page);await exec("document.documentElement.dataset.theme='dark';document.querySelector('[data-line-lab]').scrollIntoView({block:'start'});return true;");await shot('desktop-dark');

  const logs=await req(api('/se/log'),{method:'POST',body:{type:'browser'}});
  const severe=(logs||[]).filter(x=>x.level==='SEVERE'&&!String(x.message).includes('favicon.ico'));
  assert(severe.length===0,'browser console errors: '+severe.map(x=>x.message).join(' | '));
  const perf=await req(api('/se/log'),{method:'POST',body:{type:'performance'}});
  const bad=[];
  for(const entry of perf||[]){try{const m=JSON.parse(entry.message)?.message;if(m?.method==='Network.responseReceived'&&m.params?.response?.status>=400&&!m.params.response.url.includes('favicon.ico'))bad.push(m.params.response.status+' '+m.params.response.url)}catch(_){}}
  assert(bad.length===0,'network errors: '+bad.join(' | '));

  console.log('interactive browser audit: PASS');
  console.log(JSON.stringify({initial,slider,flat,guide,compare,predict,challenge,touch,keyboard,animation,reduced,mobile,screenshots:fs.readdirSync(out)},null,2));
}finally{
  await req(api(''),{method:'DELETE'}).catch(()=>{});
}
