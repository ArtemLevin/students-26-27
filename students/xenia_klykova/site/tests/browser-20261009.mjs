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
'--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','pipe','pipe']});
let chromeLog='';for(const stream of [chromeProcess.stdout,chromeProcess.stderr])stream.on('data',chunk=>{chromeLog=(chromeLog+chunk.toString()).slice(-12000)});
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
  if(!port)throw Error('DevTools port unavailable; chrome='+chrome+' exited='+chromeProcess.exitCode+' output='+chromeLog);
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
  const screenshotDir=path.join(root,'xenia-site-review-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/xenia_klykova/site/'+name;
    await call('Page.navigate',{url});
    let result;
    for(let i=0;i<150;i++){
      result=await run('({url:location.href,ready:document.readyState})');
      if(result.url.startsWith(url)&&result.ready==='complete')break;
      if(i===149)throw Error('Page did not load: '+name+' '+JSON.stringify(result));
      await sleep(70);
    }
    await sleep(140);
    await run((name==="index.html"?"document.body.dataset.theme=":"document.documentElement.dataset.theme=")+"'"+(dark?"dark":"light")+"'");
    const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(m.scroll<=m.client+2,name+' '+width+' '+(dark?'dark':'light')+
      ' horizontal overflow '+JSON.stringify(m));
  }
  async function snapshot(filename){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshotDir,filename+'.png'),Buffer.from(shot.data,'base64'));
  }
  for(const [w,h] of [[1440,900],[390,844],[375,812]]){
    for(const page of ['09.10.26.html','09.10.26-lab.html','index.html']){
      await navigate(page,w,h,false);
      await snapshot(page.replace('.html','')+'-'+w+'-light');
      await navigate(page,w,h,true);
      await snapshot(page.replace('.html','')+'-'+w+'-dark');
    }
  }
  await navigate('09.10.26.html',1440,900);
  assert.equal(await run("(()=>{document.querySelector('#checks input').click();return document.querySelector('#progressText').textContent})()"),'1 из 5');
  assert.equal(await run("(()=>{document.querySelector('#answers').open=true;return document.querySelectorAll('#answers li').length})()"),10);
  assert.equal(await run("document.querySelector('a[href=\"09.10.26-lab.html\"]')!==null"),true);
  assert.equal(await run("document.querySelector('img.poster').getAttribute('src')"),'../images/09.10.26.png');
  await navigate('09.10.26-lab.html',1440,900);
  const testTime=async value=>run("(()=>{const slider=document.querySelector('#time');slider.value='"+value+"';slider.dispatchEvent(new Event('input',{bubbles:true}));return [document.querySelector('#timeValue').textContent,document.querySelector('#heightValue').textContent,document.querySelector('#status').textContent]})()");
  let r=await testTime('0');assert.ok(r[1].startsWith('2 м'),JSON.stringify(r));
  r=await testTime('1.4');assert.ok(r[1].startsWith('11,8 м')&&r[2].includes('Выше 10 м'),JSON.stringify(r));
  r=await testTime('2');assert.ok(r[1].startsWith('10 м')&&r[2].includes('На границе'),JSON.stringify(r));
  r=await testTime('2.8');assert.ok(r[1].startsWith('2 м'),JSON.stringify(r));
  assert.equal(await run("(()=>{document.querySelector('#reset').click();return document.querySelector('#timeValue').textContent})()"),'0,8 с');
  assert.ok((await run("(()=>{document.querySelector('#same').click();return document.querySelector('#feedback').textContent})()")).includes('Верно'));
  assert.equal(await run("(()=>{const e=document.querySelector('#time');e.focus();return document.activeElement===e})()"),true);
  await navigate('index.html',1440,900);
  await sleep(400);
  assert.equal(await run("document.querySelector('#lesson-title').textContent"),'Сначала смысл, потом вычисления');
  assert.equal(await run("document.querySelector('#latestLessonCta').getAttribute('href')"),'09.10.26.html');
  assert.equal(await run("document.querySelector('#latestPdfLink').getAttribute('href')"),'../pdf_docs/09.10.26.pdf');
  assert.equal(await run("document.querySelector('#latestTexLink').getAttribute('href')"),'../tex_docs/09.10.26.tex');
  assert.equal(await run("document.querySelectorAll('#recentLessons a').length"),3);
  assert.deepEqual(jsErrors,[],'JavaScript exceptions');
  assert.deepEqual(badRequests,[],'Network errors');
  console.log('Xenia 09.10 browser QA PASS: 18 layouts (3 viewports x 3 pages x 2 themes), interactive checks and network');
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