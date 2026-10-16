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
  for(const [w,h] of [[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]]){
    await navigate('15.10.26.html',w,h,false);
    await navigate('15.10.26.html',w,h,true);
    const result=await run("(()=>{const all=[...document.querySelectorAll('math')];const visible=all.filter(el=>el.getClientRects().length);const bad=visible.filter(el=>el.getBoundingClientRect().height<4);return {total:all.length,visible:visible.length,bad:bad.length,semantic:all.every(el=>el.namespaceURI==='http://www.w3.org/1998/Math/MathML')}})()");
    assert.ok(result.total>=100,'MathML count '+JSON.stringify(result));
    assert.ok(result.visible>=85,'Too few visible mathematics '+JSON.stringify(result));
    assert.equal(result.bad,0,'Mathematics did not render');
    assert.equal(result.semantic,true,'Non-semantic mathematics markup');
  }
  await navigate('15.10.26.html',1440,900,false);
  assert.equal(await run("document.querySelectorAll('li.task math').length>=30"),true);
  assert.equal(await run("document.querySelectorAll('.formula-grid math').length"),12);
  assert.equal(await run("document.querySelectorAll('math mfrac').length>=45"),true);
  assert.equal(await run("document.querySelectorAll('math msup').length>=5"),true);
  assert.equal(await run("document.querySelectorAll('math msub').length>=2"),true);
  assert.equal(await run("(()=>{document.querySelector('#nextStep').click();return document.querySelector('#stepCount').textContent})()"),'2 / 4');
  assert.equal(await run("(()=>{document.querySelector('#resetSteps').click();return document.querySelector('#stepCount').textContent})()"),'1 / 4');
  assert.equal(await run("(()=>{document.querySelector('[data-task=\"1\"]').click();return document.querySelector('#progressText').textContent})()"),'Выполнено 1 из 10');
  assert.equal(await run("(()=>{const d=document.querySelector('.task details');d.open=true;return !!d.querySelector('.answer math')})()"),true);
  assert.equal(await run("(()=>{document.querySelector('#themeButton').click();return document.documentElement.dataset.theme})()"),'dark');
  await snapshot('lesson-20261015-desktop-dark-mathml');
  await navigate('15.10.26.html',375,812,true);
  await snapshot('lesson-20261015-mobile-dark-mathml');
  assert.deepEqual(jsErrors,[],'JavaScript errors');
  assert.deepEqual(badRequests,[],'Network errors');
  console.log('MathML browser QA PASS: 7 viewports × 2 themes, semantic formulas, interactive checks');
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