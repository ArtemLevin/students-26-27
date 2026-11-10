import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium/Chrome is required; browser QA may not be skipped');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try {
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(_){res.writeHead(500);res.end('server error')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'jaroslav-editorial-'));
const processChrome=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',
 '--user-data-dir='+profile],{stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;
try{
  let port=0;
  for(let n=0;n<160;n++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break}
    if(processChrome.exitCode!==null)throw Error('Chromium quit prematurely');
    await delay(100);
  }
  if(!port)throw Error('Chromium DevTools port unavailable');
  const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=pages.find(p=>p.type==='page');
  assert.ok(target,'Browser page target absent');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let nextId=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)){
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if(message.method==='Runtime.exceptionThrown'){
      errors.push(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text);
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');
  const images=path.join(root,'jaroslav-editorial-browser-artifacts');
  fs.mkdirSync(images,{recursive:true});
  async function screen(name){
    const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(images,name+'.png'),Buffer.from(r.data,'base64'));
  }
  async function visit(file,w,h,dark){
    errors.length=0;
    await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<=768});
    const url=origin+'/students/jaroslav_vereschagin/site/'+file;
    await call('Page.navigate',{url});
    for(let n=0;n<120;n++){
      const state=await evaluate('({url:location.href,ready:document.readyState,items:document.querySelectorAll(".archive-tile").length,cells:document.querySelectorAll(".radial-cell").length})');
      if(state.url.startsWith(url)&&state.ready==='complete'&&
        (file==='archive.html'?state.items>0:state.cells>0))break;
      if(n===119)throw Error('Page did not load fully: '+file+' '+JSON.stringify(state));
      await delay(80);
    }
    await delay(160);
    if(dark){
      await evaluate(file==='archive.html'
        ? 'document.body.hasAttribute("data-theme") && document.getElementById("archiveTheme").click()'
        : 'document.documentElement.dataset.theme !== "dark" && document.getElementById("themeToggle").click()');
    }
    const shape=await evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
    assert.ok(shape.scroll<=shape.width+2,file+' @ '+w+' '+JSON.stringify(shape));
    assert.deepEqual(errors,[],file+' uncaught JavaScript exceptions');
  }
  const widths=[[1440,900],[1024,768],[768,1024],[390,844],[360,800]];
  for(const [w,h] of widths){
    await visit('index.html',w,h,false);
    const status=await evaluate('({cells:document.querySelectorAll(".radial-cell").length,stats:document.getElementById("evaluatedCount").textContent,latest:document.querySelector(".editorial-lesson .start-card strong").textContent,nav:document.querySelector(".editorial-nav").getBoundingClientRect().width})');
    assert.ok(status.cells>=300,'The student circular map must retain 324 skills');
    assert.match(status.stats,/^\d+$/,'Statistics should come from rendered competency levels');
    assert.ok(status.latest.trim()!=='', 'Recent lesson must render');
    if(w===390) {
      assert.equal(await evaluate('document.getElementById("menuButton").getAttribute("aria-expanded")'),'false');
      await evaluate('document.getElementById("menuButton").click()');
      assert.equal(await evaluate('document.getElementById("menuButton").getAttribute("aria-expanded")'),'true');
      await evaluate('document.getElementById("closeMenu").click()');
      assert.equal(await evaluate('document.getElementById("menuButton").getAttribute("aria-expanded")'),'false');
    }
    if(w===1440||w===390)await screen('index-'+w);
    await visit('archive.html',w,h,false);
    const cards=await evaluate('([...document.querySelectorAll(".archive-tile")].map(x=>({h:Math.round(x.getBoundingClientRect().height),scroll:x.scrollHeight,client:x.clientHeight,title:x.querySelector(".archive-tile-title").textContent})))');
    const {LESSONS: registeredLessons} = await import('../lesson-registry.js');
    assert.equal(cards.length,registeredLessons.length,'Archive should display every published lesson');
    assert.ok(Math.max(...cards.map(c=>c.h))-Math.min(...cards.map(c=>c.h))<=2,'All archive tiles must be uniform across months');
    for(const card of cards)assert.ok(card.scroll<=card.client+2,'Archive text must remain uncut: '+card.title);
    const columns=await evaluate('getComputedStyle(document.querySelector(".archive-month-grid")).gridTemplateColumns.split(" ").length');
    assert.equal(columns,w>1030?3:w>700?2:1,'Archive grid should use 3/2/1 columns');
    if(w===1440||w===390)await screen('archive-'+w);
    if(w===390){
      const filtering=await evaluate('(()=>{const a=document.getElementById("archiveSearch");a.value="15.10.26";a.dispatchEvent(new Event("input",{bubbles:true}));return [...document.querySelectorAll(".archive-tile")].filter(x=>!x.hidden).length})()');
      assert.equal(filtering,1,'Archive search by date must work');
    }
  }
  await visit('index.html',390,844,true);
  assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');
  await screen('index-dark-390');
  await visit('archive.html',390,844,true);
  assert.equal(await evaluate('!document.body.hasAttribute("data-theme")'),true);
  await screen('archive-dark-390');
  await visit('index.html',1440,900,false);
  const testMap=await evaluate('(()=>{const x=document.querySelector(".radial-cell");x.dispatchEvent(new MouseEvent("click",{bubbles:true}));return document.getElementById("topicDialog").open})()');
  assert.ok(testMap,'Clicking a competence must open its existing dialog');
  await evaluate('document.getElementById("dialogClose").click()');
  assert.deepEqual(errors,[],'No JS exceptions after interactions');

  // Regression checks for the 23 October rational-inequality lesson and its simulator.
  for(const [file,width,height] of [
    ['23.10.26.html',1440,900],['23.10.26.html',390,844],
    ['23.10.26-lab.html',1440,900],['23.10.26-lab.html',390,844]
  ]){
    errors.length=0;
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/jaroslav_vereschagin/site/'+file;
    await call('Page.navigate',{url});
    for(let i=0;i<120;i++){
      const done=await evaluate('({url:location.href,ready:document.readyState})');
      if(done.url.startsWith(url)&&done.ready==='complete')break;
      if(i===119)throw Error('New lesson/lab did not finish loading: '+file);
      await delay(80);
    }
    await delay(100);
    const state=await evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
    assert.ok(state.scroll<=state.width+2,file+' viewport overflow @ '+width+': '+JSON.stringify(state));
    assert.deepEqual(errors,[],file+' JS exceptions');
    if(file.endsWith('-lab.html')){
      const basic=await evaluate('({n:document.getElementById("num").value,d:document.getElementById("den").value,v:document.getElementById("value").value})');
      assert.deepEqual(basic,{n:'1',d:'-1',v:'-1'},'basic sample x=0 must equal -1');
      const hole=await evaluate('(()=>{const i=document.getElementById("x");i.value="1";i.dispatchEvent(new Event("input",{bubbles:true}));return document.getElementById("sampleResult").textContent})()');
      assert.match(hole,/Вне ОДЗ/,'denominator x=1 should be excluded');
      const derived=await evaluate('(()=>{document.querySelector("[data-mode=constant]").click();const i=document.getElementById("x");i.value="-4";i.dispatchEvent(new Event("input",{bubbles:true}));return {n:document.getElementById("num").value,d:document.getElementById("den").value,v:document.getElementById("value").value}})()');
      assert.equal(derived.n,'-20');assert.equal(derived.d,'-12');
      assert.ok(Number(derived.v.replace(',','.'))>0,'negative numerator / negative denominator must be positive');
      const canceled=await evaluate('(()=>{document.querySelector("[data-mode=cancellation]").click();const i=document.getElementById("x");i.value="3";i.dispatchEvent(new Event("input",{bubbles:true}));return document.getElementById("sampleResult").textContent})()');
      assert.match(canceled,/Вне ОДЗ/,'canceled x=3 must remain excluded');
      const expectations=[
        ['basic','(−∞; −1] ∪ (1; +∞)'],
        ['quadratic','(−∞; 2] ∪ [3; 5) ∪ (7; +∞)'],
        ['constant','(−8; −1)'],
        ['cubic','(−5/3; 0] ∪ (5/3; +∞)'],
        ['cancellation','(−∞; −2] ∪ (1; 3) ∪ (3; +∞)'],
        ['double','(−∞; −1) ∪ (−1; 2) ∪ (4; +∞)']
      ];
      for(const [mode,want] of expectations){
        const state=await evaluate('(()=>{document.querySelector("[data-mode='+mode+']").click();return {formula:document.getElementById("formula").textContent,answer:document.getElementById("answer").textContent,hash:location.hash,title:document.querySelector("#axis title")?.textContent,desc:document.querySelector("#axis desc")?.textContent,labels:document.querySelectorAll("#rootJump button").length}})()');
        assert.equal(state.answer,'x ∈ '+want,mode+' computed solution');
        assert.equal(state.hash,'#'+mode,mode+' deep link');
        assert.ok(state.title&&state.desc,mode+' SVG accessible name and description');
        assert.ok(state.labels>=2,mode+' critical-point buttons');
      }
      const signSwitch=await evaluate('(()=>{document.querySelector("[data-mode=basic]").click();const op=document.getElementById("operator");op.value="<=";op.dispatchEvent(new Event("change",{bubbles:true}));return {formula:document.getElementById("formula").textContent,answer:document.getElementById("answer").textContent}})()');
      assert.match(signSwitch.formula,/≤ 0$/,'operator and rendered formula must stay synchronized');
      assert.equal(signSwitch.answer,'x ∈ [−1; 1)','switching operator must solve the new inequality');
      const exactBoundary=await evaluate('(()=>{document.querySelector("[data-mode=cubic]").click();const b=[...document.querySelectorAll("#rootJump button")].find(b=>b.textContent.includes("−5/3"));b.click();return {x:document.getElementById("xLabel").value,result:document.getElementById("sampleResult").textContent}})()');
      assert.equal(exactBoundary.x,'−5/3','root controls must select exact rational values');
      assert.match(exactBoundary.result,/Вне ОДЗ/,'exact rational denominator root must be excluded');
      const reset=await evaluate('(()=>{document.getElementById("reset").click();return {x:document.getElementById("xLabel").value,operator:document.getElementById("operator").value}})()');
      assert.equal(reset.x,'1','cubic reset returns to explanatory sample x=1');
      assert.equal(reset.operator,'>=','reset restores source inequality sign');
      if(width===390)await screen('23.10.26-lab-mobile-after-all-modes');

    }else{
      assert.equal(await evaluate('document.querySelectorAll("#taskList input").length'),10,'10 Path A tasks');
      const typeset=await evaluate('({count:document.querySelectorAll("#taskList math mfrac").length,labels:document.querySelectorAll("#taskList input[aria-label]").length})');
      assert.equal(typeset.count,10,'every Path A fraction must be MathML');
      assert.equal(typeset.labels,0,'wrapped checkbox label must include mathematical expression');
      const fullLesson=await evaluate('({first:document.querySelector("#roots .problem")?.textContent,repeat:document.getElementById("double-root-example")?.textContent,deep:document.querySelector("#double-root-example a")?.getAttribute("href")})');
      assert.match(fullLesson.first,/x = 3/,'source example is restored');
      assert.match(fullLesson.repeat,/двойной корень/i,'source repeated-root example is restored');
      assert.equal(fullLesson.deep,'23.10.26-lab.html#double','repeated root deep link');
      assert.ok(await evaluate('document.getElementById("normal") && document.getElementById("substitute")'),'lesson sections');
    }
    if(width===390)await screen(file.replace('.html','')+'-390');

    // Explicitly inspect both visual themes and print output for every new page.
    const toggleId=file.endsWith('-lab.html')?'theme':'themeButton';
    const themes=await evaluate('(()=>{const b=document.getElementById("'+toggleId+'");if(document.documentElement.dataset.theme!=="light")b.click();const light=getComputedStyle(document.body).backgroundColor;b.click();const dark=getComputedStyle(document.body).backgroundColor;return {light,dark,selected:document.documentElement.dataset.theme,label:b.getAttribute("aria-label")}})()');
    assert.equal(themes.selected,'dark',file+' dark theme must be enabled');
    assert.notEqual(themes.light,themes.dark,file+' light and dark backgrounds must differ');
    assert.match(themes.label,/светлую/,file+' theme control must announce the reverse action');
    if(width===390)await screen(file.replace('.html','')+'-dark-390');
    await evaluate('document.getElementById("'+toggleId+'").click()');
    const pdf=await call('Page.printToPDF',{printBackground:true});
    assert.ok(pdf.data.length>1500,file+' print preview should produce a real PDF');

    assert.deepEqual(errors,[],file+' JS errors after interactions');
  }

  // 09 November river movement release gate: both pages, learning route and physical simulator.
  const riverOrigin=origin+'/students/jaroslav_vereschagin/site/';
  async function visitRiver(file,w,h,suffix='',forceLight=true){
    errors.length=0;
    await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<=768});
    const url=riverOrigin+file+suffix;
    await call('Page.navigate',{url});
    for(let n=0;n<120;n++){
      const ready=await evaluate('({ready:document.readyState,url:location.href})');
      if(ready.url===url&&ready.ready==='complete')break;
      if(n===119)throw Error('River page did not load: '+file+' @ '+w);
      await delay(80);
    }
    await delay(70);
    if(forceLight)await evaluate('(()=>{if(document.documentElement.dataset.theme==="dark")document.getElementById("themeToggle").click()})()');
    const layout=await evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
    assert.ok(layout.scroll<=layout.width+2,file+' viewport overflow '+w+' '+JSON.stringify(layout));
    assert.deepEqual(errors,[],file+' unhandled browser errors @ '+w);
  }
  for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]]){
    await visitRiver('09.11.26.html',width,height);
    const lesson=await evaluate('({tasks:document.querySelectorAll("#taskList>li").length,examples:document.querySelectorAll(".case").length,solutions:document.querySelectorAll(".solution").length,math:document.querySelectorAll("math").length,links:[...document.querySelectorAll(".case-lab")].map(a=>a.getAttribute("href"))})');
    assert.equal(lesson.tasks,10,'10 exact Path A exercises');
    assert.equal(lesson.examples,4,'4 worked cases from the handbook');
    assert.equal(lesson.solutions,4,'4 accessible progressive disclosures');
    assert.ok(lesson.math>=7,'MathML formulas are present');
    assert.deepEqual(lesson.links,["09.11.26-lab.html?mode=t42","09.11.26-lab.html?mode=t43","09.11.26-lab.html?mode=t44","09.11.26-lab.html?mode=t45"]);
    if(width===390||width===1440)await screen('09.11.26-lesson-'+width+'-light');
    await visitRiver('09.11.26-lab.html',width,height,'?mode=t42');
    const t42=await evaluate('({first:document.getElementById("outLabel").textContent,back:document.getElementById("returnLabel").textContent,t1:document.getElementById("outTime").textContent,t2:document.getElementById("returnTime").textContent,total:document.getElementById("boatTotal").textContent,disabled:document.getElementById("showRaft").disabled})');
    assert.match(t42.first,/против течения/,'T4.2 must start upstream');
    assert.match(t42.back,/по течению/,'T4.2 return downstream');
    assert.equal(t42.t1,'6 ч');assert.equal(t42.t2,'3 ч');assert.equal(t42.total,'9 ч');
    assert.ok(t42.disabled,'raft moving outside the upstream segment must not be drawn');
    const flow=await evaluate('({text:document.getElementById("flowCaption").textContent,visible:getComputedStyle(document.getElementById("flowCaption")).display,letter:getComputedStyle(document.querySelector(".river>text:not(#flowLabel)")).fontSize})');
    assert.match(flow.text,/течение направлено к A/i,'Current direction follows source scenario');
    if(width<=650){assert.equal(flow.visible,'block','Mobile model has a readable current-direction caption');assert.ok(parseFloat(flow.letter)>=26,'A/B labels are enlarged on mobile SVG');}
    if(width===390||width===1440)await screen('09.11.26-lab-'+width+'-t42');
    if(width===390){await evaluate('document.getElementById("riverSvg").scrollIntoView({block:"center",behavior:"instant"})');await delay(50);await screen('09.11.26-lab-390-route-detail');await evaluate('document.getElementById("chartSvg").scrollIntoView({block:"center",behavior:"instant"})');await delay(50);await screen('09.11.26-lab-390-chart-detail');}
    assert.deepEqual(errors,[],'No simulator errors after t42 initialization');
  }
  await visitRiver('09.11.26.html',390,844);
  const lessonInteraction=await evaluate('(()=>{document.querySelector(".solution summary").click();const opened=document.querySelector(".solution").open;const b=document.querySelector("#taskList input");b.checked=true;b.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector(".q .opts button:nth-child(2)").click();return {opened,progress:document.getElementById("taskProgress").textContent,feedback:document.querySelector(".feedback").textContent}})()');
  assert.equal(lessonInteraction.opened,true);
  assert.match(lessonInteraction.progress,/1 из 10/);
  assert.match(lessonInteraction.feedback,/Верно/);
  const resources=await evaluate('(async()=>{const urls=["../pdf_docs/09.11.26.pdf","../tex_docs/09.11.26.tex","09.11.26-lab.html?mode=t42"];return Promise.all(urls.map(async href=>({href,status:(await fetch(href)).status})))})()');
  assert.ok(resources.every(x=>x.status===200),'PDF, TeX and laboratory links must load: '+JSON.stringify(resources));
  const darkLesson=await evaluate('(()=>{document.getElementById("themeToggle").click();return {theme:document.documentElement.dataset.theme,bg:getComputedStyle(document.body).backgroundColor}})()');
  assert.equal(darkLesson.theme,'dark');
  await screen('09.11.26-lesson-390-dark');
  const printed=await call('Page.printToPDF',{printBackground:true});
  assert.ok(printed.data.length>1500,'09 November lesson print preview');
  const afterPrint=await evaluate('({open:document.querySelector(".solution").open,answerOpen:document.getElementById("answers").open})');
  assert.equal(afterPrint.open,true,'Previously opened solution remains open after printing');
  assert.equal(afterPrint.answerOpen,false,'Answer key returns to its previous state after printing');

  await visitRiver('09.11.26-lab.html',390,844,'?mode=t45',false);
  const initialLab=await evaluate('({out:document.getElementById("outTime").textContent,back:document.getElementById("returnTime").textContent,boat:document.getElementById("boatTotal").textContent,total:document.getElementById("allTime").textContent,theme:document.documentElement.dataset.theme})');
  assert.deepEqual(initialLab,{out:'4 ч',back:'6 ч',boat:'10 ч',total:'13 ч',theme:'dark'},'Theme persists from lesson and T4.5 durations match source');
  const raft=await evaluate('(()=>{const t=document.getElementById("timeSlider");t.value=t.max;t.dispatchEvent(new Event("input",{bubbles:true}));return document.getElementById("raftDist").textContent})()');
  assert.equal(raft,'39 км','raft moves exactly 39 km during T4.5');
  for(const [mode,total,first,back] of [['t43','12 ч','4 ч','5 ч'],['t44','11 ч','3 ч','4 ч'],['t45','10 ч','4 ч','6 ч']]){
    const actual=await evaluate('(()=>{const p=document.getElementById("preset");p.value="'+mode+'";p.dispatchEvent(new Event("change",{bubbles:true}));return {boat:document.getElementById("boatTotal").textContent,out:document.getElementById("outTime").textContent,back:document.getElementById("returnTime").textContent}})()');
    assert.deepEqual(actual,{boat:total,out:first,back},mode+' speed-time consistency');
  }
  const limit=await evaluate('(()=>{const x=document.getElementById("x"),u=document.getElementById("u");x.value="4";x.dispatchEvent(new Event("input",{bubbles:true}));u.value="8";u.dispatchEvent(new Event("input",{bubbles:true}));return {x:x.value,u:u.value,notice:document.getElementById("limitNote").textContent,boat:document.getElementById("boatTotal").textContent}})()');
  assert.ok(Number(limit.x)>Number(limit.u),'Physical constraint x > u');
  assert.match(limit.notice,/ограничена/);
  assert.doesNotMatch(limit.boat,/NaN|Infinity/);
  await evaluate('document.getElementById("themeToggle").click()');
  await screen('09.11.26-lab-390-light');
  const labPrint=await call('Page.printToPDF',{printBackground:true});
  assert.ok(labPrint.data.length>1500,'09 November lab print preview');
  assert.deepEqual(errors,[],'No browser exceptions during interactive river scenarios');

  console.log('Jaroslav QA passed: dashboard, archive, 23 October and 09 November lessons with their interactive laboratories');

}finally{
  try{ws?.close()}catch(_){}
  processChrome.kill('SIGTERM');server.close();
  try { fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch (_) { /* Chrome may still own its profile. */ }
}
