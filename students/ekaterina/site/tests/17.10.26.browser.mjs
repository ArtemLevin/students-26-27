import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(r=>r.status===0)?.stdout.trim();
assert.ok(chrome,'Chromium is required for Ekaterina lesson browser QA');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json',
  '.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.tex':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  try{
    const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=path.resolve(ROOT,'.'+requested);
    if(!target.startsWith(ROOT+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('Missing');return;
    }
    res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const base=origin+'/students/ekaterina/site/';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ekaterina-171026-'));
const artifacts=path.join(ROOT,'ekaterina-171026-review-artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const processChrome=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,seq=0;
const pending=new Map(),errors=[],failed=[];
try{
  let port=0;
  for(let i=0;i<160;i++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    assert.equal(processChrome.exitCode,null,'Chromium closed during startup');
    await sleep(90);
  }
  assert.ok(port,'Chrome debugger port not available');
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const tab=targets.find(x=>x.type==='page');
  assert.ok(tab,'No Chrome page target');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.id&&pending.has(msg.id)){const fn=pending.get(msg.id);pending.delete(msg.id);fn(msg);}
    if(msg.method==='Runtime.exceptionThrown')
      errors.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)
      failed.push(msg.params.response.status+' '+msg.params.response.url);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async code=>{
    const r=await call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  const wait=async code=>{
    for(let i=0;i<100;i++){if(await run(code))return;await sleep(90);}
    throw Error('Timed out: '+code);
  };
  const screenshot=async label=>{
    const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(artifacts,label+'.png'),Buffer.from(r.data,'base64'));
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const navigate=async(file,width,height)=>{
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<800});
    const url=base+file;
    await call('Page.navigate',{url});
    await sleep(150);
    await wait('location.pathname.endsWith('+JSON.stringify(file)+')&&document.readyState==="complete"');
  };

  for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1440,900]]){
    for(const dark of [false,true]){
      await navigate('17.10.26.html',width,height);
      await run('(()=>{const desired='+JSON.stringify(dark?'dark':'light')+';if(document.documentElement.dataset.theme!==desired)document.getElementById("themeToggle").click()})()');
      const data=await run('(()=>{const doc=document.documentElement;const figures=[...document.querySelectorAll("figure.diagram svg")];return {scrollWidth:doc.scrollWidth,clientWidth:doc.clientWidth,svg:figures.length,a11y:figures.every(s=>s.getAttribute("role")==="img"&&s.querySelector("title")&&s.querySelector("desc")&&s.hasAttribute("aria-labelledby")),count:document.querySelectorAll(".task").length,theme:doc.dataset.theme,buttonColor:getComputedStyle(document.getElementById("themeToggle")).color,headerColor:getComputedStyle(document.querySelector("header.topbar")).color,badAnchors:[...document.querySelectorAll("a[href^=\'#\']")].filter(a=>!document.getElementById(a.getAttribute("href").slice(1))).length,oversized:[...document.querySelectorAll("figure.diagram")].filter(el=>el.getBoundingClientRect().right>innerWidth+2||el.getBoundingClientRect().left < -2).length};})()');
      const mathAudit=await run('(()=>{const math=[...document.querySelectorAll("main math")];const ns="http://www.w3.org/1998/Math/MathML";return {count:math.length,sub:document.querySelectorAll("main msub").length,frac:document.querySelectorAll("main mfrac").length,sup:document.querySelectorAll("main msup").length,invalid:math.filter(el=>el.namespaceURI!==ns||[...el.querySelectorAll("*")].some(c=>c.namespaceURI!==ns)).length,unrendered:math.filter(el=>el.getClientRects().length===0||el.getBoundingClientRect().height<1||el.getBoundingClientRect().width<1).length,legacy:document.querySelectorAll("main sub,main .math").length}})()');
      assert.ok(mathAudit.count>=170,'MathML count '+JSON.stringify(mathAudit));
      assert.ok(mathAudit.sub>=25 && mathAudit.frac>=3 && mathAudit.sup>=1,'Semantic MathML structure '+JSON.stringify(mathAudit));
      assert.equal(mathAudit.invalid,0,'MathML namespace integrity');
      assert.equal(mathAudit.unrendered,0,'Unrendered MathML elements');
      assert.equal(mathAudit.legacy,0,'Legacy HTML math markup');
      assert.equal(data.theme,dark?'dark':'light');
      assert.equal(data.svg,3);
      assert.equal(data.a11y,true,'SVG a11y '+JSON.stringify(data));
      assert.equal(data.count,10);
      assert.equal(data.badAnchors,0);
      assert.equal(data.oversized,0,'Figure clipped '+JSON.stringify(data));
      assert.ok(data.scrollWidth<=data.clientWidth+2,'Page overflow '+width+' '+JSON.stringify(data));
      assert.equal(data.buttonColor,data.headerColor,'Theme contrast: '+JSON.stringify(data));
      if([375,1440].includes(width))await screenshot('lesson-'+width+(dark?'-dark':'-light'));
    }
  }
  await navigate('17.10.26.html',375,812);
  await run('(()=>{localStorage.removeItem("ekaterina-2026-10-17-checks");document.querySelectorAll("input[data-task]").forEach(el=>el.checked=false);document.querySelector("input[data-task=\\"1\\"]").click();document.querySelector("input[data-task=\\"3\\"]").click();document.querySelector(".task details").open=true})()');
  assert.equal(await run('document.getElementById("progressBar").value'),2);
  assert.equal(await run('document.getElementById("progressLabel").textContent'),'2 из 10');
  assert.ok((await run('document.querySelector(".task details").textContent')).includes('24 см'));
  await call('Page.reload',{ignoreCache:true});await sleep(200);await wait('document.readyState==="complete"');
  assert.equal(await run('document.getElementById("progressBar").value'),2,'Progress persisted');
  await run('localStorage.removeItem("ekaterina-2026-10-17-checks")');

  for(const [width,height] of [[375,812],[768,1024],[1440,900]]){
    await navigate('index.html',width,height);
    const home=await run('(()=>{const d=window.EKATERINA_COMPETENCY_DATA;return {latest:document.querySelector(".material-card time")?.getAttribute("datetime"),link:document.querySelector(".material-card a")?.getAttribute("href"),cells:document.querySelectorAll(".radial-cell").length,evidence:d?.evidence?.geo_quads_07?.href,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}})()');
    assert.equal(home.latest,'2026-10-17');assert.equal(home.link,'17.10.26.html');
    assert.equal(home.evidence,'17.10.26.html#rectangle');assert.equal(home.cells,235);
    assert.ok(home.scrollWidth<=home.clientWidth+2,'Home overflow '+width+' '+JSON.stringify(home));
    if([375,1440].includes(width))await screenshot('home-'+width);
  }
  await navigate('17.10.26.html',1440,900);
  const links=await run('Promise.all([...document.querySelectorAll("a[href]")].filter(a=>!a.getAttribute("href").startsWith("#")).map(async a=>({href:a.getAttribute("href"),status:(await fetch(a.href,{method:"HEAD"})).status})))');
  for(const link of links)assert.ok(link.status>=200&&link.status<400,'Broken lesson link '+JSON.stringify(link));
  assert.deepEqual(errors,[],'Browser JS exceptions');
  assert.deepEqual(failed,[],'HTTP errors');
  console.log('Ekaterina 17.10.26 browser release-gate PASS: native MathML, 5 viewports × 2 themes, links, map, progress, SVG.');
}finally{
  if(ws)ws.close();
  processChrome.kill('SIGTERM');server.close();
  await new Promise(resolve=>{
    if(processChrome.exitCode!==null){resolve();return;}
    processChrome.once('exit',resolve);
    setTimeout(resolve,3000);
  });
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:120});}
  catch(error){console.warn('Chromium temporary profile cleanup deferred to CI runner:',error.code);}
}
