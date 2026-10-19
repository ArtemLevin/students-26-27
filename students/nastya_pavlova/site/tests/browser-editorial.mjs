import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const executable=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(bin=>spawnSync('which',[bin],{encoding:'utf8'}))
  .find(x=>x.status===0)?.stdout.trim();
if(!executable)throw Error('Chromium is required. This test cannot silently skip browser QA.');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
 try{
  const full=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!full.startsWith(ROOT+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(full)]||'application/octet-stream');
  fs.createReadStream(full).pipe(res);
 }catch(error){res.writeHead(500);res.end('Server error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nastya-editorial-'));
const processChrome=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','pipe','pipe']});
let chromeLog='';for(const stream of [processChrome.stdout,processChrome.stderr])stream.on('data',chunk=>chromeLog=(chromeLog+chunk).slice(-14000));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;const pending=new Map();let serial=0;const exceptions=[],failedResources=[];
try{
 let port=0;
 for(let i=0;i<180;i++){
  const active=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
  const fallback=chromeLog.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
  if(fallback){port=Number(fallback[1]);break;}
  if(processChrome.exitCode!==null)throw Error('Chromium exited before opening DevTools: '+chromeLog);
  await sleep(100);
 }
 if(!port)throw Error('Unable to start Chromium: '+chromeLog);
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=tabs.find(x=>x.type==='page');assert.ok(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=e=>{
  const msg=JSON.parse(e.data);
  if(msg.id&&pending.has(msg.id)){const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg);}
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails?.exception?.description||msg.params.exceptionDetails?.text);
  if(msg.method==='Network.responseReceived'&&msg.params.response?.status>=400)failedResources.push(msg.params.response.url+': '+msg.params.response.status);
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
  socket.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);
  return x.result.value;
 };
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 const output=path.join(ROOT,'nastya-editorial-artifacts');
 fs.mkdirSync(output,{recursive:true});
 async function navigate(name,width,height){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
  const url=origin+'/students/nastya_pavlova/site/'+name;
  await call('Page.navigate',{url});
  for(let i=0;i<150;i++){
   const info=await evaluate('({url:location.href,ready:document.readyState})');
   if(info.url===url&&info.ready==='complete')break;
   if(i===149)throw Error('Page loading timed out: '+url);
   await sleep(90);
  }
  for(let i=0;i<70;i++){
   const expression=name==='index.html'?
     "document.querySelector('#lessonTitle')?.textContent!=='Загрузка занятия…'":
     name==='archive.html'?"document.querySelectorAll('.archive-tile').length>0":
     name.endsWith('-lab.html')?"document.querySelector('#finalSum')?.textContent.length>0":
     "!!document.querySelector('#pageTitle')";
   const ready=await evaluate(expression);
   if(ready)break;await sleep(100);
  }
  await sleep(180);
  const geometry=await evaluate("({documentWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,screen:innerWidth})");
  if(geometry.documentWidth>geometry.viewportWidth+2){
   const offenders=await evaluate("([...document.querySelectorAll('body *')].filter(x=>{const r=x.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).slice(0,14).map(x=>({tag:x.tagName,selector:x.id||x.className?.baseVal||x.className,left:Math.round(x.getBoundingClientRect().left),right:Math.round(x.getBoundingClientRect().right)})))");
   throw Error(name+' '+width+' viewport overflow '+JSON.stringify({geometry,offenders}));
  }
  return geometry;
 }
 const viewports=[[1440,900],[1024,768],[768,1024],[390,844],[360,800]];
 for(const [w,h] of viewports){
  for(const page of ['index.html','archive.html']){
   await navigate(page,w,h);
   if(page==='archive.html'){
    const results=await evaluate("(()=>{const tiles=[...document.querySelectorAll('.archive-tile')];return {tiles:tiles.length,months:document.querySelectorAll('.archive-month').length,heights:tiles.map(x=>Math.round(x.getBoundingClientRect().height)),clipped:tiles.filter(x=>x.scrollHeight>x.clientHeight+2).length,foreign:/Ксения Клыкова/.test(document.body.innerText)}})()");
    assert.ok(results.tiles>=10,'Too few archive tiles');
    assert.ok(results.months>=2,'Missing month grouping');
    assert.equal(results.clipped,0,'Archive cards clip content: '+JSON.stringify(results));
    assert.equal(new Set(results.heights).size,1,'Unequal card heights at '+w+': '+JSON.stringify(results.heights));
    assert.equal(results.foreign,false,'Foreign student data in archive');
   }else{
    const state=await evaluate("({map:!!document.querySelector('#radialMap'),practice:!!document.querySelector('#practiceRoot'),lesson:document.querySelector('#lessonTitle')?.textContent,ids:document.querySelectorAll('#practiceSection').length})");
    assert.ok(state.map&&state.practice&&state.ids===1);
    assert.match(state.lesson,/Банковские вклады и сложные проценты/);
   }
   // Both themes must leave content accessible, without horizontal scroll.
   if(page==='archive.html')await evaluate("document.querySelector('#archiveTheme').click()");
   else await evaluate("document.documentElement.dataset.theme='dark'");
   const dark=await evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,theme:document.body.dataset.theme||document.documentElement.dataset.theme})");
   assert.equal(dark.overflow,false,page+' dark overflow at '+w);
   const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync(path.join(output,page.replace('.html','')+'-'+w+'.png'),Buffer.from(image.data,'base64'));
  }
 }
 for(const [w,h] of [[1440,900],[390,844]]){
  for(const page of ['19.10.26.html','19.10.26-lab.html']){
   await navigate(page,w,h);
   const structural=await evaluate(page.endsWith('-lab.html')?
    "({heading:document.querySelector('h1')?.textContent,chart:!!document.querySelector('#growthChart'),controls:document.querySelectorAll('input[type=range]').length})":
    "({heading:document.querySelector('#pageTitle')?.textContent,sections:document.querySelectorAll('.chapter').length,exercises:document.querySelectorAll('.practice details').length})");
   if(page.endsWith('-lab.html')){assert.ok(structural.chart&&structural.controls===4);assert.match(structural.heading,/Как растёт вклад/);}
   else{assert.equal(structural.exercises,10);assert.equal(structural.sections,7);}
   await evaluate("document.querySelector('#themeToggle').click()");
   const afterDark=await evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,theme:document.documentElement.dataset.theme})");
   assert.ok(!afterDark.overflow,'New pages have no dark theme overflow: '+page+' '+w);
  }
 }
 await navigate('19.10.26-lab.html',390,844);
 const scenarios=await evaluate("(()=>{const get=()=>document.querySelector('#finalSum').textContent;document.querySelector('[data-preset=base]').click();const base=get();document.querySelector('[data-preset=deposits]').click();const deposits=get();document.querySelector('[data-preset=withdrawal]').click();const withdrawal=get();document.querySelector('[data-preset=variable]').click();const variable=get();return {base,deposits,withdrawal,variable}})()");
 assert.deepEqual(scenarios,{base:'133,1',deposits:'179,3',withdrawal:'128,205',variable:'145,95'},'Deposit model scenario parity');
 await navigate('index.html',390,844);
 const menu=await evaluate("(()=>{const b=document.querySelector('#cabinetMenuToggle');b.click();const opened=b.getAttribute('aria-expanded')==='true'&&getComputedStyle(document.querySelector('#cabinetNavigation')).display!=='none';document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return {opened,closed:b.getAttribute('aria-expanded')==='false'};})()");
 assert.deepEqual(menu,{opened:true,closed:true},'Mobile menu must open and close with Escape');
 await navigate('archive.html',390,844);
 const filtered=await evaluate("(()=>{const input=document.querySelector('#archiveSearch');input.value='15.10.26';input.dispatchEvent(new Event('input',{bubbles:true}));return {count:[...document.querySelectorAll('.archive-tile')].filter(x=>!x.hidden).length,status:document.querySelector('#archiveSearchStatus').textContent}})()");
 assert.equal(filtered.count,1,'Search should find exactly one dated lesson');
 assert.ok(!exceptions.length,'JS errors: '+exceptions.join('\n'));
 assert.ok(!failedResources.length,'Broken local resource links: '+failedResources.join('\n'));
 console.log('Nastya editorial QA PASS: 5 viewports, 2 themes, menu, archive tile geometry, search, loading.');
}finally{
 if(socket)socket.close();
 processChrome.kill('SIGKILL');server.close();
 try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
}
