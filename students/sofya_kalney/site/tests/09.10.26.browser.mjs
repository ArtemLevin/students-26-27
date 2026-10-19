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
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sofya-review-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
'--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map();let serial=0;const jsErrors=[],badRequests=[];
try{
  let port=0;
  for(let i=0;i<150;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
    if(chromeProcess.exitCode!==null)throw Error('Chrome terminated');
    await sleep(100);
  }
  if(!port)throw Error('DevTools port unavailable');
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
  const screenshotDir=path.join(root,'sofya-review-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/sofya_kalney/site/'+name;
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
    if(m.scroll>m.client+2){
      const offenders=await run("([...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,20).map(e=>({tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:'svg',width:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right),scroll:e.scrollWidth})))");
      console.error('Overflow offenders '+name+' '+width+': '+JSON.stringify(offenders));
      const detail=await run("({innerWidth,visual:visualViewport?.width,client:document.documentElement.clientWidth,htmlScroll:document.documentElement.scrollWidth,body:({width:document.body.getBoundingClientRect().width,scroll:document.body.scrollWidth}),widths:[...document.querySelectorAll('.shell,.topbar,.mathline,.formula,math,.figure,.experiment,.chapter')].slice(0,60).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'math',width:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right),scroll:e.scrollWidth,client:e.clientWidth})).filter(x=>x.right>325||x.scroll>x.client+20)})");
      console.error('Overflow details: '+JSON.stringify(detail));
    }
    assert.ok(m.scroll<=m.client+2,name+' '+width+' '+(dark?'dark':'light')+
      ' horizontal overflow '+JSON.stringify(m));
  }
  async function snapshot(filename){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshotDir,filename+'.png'),Buffer.from(shot.data,'base64'));
  }
  for(const [w,h] of [[320,760],[390,844],[768,1024],[1024,768],[1440,900]]){
    for(const name of ['09.10.26.html','index.html','16.10.26.html','16.10.26-lab.html']){
      await navigate(name,w,h,false);
      await navigate(name,w,h,true);
    }
  }
  await navigate('09.10.26.html',1440,900);
  const mathAudit=await run("(()=>{\nconst list=[...document.querySelectorAll('#content section.chapter')];\nconst stray=[];\nfor(const section of list){\n const walker=document.createTreeWalker(section,NodeFilter.SHOW_TEXT);\n while(walker.nextNode()){\n   const node=walker.currentNode,element=node.parentElement;\n   if(!element||element.closest('math,svg,style,script,.n,.smalltask > strong'))continue;\n   const value=node.textContent.trim();\n   if(/\\b\\d+(?:[.,]\\d+)?\\b|\\b[A-Z]{1,3}\\s*[:=∥⊥]|(?:[A-Z]{1,3})\\s+и\\s+(?:[A-Z]{1,3})|(?:[a-z])²/.test(value))stray.push(value);\n }\n}\nreturn {stray,mathCount:document.querySelectorAll('section math').length,\ninvalidMath:[...document.querySelectorAll('section math')].filter(x=>x.namespaceURI!=='http://www.w3.org/1998/Math/MathML').length}\n})()");
  assert.ok(mathAudit.mathCount>=120,'All lesson expressions should use native MathML');
  assert.equal(mathAudit.invalidMath,0,'Invalid MathML namespace');
  assert.deepEqual(mathAudit.stray,[],'Unwrapped mathematical expressions remain as plain text');
  assert.equal(await run("document.querySelectorAll('svg[role=img]').length"),4);
  const tests=[
    ['10','1:9','19:1'],['25','1:3','7:1'],
    ['40','2:3','4:1'],['60','3:2','7:3'],['90','9:1','11:9']
  ];
  for(const [position,expectedAK,expectedBJ] of tests){
    const output=await run("(()=>{const el=document.querySelector('#pointRange');el.value='"+position+"';el.dispatchEvent(new Event('input',{bubbles:true}));let p=document.querySelector('#parallelLine').getAttribute('d');const c=p.match(/[0-9.]+/g);return {ak:document.querySelector('#akRatio').textContent,bj:document.querySelector('#bjRatio').textContent,desc:document.querySelector('#thalesDesc').textContent,coordinates:c?.map(Number)}})()");
    assert.equal(output.ak,expectedAK);
    assert.equal(await run("document.querySelector('#akRatio').children.length"),3,'Dynamic ratio must retain MathML children');
    assert.equal(await run("document.querySelector('#bjRatio').firstElementChild?.localName"),'mn','Dynamic ratio must use MathML tokens');
    assert.equal(output.bj,expectedBJ);
    assert.ok(output.desc.includes(expectedAK)&&output.desc.includes(expectedBJ),'Stale screen-reader description');
    const [kx,ky,jx,jy]=output.coordinates||[];
    assert.ok(Number.isFinite(kx)&&Math.abs((jx-kx)*258-(jy-ky)*390)<0.01,'Nonparallel line');
  }
  assert.equal(await run("(()=>{document.querySelector('[data-position=\"25\"]').click();return document.querySelector('[data-position=\"25\"]').getAttribute('aria-pressed')+';'+document.querySelector('#bjRatio').textContent})()"),'true;7:1');
  assert.equal(await run("(()=>{document.querySelector('#themeToggle').click();return document.documentElement.dataset.theme})()"),'dark');
  assert.equal(await run("(()=>{const el=document.querySelector('.smalltask details');el.querySelector('summary').click();return el.open})()"),true);
  await snapshot('sofya-lesson-desktop');
  await navigate('09.10.26.html',390,844,true);
  await snapshot('sofya-lesson-mobile-dark');
  await navigate('index.html',390,844);
  await sleep(400);
  assert.equal(await run("document.querySelector('#lesson-title')?.textContent.includes('Четыре метода решения задач')"),true,'New lesson not shown in dashboard');
  await snapshot('sofya-index-mobile');
  await navigate('index.html',1440,900);
  await sleep(400);
  assert.equal(await run("document.querySelector('a[href^=\"09.10.26.html\"]')!==null"),true,'Previous lesson missing from archive');
  assert.equal(await run("document.querySelector('a[href^=\"11.10.26.html\"]')!==null"),true,'New lesson missing from navigator');
  await snapshot('sofya-index-desktop');
  // New lesson and 11 October laboratory: responsive, theme and interaction checks.
  for(const [w,h] of [[375,812],[768,1024],[1440,900]]){
    for(const name of ['11.10.26.html','11.10.26-lab.html']){
      await navigate(name,w,h,false);
      await navigate(name,w,h,true);
    }
  }
  await navigate('11.10.26.html',1440,900);
  assert.equal(await run("document.querySelectorAll('ol.practice > li').length"),10,'Expected ten training tasks');
  assert.equal(await run("document.querySelector('#holes')!==null && document.querySelector('#altitudes')!==null"),true,'Lesson anchors missing');
  const lessonMath=await run("(()=>{const m=[...document.querySelectorAll('main math')];const ns='http://www.w3.org/1998/Math/MathML';const stray=[];const w=document.createTreeWalker(document.querySelector('#main'),NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode,p=n.parentElement;if(!p||p.closest('math,svg,style,script'))continue;const t=n.textContent.trim();if(/(?:[xykgh] *=|[²³√∠△∈∪≠≤≥∥]|[0-9]+ *[/] *[0-9]+|[0-9]+(?:,[0-9]+)? *%)/u.test(t))stray.push(t)}return {count:m.length,invalid:m.filter(x=>x.namespaceURI!==ns||[...x.querySelectorAll('*')].some(child=>child.namespaceURI!==ns)).length,frac:document.querySelectorAll('math mfrac').length,sqrt:document.querySelectorAll('math msqrt').length,powers:document.querySelectorAll('math msup').length,sub:document.querySelectorAll('math msub').length,blank:document.querySelectorAll('.equation:not(:has(math)),.expression:not(:has(math)),span.math').length,stray}})()");
  assert.ok(lessonMath.count>=110,'Lesson mathematical notation must use native MathML: '+JSON.stringify(lessonMath));
  assert.equal(lessonMath.invalid,0,'Lesson MathML namespace');
  assert.ok(lessonMath.frac>=20 && lessonMath.sqrt>=2 && lessonMath.powers>=10 && lessonMath.sub>=2,'Missing structural MathML nodes');
  assert.equal(lessonMath.blank,0,'Legacy formula fragments remain');
  assert.deepEqual(lessonMath.stray,[],'Plain mathematical notation remains in the lesson');
  await snapshot('sofya-20261011-lesson-desktop');
  await navigate('11.10.26-lab.html',1440,900);
  assert.equal(await run("document.querySelector('#intersectionCount').textContent.includes('0 общих')"),true,'Preset k=-9/4 should have zero intersections');
  assert.equal(await run("(()=>{const el=document.querySelector('#kSlider');el.value='-1';el.dispatchEvent(new Event('input',{bubbles:true}));return document.querySelector('#intersectionCount').textContent})().includes('1 общая')"),true,'k=-1 should have a single intersection');
  assert.equal(await run("(()=>{document.querySelector('[data-k=\"2.25\"]').click();return document.querySelector('#intersectionCount').textContent})().includes('0 общих')"),true,'k=9/4 should have no intersection');
  assert.equal(await run("(()=>{document.querySelector('[data-k=\"0\"]').click();return document.querySelector('#intersectionCount').textContent})().includes('0 общих')"),true,'k=0 should have no intersection');
  const labMath=await run("(()=>{const ns='http://www.w3.org/1998/Math/MathML',m=[...document.querySelectorAll('main math')];return {count:m.length,invalid:m.filter(x=>x.namespaceURI!==ns||[...x.querySelectorAll('*')].some(child=>child.namespaceURI!==ns)).length,frac:document.querySelectorAll('math mfrac').length,slider:!!document.querySelector('#kValue math mn'),status:!!document.querySelector('#intersectionCount math mn'),coordinate:!!document.querySelector('#coordinates math'),legacy:document.querySelectorAll('span.math,p.math').length}})()");
  assert.ok(labMath.count>=23 && labMath.frac>=12,'Lab formulas should use structural native MathML: '+JSON.stringify(labMath));
  assert.equal(labMath.invalid,0,'Lab MathML namespace');
  assert.equal(labMath.legacy,0,'Legacy lab formulas remain');
  assert.equal(labMath.slider&&labMath.status,true,'Live slider and intersection status need MathML');
  await run("(()=>{document.querySelector('[data-k=\"-1\"]').click();return true})()");
  assert.equal(await run("document.querySelector('#coordinates math')?.namespaceURI"),'http://www.w3.org/1998/Math/MathML','Dynamic coordinate pair must be MathML');
  assert.equal(await run("(()=>{document.querySelector('input[name=\"guess\"][value=\"none\"]').checked=true;document.querySelector('#checkPrediction').click();return document.querySelectorAll('#feedback math mfrac').length})()"),2,'Prediction feedback must use MathML fractions');
  await snapshot('sofya-20261011-lab-desktop');

  // 16 October: newly published material, teaching geometry and live Menelaus invariant.
  await navigate('16.10.26.html',390,844);
  assert.equal(await run("document.querySelectorAll('.training li').length"),10,'October 16 training must contain 10 tasks');
  assert.equal(await run("!!document.querySelector('#menelaus') && !!document.querySelector('#first') && !!document.querySelector('#second') && !!document.querySelector('#check')"),true,'October 16 evidence anchors missing');

  const menelausMath=await run("(()=>{const ns='http://www.w3.org/1998/Math/MathML';const math=[...document.querySelectorAll('main math')];const bad=math.filter(x=>x.namespaceURI!==ns||[...x.querySelectorAll('*')].some(y=>y.namespaceURI!==ns)).length;const stray=[];const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT);while(walker.nextNode()){const p=walker.currentNode.parentElement;if(!p||p.closest('svg,math,script,style'))continue;const v=walker.currentNode.textContent.trim();if(/\\b(?:ABC|AB|AC|AN|AK|BJ|BK|CN|JC|KB|KM|KN|MC|BM|BF|FKB|NKA)\\b|\\d+\\s*:\\s*\\d+/.test(v))stray.push(v)}return {count:math.length,frac:document.querySelectorAll('main math mfrac').length,bad,stray}})()");
  assert.ok(menelausMath.count>=140,'Expected full MathML coverage of 16 October lesson: '+JSON.stringify(menelausMath));
  assert.ok(menelausMath.frac>=20,'Menelaus theorem fractions must be native mfrac elements');
  assert.equal(menelausMath.bad,0,'16 October MathML namespace mismatch');
  assert.deepEqual(menelausMath.stray,[],'Unwrapped mathematical notation in 16 October lesson');
  await snapshot('sofya-20261016-lesson-mobile');
  await navigate('16.10.26-lab.html',1440,900);
  assert.equal(await run("document.querySelector('#answer').textContent.includes('2,00')"),true,'Default Menelaus example must return 2:1');
  await run("document.querySelector('[data-a=\"0.6666666667\"]').click()");
  const presetValue=await run("Number(document.querySelector('#answer').textContent.replace(',','.').split(' ')[0])");
  assert.ok(Math.abs(presetValue-4.5)<0.01,'Exact 2:3 and 1:2 example must return 9:2');

  const liveMath=await run("(()=>{const ns='http://www.w3.org/1998/Math/MathML';const ids=['ratioABOut','ratioNCOut','whole','outside','answer','product','equation'];const nodes=ids.map(id=>document.querySelector('#'+id+' > math'));return {valid:nodes.every(n=>n&&n.namespaceURI===ns&&[...n.querySelectorAll('*')].every(x=>x.namespaceURI===ns)),frac:document.querySelectorAll('#equation math mfrac').length,answer:document.querySelector('#answer math')?.textContent}})()");
  assert.equal(liveMath.valid,true,'All dynamic Menelaus readouts must be genuine MathML nodes');
  assert.equal(liveMath.frac,3,'Live theorem formula must have three native MathML fractions');
  assert.ok(liveMath.answer.includes('4,50'),'Live MathML ratio must update with the slider');
  const collinear=await run("(()=>{const pt=id=>{const el=document.querySelector(id);return [Number(el.getAttribute('cx')),Number(el.getAttribute('cy'))]};const k=pt('#kDot'),j=pt('#jDot'),n=pt('#nDot');return (j[0]-k[0])*(n[1]-k[1])-(j[1]-k[1])*(n[0]-k[0])})()");
  assert.ok(Math.abs(collinear)<0.001,'Menelaus K, J, N must remain mathematically collinear');
  await run("document.querySelector('#reset').click()");
  assert.equal(await run("document.querySelector('#answer').textContent.includes('2,00')"),true,'Lab reset must restore first example');

  await run("document.querySelector('#save').click();document.querySelector('#ratioNC').value='0.75';document.querySelector('#ratioNC').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.ok(await run("document.querySelectorAll('#comparisonContent math').length")>=3,'Comparison must update as MathML');
  await run("document.querySelector('[data-answer=down]').click()");
  assert.ok(await run("document.querySelectorAll('#predictionFeedback math').length")>=2,'Prediction feedback must have MathML');
  await run("document.querySelector('#reset').click()");
  await snapshot('sofya-20261016-menelaus-lab');

  // 18 October: four lesson themes and a mathematically grounded graph laboratory.
  await navigate('18.10.26.html',390,844);
  assert.equal(await run("document.querySelectorAll('.training > li').length"),10,'October 18 training must contain 10 tasks');
  assert.equal(await run("['equations','river','graphs','geometry','practice'].every(x=>!!document.getElementById(x))"),true,'October 18 evidence anchors missing');
  assert.equal(await run("(()=>{const paths=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));return paths.includes('../pdf_docs/18.10.26.pdf') && paths.includes('../tex_docs/18.10.26.tex')})()"),true,'Lesson materials absent');
  await snapshot('sofya-20261018-lesson-mobile');
  await navigate('18.10.26-lab.html',1440,900);
  assert.equal(await run("document.querySelector('#count').textContent"),'2','At m=-7.5 the line must intersect twice');
  await run("document.querySelector('[data-m=\"-5\"]').click()");
  assert.equal(await run("document.querySelector('#count').textContent"),'3','At m=-5 the line must intersect three times');
  await run("document.querySelector('[data-m=\"-3\"]').click()");
  assert.equal(await run("document.querySelector('#count').textContent"),'2','At m=-3 the line must intersect twice');
  await run("(()=>{const el=document.querySelector('#mSlider');el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
  assert.equal(await run("document.querySelector('#count').textContent"),'1','At m=0 the line must intersect once');
  await run("document.querySelector('#reset').click()");
  assert.equal(await run("document.querySelector('#count').textContent"),'2','Lab reset must restore m=-7.5');
  await snapshot('sofya-20261018-graph-lab-desktop');
  await navigate('18.10.26-lab.html',390,844,true);
  assert.ok(await run("document.documentElement.scrollWidth<=innerWidth+2"),'October 18 lab horizontal overflow on mobile');
  await snapshot('sofya-20261018-graph-lab-mobile-dark');

  assert.deepEqual(jsErrors,[],'JavaScript errors');
  assert.deepEqual(badRequests,[],'Network errors');
  console.log('Browser QA PASS: 5 viewports × 2 pages × 2 themes + interactive checks');
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