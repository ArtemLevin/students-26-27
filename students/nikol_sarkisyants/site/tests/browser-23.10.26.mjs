import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(item=>item.status===0)?.stdout.trim();
if(!chrome)throw Error('Browser QA requires installed Chromium or Chrome');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(_){res.writeHead(500);res.end('Request error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nikol-browser-review-'));
const screenshots=path.join(root,'nikol-site-review-artifacts');
fs.mkdirSync(screenshots,{recursive:true});
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--no-zygote','--disable-extensions',
  '--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;let serial=0;const pending=new Map(),uncaught=[],failed=[];
try{
  let port=0;
  for(let attempt=0;attempt<240;attempt++){
    const locator=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(locator)){port=Number(fs.readFileSync(locator,'utf8').split('\n')[0]);break}
    if(chromeProcess.exitCode!==null)throw Error('Chromium exited before launch');
    await sleep(100);
  }
  if(!port)throw Error('Chromium CDP port unavailable');
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(tab=>tab.type==='page');
  assert.ok(target,'No browser tab');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.id&&pending.has(msg.id)){const done=pending.get(msg.id);pending.delete(msg.id);done(msg);}
    if(msg.method==='Runtime.exceptionThrown'){
      uncaught.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    }
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400){
      const resource=msg.params.response.url;
      if(resource.startsWith(origin))failed.push(resource+': '+msg.params.response.status);
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  const student='/students/nikol_sarkisyants/site/';
  async function navigate(file,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+student+file;
    await call('Page.navigate',{url});
    let ready=false;
    for(let attempt=0;attempt<160;attempt++){
      const value=await run('({href:location.href,loaded:document.readyState})');
      if(value.href.startsWith(url)&&value.loaded==='complete'){ready=true;break;}
      await sleep(60);
    }
    assert.ok(ready,'Page load failed: '+file+' '+width);
    await run(`document.documentElement.dataset.theme='${dark?'dark':'light'}';document.body.dataset.theme='${dark?'dark':'light'}'`);
    await sleep(130);
    const metrics=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(metrics.scroll<=metrics.client+2,`${file} at ${width} pixels, ${dark?'dark':'light'} theme: horizontal overflow ${JSON.stringify(metrics)}`);
  }
  async function shot(name){
    const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshots,name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]]){
    for(const dark of (width===375||width===1366?[false,true]:[false])){
      await navigate('23.10.26.html',width,height,dark);
      const check=await run('({math:document.querySelectorAll("main math").length,steps:document.querySelectorAll("#stepper button").length,poster:!!document.querySelector("#poster img")})');
      assert.ok(check.math>=24,'Native MathML disappeared');
      assert.ok(check.steps>=4&&check.poster,'Missing lesson interactions');
      if(width===375||width===1366)await shot('lesson-'+width+(dark?'-dark':'-light'));
      await navigate('23.10.26-lab.html?mode=identity',width,height,dark);
      const lab=await run('({graph:document.querySelector("#b").getAttribute("d")?.length||0,identity:document.getElementById("originalLegend").hidden===false,zoom:document.getElementById("o").style.opacity})');
      assert.ok(lab.graph>7000&&lab.identity&&lab.zoom==='1','Laboratory identity plot not rendered');
      if(width===375||width===1366)await shot('lab-'+width+(dark?'-dark':'-light'));
    }
  }
  await navigate('23.10.26.html',1366,900);
  const step=await run(`(async()=>{
    document.getElementById('next').click();
    document.getElementById('next').click();
    const before=document.getElementById('stepCount').textContent;
    document.getElementById('quiz').querySelector('[data-answer="right"]').click();
    const quiz=document.getElementById('feedback').textContent;
    return {before,quiz};
  })()`);
  assert.equal(step.before,'3 / 8');
  assert.match(step.quiz,/Верно/);
  await call('Page.reload',{ignoreCache:true});await sleep(220);
  assert.equal(await run('document.getElementById("stepCount").textContent'),'3 / 8','Stepper should persist');
  await navigate('23.10.26-lab.html?mode=factors',1366,900);
  const preset=await run(`(async()=>{
    document.querySelector('[data-x="0.39269908169872414"]').click();
    const zeroA=document.getElementById('f1').textContent;
    document.querySelector('[data-x="0.2617993877991494"]').click();
    const zeroB=document.getElementById('f2').textContent;
    document.querySelector('[data-mode="identity"]').click();
    return {zeroA,zeroB,identity:document.getElementById('originalLegend').hidden===false,
      diff:document.getElementById('difference').textContent};
  })()`);
  assert.equal(preset.zeroA,'0');assert.equal(preset.zeroB,'0');
  assert.equal(preset.identity,true);assert.equal(preset.diff,'0');
  await navigate('index.html',1366,900);
  for(let i=0;i<40;i++){
    if(await run('document.getElementById("lesson-title").textContent.includes("Тригонометрические")'))break;
    await sleep(150);
  }
  assert.match(await run('document.getElementById("lesson-title").textContent'),/Тригонометрические/);
  await shot('cabinet-1366-light');
  await navigate('index.html',375,812,true);
  await shot('cabinet-375-dark');
  await navigate('23.10.26.html',1366,900,true);
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const pdf=await call('Page.printToPDF',{printBackground:false,preferCSSPageSize:true});
  assert.ok(pdf.data?.length>1000,'Print-to-PDF failed');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  assert.deepEqual(uncaught,[],'Uncaught browser exceptions');
  assert.deepEqual(failed,[],'Broken local resources');
  console.log('Nikol 23.10 browser review passed; screenshots saved to '+screenshots);
}finally{
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');
  server.close();
  fs.rmSync(profile,{recursive:true,force:true});
}
