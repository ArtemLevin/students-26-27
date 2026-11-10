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
const screenshots=path.join(root,'nikol-stereometry-browser-artifacts');
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
      await navigate('09.11.26.html',width,height,dark);
      const page=await run('({title:document.querySelector("h1")?.textContent,tasks:document.querySelectorAll(".practice-list li").length,sections:document.querySelectorAll("main .chapter").length})');
      assert.equal(page.title,'Стереометрия: три тела');
      assert.equal(page.tasks,10);
      assert.ok(page.sections>=6);
      if(width===375||width===1366)await shot('lesson-'+width+(dark?'-dark':'-light'));
      await navigate('09.11.26-lab.html#cube',width,height,dark);
      const chart=await run('({nodes:document.getElementById("solid-drawing")?.children.length,V:document.getElementById("volume")?.textContent,S:document.getElementById("surface")?.textContent})');
      assert.ok(chart.nodes>=5);
      assert.equal(chart.V,'64');assert.equal(chart.S,'96');
      if(width===375||width===1366)await shot('lab-'+width+(dark?'-dark':'-light'));
    }
  }
  await navigate('09.11.26-lab.html#box',1366,900);
  let metrics=await run('({selected:document.querySelector("[data-shape=box]").getAttribute("aria-pressed"),V:document.getElementById("volume").textContent,S:document.getElementById("surface").textContent,d:document.getElementById("diagonal").textContent})');
  assert.deepEqual(metrics,{selected:'true',V:'36',S:'72',d:'7'});
  const boxAnnotation=await run('(()=>{const front=document.querySelector("#solid-drawing polygon");const coords=front.getAttribute("points").trim().split(/\\s+/).map(p=>Number(p.split(",")[0]));const label=[...document.querySelectorAll("#solid-drawing text")].find(t=>t.textContent.startsWith("b ="));return {frontMaxX:Math.max(...coords),labelX:Number(label.getAttribute("x"))};})()');
  assert.ok(boxAnnotation.labelX>boxAnnotation.frontMaxX,'Box depth label belongs to an edge outside the front face');
  await shot('box-1366-edges');
  metrics=await run('(()=>{document.querySelector("[data-shape=prism]").click();return {V:document.getElementById("volume").textContent,S:document.getElementById("surface").textContent,base:document.getElementById("diagonal").textContent}})()');
  assert.deepEqual(metrics,{V:'60',S:'132',base:'6'});
  const prismAnnotation=await run('(()=>{const front=document.querySelector("#solid-drawing polygon");const coords=front.getAttribute("points").trim().split(/\\s+/).map(p=>Number(p.split(",")[0]));const label=[...document.querySelectorAll("#solid-drawing text")].find(t=>t.textContent.startsWith("b ="));return {frontMinX:Math.min(...coords),labelX:Number(label.getAttribute("x"))};})()');
  assert.ok(prismAnnotation.labelX<prismAnnotation.frontMinX,'Triangle leg label belongs to the depth cathetus rather than the front face');
  await shot('prism-1366-edges');
  metrics=await run('(()=>{document.querySelector("[data-shape=cube]").click();const scale=document.getElementById("scale");scale.value="2";scale.dispatchEvent(new Event("input",{bubbles:true}));return {V:document.getElementById("volume").textContent,S:document.getElementById("surface").textContent,Vratio:document.getElementById("volume-ratio").textContent,Sratio:document.getElementById("area-ratio").textContent}})()');
  assert.deepEqual(metrics,{V:'512',S:'384',Vratio:'×8',Sratio:'×4'});
  const comparisonWidths=await run('({area:parseFloat(document.getElementById("area-bar").style.width),volume:parseFloat(document.getElementById("volume-bar").style.width)})');
  assert.ok(Math.abs(comparisonWidths.area-400/27)<1e-2,'Area bar shares the 0–27 scale');
  assert.ok(Math.abs(comparisonWidths.volume-800/27)<1e-2,'Volume bar shares the 0–27 scale');
  const reflected=await run('({raw:document.getElementById("a").value,shown:document.getElementById("a-value").textContent,computed:document.getElementById("dims").textContent})');
  assert.equal(reflected.raw,'4','The slider value remains the unscaled input');
  assert.equal(reflected.shown,'4','Readout next to slider must match the slider, even when scale is doubled');
  assert.match(reflected.computed,/8/,'Calculated lengths should reflect the doubled scale');
  const accessible=await run('(()=>{const slider=document.getElementById("a");slider.value="7";slider.dispatchEvent(new Event("input",{bubbles:true}));slider.dispatchEvent(new Event("change",{bubbles:true}));return {shown:document.getElementById("a-value").textContent,volume:document.getElementById("volume").textContent,status:document.getElementById("result-status").textContent}})()');
  assert.equal(accessible.shown,'7');
  assert.equal(accessible.volume.replace(/\s/g,''),'2744','Calculated volume must use scaled dimensions');
  assert.match(accessible.status,/14/,'Final dimensions must be announced after the slider change');
  assert.match(accessible.status,/2.?744/,'Volume must be included in the accessible announcement');
  const fractional=await run('(()=>{document.getElementById("reset").click();const a=document.getElementById("a"),m=document.getElementById("scale");a.value="3";a.dispatchEvent(new Event("input",{bubbles:true}));m.value="1.25";m.dispatchEvent(new Event("input",{bubbles:true}));return {raw:document.getElementById("a-value").textContent,V:document.getElementById("volume").textContent,formula:document.getElementById("volume-formula").textContent,areaBar:parseFloat(document.getElementById("area-bar").style.width),volumeBar:parseFloat(document.getElementById("volume-bar").style.width)}})()');
  assert.equal(fractional.raw,'3');
  assert.equal(fractional.V,'52,73');
  assert.match(fractional.formula,/14,0625 · 3,75 = 52,734375/,'Do not round an intermediate product to two decimals');
  assert.ok(fractional.volumeBar>fractional.areaBar,'Shared comparison scale must visually show cubic growth');
  const answer=await run('(()=>{document.getElementById("reset").click();document.querySelector("[data-answer=b]").click();return {V:document.getElementById("volume").textContent,feedback:document.getElementById("feedback").textContent}})()');
  assert.equal(answer.V,'64');assert.match(answer.feedback,/Верно/);
  await navigate('09.11.26-lab.html#prism',375,812,true);
  assert.equal(await run('document.querySelector("[data-shape=prism]").getAttribute("aria-pressed")'),'true');
  await shot('prism-375-dark-edges');
  assert.equal(await run('document.activeElement===document.getElementById("model")'),true,'Mode deep links should focus the model');
  assert.equal(await run('window.scrollY>0'),true,'Mode deep links should land near the controls');
  const extremes=await run('(()=>{for(const id of ["a","b","h"]){const slider=document.getElementById(id);slider.value=slider.min;slider.dispatchEvent(new Event("input",{bubbles:true}));}const scale=document.getElementById("scale");scale.value="3";scale.dispatchEvent(new Event("input",{bubbles:true}));const min={volume:document.getElementById("volume").textContent,bbox:(()=>{const box=document.getElementById("solid-drawing").getBBox();return {x:box.x,y:box.y,width:box.width,height:box.height};})()};for(const id of ["a","b","h"]){const slider=document.getElementById(id);slider.value=slider.max;slider.dispatchEvent(new Event("input",{bubbles:true}));}const max={volume:document.getElementById("volume").textContent,bbox:(()=>{const box=document.getElementById("solid-drawing").getBBox();return {x:box.x,y:box.y,width:box.width,height:box.height};})()};return {min,max};})()');
  assert.equal(extremes.min.volume,'13,5');
  assert.match(extremes.max.volume,/16.?200/);
  for(const sample of [extremes.min,extremes.max]){
    const box=sample.bbox;
    assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=601&&box.y+box.height<=421,'SVG annotations must fit the viewBox: '+JSON.stringify(box));
  }
  const latest=getLatestLesson(LESSONS);
  assert.ok(latest,'A published lesson must exist');
  await navigate('index.html',1366,900);
  let newest={};
  for(let attempt=0;attempt<55;attempt++){
    newest=await run('({title:document.getElementById("lesson-title")?.textContent.trim(),href:document.getElementById("latestLessonCta")?.getAttribute("href")})');
    if(newest.title===latest.title&&newest.href===latest.href)break;
    await sleep(140);
  }
  assert.deepEqual(newest,{title:latest.title,href:latest.href});
  await shot('cabinet-newest');
  let mapLoaded=false;
  for(let attempt=0;attempt<55;attempt++){
    mapLoaded=await run('!!document.querySelector("#radialMap .radial-cell[data-id=t3_cube]")');
    if(mapLoaded)break;
    await sleep(100);
  }
  assert.ok(mapLoaded,'Competency map must load the stereometry catalog');
  const mapEvidence=await run('(()=>{const before=localStorage.getItem("nikol-competence-state-v2");const cell=document.querySelector("#radialMap .radial-cell[data-id=t3_cube]");cell.focus();cell.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));const dialog=document.getElementById("competencyDialog");return {open:dialog.open,body:document.getElementById("dialogEvidence").textContent,url:document.getElementById("dialogLink").getAttribute("href"),linkLabel:document.getElementById("dialogLink").textContent,level:document.querySelector("#levelPicker .level-btn[aria-pressed=true]")?.dataset.level,before,after:localStorage.getItem("nikol-competence-state-v2")}})()');
  assert.equal(mapEvidence.open,true,'Competency detail should open from keyboard-focusable SVG');
  assert.match(mapEvidence.body,/09\\.11/,'Evidence must refer to the actual lesson date');
  assert.equal(mapEvidence.url,'09.11.26.html#cube');
  assert.match(mapEvidence.linkLabel,/материал по теме/i,'Evidence link must avoid claiming independent mastery');
  assert.equal(mapEvidence.after,mapEvidence.before,'Opening an evidence note must not modify competency levels');
  await run('document.getElementById("closeDialog").click()');
  await sleep(60);
  assert.equal(await run('document.getElementById("competencyDialog").open'),false,'Closing the detail restores normal navigation');
  await navigate('09.11.26.html',1366,900,true);
  assert.equal(await run('(()=>{const a=document.querySelector("a.skip");a.focus();return document.activeElement===a&&a.getAttribute("href")==="#main"})()'),true,'Keyboard skip-link should be focusable');
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const pdf=await call('Page.printToPDF',{printBackground:false,preferCSSPageSize:true});
  assert.ok(pdf.data?.length>1000,'Print PDF failed');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  assert.deepEqual(uncaught,[],'Uncaught browser exceptions');
  assert.deepEqual(failed,[],'Broken local resources');
  console.log('Nikol 09.11: responsive, light/dark, lab geometry, manipulation, quiz, registry, print and network PASS');
  console.log('Screenshots saved to '+screenshots);
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
