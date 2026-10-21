import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(result=>result.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium or Chrome is required for release QA');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css',
'.json':'application/json','.png':'image/png','.svg':'image/svg+xml',
'.pdf':'application/pdf','.tex':'application/x-tex'};
const server=http.createServer((req,res)=>{
  try{
    const uri=new URL(req.url,'http://localhost');
    if(uri.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const p=path.resolve(root,'.'+decodeURIComponent(uri.pathname));
    if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){
      res.writeHead(404);res.end('Missing resource');return;
    }
    res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  }catch(e){res.writeHead(500);res.end('Server error');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'grisha-review-chrome-'));
let stderr='';
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--no-zygote','--disable-extensions',
  '--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','ignore','pipe']});
browser.stderr.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-3200);});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const exceptions=[],httpErrors=[],consoleErrors=[];
let ws;
try{
  let port=0;
  for(let i=0;i<600;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active)){port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);break;}
    if(browser.exitCode!==null)throw Error('Chromium terminated: '+stderr);
    await sleep(100);
  }
  if(!port)throw Error('Chrome DevTools port unavailable: '+stderr);
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(t=>t.type==='page');
  assert.ok(target,'No Chrome page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let counter=0;
  const pending=new Map();
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)){
      const cb=pending.get(message.id);pending.delete(message.id);cb(message);
    }
    if(message.method==='Runtime.exceptionThrown')
      exceptions.push(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text);
    if(message.method==='Network.responseReceived'&&message.params?.response?.status>=400)
      httpErrors.push(message.params.response.status+' '+message.params.response.url);
    if(message.method==='Runtime.consoleAPICalled'&&message.params?.type==='error')
      consoleErrors.push(JSON.stringify(message.params?.args||[]).slice(0,300));
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++counter;pending.set(id,response=>response.error?reject(Error(response.error.message)):resolve(response.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const js=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  const pageRoot='/students/grisha_arkhipov/site/';
  const out=path.join(root,'grisha-review-artifacts');
  fs.mkdirSync(out,{recursive:true});
  async function navigate(page,width=1440,height=900,dark=false){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    const url=origin+pageRoot+page;
    await call('Page.navigate',{url});
    let ready=false;
    for(let i=0;i<200;i++){
      const result=await js('({url:location.href,state:document.readyState})');
      if(result.url===url&&result.state==='complete'){ready=true;break;}
      await sleep(75);
    }
    assert.ok(ready,'Failed to load '+page);
    await sleep(180);
    await js('document.documentElement.dataset.theme='+JSON.stringify(dark?'dark':'light'));
    const bounds=await js('({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth})');
    assert.ok(bounds.scroll<=bounds.viewport+2,'Overflow in '+page+' at '+width+': '+JSON.stringify(bounds));
    return bounds;
  }
  async function screenshot(name){
    const data=await call('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.data,'base64'));
  }
  const sizes=[[375,812],[390,844],[768,1024],[1440,900]];
  for(const [width,height] of sizes){
    for(const page of ['21.10.26.html','21.10.26-lab.html','index.html']){
      for(const dark of [false,true]){
        await navigate(page,width,height,dark);
        if((width===375||width===1440)&&!dark)await screenshot(page.replace('.html','').replaceAll('.','-')+'-'+width+'-light');
        if(width===390&&dark)await screenshot(page.replace('.html','').replaceAll('.','-')+'-390-dark');
      }
    }
  }
  await navigate('21.10.26.html');
  const maths=await js("(()=>{const all=[...document.querySelectorAll('.formula math')];return {count:all.length,native:all.every(x=>x.namespaceURI==='http://www.w3.org/1998/Math/MathML'),fractions:document.querySelectorAll('.formula mfrac').length,source:all.every(x=>x.querySelector('annotation[encoding=\"application/x-tex\"]'))}})()");
  assert.ok(maths.count>=12&&maths.fractions>=12&&maths.native&&maths.source,
    'Semantic MathML regression '+JSON.stringify(maths));
  assert.equal(await js("document.querySelectorAll('.practice>li').length"),10);
  const links=await js("(()=>[...document.querySelectorAll('a[href]')].filter(x=>x.getAttribute('href').startsWith('#')).every(x=>document.getElementById(x.getAttribute('href').slice(1))))()");
  assert.equal(links,true,'Invalid lesson anchors');
  assert.equal(await js("document.querySelector('.answers').open"),false);
  assert.equal(await js("(()=>{document.querySelector('.answers summary').click();return document.querySelector('.answers').open})()"),true);
  await navigate('21.10.26-lab.html#river');
  assert.equal(await js("document.getElementById('river').hidden"),false);
  assert.equal(await js("document.getElementById('rtimeDown').textContent"),'3');
  assert.equal(await js("document.getElementById('rtimeUp').textContent"),'6');
  assert.equal(await js("document.getElementById('rbarUp').style.width"),'100%');
  const extremes=await js("(()=>{document.querySelector('#rv').value='6';document.querySelector('#rc').value='5';document.querySelector('#rc').dispatchEvent(new Event('input',{bubbles:true}));return {time:document.querySelector('#rtimeUp').textContent,up:document.querySelector('#rbarUp').style.width,down:parseFloat(document.querySelector('#rbarDown').style.width)}})()");
  assert.equal(extremes.time,'24');
  assert.equal(extremes.up,'100%');
  assert.ok(extremes.down>9&&extremes.down<10,'River bars not proportional '+JSON.stringify(extremes));
  assert.equal(await js("(()=>{document.getElementById('rcontrast').click();return document.getElementById('rtimeUp').textContent})()"),'3');
  assert.equal(await js("(()=>{document.getElementById('rreset').click();return document.getElementById('rtimeUp').textContent})()"),'6');
  await navigate('21.10.26-lab.html#average');
  assert.equal(await js("document.getElementById('average').hidden"),false,'hash deep link to average');
  assert.equal(await js("document.getElementById('atime').textContent"),'70');
  assert.equal(await js("document.getElementById('adistance').textContent"),'67,2');
  assert.equal(await js("(()=>{document.getElementById('acontrast').click();return document.getElementById('adistance').textContent})()"),'57,6');
  const avgEdges=await js("(()=>{document.getElementById('av1').value='30';document.getElementById('av2').value='90';document.getElementById('av1').dispatchEvent(new Event('input',{bubbles:true}));return {t:document.getElementById('atime').textContent,d:document.getElementById('adistance').textContent}})()");
  assert.deepEqual(avgEdges,{t:'60',d:'45'},'Equal times and equal distances must differ at extrema');
  assert.equal(await js("(()=>{document.getElementById('areset').click();return document.getElementById('atime').textContent})()"),'70');
  await navigate('21.10.26-lab.html#trains',390,844,true);
  assert.equal(await js("document.getElementById('trains').hidden"),false);
  assert.equal(await js("document.getElementById('tpole').textContent"),'30');
  assert.equal(await js("document.getElementById('tbridge').textContent"),'78');
  assert.equal(await js("(()=>{document.getElementById('tcontrast').click();return document.getElementById('tbridge').textContent})()"),'75');
  assert.equal(await js("(()=>{document.getElementById('tb').value='0';document.getElementById('tb').dispatchEvent(new Event('input',{bubbles:true}));return document.getElementById('tbridge').textContent})()"),'30','Zero-length bridge equals pole case');
  assert.equal(await js("(()=>{document.getElementById('treset').click();return document.getElementById('tpole').textContent})()"),'30');
  assert.equal(await js("(()=>{document.querySelector('#tab-river').focus();document.querySelector('.tabs').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return document.getElementById('average').hidden})()"),false,'Keyboard tab navigation');
  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await js("getComputedStyle(document.getElementById('river')).display!=='none'"),true,'River printable');
  assert.equal(await js("getComputedStyle(document.getElementById('trains')).display!=='none'"),true,'All lab modes printable');
  await call('Emulation.setEmulatedMedia',{media:'screen'});
  await navigate('index.html',1440,900,false);
  assert.equal(await js("document.querySelector('.latest-card').textContent.includes('21.10.2026')"),true);
  assert.equal(await js("document.querySelector('a[href=\"21.10.26-lab.html\"]')!==null"),true);
  assert.equal(await js("document.querySelectorAll('#radialMap path').length>0"),true,'Heatmap missing');
  assert.equal(await js("getComputedStyle(document.body).backgroundImage"),'none','Notebook grid should be removed');
  assert.equal(await js("document.querySelector('.hero-lead').textContent.includes('Канонические')"),false,'Internal jargon in navigator');
  assert.deepEqual(exceptions,[],'JS exceptions');
  assert.deepEqual(httpErrors,[],'HTTP failures');
  assert.deepEqual(consoleErrors,[],'Console errors');
  console.log('Release browser QA PASS: 4 viewports × 3 pages × 2 themes; mathematics, lab, links, keyboard, print');
}finally{
  try{ws?.close()}catch{}
  browser.kill('SIGKILL');server.close();
  if(browser.exitCode===null)await new Promise(done=>{const timeout=setTimeout(done,2500);browser.once('exit',()=>{clearTimeout(timeout);done()})});
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:120})}
  catch(error){if(!['EBUSY','ENOTEMPTY'].includes(error.code))console.warn('Browser cleanup:',error.message)}
}
