import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
assert.ok(chrome,'Chromium is required for Anna browser review');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json','.png':'image/png','.pdf':'application/pdf','.tex':'text/plain; charset=utf-8'};
const errors=[],failed=[];
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('Missing file');return;
    }
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/students/anna_bannova/site/';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'anna-review-'));
const artifacts=path.join(root,'anna-review-20261023-artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',
  '--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
let ws,serial=0;const pending=new Map();
try{
  let port=0;
  for(let i=0;i<160;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
    assert.equal(chromeProcess.exitCode,null,'Chrome terminated during startup');
    await sleep(90);
  }
  assert.ok(port,'No Chrome DevTools port');
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const page=tabs.find(t=>t.type==='page');
  assert.ok(page,'No Chrome page');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text);
    if(m.method==='Log.entryAdded'&&m.params.entry?.level==='error')errors.push(m.params.entry.text);
    if(m.method==='Network.responseReceived'&&m.params.response?.status>=400)
      failed.push(m.params.response.status+' '+m.params.response.url);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  const wait=async expression=>{
    for(let i=0;i<130;i++){if(await run(expression))return;await sleep(90);}
    throw Error('Timed out waiting for '+expression);
  };
  const screenshot=async name=>{
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');await call('Log.enable');
  async function navigate(file,width,height){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<800});
    await call('Page.navigate',{url:base+file});
    await wait('location.pathname.endsWith('+JSON.stringify(file)+')&&document.readyState==="complete"');
    await sleep(180);
  }
  for(const [width,height] of [[320,760],[375,812],[768,1024],[1024,768],[1440,900]]){
    for(const dark of [false,true]){
      await navigate('23.10.26.html',width,height);
      await run("(()=>{const wanted="+JSON.stringify(dark?'dark':'light')+";if(document.documentElement.dataset.theme!==wanted)document.getElementById('theme').click()})()");
      const state=await run("(()=>{const d=document.documentElement,math=[...document.querySelectorAll('main math')],ns='http://www.w3.org/1998/Math/MathML';const visible=math.filter(x=>!x.closest('[hidden]'));const graphs=[...document.querySelectorAll('svg.plot')];return {width:d.clientWidth,scroll:d.scrollWidth,theme:d.dataset.theme,math:math.length,badMath:math.filter(x=>x.namespaceURI!==ns||[...x.querySelectorAll('*')].some(c=>c.namespaceURI!==ns)).length,unrendered:visible.filter(x=>!x.getClientRects().length||x.getBoundingClientRect().height<1||x.getBoundingClientRect().width<1).length,plots:graphs.length,invalidPlots:graphs.filter(x=>x.getAttribute('role')!=='img'||!x.querySelector('title')||!x.querySelector('desc')).length,oversizedPlots:graphs.filter(x=>x.getBoundingClientRect().right>innerWidth+2||x.getBoundingClientRect().left< -2).length,points:document.querySelectorAll('svg .point').length,steps:document.querySelectorAll('#steps li:not([hidden])').length,tasks:document.querySelectorAll('.task').length,brokenAnchors:[...document.querySelectorAll('a[href^=\"#\"]')].filter(x=>!document.getElementById(x.hash.slice(1))).length}})()");
      assert.equal(state.theme,dark?'dark':'light');
      assert.ok(state.math>=45,'MathML count '+JSON.stringify(state));
      assert.equal(state.badMath,0,'MathML namespace '+JSON.stringify(state));
      assert.equal(state.unrendered,0,'MathML rendered '+JSON.stringify(state));
      assert.equal(state.plots,4);assert.equal(state.invalidPlots,0);
      assert.equal(state.oversizedPlots,0);assert.equal(state.points,8);
      assert.equal(state.steps,1);assert.equal(state.tasks,2);assert.equal(state.brokenAnchors,0);
      assert.ok(state.scroll<=state.width+2,'Horizontal overflow '+width+': '+JSON.stringify(state));
      if([375,1440].includes(width))await screenshot('lesson-'+width+(dark?'-dark':'-light'));
    }
  }
  await navigate('23.10.26.html',375,812);
  assert.equal(await run("document.querySelectorAll('#steps li:not([hidden])').length"),1);
  await run("document.getElementById('next').click()");
  assert.equal(await run("document.querySelectorAll('#steps li:not([hidden])').length"),2);
  assert.equal(await run("document.querySelectorAll('#steps li[aria-current=step]').length"),1);
  await run("document.getElementById('prev').click()");
  assert.equal(await run("document.querySelectorAll('#steps li:not([hidden])').length"),1);
  for(let n=0;n<5;n++)await run("document.getElementById('next').click()");
  assert.equal(await run("document.querySelectorAll('#steps li:not([hidden])').length"),6);
  assert.equal(await run("document.getElementById('next').disabled"),true);
  await run("document.getElementById('reset').click()");
  assert.equal(await run("document.querySelectorAll('#steps li:not([hidden])').length"),1);
  const a=await run("(()=>{const b=document.getElementById('showAnswers'),x=document.getElementById('answerList');const before=x.hidden;b.click();const open=!x.hidden&&b.getAttribute('aria-expanded')==='true';b.click();return {before,open,closed:x.hidden&&b.getAttribute('aria-expanded')==='false'}})()");
  assert.equal(a.before,true);assert.equal(a.open,true);assert.equal(a.closed,true);
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const print=await run("({nav:getComputedStyle(document.querySelector('.top')).display,answers:getComputedStyle(document.getElementById('answerList')).display})");
  assert.equal(print.nav,'none');assert.notEqual(print.answers,'none');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  for(const [width,height] of [[375,812],[1440,900]]){
    await navigate('index.html',width,height);
    await wait("document.getElementById('latestLink').getAttribute('href')==='23.10.26.html'");
    const h=await run("({href:document.getElementById('latestLink').getAttribute('href'),cells:document.querySelectorAll('svg .cell').length,errors:document.getElementById('dataError').hidden,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})");
    assert.equal(h.href,'23.10.26.html');assert.ok(h.cells>300,'Heatmap '+JSON.stringify(h));
    assert.equal(h.errors,true);assert.ok(h.scroll<=h.client+2,'Navigator overflow '+JSON.stringify(h));
    await screenshot('home-'+width);
  }
  await navigate('11.10.26-lab.html',375,812);
  assert.ok(await run("document.querySelectorAll('input[type=range]').length>0"),'Previous linked laboratory opens');
  assert.deepEqual(errors,[],'Browser console/runtime');
  assert.deepEqual(failed,[],'Network errors');
  console.log('ANNA 23.10.26 BROWSER RELEASE GATE PASS');
}finally{
  try{ws?.close()}catch{}
  chromeProcess.kill('SIGTERM');
  server.close();
  fs.rmSync(profile,{recursive:true,force:true});
}
