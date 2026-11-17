import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getLatestLesson,LESSONS} from '../lesson-registry.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(binary=>spawnSync('which',[binary],{encoding:'utf8'})).find(result=>result.status===0)?.stdout.trim();
assert.ok(chrome,'Chromium executable is required');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
  '.png':'image/png','.pdf':'application/pdf','.tex':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  try{
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(ROOT,'.'+relative);
    if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('Missing resource');return;
    }
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(error){res.writeHead(500);res.end(error.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/students/ekaterina/site/';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ekaterina-171126-review-'));
const shots=path.join(ROOT,'ekaterina-171126-review-artifacts');
fs.mkdirSync(shots,{recursive:true});
let chromiumStderr='';
const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0',
  '--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
child.stderr.on('data',chunk=>{chromiumStderr+=chunk.toString().slice(0,1200)});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map();let seq=0;
const errors=[],networkFailures=[];
try{
  let port=0;
  for(let i=0;i<130;i++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    assert.equal(child.exitCode,null,'Chromium exited during startup');await sleep(100);
  }
  assert.ok(port,'Chromium debugger did not start: '+chrome+' '+chromiumStderr.slice(-800));
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const tab=targets.find(t=>t.type==='page');assert.ok(tab);
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){const fn=pending.get(msg.id);pending.delete(msg.id);fn(msg);}
    if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params?.exceptionDetails?.text||'Uncaught JavaScript error');
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400){
      networkFailures.push(msg.params.response.status+' '+msg.params.response.url);
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  const wait=async expression=>{
    for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(80);}
    throw Error('Timed out waiting for '+expression);
  };
  const navigate=async(file,width,height)=>{
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=780});
    await call('Page.navigate',{url:base+file});
    await wait('document.readyState==="complete"&&location.pathname.endsWith('+JSON.stringify(file)+')');
    await sleep(70);
  };
  const screenshot=async(label,full=false)=>{
    const png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:full});
    fs.writeFileSync(path.join(shots,label+'.png'),Buffer.from(png.data,'base64'));
  };
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');

  for(const width of [360,390,768,1024,1440]){
    for(const dark of [false,true]){
      await navigate('17.11.26.html',width,width<=768?844:900);
      await evaluate('(()=>{const dark='+JSON.stringify(dark)+';const button=document.getElementById("themeButton");if((document.documentElement.dataset.theme==="dark")!==dark)button.click()})()');
      const inspection=await evaluate('(()=>{const doc=document.documentElement,button=document.getElementById("themeButton");const figs=[...document.querySelectorAll("main svg")];const math=[...document.querySelectorAll("main math")];const visibleMath=math.filter(m=>!m.closest("details:not([open])"));const outside=[...document.querySelectorAll("main h1,main h2,main p,main .figure,main .formula,main .exercise")].filter(x=>x.getBoundingClientRect().right>innerWidth+2||x.getBoundingClientRect().left< -2).map(x=>x.tagName+"."+(x.className||""));return {pageWidth:doc.scrollWidth,client:doc.clientWidth,theme:doc.dataset.theme,themePressed:button.getAttribute("aria-pressed"),tasks:document.querySelectorAll(".exercise").length,answers:document.querySelectorAll(".answer").length,math:math.length,invalidMath:math.filter(m=>m.namespaceURI!=="http://www.w3.org/1998/Math/MathML").length,hiddenMath:visibleMath.filter(m=>m.getBoundingClientRect().width<1||m.getBoundingClientRect().height<1).length,figures:figs.length,accessible:figs.every(f=>f.getAttribute("role")==="img"&&f.querySelector("title")&&f.querySelector("desc")),outside,missingAnchors:[...document.querySelectorAll("a[href^=\'#\']")].filter(a=>!document.getElementById(a.getAttribute("href").slice(1))).length}})()');
      assert.ok(inspection.pageWidth<=inspection.client+2,'Page overflow '+width+' '+JSON.stringify(inspection));
      assert.deepEqual(inspection.outside,[],'Escaping content '+width+' '+JSON.stringify(inspection));
      assert.equal(inspection.theme,dark?'dark':'light');
      assert.equal(inspection.themePressed,String(dark));
      assert.equal(inspection.tasks,10);assert.equal(inspection.answers,10);
      assert.ok(inspection.math>=22,'Missing semantic mathematics '+JSON.stringify(inspection));
      assert.equal(inspection.invalidMath,0);assert.equal(inspection.hiddenMath,0);
      assert.equal(inspection.figures,4);assert.equal(inspection.accessible,true);
      assert.equal(inspection.missingAnchors,0);
      if(width===390||width===1440){await screenshot('lesson-'+width+(dark?'-dark':'-light'));if(!dark)await screenshot('lesson-'+width+'-full',true);}
    }
  }
  await navigate('17.11.26.html',390,844);
  await evaluate('(()=>{document.querySelectorAll("input[data-exercise]").forEach(x=>{x.checked=false;x.dispatchEvent(new Event("change"))});document.querySelector("input[data-exercise=\'2\']").click();document.querySelector("input[data-exercise=\'7\']").click()})()');
  assert.equal(await evaluate('document.getElementById("progressStatus").textContent'),'Отмечено: 2 из 10');
  await call('Page.reload',{ignoreCache:true});await wait('document.readyState==="complete"');
  assert.equal(await evaluate('[...document.querySelectorAll("input[data-exercise]")].filter(x=>x.checked).length'),2,'Progress did not persist');
  await evaluate('(()=>{document.querySelector("#additional-k").open=true;document.querySelector("#factors .worked").open=true;})()');
  assert.ok(await evaluate('document.querySelector("#additional-k").textContent.includes("88°")'),'Missing supplementary source example');
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const printable=await evaluate('(()=>({nav:getComputedStyle(document.querySelector(".top nav")).display,actions:getComputedStyle(document.querySelector(".actions")).display,background:getComputedStyle(document.body).backgroundColor,figure:document.querySelector("#square .figure").getBoundingClientRect().height}))()');
  assert.equal(printable.nav,'none');assert.equal(printable.actions,'none');
  assert.ok(printable.figure>50,'Print must retain diagrams');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  await navigate('index.html',390,844);
  await wait('document.querySelector(".material-card time")?.getAttribute("datetime")==="2026-11-17"');
  const home=await evaluate('(()=>{const cards=[...document.querySelectorAll(".material-card")];const data=window.EKATERINA_COMPETENCY_DATA||{};return {latest:document.querySelector(".material-card time")?.getAttribute("datetime"),lessonLink:document.querySelector(".material-card a")?.getAttribute("href"),pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,evidence:data.evidence?.alg_roots_06?.href,map:document.querySelectorAll(".radial-cell").length,lessonCount:cards.length}})()');
  assert.equal(home.latest,getLatestLesson(LESSONS).date);
  assert.equal(home.lessonLink,'17.11.26.html');
  assert.equal(home.evidence,'17.11.26.html#roots');
  assert.ok(home.map>200,'Competency map not initialized');
  assert.ok(home.pageOverflow<=2,'Navigator overflow '+JSON.stringify(home));
  await screenshot('home-390');
  await navigate('index.html',1440,900);
  const desktop=await evaluate('(()=>({latest:document.querySelector(".material-card time")?.getAttribute("datetime"),pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}))()');
  assert.equal(desktop.latest,'2026-11-17');
  assert.ok(desktop.pageOverflow<=2,'Desktop navigator overflow '+JSON.stringify(desktop));
  await screenshot('home-1440');
  assert.deepEqual(errors,[],'Browser JS exceptions');
  assert.deepEqual(networkFailures,[],'Missing network resources');
  console.log('Ekaterina November 17 site review: 5 viewports, two themes, MathML, SVG, print, tasks, persistence and home integration passed.');
}finally{
  try{ws?.close();}catch{}
  if(child.exitCode===null)child.kill('SIGTERM');
  await new Promise(resolve=>server.close(resolve));
  await sleep(200);
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:6,retryDelay:250});}catch{}
}