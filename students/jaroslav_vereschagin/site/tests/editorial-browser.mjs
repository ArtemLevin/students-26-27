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
  console.log('Jaroslav editorial QA passed: all five viewport sizes, tiles, search, mobile nav, themes and map');
}finally{
  try{ws?.close()}catch(_){}
  processChrome.kill('SIGTERM');server.close();
  try { fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch (_) { /* Chrome may still own its profile. */ }
}
