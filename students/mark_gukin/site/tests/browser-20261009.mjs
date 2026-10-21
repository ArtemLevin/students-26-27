import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium/Chrome is required for browser QA');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
'.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try {
    const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  }catch(_){res.writeHead(500);res.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mark-browser-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
'--disable-gpu','--no-first-run','--no-zygote','--disable-extensions',
'--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','ignore','pipe']});
let chromeStderr='';
chromeProcess.stderr.on('data',chunk=>{chromeStderr=(chromeStderr+String(chunk)).slice(-5000);});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map();let serial=0;const jsErrors=[],badRequests=[];
try{
  let port=0;
  for(let i=0;i<600;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
    if(chromeProcess.exitCode!==null)throw Error('Chrome terminated');
    await sleep(100);
  }
  if(!port)throw Error('DevTools port unavailable after 60 seconds; chrome stderr: '+chromeStderr);
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(x=>x.type==='page');
  assert.ok(target,'Page target missing');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){
      const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg);
    }
    if(msg.method==='Runtime.exceptionThrown')jsErrors.push(
      msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)
      badRequests.push(msg.params.response.url+': '+msg.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const out=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(out.exceptionDetails)throw Error(out.exceptionDetails.exception?.description||out.exceptionDetails.text);
    return out.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const screenshotDir=path.join(root,'mark-browser-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/mark_gukin/site/'+name;
    await call('Page.navigate',{url});
    let result;
    for(let i=0;i<150;i++){
      result=await run('({url:location.href,ready:document.readyState})');
      if(result.url.startsWith(url)&&result.ready==='complete')break;
      if(i===149)throw Error('Page did not load: '+name+' '+JSON.stringify(result));
      await sleep(70);
    }
    await sleep(140);
    await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
    const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(m.scroll<=m.client+2,name+' '+width+' '+(dark?'dark':'light')+
      ' horizontal overflow '+JSON.stringify(m));
  }
  async function snapshot(filename){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshotDir,filename+'.png'),Buffer.from(shot.data,'base64'));
  }

  const sizes=[[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
  for(const [w,h] of sizes){
    for(const page of ['09.10.26.html','11.10.26.html','index.html']){
      await navigate(page,w,h,false);
      await navigate(page,w,h,true);
    }
  }
  await navigate('09.10.26.html',1440,900,false);
  const mathmlBeforeInteractions=await run("(()=>{const a=[...document.querySelectorAll('main math')];return {count:a.length,allNative:a.every(m=>m.namespaceURI==='http://www.w3.org/1998/Math/MathML'),annotated:a.every(m=>m.querySelector('annotation[encoding=\"application/x-tex\"]')),fractions:document.querySelectorAll('main mfrac').length,radicals:document.querySelectorAll('main mroot').length,powers:document.querySelectorAll('main msup').length,legacyScripts:document.querySelectorAll('main sup,main sub').length,taskMath:document.querySelectorAll('#training math').length}})()");
  assert.ok(mathmlBeforeInteractions.count>=80,JSON.stringify(mathmlBeforeInteractions));
  assert.equal(mathmlBeforeInteractions.allNative,true,'All mathematics must use the MathML namespace');
  assert.equal(mathmlBeforeInteractions.annotated,true,'Every MathML expression has a source annotation');
  assert.ok(mathmlBeforeInteractions.fractions>=30&&mathmlBeforeInteractions.radicals>=5&&mathmlBeforeInteractions.powers>=40,'Structured fractions, roots and powers');
  assert.equal(mathmlBeforeInteractions.legacyScripts,0,'No HTML sup/sub stand-ins');
  assert.ok(mathmlBeforeInteractions.taskMath>=20,'Training and answer mathematics is MathML');
  for(let i=0;i<4;i++){
    const state=await run("(()=>{document.getElementById('stepTab"+i+"').click();const m=document.querySelector('#stepPanel .formula math');return {native:m?.namespaceURI==='http://www.w3.org/1998/Math/MathML',annotated:!!m?.querySelector('annotation[encoding=\"application/x-tex\"]'),block:m?.getAttribute('display')==='block'}})()");
    assert.deepEqual(state,{native:true,annotated:true,block:true},'Dynamic MathML step '+i);
  }
  await run("document.getElementById('stepTab0').click()");
  assert.equal(await run("document.querySelectorAll('[data-step]').length"),4,'Stepper tabs');
  assert.equal(await run("document.querySelectorAll('[data-task]').length"),10,'Training count');
  assert.equal(await run("document.querySelector('#stepPanel').getAttribute('aria-labelledby')"),'stepTab0');
  assert.equal(await run("(()=>{document.getElementById('stepTab2').click();return document.querySelector('#stepPanel').getAttribute('aria-labelledby')})()"),'stepTab2');
  assert.equal(await run("document.querySelector('#stepPanel').textContent.includes('Шаг 03')"),true);
  assert.equal(await run("(()=>{const e=new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true});document.getElementById('stepTab2').dispatchEvent(e);return document.querySelector('#stepPanel').getAttribute('aria-labelledby')})()"),'stepTab3');
  assert.equal(await run("(()=>{document.querySelector('#themeToggle').click();return document.documentElement.dataset.theme})()"),'dark','theme switch');
  assert.equal(await run("(()=>{document.querySelector('[data-task=\"1\"]').click();return document.querySelector('#taskCounter').textContent})()"),'1 из 10 выполнено','progress');
  const firstOrigin=await run("location.origin");
  await call('Page.reload',{ignoreCache:true});await sleep(250);
  assert.equal(await run("document.querySelector('[data-task=\"1\"]').checked"),true,'progress persistence');
  assert.equal(await run("document.documentElement.dataset.theme"),'dark','theme persistence');
  assert.equal(await run("(()=>{document.querySelector('#resetTasks').click();return document.querySelector('#taskCounter').textContent})()"),'0 из 10 выполнено','reset');
  await snapshot('lesson-desktop-dark');
  await navigate('09.10.26.html',390,844,false);
  await snapshot('lesson-mobile-light');
  await navigate('09.10.26.html',1440,900,true);
  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await run("getComputedStyle(document.querySelector('.print-algorithm')).display !== 'none'"),true,'printed full algorithm');
  assert.equal(await run("getComputedStyle(document.querySelector('.steps')).display"),'none','interactive stepper hidden in print');
  assert.equal(await run("getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()"),'#fff','print background from dark theme');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  await navigate('index.html',390,844,false);
  assert.equal(await run("document.querySelector('#lessonTitle').textContent.includes('Логарифмические функции и уравнения')"),true,'latest lesson on home');
  assert.equal(await run("document.querySelector('#lessonJournal a[href=\"18.10.26.html\"]')!==null"),true,'previous lesson remains in journal');
  assert.equal(await run("document.querySelector('#lessonJournal a[href=\"21.10.26.html\"]')!==null"),true,'latest lesson appears in journal');
  assert.equal(await run("document.querySelector('.lesson-actions a[href=\"21.10.26-lab.html\"]')!==null"),true,'home links directly to log laboratory');
  assert.equal(await run("document.querySelector('#lessonJournal').textContent.includes('04.10.2026')"),true,'history retained');
  assert.equal(await run("document.querySelector('#lessonJournal').textContent.includes('09.10.2026')"),true,'previous lesson retained');
  await snapshot('home-mobile-light');
  await navigate('11.10.26.html',390,844,false);
  assert.equal(await run("document.querySelectorAll('#taskList input[type=checkbox]').length"),10,'new lesson training count');
  assert.equal(await run("document.querySelectorAll('[data-case]').length"),2,'new lesson graph presets');
  assert.equal(await run("document.getElementById('graphCurve').getAttribute('d').length > 200"),true,'new lesson graph curve');

  const newLessonMathML=await run("(()=>{const maths=[...document.querySelectorAll('main math')];const templates=[...document.querySelectorAll('main template')].filter(t=>t.content.querySelector('math'));return {count:maths.length,semantic:maths.every(m=>m.namespaceURI==='http://www.w3.org/1998/Math/MathML'&&m.querySelector('semantics > annotation[encoding=\"application/x-tex\"]')),fractions:document.querySelectorAll('main mfrac').length,powers:document.querySelectorAll('main msup').length,subscripts:document.querySelectorAll('main msub').length,legacy:document.querySelectorAll('main sup,main sub').length,training:document.querySelectorAll('#taskList math').length,templates:templates.length,graphFormula:document.querySelector('#graphCaseFormula math')?.namespaceURI}})()");
  assert.ok(newLessonMathML.count>=90,'11 October MathML coverage: '+JSON.stringify(newLessonMathML));
  assert.equal(newLessonMathML.semantic,true,'11 October native MathML with LaTeX semantics');
  assert.ok(newLessonMathML.fractions>=8&&newLessonMathML.powers>=20&&newLessonMathML.subscripts>=5,'structured fractions, powers and indices');
  assert.equal(newLessonMathML.legacy,0,'no legacy HTML superscripts/subscripts in new lesson');
  assert.ok(newLessonMathML.training>=20,'all training tasks and answer keys use MathML');
  assert.equal(newLessonMathML.templates,6,'MathML templates for graph state');
  assert.equal(newLessonMathML.graphFormula,'http://www.w3.org/1998/Math/MathML','graph formula is native MathML');
  
  const switched=await run("(()=>{document.querySelector('[data-case=decrease]').click();const result=document.querySelector('#graphCaseResult math');const formula=document.querySelector('#graphCaseFormula math');const text=[...document.querySelectorAll('#graphCaseText math')];return {title:document.getElementById('graphCaseTitle').textContent,result:result?.querySelector('annotation')?.textContent,formula:formula?.querySelector('annotation')?.textContent,native:result?.namespaceURI,descriptionMath:text.length}})()");
  assert.equal(switched.title,'Убывающая функция','graph case switch title');
  assert.equal(switched.result,String.raw`f(x)=12\to 2^{-x}=16\to x=-4`,'graph cases recalculate with MathML');
  assert.equal(switched.formula,String.raw`f(x)=2^{-x}-4`,'graph formula changes');
  assert.equal(switched.native,'http://www.w3.org/1998/Math/MathML','dynamic graph result is native MathML');
  assert.equal(switched.descriptionMath,4,'dynamic graph labels retain MathML');
  assert.equal(await run("(()=>{document.querySelector('#taskList input').click();return document.getElementById('progressText').textContent})()"),'Выполнено: 1 из 10','new lesson task progress');
  await call('Page.reload',{ignoreCache:true});await sleep(220);
  assert.equal(await run("document.querySelector('#taskList input').checked"),true,'new lesson persisted completion');
  assert.equal(await run("document.querySelector('#materials a[href=\"../pdf_docs/11.10.26.pdf\"]')!==null"),true,'new lesson PDF link');
  const requests=await run("Promise.all(['../pdf_docs/09.10.26.pdf','../tex_docs/09.10.26.tex','../images/09.10.26.png'].map(async u=>({u,status:(await fetch(u)).status})))");
  assert.ok(requests.every(x=>x.status===200),'lesson materials: '+JSON.stringify(requests));
  await navigate('09.10.26.html#inequality',390,844,false);
  await sleep(170);
  const anchorTop=await run("Math.round(document.getElementById('inequality').getBoundingClientRect().top)");
  assert.ok(anchorTop>=30,'sticky nav obscures evidence anchor: '+anchorTop);
  // Занятие 18 октября: новая страница и сохранение прогресса.
  await navigate('18.10.26.html',390,844,false);
  assert.equal(await run("document.querySelectorAll('[data-task]').length"),10,'18 October original training exercises');
  assert.equal(await run("document.querySelectorAll('#materials img').length"),1,'18 October poster');
  assert.equal(await run("document.getElementById('stepCount').textContent"),'Шаг 1 из 4','18 October stepper initialization');
  assert.equal(await run("(()=>{document.getElementById('nextStep').click();return document.getElementById('stepCount').textContent})()"),'Шаг 2 из 4','18 October stepper advance');
  assert.equal(await run("(()=>{document.querySelector('[data-task=\\\"1\\\"]').click();return document.getElementById('doneText').textContent})()"),'Выполнено: 1 из 10','18 October task progress');
  await call('Page.reload',{ignoreCache:true});await sleep(200);
  assert.equal(await run("document.querySelector('[data-task=\\\"1\\\"]').checked"),true,'18 October progress persists');
  const lesson1810Materials=await run("Promise.all(['../pdf_docs/18.10.26.pdf','../tex_docs/18.10.26.tex','../images/18.10.26.png'].map(async u=>({u,status:(await fetch(u)).status})))");
  assert.ok(lesson1810Materials.every(x=>x.status===200),'18 October materials: '+JSON.stringify(lesson1810Materials));
  await snapshot('lesson-18-mobile-light');
  await navigate('18.10.26.html',1440,900,true);
  assert.equal(await run("document.querySelectorAll('section.chapter').length"),9,'18 October full lesson content');
  await snapshot('lesson-18-desktop-dark');

  // Занятие 21 октября: новый материал, 10 заданий, лаборатория и сохранение прогресса.
  for(const [w,h] of sizes){
    await navigate('21.10.26.html',w,h,false);
    await navigate('21.10.26.html',w,h,true);
    await navigate('21.10.26-lab.html',w,h,false);
    await navigate('21.10.26-lab.html',w,h,true);
  }
  await navigate('21.10.26.html',390,844,false);
  const mathml2110=await run("(()=>{const expressions=[...document.querySelectorAll('main math')];return {count:expressions.length,semantic:expressions.every(m=>m.namespaceURI==='http://www.w3.org/1998/Math/MathML'&&m.querySelector('semantics > annotation[encoding=\\\"application/x-tex\\\"]')),superscripts:document.querySelectorAll('main math msup').length,subscripts:document.querySelectorAll('main math msub').length}})()");
  assert.ok(mathml2110.count>=85,'21 October all mathematical statements in semantic MathML: '+JSON.stringify(mathml2110));
  assert.ok(mathml2110.superscripts>=5,'MathML powers are structural');
  assert.ok(mathml2110.subscripts>=12,'MathML logarithm bases are structural');
  assert.equal(mathml2110.semantic,true,'21 October semantic MathML annotations');
  assert.equal(await run("document.querySelectorAll('main sup,main sub,main .frac').length"),0,'21 October has no superscript, subscript or CSS fractions left');
  assert.equal(await run("document.querySelectorAll('#training math').length>=34"),true,'every training prompt and answer has MathML');
  assert.equal(await run("document.querySelectorAll('#stepMath math').length"),1,'stepper displays a real MathML element');
  assert.equal(await run("document.querySelector('#stepMath math annotation[encoding=\"application/x-tex\"]')!==null"),true,'stepper supplies LaTeX annotation');
  assert.equal(await run("document.querySelectorAll('[data-task]').length"),10,'21 October training count');
  assert.equal(await run("document.getElementById('stepCount').textContent"),'Шаг 1 из 6','21 October stepper initialization');
  assert.equal(await run("(()=>{document.getElementById('nextStep').click();return document.getElementById('stepCount').textContent})()"),'Шаг 2 из 6','21 October stepper advancement');
  assert.equal(await run("document.querySelector('#materials img')!==null"),true,'21 October poster');
  await snapshot('lesson-21-mobile-light');
  await navigate('21.10.26.html',1440,900,true);
  await snapshot('lesson-21-desktop-dark');
  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await run("getComputedStyle(document.querySelector('#training')).breakInside"),'auto','long lesson chapters may split across printed pages');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  const materials2110=await run("Promise.all(['../pdf_docs/21.10.26.pdf','../tex_docs/21.10.26.tex','../images/21.10.26.png'].map(async u=>({u,status:(await fetch(u)).status})))");
  assert.ok(materials2110.every(x=>x.status===200),'21 October materials: '+JSON.stringify(materials2110));
  await navigate('21.10.26-lab.html',390,844,false);
  assert.equal(await run("document.getElementById('valueOutput').getAttribute('aria-label')"),'f(32) = 2','21 October original graph');
  assert.equal(await run("document.querySelectorAll('#formula math,#valueOutput math,#domain math,#xOutput math').length"),4,'lab formula, value, domain and x are semantic MathML');
  assert.equal(await run("document.querySelector('#valueOutput math').namespaceURI"),'http://www.w3.org/1998/Math/MathML','lab live MathML namespace');
  assert.equal(await run("document.getElementById('curve').getAttribute('d').length>1000"),true,'21 October graph path');
  const case2=await run("(()=>{const s=document.getElementById('scenario');s.value='horizontal';s.dispatchEvent(new Event('change',{bubbles:true}));return {formula:document.querySelector('#formula math annotation').textContent,value:document.getElementById('valueOutput').getAttribute('aria-label'),structured:document.querySelector('#formula math msub')!==null}})()");
  assert.deepEqual(case2,{formula:'f(x) = \\log_{2}(x + 5)',value:'f(11) = 4',structured:true},'21 October second graph semantic MathML');
  await snapshot('lesson-21-lab-mobile-light');
  await navigate('21.10.26-lab.html#horizontal',1440,900,true);
  assert.equal(await run("document.getElementById('scenario').value"),'horizontal','21 October lab deep link');
  await snapshot('lesson-21-lab-desktop-dark');
  const guess=await run("(()=>{const a=document.getElementById('aGuess'),b=document.getElementById('bGuess'),form=document.getElementById('parameterForm'),feedback=document.getElementById('parameterFeedback');a.value='2';b.value='-3';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return {message:feedback.textContent,kind:feedback.dataset.kind}})()");
  assert.equal(guess.kind,'wrong','wrong graph parameters are rejected');
  const correct=await run("(()=>{document.getElementById('bGuess').value='5';document.getElementById('parameterForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('parameterFeedback').dataset.kind})()");
  assert.equal(correct,'correct','correct graph parameters accepted');
  assert.equal(await run("document.querySelector('#parameterFeedback math')!==null"),true,'feedback contains semantic MathML formula');
  assert.equal(await run("document.querySelector('#parameterFeedback math annotation')!==null"),true,'feedback has LaTeX annotation');
  const extremes=await run("(()=>{const s=document.getElementById('scenario'),slider=document.getElementById('xValue'),arr=[];for(const mode of ['vertical','horizontal']){s.value=mode;s.dispatchEvent(new Event('change',{bubbles:true}));for(const endpoint of ['min','max']){slider.value=slider[endpoint];slider.dispatchEvent(new Event('input',{bubbles:true}));const dot=document.querySelector('#markers .plot-target');const label=document.getElementById('valueOutput').getAttribute('aria-label');arr.push({mode,endpoint,dot:!!dot,y:Number(dot?.getAttribute('cy')),label,accessible:slider.getAttribute('aria-valuetext')});}}return arr})()");
  assert.equal(extremes.length,4,'both graph boundaries');
  for(const item of extremes){assert.equal(item.dot,true,'visible selected point '+JSON.stringify(item));assert.ok(item.y>=24&&item.y<=435,'selected point stays in chart area '+JSON.stringify(item));assert.ok(item.accessible.includes('f(x)'),'graph slider accessible value '+JSON.stringify(item));}
  await run("(()=>{const s=document.getElementById('scenario');s.value='horizontal';s.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('xValue').value='15';document.getElementById('xValue').dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await run("document.getElementById('valueOutput').getAttribute('aria-label')"),'f(15) = 4,32','21 October slider recomputes function value');
  await run("document.getElementById('reset').click()");
  assert.equal(await run("document.getElementById('valueOutput').getAttribute('aria-label')"),'f(11) = 4','lab reset restores preset');
  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await run("getComputedStyle(document.querySelector('.parameter-form')).display"),'none','lab form hidden in print');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  await navigate('21.10.26-lab.html',390,844,true);
  await snapshot('lesson-21-lab-mobile-dark');
  assert.deepEqual(jsErrors,[],'Browser JavaScript exceptions');
  assert.deepEqual(badRequests,[],'Browser network failures');
  console.log('Mark review browser PASS: seven viewports x two pages x two themes, stepper, keyboard, persistence, print, links, anchors');
}finally{
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');server.close();
  if(chromeProcess.exitCode===null){
    await new Promise(resolve=>{
      const timeout=setTimeout(resolve,2500);
      chromeProcess.once('exit',()=>{clearTimeout(timeout);resolve();});
    });
  }
  try{
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:15,retryDelay:100});
  }catch(error){
    if(error.code!=='ENOTEMPTY'&&error.code!=='EBUSY')throw error;
    console.warn('Chromium profile cleanup deferred to ephemeral CI runner');
  }
}