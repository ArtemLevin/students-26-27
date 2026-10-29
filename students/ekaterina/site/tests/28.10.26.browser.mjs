import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const chrome=['google-chrome','chromium','chromium-browser','google-chrome-stable']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(x=>x.status===0)?.stdout.trim();
assert.ok(chrome,'Chromium browser not installed');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.tex':'text/plain; charset=utf-8','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500);res.end(error.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port+'/students/ekaterina/site/';
async function freePort(){const srv=net.createServer();await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));const p=srv.address().port;await new Promise(resolve=>srv.close(resolve));return p;}
const port=await freePort(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'ekaterina-281026-'));
const artifacts=path.join(ROOT,'ekaterina-281026-review-artifacts');fs.mkdirSync(artifacts,{recursive:true});
let stderr='',ws,seq=0,child,exceptions=[],badResponses=[],pending=new Map();
try{
 child=spawn(chrome,['--headless=new','--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 child.stderr.on('data',buf=>{stderr+=buf.toString().slice(0,2000);});
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 let targets;
 for(let n=0;n<140;n++){
  if(child.exitCode!==null)throw Error('Browser exited: '+child.exitCode+' '+stderr.slice(-1200));
  try{const response=await fetch('http://127.0.0.1:'+port+'/json/list');if(response.ok){targets=await response.json();if(targets.some(t=>t.type==='page'))break;}}catch{}
  await sleep(100);
 }
 assert.ok(targets?.some(t=>t.type==='page'),'Chrome DevTools unavailable: '+stderr.slice(-1200));
 const tab=targets.find(t=>t.type==='page');
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{
  const msg=JSON.parse(e.data);
  if(msg.id&&pending.has(msg.id)){const handler=pending.get(msg.id);pending.delete(msg.id);handler(msg);}
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params?.exceptionDetails?.text||'Uncaught error');
  if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)badResponses.push(msg.params.response.status+' '+msg.params.response.url);
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error((r.exceptionDetails.exception?.description||r.exceptionDetails.text)+" while evaluating "+expression.slice(0,240));return r.result.value;};
 const wait=async expression=>{for(let n=0;n<100;n++){if(await evaluate(expression))return;await sleep(80);}throw Error('Wait condition failed: '+expression);};
 const navigate=async(file,width,height,query='')=>{
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<800});
  await call('Page.navigate',{url:local+file+query});
  await wait('document.readyState==="complete"&&location.pathname.endsWith('+JSON.stringify(file)+')');
 };
 const screenshot=async name=>{const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(r.data,'base64'));};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]]){
  for(const dark of [false,true]){
   await navigate('28.10.26.html',width,height);
   await evaluate('(()=>{const d='+JSON.stringify(dark)+';if((document.documentElement.dataset.theme==="dark")!==d)document.getElementById("theme").click()})()');
   const data=await evaluate('(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,count:document.querySelectorAll(".task").length,answers:document.querySelectorAll(".answer").length,math:[...document.querySelectorAll("main math")].length,invalid:[...document.querySelectorAll("main math")].filter(el=>el.namespaceURI!=="http://www.w3.org/1998/Math/MathML").length,theme:document.documentElement.dataset.theme,brokenAnchors:[...document.querySelectorAll("a[href]")].filter(el=>el.getAttribute("href").startsWith("#")&&!document.getElementById(el.getAttribute("href").slice(1))).length}))()');
   assert.ok(data.overflow<=2,'Lesson horizontal overflow at '+width+': '+JSON.stringify(data));
   assert.equal(data.count,10);assert.equal(data.answers,10);
   assert.ok(data.math>=75,'Missing native MathML: '+JSON.stringify(data));
   assert.equal(data.invalid,0);assert.equal(data.brokenAnchors,0);
   assert.equal(data.theme,dark?'dark':'light');
   if([375,1440].includes(width))await screenshot('lesson-'+width+(dark?'-dark':'-light'));
  }
 }
 for(const [width,height] of [[375,812],[768,1024],[1440,900]]){
  await navigate('28.10.26-lab.html',width,height,'?mode=sign');
  let data=await evaluate('(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,mode:document.querySelectorAll("[data-level]")[0].getAttribute("aria-pressed"),y:document.getElementById("yout").textContent}))()');
  assert.ok(data.overflow<=2,'Lab horizontal overflow: '+JSON.stringify(data));assert.equal(data.mode,'true');
  await evaluate('document.getElementById("at-boundary").click()');
  data=await evaluate('(()=>({coordinates:document.getElementById("coords").textContent,y:document.getElementById("yout").textContent,formula:document.getElementById("calculation").textContent}))()');
  assert.ok(data.coordinates.includes('8/3'),'Exact boundary missing '+JSON.stringify(data));assert.equal(data.y,'0');
  assert.ok(data.formula.includes('8/3'));
  await evaluate('document.querySelectorAll("[data-level]")[1].click()');
  await evaluate('(()=>{const el=document.getElementById("xrange");el.value="2";el.dispatchEvent(new Event("input",{bubbles:true}));document.querySelectorAll("input[name=forecast]")[0].click();document.getElementById("check-forecast").click()})()');
  data=await evaluate('(()=>({y:document.getElementById("yout").textContent,message:document.getElementById("forecast-result").textContent}))()');
  assert.equal(data.y,'-2');assert.ok(data.message.includes('подтверждён'),'Prediction feedback mismatch '+JSON.stringify(data));
  await evaluate('document.getElementById("reset").click()');
  assert.equal(await evaluate('document.getElementById("coords").textContent'),'(3; 1)');
  if([375,1440].includes(width))await screenshot('lab-'+width);
 }
 await navigate('index.html',375,812);
 const home=await evaluate('(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,map:!!document.getElementById("map"),latest:document.querySelector(".material-card time")?.getAttribute("datetime"),lessonLink:document.querySelector(".material-card a")?.getAttribute("href")}))()');
 assert.ok(home.overflow<=2,'Home overflow '+JSON.stringify(home));assert.ok(home.map,'Dashboard competence map missing');assert.equal(home.latest,'2026-10-28');assert.equal(home.lessonLink,'28.10.26.html');
 assert.deepEqual(exceptions,[],'Uncaught browser exceptions');assert.deepEqual(badResponses,[],'HTTP resource errors');
 console.log('Ekaterina 28.10.26 browser QA passed');
}finally{
 try{ws?.close();}catch{}
 if(child&&child.exitCode===null)child.kill('SIGTERM');
 await new Promise(resolve=>server.close(resolve));
 await new Promise(resolve=>setTimeout(resolve,200));
 try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});}catch(error){console.warn('Could not remove disposable Chromium profile: '+error.message);}
}
