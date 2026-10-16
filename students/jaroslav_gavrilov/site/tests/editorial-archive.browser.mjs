import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(cmd=>spawnSync('which',[cmd],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
if(!chrome)throw new Error('BROWSER_NOT_AVAILABLE: Chromium missing');
const server=http.createServer((req,res)=>{
  try{
    const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=path.resolve(ROOT,'.'+requestPath);
    if(!target.startsWith(ROOT+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript',
      '.css':'text/css','.pdf':'application/pdf','.json':'application/json','.png':'image/png'})[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const host='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'jaroslav1510-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map(),errors=[],bad=[];let id=0;
try{
  let port;
  for(let i=0;i<130;i++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    if(chromeProcess.exitCode!==null)throw new Error('Chrome exited');
    await wait(100);
  }
  assert.ok(port,'Chrome DevTools port available');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(x=>x.type==='page');assert.ok(target);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  ws.onmessage=e=>{
    const item=JSON.parse(e.data);
    if(item.id&&pending.has(item.id)){const callback=pending.get(item.id);pending.delete(item.id);callback(item);}
    if(item.method==='Runtime.exceptionThrown')errors.push(item.params?.exceptionDetails?.exception?.description||item.params?.exceptionDetails?.text);
    if(item.method==='Network.responseReceived'&&item.params?.response?.status>=400)
      bad.push(item.params.response.url+': '+item.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const serial=++id;pending.set(serial,result=>result.error?reject(Error(result.error.message)):resolve(result.result));
    ws.send(JSON.stringify({id:serial,method,params}));
  });
  const evalJS=async expression=>{
    const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);
    return x.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const artifact=path.join(ROOT,'jaroslav-editorial-qa-artifacts');fs.mkdirSync(artifact,{recursive:true});
  async function visit(page,width,dark){
    await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=768});
    const url=host+'/students/jaroslav_gavrilov/site/'+page;
    await call('Page.navigate',{url});
    let state;
    for(let i=0;i<130;i++){
      state=await evalJS('({url:location.href,ready:document.readyState})');
      if(state.url.startsWith(url)&&state.ready==='complete')break;
      await wait(80);
    }
    assert.equal(state?.ready,'complete');
    await evalJS('document.documentElement.dataset.theme='+JSON.stringify(dark?'dark':'light'));
    await wait(40);
    const r=await evalJS('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(r.scroll<=r.client+2,page+' width='+width+' dark='+dark+' overflow '+JSON.stringify(r));
  }
  async function screenshot(name){const s=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(artifact,name+'.png'),Buffer.from(s.data,'base64'));}
  for(const width of [375,390,768,1024,1440]){
    for(const page of ['15.10.26.html','15.10.26-lab.html']){
      for(const dark of [false,true]){
        await visit(page,width,dark);
        if((width===390||width===1440)&&!dark)await screenshot(page+'-'+width);
      }
    }
  }
  await visit('15.10.26.html',1440,false);
  const lesson=await evalJS('({charts:document.querySelectorAll("svg[data-graph] path").length,anchors:["method","cos","sin","tan","line","crossing","recall"].every(x=>document.getElementById(x)),math:document.querySelectorAll("main math").length,plotMath:document.querySelectorAll("svg[data-graph] foreignObject math").length,fractions:document.querySelectorAll("main mfrac").length,semantic:[...document.querySelectorAll("main math")].every(x=>x.namespaceURI==="http://www.w3.org/1998/Math/MathML"),work:[...document.querySelectorAll(".math")].every(x=>x.querySelector("math"))})');
  assert.equal(lesson.anchors,true);assert.ok(lesson.charts>=5,'all five plots rendered');
  assert.ok(lesson.math>=100,'lesson and chart labels use native MathML');
  assert.ok(lesson.plotMath>=35,'chart coordinates and ticks use MathML');
  assert.ok(lesson.fractions>=20,'fractions use mfrac');
  assert.equal(lesson.semantic,true);assert.equal(lesson.work,true);
  await visit('15.10.26-lab.html?mode=cos',1440,false);
  let data=await evalJS('({mode:document.querySelector("[data-mode=cos]").getAttribute("aria-pressed"),a:document.querySelector("#point-a math").getAttribute("aria-label"),b:document.querySelector("#point-b math").getAttribute("aria-label"),formula:document.querySelector("#formula math").getAttribute("aria-label"),semantic:document.querySelector("#formula math").namespaceURI})');
  assert.equal(data.mode,'true');assert.equal(data.a,'A (0; 0,5)');assert.equal(data.b,'B (π; −2,5)');
  assert.equal(data.semantic,'http://www.w3.org/1998/Math/MathML');
  assert.ok(data.formula.includes('3/2'));
  const edited=await evalJS('(()=>{const b=document.querySelector("#b");b.value="0";b.dispatchEvent(new Event("input",{bubbles:true}));return {a:document.querySelector("#point-a math").getAttribute("aria-label"),b:document.querySelector("#point-b math").getAttribute("aria-label")};})()');
  assert.equal(edited.a,'A (0; 1,5)');assert.equal(edited.b,'B (π; −1,5)');
  const reset=await evalJS('(()=>{document.querySelector("#reset").click();return document.querySelector("#point-a math").getAttribute("aria-label");})()');
  assert.equal(reset,'A (0; 0,5)');
  const tan=await evalJS('(()=>{document.querySelector("[data-mode=tan]").click();return {a:document.querySelector("#point-a math").getAttribute("aria-label"),b:document.querySelector("#point-b math").getAttribute("aria-label")};})()');
  assert.equal(tan.a,'A (0; −1,5)');assert.equal(tan.b,'B (π/4; 0,5)');
  const crossing=await evalJS('(()=>{document.querySelector("[data-mode=crossing]").click();return {a:document.querySelector("#point-a math").getAttribute("aria-label"),hidden:document.querySelector("#sliders").hidden,math:document.querySelectorAll("#formula math msub").length};})()');
  assert.equal(crossing.a,'P (−5; −11)');assert.equal(crossing.hidden,true);assert.equal(crossing.math,2);
  const compare=await evalJS('(()=>{document.querySelector("#compare-toggle").click();return {hidden:document.querySelector("#compare").hidden,plot:document.querySelector("#baseline-chart path")!==null};})()');
  assert.deepEqual(compare,{hidden:false,plot:true});
  const mathLab=await evalJS('({native:[...document.querySelectorAll("math")].every(x=>x.namespaceURI==="http://www.w3.org/1998/Math/MathML"),svg:document.querySelectorAll("#lab-chart foreignObject math").length,base:document.querySelector("#baseline-formula math")!==null})');
  assert.equal(mathLab.native,true);assert.ok(mathLab.svg>=8);assert.equal(mathLab.base,true);

  // Independent QA of the redesigned student cabinet and monthly archive.
  const archiveMeasures=[];
  for (const width of [360,390,768,1024,1440]) {
    for (const dark of [false,true]) {
      await visit('index.html',width,dark);
      const mainMetrics=await evalJS('({map:document.querySelectorAll("#radialMap .radial-cell").length,total:document.getElementById("totalStat").textContent,latest:document.getElementById("latestLessonCta").getAttribute("href"),visible:document.querySelectorAll(".atlas-outcome strong").length})');
      assert.ok(mainMetrics.map>150,'radial map must render at '+width);
      assert.equal(Number(mainMetrics.total),mainMetrics.map,'total must come from map');
      assert.ok(mainMetrics.latest?.endsWith('.html'),'latest real lesson');
      assert.ok(mainMetrics.visible>0,'lesson outcomes use catalogue labels');
      await visit('archive.html',width,dark);
      await wait(170);
      const archive=await evalJS('(()=>{const tiles=[...document.querySelectorAll(".archive-tile")];const heights=tiles.map(t=>Math.round(t.getBoundingClientRect().height));const grid=document.querySelector(".archive-month-grid");const columns=getComputedStyle(grid).gridTemplateColumns.split(" ").length;return {count:tiles.length,months:document.querySelectorAll(".archive-month").length,columns,delta:Math.max(...heights)-Math.min(...heights),dates:tiles.map(t=>t.querySelector("time").dateTime),clipped:tiles.some(t=>t.scrollHeight>t.clientHeight+4)}})()');
      const expected=width>1030?3:width>700?2:1;
      assert.equal(archive.columns,expected,'archive columns '+width);
      assert.ok(archive.count>=7,'published lessons loaded');
      assert.ok(archive.months>=2,'history across months');
      assert.ok(archive.delta<=3,'tiles should be equal height '+width+': '+JSON.stringify(archive));
      assert.equal(archive.clipped,false,'archive card clipped '+width);
      assert.ok(archive.dates.every((d,i)=>!i||archive.dates[i-1]>=d),'chronological order');
      archiveMeasures.push({width,dark,count:archive.count,delta:archive.delta,columns});
      if((width===390||width===1440)&&!dark)await screenshot('archive-'+width+'-light');
    }
  }
  await visit('index.html',390,false);
  const mobile=await evalJS('(()=>{const menu=document.querySelector("#menuButton");menu.click();const open=document.body.classList.contains("sidebar-open");const expanded=menu.getAttribute("aria-expanded");document.querySelector("#sidebarClose").click();return {open,expanded,closed:!document.body.classList.contains("sidebar-open")}})()');
  assert.deepEqual(mobile,{open:true,expanded:'true',closed:true},'mobile drawer menu');
  await visit('index.html',1440,false);
  const names=await evalJS('(()=>({labels:[...document.querySelectorAll(".atlas-outcome strong")].map(x=>x.textContent),count:document.querySelectorAll(".atlas-ledger b").length,heat:[...document.querySelectorAll(".radial-cell")].every(x=>/^[0-4]$/.test(x.dataset.level))}))()');
  assert.equal(names.count,5,'all five ledger metrics');
  assert.equal(names.heat,true,'all heat cells have real level');
  assert.ok(names.labels.every(s=>!/^ege\d+_/.test(s)),'no internal competency IDs');
  const searchIndex=await evalJS('(()=>{const field=document.getElementById("topicSearch");field.value="тригонометр";field.dispatchEvent(new Event("input",{bubbles:true}));return document.querySelectorAll(".topic-row.is-dimmed").length})()');
  assert.ok(searchIndex>0,'map search still functions');
  await evalJS('(()=>{document.getElementById("topicSearch").value="";document.getElementById("topicSearch").dispatchEvent(new Event("input",{bubbles:true}));document.querySelector(".topic-row").click();})()');
  assert.equal(await evalJS('document.getElementById("topicDialog").open'),true,'map dialog opens');
  await evalJS('document.querySelector("#topicDialog .icon-btn").click()');
  await visit('archive.html',1440,false);
  const found=await evalJS('(()=>{const f=document.querySelector("#archiveSearch");f.value="15.10.26";f.dispatchEvent(new Event("input",{bubbles:true}));return {visible:document.querySelectorAll(".archive-tile:not([hidden])").length,months:document.querySelectorAll(".archive-month:not([hidden])").length}})()');
  assert.deepEqual(found,{visible:1,months:1},'archive search month filtering');
  await visit('index.html',1440,false);
  await evalJS('document.getElementById("themeToggle").click()');
  const darkState=await evalJS('({html:document.documentElement.dataset.theme,body:document.body.dataset.theme})');
  assert.deepEqual(darkState,{html:'dark',body:'dark'},'theme sync');
  await visit('archive.html',1440,true);
  assert.equal(await evalJS('document.body.dataset.theme'),'dark','archive theme');
  console.log('JAROSLAV_EDITORIAL_QA_PASS',JSON.stringify({mobile,names,found,archiveMeasures}));

  assert.deepEqual(errors,[],'JavaScript errors');assert.deepEqual(bad,[],'HTTP failures');
  console.log('JAROSLAV_1510_BROWSER_PASS',JSON.stringify({lesson,data,edited,tan,crossing,compare,screenshots:fs.readdirSync(artifact).length}));
} finally {
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');server.close();
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150})}catch(error){
    if(!['ENOTEMPTY','EBUSY','EPERM'].includes(error.code))throw error;
  }
}
