import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>spawnSync('which',[x],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
if(!chrome)throw new Error('BROWSER_NOT_AVAILABLE: Chromium missing');
const server=http.createServer((req,res)=>{
 try {const target=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!target.startsWith(ROOT+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return}
 const ext=path.extname(target);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.pdf':'application/pdf','.json':'application/json'})[ext]||'application/octet-stream');fs.createReadStream(target).pipe(res);
 }catch(_){res.writeHead(500);res.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const host='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'jaroslav1210-'));
const processChrome=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let ws;const pending=new Map(),errors=[],bad=[];let serial=0;
try {
 let port;for(let i=0;i<130;i++){const p=path.join(profile,'DevToolsActivePort');if(fs.existsSync(p)){port=Number(fs.readFileSync(p,'utf8').split('\n')[0]);break}if(processChrome.exitCode!==null)throw Error('Chrome quit unexpectedly');await pause(100)}
 if(!port)throw Error('BROWSER_NOT_AVAILABLE: Chrome did not expose DevTools port');
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const target=tabs.find(x=>x.type==='page');assert.ok(target);
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no});
 ws.onmessage=ev=>{const msg=JSON.parse(ev.data);if(msg.id&&pending.has(msg.id)){const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg)}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)bad.push(msg.params.response.url+':'+msg.params.response.status)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,x=>x.error?reject(Error(x.error.message)):resolve(x.result));ws.send(JSON.stringify({id,method,params}))});
 const run=async expression=>{const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);return x.result.value};
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 const shots=path.join(ROOT,'jaroslav-review-artifacts');fs.mkdirSync(shots,{recursive:true});
 async function nav(page,width,dark=false){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=768});const url=host+'/students/jaroslav_gavrilov/site/'+page;await call('Page.navigate',{url});let state;for(let i=0;i<160;i++){state=await run('({url:location.href,ready:document.readyState})');if(state.url.startsWith(url)&&state.ready==='complete')break;await pause(80)}assert.equal(state?.ready,'complete');await run('document.documentElement.dataset.theme='+JSON.stringify(dark?'dark':'light'));await pause(90);const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');assert.ok(m.scroll<=m.client+2,page+' '+width+' dark='+dark+' overflow '+JSON.stringify(m));return m;}
 async function shot(label){const x=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(shots,label+'.png'),Buffer.from(x.data,'base64'));}
 for(const width of [320,390,768,900,1024,1440])for(const page of ['12.10.26.html','12.10.26-lab.html'])for(const dark of [false,true]){await nav(page,width,dark);if((width===390||width===1440))await shot(page+'-'+width+'-'+(dark?'dark':'light'));}
 await nav('12.10.26.html',1440,false);
 const analysis=await run('({title:document.title,math:document.querySelectorAll("math").length,days:document.querySelectorAll(".day").length,tasks:document.querySelectorAll(".tasks li").length,steps:document.querySelectorAll(".step-content h4").length})');
 assert.equal(analysis.days,2);assert.equal(analysis.tasks,16);assert.ok(analysis.math>=4);
 const step=await run('(()=>{document.querySelector("#step-next").click();return document.querySelector("#step-count").textContent})()');assert.ok(step.includes('2 из 5'));
 const quiz=await run('(()=>{document.querySelector(".quiz-item [data-value=b]").click();return document.querySelector(".quiz-item .feedback").textContent})()');assert.ok(quiz.startsWith('Верно.'));
 const theme=await run('(()=>{document.querySelector("#theme-toggle").click();return document.documentElement.dataset.theme})()');assert.equal(theme,'dark');
 await nav('12.10.26-lab.html',1440,false);
 const first=await run('(()=>({share:document.querySelector("#share").textContent,interval:document.querySelector("#interval").textContent,status:document.querySelector("#status").textContent}))()');assert.equal(first.share,'2/3 ≈ 0,67');assert.equal(first.interval,'[1/6; 5/6]');
 const phase=await run('(()=>{document.querySelector("[data-case=phase]").click();const x=document.querySelector("#moment");x.value="0.75";x.dispatchEvent(new Event("input"));return {share:document.querySelector("#share").textContent,status:document.querySelector("#status").textContent,interval:document.querySelector("#interval").textContent}})()');assert.deepEqual(phase,{share:'50 %',status:'Не ниже порога',interval:'[0,5; 1]'});
 const lamp=await run('(()=>{document.querySelector("[data-case=lamp-start]").click();return document.querySelector("#share").textContent})()');assert.equal(lamp,'70 %');
 assert.deepEqual(errors,[],'Runtime exceptions');assert.deepEqual(bad,[],'HTTP errors');console.log('BROWSER_QA_PASS',JSON.stringify({analysis,first,phase,lamp,screenshots:fs.readdirSync(shots).length}));
} finally {try{ws?.close()}catch(_){}processChrome.kill('SIGKILL');server.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:150})}