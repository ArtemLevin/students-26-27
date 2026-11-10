import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {LESSONS} from '../lesson-registry.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const executable=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(bin=>spawnSync('which',[bin],{encoding:'utf8'}))
  .find(x=>x.status===0)?.stdout.trim();
if(!executable)throw Error('Chromium is required. This test cannot silently skip browser QA.');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
 try{
  const full=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!full.startsWith(ROOT+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(full)]||'application/octet-stream');
  fs.createReadStream(full).pipe(res);
 }catch(error){res.writeHead(500);res.end('Server error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nastya-editorial-'));
const processChrome=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','pipe','pipe']});
let chromeLog='';for(const stream of [processChrome.stdout,processChrome.stderr])stream.on('data',chunk=>chromeLog=(chromeLog+chunk).slice(-14000));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;const pending=new Map();let serial=0;const exceptions=[],failedResources=[];
try{
 let port=0;
 for(let i=0;i<180;i++){
  const active=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
  const fallback=chromeLog.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
  if(fallback){port=Number(fallback[1]);break;}
  if(processChrome.exitCode!==null)throw Error('Chromium exited before opening DevTools: '+chromeLog);
  await sleep(100);
 }
 if(!port)throw Error('Unable to start Chromium: '+chromeLog);
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=tabs.find(x=>x.type==='page');assert.ok(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=e=>{
  const msg=JSON.parse(e.data);
  if(msg.id&&pending.has(msg.id)){const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg);}
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails?.exception?.description||msg.params.exceptionDetails?.text);
  if(msg.method==='Network.responseReceived'&&msg.params.response?.status>=400)failedResources.push(msg.params.response.url+': '+msg.params.response.status);
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
  socket.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);
  return x.result.value;
 };
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 const output=path.join(ROOT,'nastya-editorial-artifacts');
 fs.mkdirSync(output,{recursive:true});
 async function navigate(name,width,height){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
  const url=origin+'/students/nastya_pavlova/site/'+name;
  await call('Page.navigate',{url});
  for(let i=0;i<150;i++){
   const info=await evaluate('({url:location.href,ready:document.readyState})');
   if(info.url===url&&info.ready==='complete')break;
   if(i===149)throw Error('Page loading timed out: '+url);
   await sleep(90);
  }
  for(let i=0;i<70;i++){
   const expression=name==='09.11.26.html'?"!!document.querySelector('#heading')":
     name==='09.11.26-lab.html'?"document.querySelectorAll('#rows tr').length>0":
     name==='index.html'?
     "document.querySelector('#lessonTitle')?.textContent!=='Загрузка занятия…'":
     name==='archive.html'?"document.querySelectorAll('.archive-tile').length>0":
     name==='22.10.26-lab.html'?"document.querySelector('#payment')?.textContent.length>0":
     name==='26.10.26-lab.html'?"document.querySelector('#firstMetric')?.textContent!=='—'":
     name==='26.10.26.html'?"!!document.querySelector('.cover h1')":
     name.endsWith('-lab.html')?"document.querySelector('#finalSum')?.textContent.length>0":
     "!!document.querySelector('#pageTitle')";
   const ready=await evaluate(expression);
   if(ready)break;await sleep(100);
  }
  await sleep(180);
  const geometry=await evaluate("({documentWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,screen:innerWidth})");
  if(geometry.documentWidth>geometry.viewportWidth+2){
   const offenders=await evaluate("([...document.querySelectorAll('body *')].filter(x=>{const r=x.getBoundingClientRect();return r.right>document.documentElement.clientWidth+2||r.left< -2}).slice(0,14).map(x=>({tag:x.tagName,selector:x.id||x.className?.baseVal||x.className,left:Math.round(x.getBoundingClientRect().left),right:Math.round(x.getBoundingClientRect().right)})))");
   throw Error(name+' '+width+' viewport overflow '+JSON.stringify({geometry,offenders}));
  }
  return geometry;
 }
 const viewports=[[1440,900],[1024,768],[768,1024],[390,844],[360,800]];
 for(const [w,h] of viewports){
  for(const page of ['index.html','archive.html']){
   await navigate(page,w,h);
   if(page==='archive.html'){
    const results=await evaluate("(()=>{const tiles=[...document.querySelectorAll('.archive-tile')];return {tiles:tiles.length,months:document.querySelectorAll('.archive-month').length,heights:tiles.map(x=>Math.round(x.getBoundingClientRect().height)),clipped:tiles.filter(x=>x.scrollHeight>x.clientHeight+2).length,foreign:/Ксения Клыкова/.test(document.body.innerText)}})()");
    assert.ok(results.tiles>=10,'Too few archive tiles');
    assert.ok(results.months>=2,'Missing month grouping');
    assert.equal(results.clipped,0,'Archive cards clip content: '+JSON.stringify(results));
    assert.equal(new Set(results.heights).size,1,'Unequal card heights at '+w+': '+JSON.stringify(results.heights));
    assert.equal(results.foreign,false,'Foreign student data in archive');
   }else{
    const state=await evaluate("({map:!!document.querySelector('#radialMap'),practice:!!document.querySelector('#practiceRoot'),lesson:document.querySelector('#lessonTitle')?.textContent,ids:document.querySelectorAll('#practiceSection').length})");
    assert.ok(state.map&&state.practice&&state.ids===1);
    assert.equal(state.lesson,LESSONS[0].title,'Latest lesson title must follow the registry');
   }
   // Both themes must leave content accessible, without horizontal scroll.
   if(page==='archive.html')await evaluate("document.querySelector('#archiveTheme').click()");
   else await evaluate("document.documentElement.dataset.theme='dark'");
   const dark=await evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,theme:document.body.dataset.theme||document.documentElement.dataset.theme})");
   assert.equal(dark.overflow,false,page+' dark overflow at '+w);
   const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync(path.join(output,page.replace('.html','')+'-'+w+'.png'),Buffer.from(image.data,'base64'));
  }
 }
 for(const [w,h] of [[1440,900],[390,844]]){
  for(const page of ['19.10.26.html','19.10.26-lab.html']){
   await navigate(page,w,h);
   const structural=await evaluate(page.endsWith('-lab.html')?
    "({heading:document.querySelector('h1')?.textContent,chart:!!document.querySelector('#growthChart'),controls:document.querySelectorAll('input[type=range]').length})":
    "({heading:document.querySelector('#pageTitle')?.textContent,sections:document.querySelectorAll('.chapter').length,exercises:document.querySelectorAll('.practice details').length})");
   if(page.endsWith('-lab.html')){assert.ok(structural.chart&&structural.controls===4);assert.match(structural.heading,/Как растёт вклад/);}
   else{assert.equal(structural.exercises,10);assert.equal(structural.sections,7);}
   await evaluate("document.querySelector('#themeToggle').click()");
   const afterDark=await evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,theme:document.documentElement.dataset.theme})");
   assert.ok(!afterDark.overflow,'New pages have no dark theme overflow: '+page+' '+w);
  }
 }
 for(const [w,h] of [[1440,900],[390,844]]){
  await navigate('22.10.26.html',w,h);
  const lesson=await evaluate("({heading:document.querySelector('#pageTitle')?.textContent,sections:document.querySelectorAll('.chapter').length,exercises:document.querySelectorAll('.practice details').length,labLink:[...document.querySelectorAll('a')].some(x=>x.getAttribute('href')==='22.10.26-lab.html')})");
  assert.match(lesson.heading,/Вклады/);assert.equal(lesson.sections,10);assert.equal(lesson.exercises,10);assert.ok(lesson.labLink);
  await evaluate("document.querySelector('#themeToggle').click()");
  assert.ok(await evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+2"),'22 October lesson dark overflow at '+w);
  await navigate('22.10.26-lab.html',w,h);
  const credit=await evaluate("({heading:document.querySelector('h1')?.textContent,chart:!!document.querySelector('#debtChart'),controls:document.querySelectorAll('input[type=range]').length,years:document.querySelectorAll('#yearRows tr').length,payment:document.querySelector('#payment')?.textContent.replace(/[^0-9]/g,'')})");
  assert.match(credit.heading,/Как погашается кредит/);assert.equal(credit.controls,3);assert.ok(credit.chart);assert.equal(credit.years,3);assert.equal(credit.payment,'199650');
  const presets=await evaluate("(()=>{const get=()=>document.querySelector('#payment').textContent.replace(/[^0-9]/g,'');document.querySelector('[data-scenario=two]').click();const two=get();document.querySelector('[data-scenario=four]').click();const four=get();const rate=document.querySelector('#rate');rate.value='12';rate.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#reset').click();return {two,four,reset:get(),rows:document.querySelectorAll('#yearRows tr').length}})()");
  assert.deepEqual(presets,{two:'121000',four:'146410',reset:'146410',rows:4},'Annuity scenario and reset parity');
  await evaluate("document.querySelector('#themeToggle').click()");
  assert.ok(await evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+2"),'22 October lab dark overflow at '+w);
 }

 // Newly published differentiated-credit lesson must render on desktop and mobile.
 for(const [w,h] of [[1440,900],[390,844]]){
  await navigate('26.10.26.html',w,h);
  const lesson=await evaluate("({heading:document.querySelector('.cover h1')?.textContent,chapters:document.querySelectorAll('.chapter').length,exercises:document.querySelectorAll('.practice details').length,lab:[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='26.10.26-lab.html')})");
  assert.match(lesson.heading,/Когда платёж/);
  assert.equal(lesson.chapters,7);
  assert.equal(lesson.exercises,10);
  assert.equal(lesson.lab,true);
  await evaluate("document.querySelector('#themeToggle').click()");
  assert.ok(await evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+2"),'26 October lesson dark overflow at '+w);
  await navigate('26.10.26-lab.html',w,h);
  const initial=await evaluate("({rows:document.querySelectorAll('#scheduleRows tr').length,total:document.querySelector('#totalMetric')?.textContent,first:document.querySelector('#firstMetric')?.textContent,last:document.querySelector('#lastMetric')?.textContent})");
  assert.deepEqual(initial,{rows:3,total:'144',first:'52',last:'44'},'Differentiated initial schedule');
  const scenarios=await evaluate("(()=>{document.querySelector('[data-preset=five]').click();const five={rows:document.querySelectorAll('#scheduleRows tr').length,total:document.querySelector('#totalMetric').textContent};document.querySelector('[data-preset=bounds]').click();const bounds={rows:document.querySelectorAll('#scheduleRows tr').length,first:document.querySelector('#firstMetric').textContent,last:document.querySelector('#lastMetric').textContent,good:document.querySelector('#boundsResult').textContent.includes('Оба ограничения выполняются')};const r=document.querySelector('#rateInput');r.value='20';r.dispatchEvent(new Event('input',{bubbles:true}));const failed=document.querySelector('#boundsResult').textContent.includes('нарушены');document.querySelector('#next').click();return {five,bounds,failed,selected:document.querySelector('#stepLabel').textContent}})()");
  assert.deepEqual(scenarios,{five:{rows:5,total:'240'},bounds:{rows:15,first:'1,9',last:'0,5',good:true},failed:true,selected:'Год 2 из 15'},'Differentiated scenario and bounds parity');
  await evaluate("document.querySelector('#themeToggle').click()");
  assert.ok(await evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+2"),'26 October lab dark overflow at '+w);
 }
 // Dedicated release-gate checks: 9 November credit lesson and simulator.
 for(const [w,h] of [[1440,900],[1024,768],[768,1024],[390,844],[375,812]]){
  await navigate('09.11.26.html',w,h);
  const topic=await evaluate("({heading:document.querySelector('#heading')?.textContent.trim(),sections:document.querySelectorAll('main .section').length,exercises:document.querySelectorAll('.practice details').length,mathml:document.querySelectorAll('math').length,broken:[...document.querySelectorAll('a[href^=\"#\"]')].filter(a=>!document.getElementById(a.getAttribute('href').slice(1))).length,files:[...document.querySelectorAll('a[href]')].filter(a=>/pdf_docs|tex_docs/.test(a.getAttribute('href'))).length,duplicateIds:(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return ids.length-new Set(ids).size})()})");
  assert.match(topic.heading,/Схемы погашения кредита/);
  assert.equal(topic.sections,7);
  assert.equal(topic.exercises,10);
  assert.ok(topic.mathml>=3,'Critical equations must be MathML');
  assert.equal(topic.broken,0,'Broken lesson section anchors');
  assert.ok(topic.files>=2,'Missing PDF/TeX materials');
  assert.equal(topic.duplicateIds,0,'Duplicate IDs');
  await evaluate("document.querySelector('#theme').click()");
  assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
  assert.ok(await evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+2"),'Lesson overflow '+w);
  let image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(output,'09-11-lesson-'+w+'.png'),Buffer.from(image.data,'base64'));
  await navigate('09.11.26-lab.html',w,h);
  const initial=await evaluate("(()=>{const v=sel=>document.querySelector(sel)?.textContent;const metrics={total:v('#total'),overpay:v('#overpay'),remainder:v('#remainder'),rows:document.querySelectorAll('#rows tr').length,yearOptions:document.querySelectorAll('#yearPicker option').length,compare:document.querySelectorAll('#compareGrid article').length};return metrics;})()");
  assert.deepEqual(initial,{total:'969 600 ₽',overpay:'219 600 ₽',remainder:'0 ₽',rows:3,yearOptions:3,compare:3},'Custom repayment baseline');
  const selected=await evaluate("(()=>{let p=document.querySelector('#yearPicker');p.value='2';p.dispatchEvent(new Event('change',{bubbles:true}));return {detail:document.querySelector('#yearDetail').textContent,selected:document.querySelectorAll('#rows button[aria-pressed=true]').length}})()");
  assert.ok(selected.detail.startsWith('Год 2:')&&selected.selected===1,'Accessible year navigation');
  const diff=await evaluate("(()=>{document.querySelector('[data-mode=differential]').click();return {total:document.querySelector('#total').textContent,overpay:document.querySelector('#overpay').textContent,mode:location.hash,years:document.querySelectorAll('#rows tr').length}})()");
  assert.equal(diff.total,'696 000 ₽');assert.equal(diff.overpay,'96 000 ₽');assert.equal(diff.mode,'#differential');
  const ann=await evaluate("(()=>{document.querySelector('[data-mode=annuity]').click();const start={total:document.querySelector('#total').textContent,overpay:document.querySelector('#overpay').textContent,rows:document.querySelectorAll('#rows tr').length};const rate=document.querySelector('#rate');rate.value='0';rate.dispatchEvent(new Event('input',{bubbles:true}));const free={total:document.querySelector('#total').textContent,overpay:document.querySelector('#overpay').textContent};const years=document.querySelector('#years');years.value='6';years.dispatchEvent(new Event('input',{bubbles:true}));const six=document.querySelectorAll('#rows tr').length;document.querySelector('#reset').click();const restored={total:document.querySelector('#total').textContent,rows:document.querySelectorAll('#rows tr').length};return {start,free,six,restored};})()");
  assert.deepEqual(ann,{start:{total:'324 000 ₽',overpay:'96 500 ₽',rows:3},free:{total:'227 500 ₽',overpay:'0 ₽'},six:6,restored:{total:'324 000 ₽',rows:3}},'Annuitized/zero-rate/six-year arithmetic');
  assert.match(await evaluate("(()=>{let s=document.querySelector('#prediction');s.value='equal';document.querySelector('#check').click();return document.querySelector('#predictionResult').textContent})()"),/^Верно\./,'Predict-result interaction');
  const dark=await evaluate("(()=>{document.querySelector('#theme').click();return {theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,selected:document.querySelector('#yearPicker').value}})()");
  assert.deepEqual(dark,{theme:'dark',overflow:0,selected:'1'},'Dark theme and responsive lab');
  image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(output,'09-11-lab-'+w+'.png'),Buffer.from(image.data,'base64'));
 }

 await navigate('19.10.26-lab.html',390,844);
 const scenarios=await evaluate("(()=>{const get=()=>document.querySelector('#finalSum').textContent;document.querySelector('[data-preset=base]').click();const base=get();document.querySelector('[data-preset=deposits]').click();const deposits=get();document.querySelector('[data-preset=withdrawal]').click();const withdrawal=get();document.querySelector('[data-preset=variable]').click();const variable=get();return {base,deposits,withdrawal,variable}})()");
 assert.deepEqual(scenarios,{base:'133,1',deposits:'179,3',withdrawal:'128,205',variable:'145,95'},'Deposit model scenario parity');
 await navigate('index.html',390,844);
 const menu=await evaluate("(()=>{const b=document.querySelector('#cabinetMenuToggle');b.click();const opened=b.getAttribute('aria-expanded')==='true'&&getComputedStyle(document.querySelector('#cabinetNavigation')).display!=='none';document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return {opened,closed:b.getAttribute('aria-expanded')==='false'};})()");
 assert.deepEqual(menu,{opened:true,closed:true},'Mobile menu must open and close with Escape');
 await navigate('archive.html',390,844);
 const filtered=await evaluate("(()=>{const input=document.querySelector('#archiveSearch');input.value='15.10.26';input.dispatchEvent(new Event('input',{bubbles:true}));return {count:[...document.querySelectorAll('.archive-tile')].filter(x=>!x.hidden).length,status:document.querySelector('#archiveSearchStatus').textContent}})()");
 assert.equal(filtered.count,1,'Search should find exactly one dated lesson');
 assert.ok(!exceptions.length,'JS errors: '+exceptions.join('\n'));
 assert.ok(!failedResources.length,'Broken local resource links: '+failedResources.join('\n'));
 console.log('Nastya editorial QA PASS: 5 viewports, 2 themes, menu, archive tile geometry, search, loading.');
}finally{
 if(socket)socket.close();
 processChrome.kill('SIGKILL');server.close();
 try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
}
