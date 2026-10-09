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
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sofya-review-'));
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
  const screenshotDir=path.join(root,'sofya-review-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/sofya_kalney/site/'+name;
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
  for(const [w,h] of [[320,760],[390,844],[768,1024],[1024,768],[1440,900]]){
    for(const name of ['09.10.26.html','index.html']){
      await navigate(name,w,h,false);
      await navigate(name,w,h,true);
    }
  }
  await navigate('09.10.26.html',1440,900);
  assert.ok(await run("document.querySelectorAll('math').length>=30"),'Use semantic MathML for formulas');
  assert.equal(await run("document.querySelectorAll('svg[role=img]').length"),4);
  const tests=[
    ['10','1:9','19:1'],['25','1:3','7:1'],
    ['40','2:3','4:1'],['60','3:2','7:3'],['90','9:1','11:9']
  ];
  for(const [position,expectedAK,expectedBJ] of tests){
    const output=await run("(()=>{const el=document.querySelector('#pointRange');el.value='"+position+"';el.dispatchEvent(new Event('input',{bubbles:true}));let p=document.querySelector('#parallelLine').getAttribute('d');const c=p.match(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);return {ak:document.querySelector('#akRatio').textContent,bj:document.querySelector('#bjRatio').textContent,desc:document.querySelector('#thalesDesc').textContent,coordinates:c?.slice(1).map(Number)}})()");
    assert.equal(output.ak,expectedAK);
    assert.equal(output.bj,expectedBJ);
    assert.ok(output.desc.includes(expectedAK)&&output.desc.includes(expectedBJ),'Stale screen-reader description');
    const [kx,ky,jx,jy]=output.coordinates||[];
    assert.ok(Number.isFinite(kx)&&Math.abs((jx-kx)*258-(jy-ky)*390)<0.01,'Nonparallel line');
  }
  assert.equal(await run("(()=>{document.querySelector('[data-position=\"25\"]').click();return document.querySelector('[data-position=\"25\"]').getAttribute('aria-pressed')+';'+document.querySelector('#bjRatio').textContent})()"),'true;7:1');
  assert.equal(await run("(()=>{document.querySelector('#themeToggle').click();return document.documentElement.dataset.theme})()"),'dark');
  assert.equal(await run("(()=>{const el=document.querySelector('.smalltask details');el.querySelector('summary').click();return el.open})()"),true);
  await snapshot('sofya-lesson-desktop');
  await navigate('09.10.26.html',390,844,true);
  await snapshot('sofya-lesson-mobile-dark');
  await navigate('index.html',390,844);
  await sleep(400);
  assert.equal(await run("document.querySelector('#lesson-title')?.textContent.includes('Высоты, касательные')"),true,'New lesson not shown in dashboard');
  await snapshot('sofya-index-mobile');
  await navigate('index.html',1440,900);
  await sleep(400);
  assert.equal(await run("document.querySelector('a[href^=\"09.10.26.html\"]')!==null"),true,'No lesson navigation link');
  await snapshot('sofya-index-desktop');
  assert.deepEqual(jsErrors,[],'JavaScript errors');
  assert.deepEqual(badRequests,[],'Network errors');
  console.log('Browser QA PASS: 5 viewports × 2 pages × 2 themes + interactive checks');
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