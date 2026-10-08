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
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xenia-browser-'));
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
  const screenshotDir=path.join(root,'xenia-browser-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/xenia_vasilchenko/site/'+name;
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
  for(const [w,h] of [[375,812],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]]){
    for(const page of ['08.10.26.html','08.10.26-lab.html','index.html']){
      await navigate(page,w,h,false);await navigate(page,w,h,true);
    }
  }
  await navigate('08.10.26.html',1440,900);
  assert.equal(await run("(()=>{document.querySelector('[data-guess=c]').click();return document.querySelector('#quizFeedback').textContent.includes('Верно')})()"),true);
  assert.equal(await run("(()=>{document.querySelector('#skills input').click();return document.querySelector('#skillProgress').textContent.includes('1 из 4')})()"),true);
  assert.equal(await run("(()=>{document.querySelector('#themeToggle').click();return document.documentElement.dataset.theme})()"),'dark');
  await snapshot('lesson-desktop');
  await navigate('08.10.26-lab.html?mode=time',1440,900);
  assert.equal(await run("document.querySelector('#timeCompare').textContent"),'Вторая величина больше');
  assert.equal(await run("(()=>{const a=document.querySelector('#fractionA'),b=document.querySelector('#fractionB');a.value='2';b.value='3';a.dispatchEvent(new Event('change',{bubbles:true}));return document.querySelector('#timeExplain').textContent.includes('33 с > 32 с')})()"),true);
  assert.equal(await run("(()=>{document.querySelector('#timeSwap').click();return document.querySelector('#timeCompare').textContent})()"),'Вторая величина больше');
  await snapshot('lab-time');
  assert.equal(await run("(()=>{document.querySelector('[data-mode=work]').click();return !document.querySelector('#workMode').hidden})()"),true);
  assert.equal(await run("document.querySelector('#workCompare').textContent"),'Второй выполнил больше');
  assert.equal(await run("(()=>{document.querySelector('#workEqual').click();return document.querySelector('#workCompare').textContent})()"),'Выполнены равные доли');
  assert.equal(await run("(()=>{const a=document.querySelector('#tA');a.value='0';a.dispatchEvent(new Event('input',{bubbles:true}));return document.querySelector('#workFractionA').textContent})()"),'0 заказа');
  await snapshot('lab-work');
  await navigate('08.10.26-lab.html?mode=work',375,812);
  assert.equal(await run("document.querySelector('#workMode').hidden"),false);
  await snapshot('lab-work-mobile');
  assert.deepEqual(jsErrors,[],'JavaScript errors');
  assert.deepEqual(badRequests,[],'Network errors');
  console.log('Browser QA PASS: 6 viewports × 3 pages × 2 themes + interactive checks');
}finally{
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');server.close();
  fs.rmSync(profile,{recursive:true,force:true});
}