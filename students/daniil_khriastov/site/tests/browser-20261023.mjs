import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium/Chrome is required for Daniil browser QA');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.pdf':'application/pdf','.tex':'text/plain'};
const errors=[],badRequests=[];
const server=http.createServer((req,res)=>{
  try{
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(500);res.end('Request error');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'daniil-browser-'));
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-zygote','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const artifact=path.join(root,'daniil-site-review-artifacts');
let ws;
try{
  let port=0;
  for(let tries=0;tries<150;tries++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    if(browser.exitCode!==null)throw Error('Chromium exited early');
    await pause(100);
  }
  if(!port)throw Error('DevToolsActivePort unavailable');
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(x=>x.type==='page');
  assert.ok(target,'Chromium did not expose a page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  let serial=0;const pending=new Map();
  ws.onmessage=ev=>{
    const msg=JSON.parse(ev.data);
    if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}
    if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)
      badRequests.push(msg.params.response.url+': '+msg.params.response.status);
  };
  const call=(method,params={})=>new Promise((ok,fail)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?fail(Error(msg.error.message)):ok(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  async function navigate(width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/daniil_khriastov/site/23.10.26.html';
    await call('Page.navigate',{url});
    for(let i=0;i<150;i++){
      const state=await run('({href:location.href,ready:document.readyState})');
      if(state.href.startsWith(url)&&state.ready==='complete')break;
      if(i===149)throw Error('Lesson failed to load');
      await pause(70);
    }
    await pause(150);
    const theme=await run("(()=>{const wanted='"+(dark?'dark':'light')+"';if(document.documentElement.dataset.theme!==wanted)document.querySelector('#themeToggle').click();return {actual:document.documentElement.dataset.theme,label:document.querySelector('#themeToggle').textContent}})()");
    assert.equal(theme.actual,dark?'dark':'light');
    assert.equal(theme.label,dark?'Светлая тема':'Тёмная тема');
    const view=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    const offenders=view.scroll>view.client+2 ? await run("[...document.body.querySelectorAll('*')].filter(el=>{const x=el.getBoundingClientRect();return x.right>document.documentElement.clientWidth+2}).slice(0,18).map(el=>({tag:el.localName,id:el.id,cls:typeof el.className==='string'?el.className.slice(0,45):'',left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right),parent:el.parentElement?.localName,parentCls:typeof el.parentElement?.className==='string'?el.parentElement.className.slice(0,30):''}))") : [];
    assert.ok(view.scroll<=view.client+2,'Horizontal overflow '+width+'x'+height+' theme '+(dark?'dark':'light')+': '+JSON.stringify({view,offenders}));
  }
  const sizes=[[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
  for(const [w,h] of sizes)for(const dark of [false,true])await navigate(w,h,dark);
  await navigate(1440,900,false);
  const formulas=await run("({math:document.querySelectorAll('main math').length,namespace:[...document.querySelectorAll('main math')].every(m=>m.namespaceURI==='http://www.w3.org/1998/Math/MathML'),tasks:document.querySelectorAll('.tasks li').length,answers:document.querySelectorAll('.answer-row').length})");
  assert.ok(formulas.math>=50,'Expected at least 50 MathML expressions: '+JSON.stringify(formulas));
  assert.equal(formulas.namespace,true,'MathML namespace');
  assert.equal(formulas.tasks,10);
  assert.equal(formulas.answers,10);
  assert.equal(await run("document.querySelector('details.answer').open"),false);
  assert.equal(await run("(()=>{document.querySelector('details.answer summary').click();return document.querySelector('details.answer').open})()"),true);
  const themeState=await run("(()=>{document.querySelector('#themeToggle').click();return [document.documentElement.dataset.theme,document.querySelector('#themeToggle').getAttribute('aria-pressed')]})()");
  assert.deepEqual(themeState,['dark','true']);
  const experimental=await run("(()=>{const m=document.getElementById('powerM');const n=document.getElementById('powerN');m.value='-1';n.value='2';m.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('input',{bubbles:true}));return {m:document.getElementById('mOut').textContent,n:document.getElementById('nOut').textContent,product:document.getElementById('powerMath').textContent,plus:document.getElementById('multiplyMath').textContent,negativeSigns:document.getElementById('powerMath').querySelectorAll('mo').length}})()");
  assert.equal(experimental.m,'-1');
  assert.equal(experimental.n,'2');
  assert.ok(experimental.product.includes('−')||experimental.product.includes('-'),'Negative exponent absent');
  assert.ok(experimental.negativeSigns>=1,'Expected MathML operator signs');
  assert.equal(await run("(()=>{document.querySelector('#resetExperiment').click();return [document.querySelector('#base').value,document.querySelector('#powerM').value,document.querySelector('#powerN').value]})()").then(x=>JSON.stringify(x)),JSON.stringify(['2','2','3']));
  assert.ok((await run("(()=>{document.querySelector('[data-answer=right]').click();return document.querySelector('#choiceFeedback').textContent})()")).startsWith('Верно'));
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const print=await run("({background:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),main:!!document.querySelector('main'),answers:document.querySelector('details.answer').open})");
  assert.equal(print.background,'#fff');
  assert.equal(print.main,true);
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  fs.mkdirSync(artifact,{recursive:true});
  for(const [w,h,dark,file] of [[1440,900,false,'desktop-light'],[390,844,false,'mobile-light'],[1440,900,true,'desktop-dark'],[390,844,true,'mobile-dark']]){
    await navigate(w,h,dark);
    const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(artifact,file+'.png'),Buffer.from(image.data,'base64'));
  }
  assert.deepEqual(errors,[],'JavaScript exceptions');
  assert.deepEqual(badRequests,[],'Network 4xx/5xx errors');
  console.log('Daniil 23.10.26 browser QA PASS: 7 sizes, 2 themes, MathML, model, print, links, screenshots');
}finally{
  try{ws?.close();}catch{}
  browser.kill('SIGTERM');
  server.close();
  fs.rmSync(profile,{force:true,recursive:true});
}
