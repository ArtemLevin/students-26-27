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
if(!chrome)throw Error('Chromium/Chrome is required for browser QA');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
'.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try {
    const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  }catch(_){res.writeHead(500);res.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xenia-browser-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
'--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','pipe','pipe']});
let chromeLog='';for(const stream of [chromeProcess.stdout,chromeProcess.stderr])stream.on('data',chunk=>{chromeLog=(chromeLog+chunk.toString()).slice(-12000)});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const pending=new Map();let serial=0;const jsErrors=[],badRequests=[];
try{
  let port=0;
  for(let i=0;i<150;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
    if(chromeProcess.exitCode!==null)throw Error('Chrome terminated');
    await sleep(100);
  }
  if(!port)throw Error('DevTools port unavailable; chrome='+chrome+' exited='+chromeProcess.exitCode+' output='+chromeLog);
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(x=>x.type==='page');
  assert.ok(target,'Page target missing');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){
      const cb=pending.get(msg.id);pending.delete(msg.id);cb(msg);
    }
    if(msg.method==='Runtime.exceptionThrown')jsErrors.push(
      msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)
      badRequests.push(msg.params.response.url+': '+msg.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const out=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(out.exceptionDetails)throw Error(out.exceptionDetails.exception?.description||out.exceptionDetails.text);
    return out.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const screenshotDir=path.join(root,'xenia-site-review-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/xenia_klykova/site/'+name;
    await call('Page.navigate',{url});
    let result;
    for(let i=0;i<150;i++){
      result=await run('({url:location.href,ready:document.readyState})');
      if(result.url.startsWith(url)&&result.ready==='complete')break;
      if(i===149)throw Error('Page did not load: '+name+' '+JSON.stringify(result));
      await sleep(70);
    }
    await sleep(140);
    await run((name==="index.html"?"document.body.dataset.theme=":"document.documentElement.dataset.theme=")+"'"+(dark?"dark":"light")+"'");
    const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    let offenders=[];
    if(m.scroll>m.client+2){
      offenders=await run("([...document.body.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>document.documentElement.clientWidth+2||r.left< -2}).slice(0,16).map(e=>({tag:e.localName,class:String(e.className?.baseVal||e.className||'').slice(0,60),id:e.id,left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width),formula:e.closest('math')?.getAttribute('aria-label')?.slice(0,140),parents:[e.parentElement?.localName,e.parentElement?.className?.baseVal||e.parentElement?.className,e.parentElement?.parentElement?.localName,e.parentElement?.parentElement?.className?.baseVal||e.parentElement?.parentElement?.className]})))");
    }
    assert.ok(m.scroll<=m.client+2,name+' '+width+' '+(dark?'dark':'light')+
      ' horizontal overflow '+JSON.stringify({m,offenders}));
  }
  async function snapshot(filename){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshotDir,filename+'.png'),Buffer.from(shot.data,'base64'));
  }
  for(const [w,h] of [[1440,900],[390,844],[375,812]]){
    for(const page of ['09.10.26.html','09.10.26-lab.html','index.html']){
      await navigate(page,w,h,false);
      await snapshot(page.replace('.html','')+'-'+w+'-light');
      await navigate(page,w,h,true);
      await snapshot(page.replace('.html','')+'-'+w+'-dark');
    }
  }
  await navigate('09.10.26.html',1440,900);
  assert.ok(await run("document.querySelectorAll('math').length >= 75"),'lesson should render MathML formulas');
  assert.equal(await run("document.querySelector('.equation math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  assert.equal(await run("(()=>{document.querySelector('#checks input').click();return document.querySelector('#progressText').textContent})()"),'1 из 5');
  assert.equal(await run("(()=>{document.querySelector('#answers').open=true;return document.querySelectorAll('#answers li').length})()"),10);
  assert.equal(await run("document.querySelector('a[href=\"09.10.26-lab.html\"]')!==null"),true);
  assert.equal(await run("document.querySelector('img.poster').getAttribute('src')"),'../images/09.10.26.png');
  await navigate('09.10.26-lab.html',1440,900);
  const labMathCount=await run("document.querySelectorAll('math').length");
  assert.ok(labMathCount>=12,'lab should render static MathML: '+labMathCount);
  assert.equal(await run("document.querySelector('#calculation math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  const testTime=async value=>run("(()=>{const slider=document.querySelector('#time');slider.value='"+value+"';slider.dispatchEvent(new Event('input',{bubbles:true}));return [document.querySelector('#timeValue').textContent,document.querySelector('#heightValue').textContent,document.querySelector('#status').textContent]})()");
  let r=await testTime('0');assert.ok(r[1].startsWith('2 м'),JSON.stringify(r));
  r=await testTime('1.4');assert.ok(r[1].startsWith('11,8 м')&&r[2].includes('Выше 10 м'),JSON.stringify(r));
  assert.equal(await run("document.querySelector('#calculation math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  assert.equal(await run("document.querySelector('#calculation msup mn:last-child')?.textContent"),'2');
  r=await testTime('2');assert.ok(r[1].startsWith('10 м')&&r[2].includes('На границе'),JSON.stringify(r));
  r=await testTime('2.8');assert.ok(r[1].startsWith('2 м'),JSON.stringify(r));
  assert.equal(await run("(()=>{document.querySelector('#reset').click();return document.querySelector('#timeValue').textContent})()"),'0,8 с');
  assert.ok((await run("(()=>{document.querySelector('#same').click();return document.querySelector('#feedback').textContent})()")).includes('Верно'));
  assert.equal(await run("(()=>{const e=document.querySelector('#time');e.focus();return document.activeElement===e})()"),true);

  // New 12 October publication: independent visual and interactive regression.
  for(const [w,h] of [[1440,900],[390,844],[375,812]]){
    for(const page of ['12.10.26.html','12.10.26-lab.html']){
      await navigate(page,w,h,false);
      await snapshot(page.replace('.html','')+'-'+w+'-light');
      await navigate(page,w,h,true);
      await snapshot(page.replace('.html','')+'-'+w+'-dark');
    }
  }
  await navigate('12.10.26.html',1440,900);
  assert.equal(await run("document.querySelectorAll('#tasklist input').length"),10);
  assert.equal(await run("(()=>{document.querySelector('#tasklist input').click();return document.querySelector('#progressText').textContent})()"),'Выполнено: 1 из 10');
  assert.equal(await run("document.querySelector('a[href=\"12.10.26-lab.html#euclid\"]')!==null"),true);
  await navigate('12.10.26-lab.html',1440,900);
  assert.equal(await run("document.querySelector('#gcd').textContent"),'24');
  assert.equal(await run("(()=>{document.querySelector('#next').click();return document.querySelector('#stepCount').textContent})()"),'1 / 3');
  assert.equal(await run("(()=>{location.hash='#pairs';return location.hash})()"),'#pairs');
  await sleep(100);
  assert.equal(await run("document.querySelector('#pairCount').textContent"),'2');
  assert.equal(await run("(()=>{const e=document.querySelector('#pairScenario');e.value='12,360';e.dispatchEvent(new Event('change'));return document.querySelector('#pairCount').textContent})()"),'4');
  // 14 October: responsive page, live Horner division and rational sign experiment.
  for(const [w,h] of [[1440,900],[390,844],[375,812]]){
    for(const page of ['14.10.26.html','14.10.26-lab.html']){
      await navigate(page,w,h,false);
      await snapshot(page.replace('.html','')+'-'+w+'-light');
      await navigate(page,w,h,true);
      await snapshot(page.replace('.html','')+'-'+w+'-dark');
    }
  }
  await navigate('14.10.26.html',1440,900);
  assert.ok(await run("document.querySelectorAll('math').length >= 90"),'lesson should render native MathML');
  assert.ok(await run("document.querySelectorAll('msup').length >= 40"));
  assert.ok(await run("document.querySelectorAll('mfrac').length >= 5"));
  assert.equal(await run("document.querySelector('.eq math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  assert.equal(await run("document.querySelectorAll('#tasklist math').length >= 10"),true);
  assert.equal(await run("document.querySelectorAll('.answers math').length >= 10"),true);
  assert.equal(await run("document.querySelectorAll('.logic foreignObject math').length"),7);
  assert.equal(await run("document.querySelectorAll('#tasklist input').length"),10);
  assert.ok(await run("document.querySelector('a[href=\"14.10.26-lab.html#intervals\"]')!==null"));
  await navigate('14.10.26-lab.html',1440,900);
  assert.ok(await run("document.querySelectorAll('math').length >= 45"),'lab should render native MathML');
  assert.ok(await run("document.querySelector('mfrac')!==null && document.querySelector('msup')!==null"));
  assert.equal(await run("document.querySelector('#tableR math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  assert.equal(await run("document.querySelectorAll('.graph foreignObject math').length"),8);
  assert.equal(await run("document.querySelector('#tableR').textContent"),'0');
  assert.equal(await run("(()=>{const r=document.querySelector('#aRange');r.value='1';r.dispatchEvent(new Event('input'));return document.querySelector('#tableR').textContent})()"),'84');
  assert.equal(await run("document.querySelector('#quotient math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  assert.equal(await run("document.querySelector('#remainder math').namespaceURI"),'http://www.w3.org/1998/Math/MathML');
  assert.ok(await run("(()=>{const r=document.querySelector('#xRange');r.value='1.5';r.dispatchEvent(new Event('input'));return document.querySelector('#signExplanation').textContent.includes('исключается')})()"));
  // 15 October: new number-theory lesson, interactive remainders and candidate verification.
  for(const [w,h] of [[1440,900],[390,844]]){
    for(const page of ['15.10.26.html','15.10.26-lab.html']){
      await navigate(page,w,h,false);
      await snapshot(page.replace('.html','')+'-'+w+'-light');
      await navigate(page,w,h,true);
      await snapshot(page.replace('.html','')+'-'+w+'-dark');
    }
  }
  await navigate('15.10.26.html',1440,900);
  assert.ok(await run("document.querySelectorAll('.content math').length >= 150"),'lesson should use semantic MathML');
  assert.ok(await run("[...document.querySelectorAll('.content math')].every(m=>m.namespaceURI==='http://www.w3.org/1998/Math/MathML')"),'lesson MathML namespace');
  assert.ok(await run("[...document.querySelectorAll('.eq')].every(e=>e.firstElementChild?.localName==='math'&&e.firstElementChild.getAttribute('display')==='block')"),'display equations use MathML');
  assert.ok(await run("[...document.querySelectorAll('.tasks details math')].length >= 15"),'answer hints use MathML');
  await navigate('15.10.26-lab.html?case=seven',1440,900);
  assert.ok(await run("['aLabel','bLabel','aValue','bValue','aDivision','bDivision','identity','identityValue','rule'].every(id=>document.getElementById(id).querySelector('math')?.namespaceURI==='http://www.w3.org/1998/Math/MathML')"),'lab must render MathML for every live mathematical result');
  assert.equal(await run("document.querySelector('#aValue').textContent"),'14');
  assert.equal(await run("document.querySelector('#bValue').textContent"),'35');
  assert.ok(await run("document.querySelector('#conclusion').textContent.includes('Оба выражения')"));
  assert.equal(await run("(()=>{const x=document.querySelector('#nRange');x.value='1';x.dispatchEvent(new Event('input'));return document.querySelector('#aValue').textContent})()"),'5');
  assert.ok(await run("document.querySelector('#aDivision math mn')!==null && document.querySelector('#identityValue math')?.namespaceURI==='http://www.w3.org/1998/Math/MathML'"),'MathML survives reactive recomputation');
  assert.ok(await run("document.querySelector('#explanation').textContent.includes('не гарантирует')"));
  await navigate('15.10.26-lab.html?case=three',1440,900);
  assert.equal(await run("document.querySelector('#aValue').textContent"),'6');
  assert.equal(await run("document.querySelector('#bValue').textContent"),'3');
  assert.equal(await run("document.querySelector('#identityValue').textContent"),'2 × 6 − 5 × 3 = -3');
  await navigate('index.html',1440,900);
  await sleep(400);
  assert.equal(await run("document.querySelector('#lesson-title').textContent"),'Делимость. Искусство исключать');
  assert.equal(await run("document.querySelector('#latestLessonCta').getAttribute('href')"),'15.10.26.html');
  assert.equal(await run("document.querySelector('#latestPdfLink').hidden"),false);
  assert.equal(await run("document.querySelector('#latestTexLink').getAttribute('href')"),'../tex_docs/15.10.26.tex');
  assert.equal(await run("document.querySelectorAll('#recentLessons a').length"),3);
  // Anna Bannova visual reference: open editorial layout instead of permanent desktop sidebar.
  assert.equal(await run("getComputedStyle(document.querySelector('#sidebar')).position"),'relative');
  assert.equal(await run("getComputedStyle(document.querySelector('.atlas-ledger .map-stats')).display"),'grid');
  assert.ok(await run("document.querySelector('#lessonArchive').contains(document.querySelector('#recentLessons'))"));
  assert.ok(await run("document.querySelector('.atlas-catalog').contains(document.querySelector('#topicIndex'))"));
  assert.equal(await run("getComputedStyle(document.querySelector('#atlasTitle')).fontFamily.includes('Georgia')"),true);
  assert.ok(await run("document.querySelectorAll('#radialMap .radial-cell').length>200"),'circular skills must load');
  await navigate('index.html',390,844,false);
  await sleep(300);
  assert.equal(await run("getComputedStyle(document.querySelector('.mobile-bar')).display"),'flex');
  assert.equal(await run("getComputedStyle(document.querySelector('#sidebar')).position"),'fixed');
  assert.equal(await run("document.querySelector('#lessonArchive').contains(document.querySelector('#recentLessons'))"),true);
  assert.equal(await run("(()=>{document.querySelector('#menuButton').click();return document.querySelector('#menuButton').getAttribute('aria-expanded')})()"),'true');
  assert.equal(await run("(()=>{document.querySelector('#sidebarClose').click();return document.querySelector('#menuButton').getAttribute('aria-expanded')})()"),'false');
  assert.deepEqual(jsErrors,[],'JavaScript exceptions');
  assert.deepEqual(badRequests,[],'Network errors');
  console.log('Xenia 09.10 and 12.10 browser QA PASS: 30 layouts, interactive checks and network');
}finally{
  try{ws?.close()}catch(_){}
  chromeProcess.kill('SIGKILL');server.close();
  if(chromeProcess.exitCode===null){
    await new Promise(resolve=>{
      const timeout=setTimeout(resolve,2500);
      chromeProcess.once('exit',()=>{clearTimeout(timeout);resolve();});
    });
  }
  try{
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:15,retryDelay:100});
  }catch(error){
    if(error.code!=='ENOTEMPTY'&&error.code!=='EBUSY')throw error;
    console.warn('Chromium profile cleanup deferred to ephemeral CI runner');
  }
}