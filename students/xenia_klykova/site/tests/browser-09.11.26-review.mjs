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
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xenia-0911-review-'));
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
 const dir=path.join(repo,'xenia-site-review-artifacts');
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
  assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,
   'Horizontal overflow '+name+' '+width+' '+(dark?'dark':'light')+' '+JSON.stringify(metrics));
  assert.deepEqual(failed,[],'HTTP failures '+name+' '+width);
  assert.deepEqual(exceptions,[],'Browser exceptions '+name+' '+width);
  return url;
 }
 for(const name of ['09.11.26.html','09.11.26-lab.html']){
  for(const [width,height] of [[1440,900],[390,844],[320,740]]){
   for(const dark of [false,true]){
    await open(name,width,height,dark);
    const theme=await run('document.documentElement.dataset.theme');
    assert.equal(theme,dark?'dark':'light');
    const idsUnique=await run('(()=>{const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.length===new Set(ids).size})()');
    assert.ok(idsUnique,name+' duplicate element ids');
    if(width===1440||width===390)await shot(
      name.replace('.html','')+'-'+width+'-'+(dark?'dark':'light'));
   }
  }
 }
 await open('09.11.26.html',1440,900,false);
 const tasks=await run("document.querySelectorAll('article.task').length");
 assert.equal(tasks,10,'10 full-length training tasks');
 const math=await run("document.querySelectorAll('math').length");
 assert.ok(math>=2,'MathML source definitions must exist');
 assert.equal(await run("(()=>{dispatchEvent(new Event('beforeprint'));return [...document.querySelectorAll('.task details')].every(x=>x.open)})()"),true,'Print answers must open');
 assert.equal(await run("(()=>{dispatchEvent(new Event('afterprint'));return [...document.querySelectorAll('.task details')].every(x=>!x.open)})()"),true,'Print restores closed answers');
 await open('09.11.26-lab.html#limits',1440,900,false);
 assert.equal(await run("document.getElementById('scenario').value"),'limits','Deep link must select limit model');
 assert.ok((await run('window.scrollY'))<140,'Deep link must keep controls reachable');
 assert.equal(await run("document.querySelectorAll('#history tr').length"),3,'Limit has three annual periods');
 await open('09.11.26-lab.html#total',390,844,false);
 assert.equal(await run("document.getElementById('scenario').value"),'total','Total debt mode');
 const value36=await run("document.getElementById('totalValue').textContent");
 assert.match(value36,/48,96/);
 assert.equal(await run("(()=>{const e=document.querySelector('#amountSelect');e.value='37';e.dispatchEvent(new Event('change',{bubbles:true}));return document.getElementById('totalValue').textContent})()"),'50,32 млн руб.');
 const final=await run("(()=>{const e=document.getElementById('period');e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}));return {v:document.getElementById('endValue').textContent,next:document.getElementById('next').disabled}})()");
 assert.equal(final.v,'0');assert.equal(final.next,true);
 assert.equal(await run("(()=>{document.getElementById('reset').click();return document.getElementById('period').value})()"),'1');
 await open('09.11.26-lab.html#months',390,844,false);
 assert.equal(await run("document.querySelectorAll('#history tr').length"),6,'Monthly case needs six monthly periods');
 assert.match(await run("document.getElementById('overValue').textContent"),/22,5%/);
 await open('index.html',1440,900,false);
 let title='';
 for(let i=0;i<80;i++){
  title=await run("document.getElementById('lesson-title')?.textContent||''");
  if(title.includes('Кредит:'))break;
  await sleep(100);
 }
 assert.match(title,/Кредит:/,'Dashboard latest lesson not updated');
 const href=await run("document.getElementById('latestLessonCta')?.getAttribute('href')");
 assert.match(href||'',/09\.11\.26\.html/);
 await shot('klykova-home-desktop');
 await open('index.html',390,844,false);
 await shot('klykova-home-mobile');
 console.log('Browser release gate passed: lesson, lab, home, responsive themes, deep links, modes, print, math, console and network.');
}finally{
 try{ws?.close()}catch(_){}
 chrome.kill('SIGTERM');
 await new Promise(resolve=>server.close(resolve));
 fs.rmSync(profile,{recursive:true,force:true});
}
