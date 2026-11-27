import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {LESSONS,getLatestLesson} from '../lesson-registry.js';

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
      await navigate('26.11.26.html',width,height,dark);
      const lesson=await run(`({
        math:document.querySelectorAll('main math').length,
        answers:document.querySelectorAll('#practice details').length,
        ids:[...document.querySelectorAll('[id]')].map(e=>e.id),
        anchors:[...document.querySelectorAll('main a[href^="#"],nav a[href^="#"]')].every(a=>!!document.getElementById(a.hash.slice(1)))
      })`);
      assert.ok(lesson.math>=60,'Native MathML must be present');
      assert.equal(lesson.answers,10);
      assert.equal(new Set(lesson.ids).size,lesson.ids.length,'Duplicate HTML IDs');
      assert.ok(lesson.anchors,'Broken lesson anchors');
      if(width===375||width===1366)await shot('nov26-lesson-'+width+(dark?'-dark':'-light'));
      await navigate('26.11.26-lab.html#cone',width,height,dark);
      assert.equal(await run('document.querySelector("#readout output:nth-child(2)").textContent'),'2');
      if(width===375||width===1366)await shot('nov26-cone-'+width+(dark?'-dark':'-light'));
    }
  }
  await navigate('26.11.26.html',1366,900);
  await run('document.querySelector("#practice details summary").click()');
  assert.equal(await run('document.querySelector("#practice details").open'),true);
  await run('document.getElementById("posterOpen").click()');
  assert.equal(await run('document.getElementById("posterDialog").open'),true);
  for(let i=0;i<30;i++){
    if(await run('document.querySelector("#posterDialog img").naturalWidth>0'))break;
    await sleep(100);
  }
  assert.ok(await run('document.querySelector("#posterDialog img").naturalWidth>0'),'Poster image missing');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await sleep(120);
  assert.equal(await run('document.getElementById("posterDialog").open'),false);
  assert.equal(await run('document.activeElement.id'),'posterOpen');
  await run('document.querySelectorAll("[data-check]").forEach(x=>{x.checked=false;x.dispatchEvent(new Event("change"))});document.querySelector("[data-check]").click()');
  assert.match(await run('document.getElementById("progress").textContent'),/1 из 5/);
  await call('Page.reload',{ignoreCache:true});await sleep(250);
  assert.equal(await run('document.querySelector("[data-check]").checked'),true);
  await run('document.querySelector("[data-check]").click()');
  const readouts=()=>run('Array.from(document.querySelectorAll("#readout output"),e=>e.textContent)');
  const setParam=async(key,value)=>run(`(()=>{const e=document.getElementById('param-${key}');e.value=${value};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  for(const [width,height] of [[375,812],[1366,900]]){
    await navigate('26.11.26-lab.html#cone',width,height);
    assert.deepEqual(await readouts(),['2','1,5','10,5','25 %']);
    await setParam('k',4);assert.deepEqual((await readouts()).slice(0,2),['4','0,188']);
    await setParam('k',1.25);assert.deepEqual((await readouts()).slice(0,2),['1,25','6,144']);
    await run('document.getElementById("reset").click()');assert.equal((await readouts())[1],'1,5');
    await run('document.querySelectorAll("[data-choice]")[2].click()');
    assert.match(await run('document.getElementById("feedback").textContent'),/^Верно/);
    await navigate('26.11.26-lab.html#scale',width,height);
    assert.deepEqual(await readouts(),['4','3','12','Нет']);
    await setParam('p',3);await setParam('q',2);assert.equal((await readouts())[2],'18');
    await setParam('q',3);assert.deepEqual(await readouts(),['9','3','27','Да']);
    await setParam('p',1);await setParam('q',1);assert.equal((await readouts())[2],'1');
    await run('document.getElementById("reset").click()');assert.equal((await readouts())[2],'12');
    await shot('nov26-scale-'+width);
    await navigate('26.11.26-lab.html#groove',width,height);
    assert.deepEqual(await readouts(),['10','50','4','20','110']);
    await setParam('w',3);await setParam('h',2.5);assert.deepEqual(await readouts(),['37,5','22,5','15','25','104']);
    await setParam('w',1);await setParam('h',1);assert.deepEqual(await readouts(),['5','55','2','10','102']);
    await run('document.getElementById("reset").click()');assert.equal((await readouts())[4],'110');
    await shot('nov26-groove-'+width);
  }
  const lessonRecord=LESSONS.find(x=>x.date==='2026-11-26');
  assert.ok(lessonRecord&&lessonRecord.outcomes.length===8,'Canonical registry entry or evidence missing');
  assert.equal(lessonRecord.materials.lab,'26.11.26-lab.html');
  const latest=getLatestLesson(LESSONS);
  await navigate('index.html',1366,900);
  let cabinetLatest;
  for(let i=0;i<40;i++){
    cabinetLatest=await run('({title:document.getElementById("lesson-title")?.textContent.trim(),href:document.getElementById("latestLessonCta")?.getAttribute("href")})');
    if(cabinetLatest.title===latest.title&&cabinetLatest.href===latest.href)break;
    await sleep(150);
  }
  assert.equal(cabinetLatest.title,latest.title);
  assert.equal(cabinetLatest.href,latest.href);
  await shot('nov26-cabinet-1366');
  await navigate('index.html',375,812,true);await shot('nov26-cabinet-375-dark');
  await navigate('26.11.26.html',1366,900);
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const pdf=await call('Page.printToPDF',{printBackground:false,preferCSSPageSize:true});
  assert.ok(pdf.data?.length>1000,'Print-to-PDF failed');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  assert.deepEqual(uncaught,[],'Uncaught browser exceptions');
  assert.deepEqual(failed,[],'Broken local resources');
  console.log('Nikol 26 November browser regression passed');
}finally{
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');
  server.close();
  try{
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:150});
  }catch(error){
    // The runner deletes its temporary profile after the job; Chromium subprocesses
    // can race with immediate directory cleanup after an otherwise successful test.
    console.warn('Temporary Chromium profile cleanup:',error.message);
  }
}
