import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('New probability lesson and lab browser release',async()=>{
 assert.ok(chrome,'Chromium required');
 const server=http.createServer((req,res)=>{
  try{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.pdf':'application/pdf'})[path.extname(f)]||'text/plain');fs.createReadStream(f).pipe(res);}
  catch(e){res.writeHead(500);res.end(String(e));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'probability-browser-'));
 const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
 let ws,serial=0;const pending=new Map(),errors=[],failed=[];
 try{
  let port;for(let i=0;i<160;i++){const f=path.join(profile,'DevToolsActivePort');if(fs.existsSync(f)){port=Number(fs.readFileSync(f,'utf8').split('\n')[0]);break;}if(proc.exitCode!==null)throw Error('Chromium exited');await sleep(100);}
  assert.ok(port,'DevTools port unavailable');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(t=>t.type==='page');assert.ok(target);
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
   if(m.method==='Runtime.exceptionThrown')errors.push(m.params?.exceptionDetails?.text||'exception');
   if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400)failed.push(m.params.response.url);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
  const run=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;};
  const wait=async expr=>{for(let i=0;i<75;i++){if(await run(expr))return;await sleep(100);}throw Error('Wait '+expr);};
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const base='http://127.0.0.1:'+server.address().port+'/students/ekaterina_gnedkova/site/';
  for(const view of [{w:1440,h:900},{w:768,h:1024},{w:375,h:812}]){
   await call('Emulation.setDeviceMetricsOverride',{width:view.w,height:view.h,deviceScaleFactor:1,mobile:view.w<600});
   for(const file of ['11.11.26.html','11.11.26-lab.html']){
    await call('Page.navigate',{url:base+file});await wait('document.readyState==="complete"');
    if(file.includes('lab'))await wait('document.querySelectorAll(".cell").length===36');
    for(const theme of ['light','dark']){
     await run('document.documentElement.dataset.theme="'+theme+'"');
     const m=await run('({width:document.documentElement.scrollWidth,viewport:innerWidth,ids:(()=>{const x=[...document.querySelectorAll("[id]")].map(n=>n.id);return x.length===new Set(x).size})(),tasks:document.querySelectorAll(".exercise").length,cells:document.querySelectorAll(".cell").length})');
     assert.ok(m.width<=m.viewport+2,file+' '+view.w+' '+theme+' overflow');
     assert.equal(m.ids,true,file+' duplicate id');
     if(file.includes('lab'))assert.equal(m.cells,36);else assert.equal(m.tasks,10);
    }
    if(file.includes('lab')){
     assert.equal(await run('document.querySelector("#count").textContent'),'5 из 36');
     await run('document.querySelector("#pairs").click()');assert.equal(await run('document.querySelector("#count").textContent'),'2 из 36');
     await run('document.querySelector("#clear").click()');assert.equal(await run('document.querySelector("#count").textContent'),'0 из 36');
     await run('document.querySelector("#preset").click()');assert.equal(await run('document.querySelector("#count").textContent'),'5 из 36');
    }
   }
  }
  assert.deepEqual(errors,[],'JS exceptions');assert.deepEqual(failed,[],'network failures');
 }finally{try{ws?.close()}catch{}proc.kill('SIGKILL');server.close();fs.rmSync(profile,{force:true,recursive:true});}
},{timeout:90000});