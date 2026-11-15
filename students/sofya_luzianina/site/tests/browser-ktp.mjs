// Headless Chromium release gate: runs against real HTTP files without npm dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium/Chrome is required for Sofia KTP browser QA');

const rootPath='/students/sofya_luzianina/site/';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const originalState=JSON.parse(fs.readFileSync(path.join(root,rootPath,'data/ktp-state.json'.replace(/^\/+/,'')),'utf8'));
const originalMastery=JSON.parse(fs.readFileSync(path.join(root,rootPath,'data/mastery-state.json'.replace(/^\/+/,'')),'utf8'));
let scenario='baseline';
const requests=[];
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(scenario==='broken'&&pathname.endsWith('/sofya_luzianina/site/data/ktp-state.json')){
    res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('CI simulated outage');return;
  }
  if(scenario==='progress'&&pathname.endsWith('/sofya_luzianina/site/data/ktp-state.json')){
    const state=structuredClone(originalState);
    state.records['ktp-001']={status:'done',actualDate:'2026-11-17',coverage:'complete'};
    state.records['ktp-002']={status:'skipped'};
    state.records['ktp-003']={status:'moved',scheduledDate:'2026-11-25'};
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(state));return;
  }
  if(scenario==='mastery'&&pathname.endsWith('/sofya_luzianina/site/data/mastery-state.json')){
    const mastery=structuredClone(originalMastery);
    mastery.levels.heat_07={
      level:2,
      sourcePath:'site/data/lessons/2026-11-16.lesson.json',
      sourceKind:'lesson-assessment',
      basis:'Проверена постановка закона относительной влажности.'
    };
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(mastery));return;
  }
  const full=path.resolve(root,'.'+pathname);
  if(!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){
    if(!pathname.endsWith('/favicon.ico'))requests.push('404 '+pathname);
    res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(full).pipe(res);
 }catch(error){requests.push(String(error));res.writeHead(500);res.end('Test server failure')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sofya-ktp-cdp-'));
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--disable-gpu','--no-first-run','--no-zygote','--disable-extensions',
 '--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const runtimeErrors=[];let websocket;let sequence=0;
const pending=new Map();
let pageCount=0;
try{
 let port=0;
 for(let i=0;i<300;i++){
  const devPort=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(devPort)){port=Number(fs.readFileSync(devPort,'utf8').split('\n')[0]);break}
  if(browser.exitCode!==null)throw Error('Chromium exited before opening the DevTools interface');
  await pause(100);
 }
 if(!port)throw Error('Chromium DevTools port unavailable');
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=targets.find(x=>x.type==='page');
 assert.ok(target,'No Chromium page target');
 websocket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{websocket.onopen=resolve;websocket.onerror=reject});
 websocket.onmessage=event=>{
  const msg=JSON.parse(event.data);
  if(msg.id&&pending.has(msg.id)){const fn=pending.get(msg.id);pending.delete(msg.id);fn(msg)}
  if(msg.method==='Runtime.exceptionThrown')runtimeErrors.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence;
  pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
  websocket.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>{
  const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
 };
 const awaitPredicate=async(script,label)=>{
  for(let i=0;i<160;i++){
   let passed=false;try{passed=Boolean(await run(script))}catch{}
   if(passed)return;
   await pause(75);
  }
  throw Error('Timed out waiting for '+label);
 };
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 async function navigate(page='ktp.html',width=1366,height=900,mode='baseline'){
  scenario=mode;pageCount++;
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
  await call('Page.navigate',{url:origin+rootPath+page+'?case='+pageCount});
  await awaitPredicate(
    page==='index.html'?
     "document.readyState==='complete'&&document.querySelector('#skillsTotal')?.textContent==='194'":
     mode==='broken'?
      "document.readyState==='complete'&&document.querySelector('#loadError')?.hidden===false":
      "document.readyState==='complete'&&document.querySelector('#matchCount')?.textContent.includes('/ 57')",
    page+' '+width+' '+mode
  );
 }
 // Real browser interactions, full canonical fixtures.
 await navigate();
 assert.equal(await run("document.querySelectorAll('.lesson-btn').length"),57);
 assert.equal(await run("document.querySelector('#metricTotal').textContent"),'57');
 assert.equal(await run("document.querySelector('#loadError').hidden"),true);
 assert.equal(await run("document.querySelectorAll('#stageList .stage').length"),6);
 assert.equal(await run("document.querySelector('#viewOverview').hidden"),true);
 await run("document.querySelector('[data-view=overview]').click()");
 assert.equal(await run("document.querySelector('#viewOverview').hidden"),false);
 assert.equal(await run("document.querySelector('#viewCalendar').hidden"),true);
 await run("document.querySelector('[data-view=today]').click()");
 assert.equal(await run("document.querySelector('#viewToday').hidden"),false);
 await run("document.querySelector('[data-view=calendar]').click()");
 assert.equal(await run("document.querySelector('#viewCalendar').hidden"),false);
 const searched=await run("(()=>{const a=document.querySelector('#query');a.value='№ 26';a.dispatchEvent(new Event('input',{bubbles:true}));return {count:document.querySelector('#matchCount').textContent,topics:[...document.querySelectorAll('.lesson-btn')].map(x=>x.textContent)}})()");
 assert.ok(searched.count.startsWith('1 / 57'),JSON.stringify(searched));
 assert.ok(searched.topics[0].includes('№26'));
 await run("document.querySelector('.lesson-btn').click()");
 assert.equal(await run("document.querySelector('#lessonDialog').open"),true);
 assert.ok((await run("document.querySelector('#detailContent').textContent")).length>20);
 await run("document.querySelector('#closeDialog').click()");
 assert.equal(await run("document.querySelector('#lessonDialog').open"),false);
 await run("document.querySelector('#clearFilters').click()");
 assert.equal(await run("document.querySelectorAll('.lesson-btn').length"),57);
 await run("(()=>{const s=document.querySelector('#statusSelect');s.value='done';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
 assert.ok((await run("document.querySelector('#matchCount').textContent")).startsWith('0 / 57'));
 // Browser progress records: completion must show actual date and skipped must never be next.
 await navigate('ktp.html',1366,900,'progress');
 assert.equal(await run("document.querySelector('#metricDone').textContent"),'1');
 await run("document.querySelector('[data-view=today]').click()");
 assert.ok((await run("document.querySelector('#todayLast .date').textContent")).includes('17 ноября 2026'));
 await run("document.querySelector('[data-view=calendar]').click()");
 await run("(()=>{const s=document.querySelector('#statusSelect');s.value='done';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
 assert.ok((await run("document.querySelector('#matchCount').textContent")).startsWith('1 / 57'));
 // Source-of-truth data outage: no stale metrics.
 await navigate('ktp.html',1366,900,'broken');
 assert.equal(await run("document.querySelector('#loadError').hidden"),false);
 assert.deepEqual(await run("['metricTotal','metricDone','metricActive','metricPending'].map(id=>document.getElementById(id).textContent)"),['—','—','—','—']);
 assert.equal(await run("document.querySelector('#query').disabled"),true);
 // Atlas: verified mastery basis visible alongside an original diagnostic marker.
 await navigate('index.html',1366,900,'mastery');
 const evidence=await run("document.querySelector('#detailEvidence').textContent");
 assert.ok(evidence.includes('Основание подтверждённой оценки'),evidence);
 assert.ok(evidence.includes('Проверена постановка закона'),evidence);
 assert.equal(await run("document.querySelectorAll('a[href*=\"/review_docs/\"]').length"),0);
 // Theme persistence between KTP and atlas.
 await navigate('ktp.html',1366,900,'baseline');
 await run("(()=>{localStorage.setItem('sofya-luzianina-atlas-theme','light');document.documentElement.dataset.theme='light';document.querySelector('#themeToggle').click()})()");
 assert.equal(await run("document.documentElement.dataset.theme"),'dark');
 await navigate('index.html',1366,900,'baseline');
 assert.equal(await run("document.documentElement.dataset.theme"),'dark');
 // Responsive layouts, light/dark, no document overflow.
 for(const [w,h] of [[360,800],[390,844],[768,1024],[1024,768],[1440,900]]){
  for(const dark of [false,true]){
   await navigate('ktp.html',w,h,'baseline');
   const result=await run("(()=>{document.documentElement.dataset.theme='"+(dark?'dark':'light')+"';return {scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,lessons:document.querySelectorAll('.lesson-btn').length,open:document.querySelector('#viewCalendar').hidden}})()");
   assert.ok(result.scroll<=result.client+2,'Horizontal overflow '+w+'x'+h+': '+JSON.stringify(result));
   assert.equal(result.lessons,57);
   assert.equal(result.open,false);
  }
 }
 assert.deepEqual(runtimeErrors,[],'Uncaught browser JS exceptions');
 assert.deepEqual(requests,[],'Unexpected HTTP failures');
 console.log('✓ Sofia browser QA: tabs, search №26, details, states, fetch errors, mastery, theme, responsive');
}finally{
 if(websocket)websocket.close();
 browser.kill('SIGKILL');
 await new Promise(resolve=>server.close(resolve));
 fs.rmSync(profile,{recursive:true,force:true});
}
