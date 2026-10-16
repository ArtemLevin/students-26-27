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
'--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
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
  if(!port)throw Error('DevTools port unavailable');
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
  const screenshotDir=path.join(root,'xenia-browser-artifacts');
  fs.mkdirSync(screenshotDir,{recursive:true});
  async function navigate(name,width,height,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/xenia_vasilchenko/site/'+name;
    await call('Page.navigate',{url});
    let result;
    for(let i=0;i<150;i++){
      result=await run('({url:location.href,ready:document.readyState})');
      if(result.url.startsWith(url)&&result.ready==='complete')break;
      if(i===149)throw Error('Page did not load: '+name+' '+JSON.stringify(result));
      await sleep(70);
    }
    await sleep(140);
    await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
    const m=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(m.scroll<=m.client+2,name+' '+width+' '+(dark?'dark':'light')+
      ' horizontal overflow '+JSON.stringify(m));
  }
  async function snapshot(filename){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(screenshotDir,filename+'.png'),Buffer.from(shot.data,'base64'));
  }
  for(const [w,h,cols] of [[1440,900,3],[1024,768,2],[768,1024,2],[390,844,1],[360,800,1]]){
    await navigate('index.html',w,h,false);
    const home=await run("(()=>({id:document.querySelector('#pageTitle')?.textContent,lessons:document.querySelector('#lesson-title')?.textContent,skills:document.querySelectorAll('.map-cell').length,stat:document.querySelector('#totalCount')?.textContent,practice:document.querySelector('#latestPracticeLink')?.getAttribute('href'),layout:document.querySelector('.map-layout')?.getBoundingClientRect().width}))()");
    assert.match(home.id,/6 класса/,JSON.stringify(home));
    assert.match(home.lessons,/Дроби, уравнения/,JSON.stringify(home));
    assert.ok(home.skills>=200,'Skill map not loaded '+JSON.stringify(home));
    assert.equal(Number(home.stat),home.skills,'Real skill total mismatch');
    assert.equal(home.practice,'15.10.26.html#practice');
    const personal=await run("document.querySelector('#latestLessonStatus')?.textContent");
    assert.ok(!/\b(?:[a-z]+_\d+|t19_divisibility)\b/i.test(personal),'Raw internal skill IDs');
    if(w<=390){
      assert.equal(await run("(()=>{const b=document.querySelector('#menuButton');b.click();return b.getAttribute('aria-expanded')==='true'&&!document.querySelector('#mobileMenu').hidden})()"),true,'menu open');
      assert.equal(await run("(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return document.querySelector('#mobileMenu').hidden&&document.querySelector('#menuButton').getAttribute('aria-expanded')==='false'})()"),true,'menu close');
    }
    await navigate('index.html',w,h,true);
    await navigate('archive.html',w,h,false);
    await run("document.fonts.ready.then(()=>true)");
    const layout=await run("(()=>{const cards=[...document.querySelectorAll('.archive-tile')],heights=cards.map(c=>Math.round(c.getBoundingClientRect().height)),grid=document.querySelector('.archive-month-grid');return {cards:cards.length,heights:[...new Set(heights)],clipped:cards.filter(c=>c.scrollHeight>c.clientHeight+2).length,columns:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').length:0,root:document.querySelector('#archiveRoot').getAttribute('aria-busy'),months:document.querySelectorAll('.archive-month').length}})()");
    assert.equal(layout.cards,11,'Archive must follow current registry '+JSON.stringify(layout));
    assert.ok(layout.months>=2,'Grouped by month '+JSON.stringify(layout));
    assert.equal(layout.columns,cols,'Breakpoints '+JSON.stringify(layout));
    assert.equal(layout.heights.length,1,'Unequal archive tile heights '+JSON.stringify(layout));
    assert.equal(layout.clipped,0,'Clipped descriptions '+JSON.stringify(layout));
    assert.equal(layout.root,'false','Archive has not loaded '+JSON.stringify(layout));
    assert.equal(await run("(()=>{const x=document.querySelector('#archiveSearch');x.value='НОД';x.dispatchEvent(new Event('input',{bubbles:true}));return document.querySelectorAll('.archive-tile:not([hidden])').length>0&&document.querySelectorAll('.archive-tile[hidden]').length>0})()"),true,'Archive search filter');
    assert.equal(await run("(()=>{const x=document.querySelector('#archiveSearch');x.value='';x.dispatchEvent(new Event('input',{bubbles:true}));return document.querySelectorAll('.archive-tile:not([hidden])').length})()"),11,'Clear archive search');
    const theme=await run("(()=>{document.querySelector('#archiveTheme').click();return document.body.dataset.theme||'dark'})()");
    assert.equal(theme,'dark','Archive dark mode toggle');
    if(w===1440){await snapshot('editorial-home-archive-desktop');}
    if(w===390){await snapshot('editorial-archive-mobile');}
  }
  await navigate('index.html',1440,900,false);
  assert.equal(await run("(()=>{document.querySelector('#themeToggle').click();return document.documentElement.dataset.theme})()"),'dark','Dashboard theme');
  assert.equal(await run("document.querySelector('#topicCatalog')?.children.length>0"),true,'Text catalog retained');
  assert.equal(await run("document.querySelector('#topicDialog')?.tagName"),'DIALOG','Skill dialog retained');
  assert.deepEqual(jsErrors,[],'JavaScript runtime errors');
  assert.deepEqual(badRequests,[],'HTTP resource failures');
  console.log('Vasilchenko editorial browser QA PASS: 5 viewports, map, menu, archive, search, equal tiles and themes');
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