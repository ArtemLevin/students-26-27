import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const pagePath=path.join(root,'students/sofya_kalney/site/20.11.26.html');
const html=fs.readFileSync(pagePath,'utf8');
assert.equal((html.match(/<li class="task">/g)||[]).length,10,'exactly ten exercises');
assert.equal((html.match(/data-task="\d+"/g)||[]).length,10,'ten progress controls');
for(const anchor of ['rules','examples','example-extension','example-midline','laboratory','practice']){
  assert.match(html,new RegExp('id="'+anchor+'"'),'required learning anchor: '+anchor);
}
for(const link of ['../pdf_docs/20.11.26.pdf','../tex_docs/20.11.26.tex']){
  assert.ok(fs.existsSync(path.resolve(path.dirname(pagePath),link)),'source material must exist: '+link);
}
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(binary=>spawnSync('which',[binary],{encoding:'utf8'}))
  .find(result=>result.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium/Chrome required for browser QA');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(error){res.writeHead(500);res.end('Internal error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sofya-20261120-'));
const artifacts=path.join(root,'sofya-20261120-review-artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const cp=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,seq=0;const pending=new Map(),bad=[],exceptions=[],consoleErrors=[];
try{
  let port=null;
  for(let t=0;t<150;t++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    if(cp.exitCode!==null)throw Error('Chrome unexpectedly exited');
    await sleep(100);
  }
  assert.ok(port,'DevTools port must exist');
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=targets.find(t=>t.type==='page');
  assert.ok(target,'DevTools page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}
    if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params?.exceptionDetails?.text||'JS exception');
    if(msg.method==='Runtime.consoleAPICalled'&&msg.params?.type==='error')consoleErrors.push(msg.params?.args?.map(x=>x.value).join(' '));
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)bad.push(msg.params.response.url+' '+msg.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async code=>{
    const result=await call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.text||'Runtime evaluate failed');
    return result.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  async function navigate(width,dark){
    bad.length=exceptions.length=consoleErrors.length=0;
    await call('Emulation.setDeviceMetricsOverride',{width,height:width<600?812:900,deviceScaleFactor:1,mobile:width<600});
    const url=origin+'/students/sofya_kalney/site/20.11.26.html';
    await call('Page.navigate',{url});
    let loaded=false;
    for(let k=0;k<110;k++){
      const state=await run('({ready:document.readyState,url:location.href})');
      if(state.ready==='complete'&&state.url.startsWith(url)){loaded=true;break;}
      await sleep(75);
    }
    assert.ok(loaded,'lesson loaded');
    await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
    await sleep(100);
    const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,title:document.title,svg:document.querySelectorAll("#geometry polygon").length})');
    assert.ok(m.scroll<=m.client+2,'overflow at '+width+': '+JSON.stringify(m));
    assert.ok(m.title.includes('София Кальней'),'lesson title');
    assert.ok(m.svg>=2,'geometry rendered');
    assert.equal(exceptions.length,0,'JS exceptions: '+JSON.stringify(exceptions));
    assert.equal(consoleErrors.length,0,'console errors: '+JSON.stringify(consoleErrors));
    assert.equal(bad.length,0,'HTTP failures: '+JSON.stringify(bad));
    return m;
  }
  for(const width of [375,390,768,1024,1366,1440]){
    await navigate(width,false);
    if(width===375||width===1440){
      const png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(artifacts,'sofya-'+width+'-light.png'),Buffer.from(png.data,'base64'));
      await navigate(width,true);
      const dark=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(artifacts,'sofya-'+width+'-dark.png'),Buffer.from(dark.data,'base64'));
    }
  }
  await navigate(1440,false);
  const value=async()=>Number((await run("document.getElementById('areaResult').textContent")).replace(',','.'));
  assert.ok(Math.abs((await value())-10/3)<.005,'initial extension area 10/3');
  assert.equal(await run("document.getElementById('segmentResult').textContent"),'1 / 3');
  await run("document.querySelector('[data-mode=\"midline\"]').click()");
  assert.equal(await run("document.getElementById('shareNWrap').hidden"),false,'midline control shown');
  assert.equal(await run("document.getElementById('shareRWrap').hidden"),true,'extension control hidden');
  assert.ok(Math.abs((await value())-15)<.005,'midline area 15');
  await run("(()=>{let e=document.getElementById('area');e.value='128';e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  assert.ok(Math.abs((await value())-30)<.005,'midline area 30 when total 128');
  await run("document.getElementById('reset').click()");
  assert.ok(Math.abs((await value())-15)<.005,'reset midline area');
  await run("document.querySelector('[data-mode=\"extension\"]').click()");
  assert.ok(Math.abs((await value())-10/3)<.005,'extension restored');
  await run("document.querySelector('[data-task=\"1\"]').click()");
  assert.equal(await run('document.getElementById("progress").value'),1,'progress increments');
  await navigate(1440,false);
  assert.equal(await run('document.getElementById("progress").value'),1,'progress persists');
  await run('document.getElementById("themeBtn").click()');
  assert.equal(await run('document.documentElement.dataset.theme'),'dark','theme toggle');
  console.log('PASS Sofia 20.11.26: source integrity, responsive 375–1440, light/dark, browser console/network, geometry, parametric ratios, answers, reset, localStorage');
}finally{
  try{ws?.close();}catch(_){}
  cp.kill('SIGKILL');
  await new Promise(resolve=>server.close(resolve));
  await sleep(250);
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}catch(_){}
}
