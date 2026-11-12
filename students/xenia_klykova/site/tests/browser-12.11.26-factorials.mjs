import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!browser)throw Error('Real Chromium/Chrome browser is required for release gate');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript; charset=utf-8',
 '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml',
 '.pdf':'application/pdf','.tex':'text/plain'};
const server=http.createServer((req,res)=>{
 try{
  const target=path.resolve(repo,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!target.startsWith(repo+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
  fs.createReadStream(target).pipe(res);
 }catch(_){res.writeHead(500);res.end('Server error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xenia-1211-review-'));
const chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
 '--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const failed=[],exceptions=[],pending=new Map();let serial=0,ws;
try{
 let port=0;
 for(let i=0;i<120;i++){
  const active=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
  if(chrome.exitCode!==null)throw Error('Browser crashed');
  await sleep(100);
 }
 assert.ok(port,'Chrome debugging endpoint missing');
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=tabs.find(x=>x.type==='page');
 assert.ok(target,'Page tab missing');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 ws.onmessage=e=>{
  const msg=JSON.parse(e.data);
  if(msg.id&&pending.has(msg.id)){const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg);}
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(
    msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text||'JS exception'
  );
  if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400){
   failed.push(msg.params.response.url+' '+msg.params.response.status);
  }
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial;
  pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>{
  const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
 };
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 const dir=path.join(repo,'xenia-factorials-20261112-browser-artifacts');
 fs.mkdirSync(dir,{recursive:true});
 async function shot(name){
  const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(result.data,'base64'));
 }
 async function open(name,width=1440,height=900,dark=false){
  failed.length=0;exceptions.length=0;
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
  const suffix=name.startsWith('09.')?name:name;
  const url=origin+'/students/xenia_klykova/site/'+suffix;
  await call('Page.navigate',{url});
  for(let i=0;i<160;i++){
   const state=await run('({url:location.href,ready:document.readyState})');
   if(state.url===url&&state.ready==='complete')break;
   if(i===159)throw Error('Page load timeout '+url);
   await sleep(70);
  }
  await sleep(150);
  await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
  const metrics=await run('({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})');
  if(metrics.scrollWidth>metrics.clientWidth+2){
   const offenders=await run('(()=>[...document.querySelectorAll("*")].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>document.documentElement.clientWidth+2||r.left< -2)}).slice(0,20).map(el=>({tag:el.tagName,className:String(el.className||"").slice(0,80),id:el.id||"",rect:Math.round(el.getBoundingClientRect().right)})))()');
   console.error('Horizontal overflow offenders:',JSON.stringify(offenders));
  }
  assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,
   'Horizontal overflow '+name+' '+width+' '+(dark?'dark':'light')+' '+JSON.stringify(metrics));
  assert.deepEqual(failed,[],'HTTP failures '+name+' '+width);
  assert.deepEqual(exceptions,[],'Browser exceptions '+name+' '+width);
  return url;
 }

 for(const name of ['12.11.26.html','12.11.26-lab.html']){
  for(const [width,height] of [[1440,900],[390,844],[320,740]]){
   for(const dark of [false,true]){
    await open(name,width,height,dark);
    const theme=await run('document.documentElement.dataset.theme');
    assert.equal(theme,dark?'dark':'light');
    assert.equal(await run('(()=>{const ids=[...document.querySelectorAll("[id]")].map(x=>x.id);return ids.length===new Set(ids).size})()'),true,'Duplicate ids');
    if(width===1440||width===390)await shot(name.replace('.html','')+'-'+width+'-'+(dark?'dark':'light'));
   }
  }
 }
 await open('12.11.26.html',1440,900,false);
 assert.equal(await run("document.querySelectorAll('.task').length"),10,'Exactly ten tasks');
 assert.equal(await run("document.querySelectorAll('.task details').length"),10,'Each task has an answer');
 assert.equal(await run("(()=>{dispatchEvent(new Event('beforeprint'));return [...document.querySelectorAll('.task details')].every(x=>x.open)})()"),true);
 assert.equal(await run("(()=>{dispatchEvent(new Event('afterprint'));return [...document.querySelectorAll('.task details')].every(x=>!x.open)})()"),true);
 assert.equal(await run("(()=>{document.querySelector('#checklist input').click();return document.getElementById('progressText').textContent})()"),'Отмечено: 1 из 5');
 await open('12.11.26-lab.html#thirty-twelve',1440,900,false);
 assert.equal(await run("document.getElementById('scenario').value"),'thirty-twelve','Deep link');
 assert.equal(await run("document.querySelectorAll('#summaryBody tr').length"),2);
 assert.equal(await run("(()=>{document.getElementById('showAll').click();return document.getElementById('resultValue').textContent})()"),'k = 13');
 assert.equal(await run("(()=>{const e=document.getElementById('prediction');e.value='2';document.getElementById('reveal').click();return document.getElementById('predictionResult').textContent.includes('Верно.')})()"),true,'Factor 2 must limit 30!/12');
 const cases={
  'six-twelve':2,'ten-eighteen':2,'thirty-twelve':13,'six-fifteen':1,'ten-fifteen':2
 };
 for(const [key,expected] of Object.entries(cases)){
  await open('12.11.26-lab.html#'+key,390,844,false);
  assert.equal(await run("document.getElementById('scenario').value"),key);
  assert.equal(await run("(()=>{document.getElementById('showAll').click();return document.getElementById('resultValue').textContent})()"),'k = '+expected);
 }
 await open('index.html',1440,900,false);
 let title='';
 for(let i=0;i<100;i++){
  title=await run("document.getElementById('lesson-title')?.textContent||''");
  if(title.includes('Факториал'))break;
  await sleep(100);
 }
 assert.match(title,/Факториал/,'Published lesson must be latest');
 assert.equal(await run("document.getElementById('latestLessonCta')?.getAttribute('href')"),'12.11.26.html');
 await shot('xenia-20261112-dashboard');
 console.log('Browser QA PASS: lesson, laboratory, 5 scenarios, print, self-check, registry dashboard, mobile/dark and zero browser/network errors.');
}finally{
 try{ws?.close()}catch(_){}
 chrome.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(1500)]);
 await new Promise(resolve=>server.close(resolve));
 try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:25,retryDelay:100})}
 catch(error){console.warn('Chromium profile cleanup deferred to ephemeral CI runner:',error.code);}
}
