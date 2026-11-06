import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(result=>result.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium/Chrome required for browser QA');
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.pdf':'application/pdf'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(500);res.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sofya-area-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,seq=0;const pending=new Map(),bad=[],jsErrors=[];
try{
 let port;
 for(let t=0;t<150;t++){const file=path.join(profile,'DevToolsActivePort');if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}if(chromeProcess.exitCode!==null)throw Error('Chrome exited');await sleep(100);}
 assert.ok(port,'DevTools port');
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=targets.find(t=>t.type==='page');assert.ok(target,'Page target');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 ws.onmessage=event=>{
  const msg=JSON.parse(event.data);
  if(msg.id&&pending.has(msg.id)){const done=pending.get(msg.id);pending.delete(msg.id);done(msg);}
  if(msg.method==='Runtime.exceptionThrown')jsErrors.push(msg.params?.exceptionDetails?.text||'JS exception');
  if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)bad.push(msg.params.response.url+': '+msg.params.response.status);
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));ws.send(JSON.stringify({id,method,params}));});
 const run=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text||'Runtime eval');return result.result.value;};
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 async function navigate(file,width,dark=false){
  bad.length=0;jsErrors.length=0;
  await call('Emulation.setDeviceMetricsOverride',{width,height:width<600?812:900,deviceScaleFactor:1,mobile:width<600});
  const url=origin+'/students/sofya_kalney/site/'+file;
  await call('Page.navigate',{url});
  let loaded=false;
  for(let k=0;k<100;k++){const state=await run('({href:location.href,ready:document.readyState})');if(state.href.startsWith(url)&&state.ready==='complete'){loaded=true;break;}await sleep(70);}
  assert.ok(loaded,file+' did not load');
  await sleep(150);
  await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
  const metrics=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
  assert.ok(metrics.scroll<=metrics.client+2,file+' width '+width+' overflow '+JSON.stringify(metrics));
  assert.equal(jsErrors.length,0,file+' JavaScript errors '+JSON.stringify(jsErrors));
  assert.equal(bad.length,0,file+' 404+ requests '+JSON.stringify(bad));
 }
 for(const file of ['06.11.26.html','06.11.26-lab.html']){
  for(const width of [375,1440])for(const dark of [false,true])await navigate(file,width,dark);
 }
 await navigate('06.11.26.html',1440);
 assert.equal(await run("document.querySelectorAll('.path .problem').length"),10);
 assert.equal(await run("document.querySelectorAll('.path .answer[hidden]').length"),10);
 assert.equal(await run("document.querySelectorAll('math').length"),6);
 await run("document.querySelector('.reveal').click()");
 assert.equal(await run("document.querySelector('.path .answer').hidden"),false);
 await run("document.querySelector('.finished input').click()");
 assert.equal(await run("document.getElementById('bar').value"),1);
 await navigate('06.11.26-lab.html',1440);
 const baseline=await run("Number(document.getElementById('areaOut').textContent.replace(',','.'))");
 assert.ok(Math.abs(baseline-30)<.005,'common angle baseline must equal 30, got '+baseline);
 await run("(() => {let e=document.getElementById('p');e.value='.8';e.dispatchEvent(new Event('input',{bubbles:true}));})()");
 const changed=await run("Number(document.getElementById('areaOut').textContent.replace(',','.'))");
 assert.ok(Math.abs(changed-40)<.01,'changing side share must give 40, got '+changed);
 await run("document.getElementById('tab-diagonals').click()");
 assert.equal(await run("document.getElementById('panel-diagonals').hidden"),false);
 assert.equal(await run("Number(document.getElementById('totalOut').textContent.replace(',','.'))"),120);
 await run("(() => {let e=document.getElementById('ratio');e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));})()");
 assert.equal(await run("Number(document.getElementById('totalOut').textContent.replace(',','.'))"),100);
 await run("document.getElementById('resetQuad').click()");
 assert.equal(await run("Number(document.getElementById('totalOut').textContent.replace(',','.'))"),120);
 await navigate('index.html',1440);
 for(let i=0;i<80;i++){if(await run("document.getElementById('lesson-title')?.textContent.includes('Отношения площадей')"))break;await sleep(100);}
 assert.ok(await run("document.getElementById('lesson-title')?.textContent.includes('Отношения площадей')"),'dashboard must show latest 6 November lesson');
 console.log('PASS Sofia 06.11.26: responsive, JS/network, MathML, practice, lab, dashboard');
}finally{
 try{ws?.close();}catch(_){}
 chromeProcess.kill('SIGKILL');
 await new Promise(resolve=>server.close(resolve));
 await sleep(400);
 try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
 catch(error){console.warn('Temporary Chromium profile cleanup:',error.message);}
}
