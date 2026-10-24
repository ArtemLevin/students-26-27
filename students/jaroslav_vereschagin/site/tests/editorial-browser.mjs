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
if(!chrome)throw Error('Chromium/Chrome is required; browser QA may not be skipped');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try {
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(_){res.writeHead(500);res.end('server error')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'jaroslav-editorial-'));
const processChrome=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',
 '--user-data-dir='+profile],{stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;
try{
  let port=0;
  for(let n=0;n<160;n++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break}
    if(processChrome.exitCode!==null)throw Error('Chromium quit prematurely');
    await delay(100);
  }
  if(!port)throw Error('Chromium DevTools port unavailable');
  const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=pages.find(p=>p.type==='page');
  assert.ok(target,'Browser page target absent');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let nextId=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)){
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if(message.method==='Runtime.exceptionThrown'){
      errors.push(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text);
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');
  const images=path.join(root,'jaroslav-editorial-browser-artifacts');
  fs.mkdirSync(images,{recursive:true});
  async function screen(name){
    const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(images,name+'.png'),Buffer.from(r.data,'base64'));
  }
  async function visit(file,w,h,dark){
    errors.length=0;
    await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<=768});
    const url=origin+'/students/jaroslav_vereschagin/site/'+file;
    await call('Page.navigate',{url});
    for(let n=0;n<120;n++){
      const state=await evaluate('({url:location.href,ready:document.readyState,items:document.querySelectorAll(".archive-tile").length,cells:document.querySelectorAll(".radial-cell").length})');
      if(state.url.startsWith(url)&&state.ready==='complete'&&
        (file==='archive.html'?state.items>0:state.cells>0))break;
      if(n===119)throw Error('Page did not load fully: '+file+' '+JSON.stringify(state));
      await delay(80);
    }
    await delay(160);
    if(dark){
      await evaluate(file==='archive.html'
        ? 'document.body.hasAttribute("data-theme") && document.getElementById("archiveTheme").click()'
        : 'document.documentElement.dataset.theme !== "dark" && document.getElementById("themeToggle").click()');
    }
    const shape=await evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
    assert.ok(shape.scroll<=shape.width+2,file+' @ '+w+' '+JSON.stringify(shape));
    assert.deepEqual(errors,[],file+' uncaught JavaScript exceptions');
  }
  const widths=[[1440,900],[1024,768],[768,1024],[390,844],[360,800]];
  for(const [w,h] of widths){
    await visit('index.html',w,h,false);
    const status=await evaluate('({cells:document.querySelectorAll(".radial-cell").length,stats:document.getElementById("evaluatedCount").textContent,latest:document.querySelector(".editorial-lesson .start-card strong").textContent,nav:document.querySelector(".editorial-nav").getBoundingClientRect().width})');
    assert.ok(status.cells>=300,'The student circular map must retain 324 skills');
    assert.match(status.stats,/^\d+$/,'Statistics should come from rendered competency levels');
    assert.ok(status.latest.trim()!=='', 'Recent lesson must render');
    if(w===390) {
      assert.equal(await evaluate('document.getElementById("menuButton").getAttribute("aria-expanded")'),'false');
      await evaluate('document.getElementById("menuButton").click()');
      assert.equal(await evaluate('document.getElementById("menuButton").getAttribute("aria-expanded")'),'true');
      await evaluate('document.getElementById("closeMenu").click()');
      assert.equal(await evaluate('document.getElementById("menuButton").getAttribute("aria-expanded")'),'false');
    }
    if(w===1440||w===390)await screen('index-'+w);
    await visit('archive.html',w,h,false);
    const cards=await evaluate('([...document.querySelectorAll(".archive-tile")].map(x=>({h:Math.round(x.getBoundingClientRect().height),scroll:x.scrollHeight,client:x.clientHeight,title:x.querySelector(".archive-tile-title").textContent})))');
    const {LESSONS: registeredLessons} = await import('../lesson-registry.js');
    assert.equal(cards.length,registeredLessons.length,'Archive should display every published lesson');
    assert.ok(Math.max(...cards.map(c=>c.h))-Math.min(...cards.map(c=>c.h))<=2,'All archive tiles must be uniform across months');
    for(const card of cards)assert.ok(card.scroll<=card.client+2,'Archive text must remain uncut: '+card.title);
    const columns=await evaluate('getComputedStyle(document.querySelector(".archive-month-grid")).gridTemplateColumns.split(" ").length');
    assert.equal(columns,w>1030?3:w>700?2:1,'Archive grid should use 3/2/1 columns');
    if(w===1440||w===390)await screen('archive-'+w);
    if(w===390){
      const filtering=await evaluate('(()=>{const a=document.getElementById("archiveSearch");a.value="15.10.26";a.dispatchEvent(new Event("input",{bubbles:true}));return [...document.querySelectorAll(".archive-tile")].filter(x=>!x.hidden).length})()');
      assert.equal(filtering,1,'Archive search by date must work');
    }
  }
  await visit('index.html',390,844,true);
  assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');
  await screen('index-dark-390');
  await visit('archive.html',390,844,true);
  assert.equal(await evaluate('!document.body.hasAttribute("data-theme")'),true);
  await screen('archive-dark-390');
  await visit('index.html',1440,900,false);
  const testMap=await evaluate('(()=>{const x=document.querySelector(".radial-cell");x.dispatchEvent(new MouseEvent("click",{bubbles:true}));return document.getElementById("topicDialog").open})()');
  assert.ok(testMap,'Clicking a competence must open its existing dialog');
  await evaluate('document.getElementById("dialogClose").click()');
  assert.deepEqual(errors,[],'No JS exceptions after interactions');

  // Regression checks for the 23 October rational-inequality lesson and its simulator.
  for(const [file,width,height] of [
    ['23.10.26.html',1440,900],['23.10.26.html',390,844],
    ['23.10.26-lab.html',1440,900],['23.10.26-lab.html',390,844]
  ]){
    errors.length=0;
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/jaroslav_vereschagin/site/'+file;
    await call('Page.navigate',{url});
    for(let i=0;i<120;i++){
      const done=await evaluate('({url:location.href,ready:document.readyState})');
      if(done.url.startsWith(url)&&done.ready==='complete')break;
      if(i===119)throw Error('New lesson/lab did not finish loading: '+file);
      await delay(80);
    }
    await delay(100);
    const state=await evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
    assert.ok(state.scroll<=state.width+2,file+' viewport overflow @ '+width+': '+JSON.stringify(state));
    assert.deepEqual(errors,[],file+' JS exceptions');
    if(file.endsWith('-lab.html')){
      const basic=await evaluate('({n:document.getElementById("num").value,d:document.getElementById("den").value,v:document.getElementById("value").value})');
      assert.deepEqual(basic,{n:'1',d:'-1',v:'-1'},'basic sample x=0 must equal -1');
      const hole=await evaluate('(()=>{const i=document.getElementById("x");i.value="1";i.dispatchEvent(new Event("input",{bubbles:true}));return document.getElementById("sampleResult").textContent})()');
      assert.match(hole,/Вне ОДЗ/,'denominator x=1 should be excluded');
      const derived=await evaluate('(()=>{document.querySelector("[data-mode=constant]").click();const i=document.getElementById("x");i.value="-4";i.dispatchEvent(new Event("input",{bubbles:true}));return {n:document.getElementById("num").value,d:document.getElementById("den").value,v:document.getElementById("value").value}})()');
      assert.equal(derived.n,'-20');assert.equal(derived.d,'-12');
      assert.ok(Number(derived.v.replace(',','.'))>0,'negative numerator / negative denominator must be positive');
      const canceled=await evaluate('(()=>{document.querySelector("[data-mode=cancellation]").click();const i=document.getElementById("x");i.value="3";i.dispatchEvent(new Event("input",{bubbles:true}));return document.getElementById("sampleResult").textContent})()');
      assert.match(canceled,/Вне ОДЗ/,'canceled x=3 must remain excluded');
      const expectations=[
        ['basic','(−∞; −1] ∪ (1; +∞)'],
        ['quadratic','(−∞; 2] ∪ [3; 5) ∪ (7; +∞)'],
        ['constant','(−8; −1)'],
        ['cubic','(−5/3; 0] ∪ (5/3; +∞)'],
        ['cancellation','(−∞; −2] ∪ (1; 3) ∪ (3; +∞)'],
        ['double','(−∞; −1) ∪ (−1; 2) ∪ (4; +∞)']
      ];
      for(const [mode,want] of expectations){
        const state=await evaluate('(()=>{document.querySelector("[data-mode='+mode+']").click();return {formula:document.getElementById("formula").textContent,answer:document.getElementById("answer").textContent,hash:location.hash,title:document.querySelector("#axis title")?.textContent,desc:document.querySelector("#axis desc")?.textContent,labels:document.querySelectorAll("#rootJump button").length}})()');
        assert.equal(state.answer,'x ∈ '+want,mode+' computed solution');
        assert.equal(state.hash,'#'+mode,mode+' deep link');
        assert.ok(state.title&&state.desc,mode+' SVG accessible name and description');
        assert.ok(state.labels>=2,mode+' critical-point buttons');
      }
      const signSwitch=await evaluate('(()=>{document.querySelector("[data-mode=basic]").click();const op=document.getElementById("operator");op.value="<=";op.dispatchEvent(new Event("change",{bubbles:true}));return {formula:document.getElementById("formula").textContent,answer:document.getElementById("answer").textContent}})()');
      assert.match(signSwitch.formula,/≤ 0$/,'operator and rendered formula must stay synchronized');
      assert.equal(signSwitch.answer,'x ∈ [−1; 1)','switching operator must solve the new inequality');
      const exactBoundary=await evaluate('(()=>{document.querySelector("[data-mode=cubic]").click();const b=[...document.querySelectorAll("#rootJump button")].find(b=>b.textContent.includes("−5/3"));b.click();return {x:document.getElementById("xLabel").value,result:document.getElementById("sampleResult").textContent}})()');
      assert.equal(exactBoundary.x,'−5/3','root controls must select exact rational values');
      assert.match(exactBoundary.result,/Вне ОДЗ/,'exact rational denominator root must be excluded');
      const reset=await evaluate('(()=>{document.getElementById("reset").click();return {x:document.getElementById("xLabel").value,operator:document.getElementById("operator").value}})()');
      assert.equal(reset.x,'1','cubic reset returns to explanatory sample x=1');
      assert.equal(reset.operator,'>=','reset restores source inequality sign');
      if(width===390)await screen('23.10.26-lab-mobile-after-all-modes');

    }else{
      assert.equal(await evaluate('document.querySelectorAll("#taskList input").length'),10,'10 Path A tasks');
      const typeset=await evaluate('({count:document.querySelectorAll("#taskList math mfrac").length,labels:document.querySelectorAll("#taskList input[aria-label]").length})');
      assert.equal(typeset.count,10,'every Path A fraction must be MathML');
      assert.equal(typeset.labels,0,'wrapped checkbox label must include mathematical expression');
      const fullLesson=await evaluate('({first:document.querySelector("#roots .problem")?.textContent,repeat:document.getElementById("double-root-example")?.textContent,deep:document.querySelector("#double-root-example a")?.getAttribute("href")})');
      assert.match(fullLesson.first,/x = 3/,'source example is restored');
      assert.match(fullLesson.repeat,/двойной корень/i,'source repeated-root example is restored');
      assert.equal(fullLesson.deep,'23.10.26-lab.html#double','repeated root deep link');
      assert.ok(await evaluate('document.getElementById("normal") && document.getElementById("substitute")'),'lesson sections');
    }
    if(width===390)await screen(file.replace('.html','')+'-390');
    assert.deepEqual(errors,[],file+' JS errors after interactions');
  }
  console.log('Jaroslav QA passed: dashboard, archive, 23 October lesson and interactive laboratory');

}finally{
  try{ws?.close()}catch(_){}
  processChrome.kill('SIGTERM');server.close();
  try { fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch (_) { /* Chrome may still own its profile. */ }
}
