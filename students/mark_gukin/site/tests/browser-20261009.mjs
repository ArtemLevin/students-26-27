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
if(!chrome)throw Error('Chromium/Chrome is required for browser QA');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
'.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try {
    const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  }catch(_){res.writeHead(500);res.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mark-browser-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
'--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map();let serial=0;const jsErrors=[],badRequests=[];
try{
  let port=0;
  for(let i=0;i<150;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
    if(chromeProcess.exitCode!==null)throw Error('Chrome terminated');
    await sleep(100);
  }
  if(!port)throw Error('DevTools port unavailable');
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(x=>x.type==='page');
  assert.ok(target,'Page target missing');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){
      const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg);
    }
    if(msg.method==='Runtime.exceptionThrown')jsErrors.push(
      msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)
      badRequests.push(msg.params.response.url+': '+msg.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const out=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(out.exceptionDetails)throw Error(out.exceptionDetails.exception?.description||out.exceptionDetails.text);
    return out.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const screenshotDir=path.join(root,'mark-browser-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/mark_gukin/site/'+name;
    await call('Page.navigate',{url});
    let result;
    for(let i=0;i<150;i++){
      result=await run('({url:location.href,ready:document.readyState})');
      if(result.url.startsWith(url)&&result.ready==='complete')break;
      if(i===149)throw Error('Page did not load: '+name+' '+JSON.stringify(result));
      await sleep(70);
    }
    await sleep(140);
    await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
    const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(m.scroll<=m.client+2,name+' '+width+' '+(dark?'dark':'light')+
      ' horizontal overflow '+JSON.stringify(m));
  }
  async function snapshot(filename){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshotDir,filename+'.png'),Buffer.from(shot.data,'base64'));
  }

  const sizes=[[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
  for(const [w,h] of sizes){
    for(const page of ['09.10.26.html','index.html']){
      await navigate(page,w,h,false);
      await navigate(page,w,h,true);
    }
  }
  await navigate('09.10.26.html',1440,900,false);
  assert.equal(await run("document.querySelectorAll('[data-step]').length"),4,'Stepper tabs');
  assert.equal(await run("document.querySelectorAll('[data-task]').length"),10,'Training count');
  assert.equal(await run("document.querySelector('#stepPanel').getAttribute('aria-labelledby')"),'stepTab0');
  assert.equal(await run("(()=>{document.getElementById('stepTab2').click();return document.querySelector('#stepPanel').getAttribute('aria-labelledby')})()"),'stepTab2');
  assert.equal(await run("document.querySelector('#stepPanel').textContent.includes('Шаг 03')"),true);
  assert.equal(await run("(()=>{const e=new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true});document.getElementById('stepTab2').dispatchEvent(e);return document.querySelector('#stepPanel').getAttribute('aria-labelledby')})()"),'stepTab3');
  assert.equal(await run("(()=>{document.querySelector('#themeToggle').click();return document.documentElement.dataset.theme})()"),'dark','theme switch');
  assert.equal(await run("(()=>{document.querySelector('[data-task=\"1\"]').click();return document.querySelector('#taskCounter').textContent})()"),'1 из 10 выполнено','progress');
  const firstOrigin=await run("location.origin");
  await call('Page.reload',{ignoreCache:true});await sleep(250);
  assert.equal(await run("document.querySelector('[data-task=\"1\"]').checked"),true,'progress persistence');
  assert.equal(await run("document.documentElement.dataset.theme"),'dark','theme persistence');
  assert.equal(await run("(()=>{document.querySelector('#resetTasks').click();return document.querySelector('#taskCounter').textContent})()"),'0 из 10 выполнено','reset');
  await snapshot('lesson-desktop-dark');
  await navigate('09.10.26.html',390,844,false);
  await snapshot('lesson-mobile-light');
  await navigate('09.10.26.html',1440,900,true);
  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await run("getComputedStyle(document.querySelector('.print-algorithm')).display !== 'none'"),true,'printed full algorithm');
  assert.equal(await run("getComputedStyle(document.querySelector('.steps')).display"),'none','interactive stepper hidden in print');
  assert.equal(await run("getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()"),'#fff','print background from dark theme');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  await navigate('index.html',390,844,false);
  assert.equal(await run("document.querySelector('#lessonTitle').textContent.includes('Показательные')"),true,'latest lesson on home');
  assert.equal(await run("document.querySelector('#lessonJournal').textContent.includes('04.10.2026')"),true,'history retained');
  await snapshot('home-mobile-light');
  const requests=await run("Promise.all(['../pdf_docs/09.10.26.pdf','../tex_docs/09.10.26.tex','../images/09.10.26.png'].map(async u=>({u,status:(await fetch(u)).status})))");
  assert.ok(requests.every(x=>x.status===200),'lesson materials: '+JSON.stringify(requests));
  await navigate('09.10.26.html#inequality',390,844,false);
  await sleep(170);
  const anchorTop=await run("Math.round(document.getElementById('inequality').getBoundingClientRect().top)");
  assert.ok(anchorTop>=30,'sticky nav obscures evidence anchor: '+anchorTop);
  assert.deepEqual(jsErrors,[],'Browser JavaScript exceptions');
  assert.deepEqual(badRequests,[],'Browser network failures');
  console.log('Mark review browser PASS: seven viewports x two pages x two themes, stepper, keyboard, persistence, print, links, anchors');
}finally{
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');server.close();
  if(chromeProcess.exitCode===null){
    await new Promise(resolve=>{
      const timeout=setTimeout(resolve,2500);
      chromeProcess.once('exit',()=>{clearTimeout(timeout);resolve();});
    });
  }
  try{
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:15,retryDelay:100});
  }catch(error){
    if(error.code!=='ENOTEMPTY'&&error.code!=='EBUSY')throw error;
    console.warn('Chromium profile cleanup deferred to ephemeral CI runner');
  }
}