import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.pdf':'application/pdf','.tex':'text/plain'};

test('Gravity 24.10 browser: 7 sizes, dark/light, live modes, links and home integration',{skip:!chrome?'Chromium is unavailable in the test environment':false,timeout:180000},async()=>{
  const errors=[],failedRequests=[];
  const server=http.createServer((req,res)=>{
    try{
      const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){
        res.writeHead(404);res.end('Not found');return;
      }
      res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');
      fs.createReadStream(filename).pipe(res);
    }catch{res.writeHead(500);res.end('Internal failure')}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  let browser=null,ws=null,profile=null;
  try{
    let port=0;
    for(let attempt=0;attempt<2&&!port;attempt++){
      profile=fs.mkdtempSync(path.join(os.tmpdir(),'volodia-qa-'));
      browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-zygote','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
      for(let i=0;i<200;i++){
        const file=path.join(profile,'DevToolsActivePort');
        if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
        if(browser.exitCode!==null)break;
        await sleep(70);
      }
      if(!port){browser.kill('SIGTERM');await sleep(250);fs.rmSync(profile,{force:true,recursive:true,maxRetries:12,retryDelay:100});}
    }
    assert.ok(port,'Chromium DevToolsActivePort not available');
    const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    const tab=tabs.find(x=>x.type==='page');assert.ok(tab);
    ws=new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
    let serial=0;const pending=new Map();
    ws.onmessage=e=>{
      const m=JSON.parse(e.data);
      if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params?.exceptionDetails?.text||'Uncaught exception');
      if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400)failedRequests.push(m.params.response.url);
    };
    const call=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++serial;
      pending.set(id,m=>m.error?reject(new Error(m.error.message)):resolve(m.result));
      ws.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async expression=>{
      const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails)throw Error(result.exceptionDetails.text||'JavaScript exception');
      return result.result.value;
    };
    await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
    const dir='/students/volodia_khachaturian/site/';
    async function navigate(filename,width,height,dark=false){
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
      const url=origin+dir+filename;
      await call('Page.navigate',{url});
      for(let i=0;i<200;i++){
        const s=await evaluate('({url:location.href,ready:document.readyState})');
        if(s.url===url&&s.ready==='complete')break;
        if(i===199)throw Error('Page never loaded: '+url);
        await sleep(50);
      }
      await sleep(60);
      if(dark){await evaluate("document.getElementById('theme')?.click()");}
      const result=await evaluate('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,theme:document.documentElement.dataset.theme})');
      assert.ok(result.scroll<=result.client+2,'Overflow '+filename+' '+width+' '+(dark?'dark':'light')+' '+JSON.stringify(result));
      assert.equal(result.theme,dark?'dark':'light','Theme mismatch '+filename);
    }
    const sizes=[[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
    for(const [width,height] of sizes)for(const dark of [false,true])
      await navigate('24.10.26.html',width,height,dark);
    await navigate('24.10.26.html',1440,900,false);
    const data=await evaluate("({tasks:document.querySelectorAll('#practice .exercise li').length,answers:document.querySelectorAll('.answers tbody tr').length,lab:document.querySelector('a[href*=\"24.10.26-lab.html?mode=height\"]')?.getAttribute('href')})");
    assert.equal(data.tasks,10);assert.equal(data.answers,10);assert.ok(data.lab);
    assert.equal(await evaluate("document.querySelector('.answers').open"),false);
    assert.equal(await evaluate("(()=>{document.querySelector('.answers summary').click();return document.querySelector('.answers').open})()"),true);
    for(const mode of ['satellites','compare','height']){
      for(const width of [390,1440])for(const dark of [false,true]){
        await navigate('24.10.26-lab.html?mode='+mode,width,width===390?844:900,dark);
        const value=await evaluate("document.querySelector('#metricValue').textContent");
        assert.equal(value,mode==='satellites'?'9':mode==='compare'?'22,5':'80 Н');
      }
    }
    await navigate('24.10.26-lab.html?mode=compare',1440,900,false);
    const edge=await evaluate("(()=>{const a=document.getElementById('massRatio'),b=document.getElementById('distanceRatio');a.value='2';b.value='1';a.dispatchEvent(new Event('input',{bubbles:true}));b.dispatchEvent(new Event('input',{bubbles:true}));return {value:document.getElementById('metricValue').textContent,explain:document.getElementById('explain').textContent}})()");
    assert.equal(edge.value,'0,5');assert.match(edge.explain,/второе притягивается сильнее/);
    const pressed=await evaluate("(()=>{const a=[...document.querySelectorAll('[data-answer]')];a[0].click();const first=a.map(b=>b.getAttribute('aria-pressed'));a[1].click();return {first,second:a.map(b=>b.getAttribute('aria-pressed'))}})()");
    assert.deepEqual(pressed.first,['true','false','false']);
    assert.deepEqual(pressed.second,['false','true','false']);
    await navigate('24.10.26-lab.html?mode=height',390,844,false);
    const h=await evaluate("(()=>{const e=document.getElementById('height');e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));const start=[document.getElementById('metricValue').textContent,document.getElementById('orbiter').getAttribute('cx')];e.value='3';e.dispatchEvent(new Event('input',{bubbles:true}));const end=[document.getElementById('metricValue').textContent,document.getElementById('orbiter').getAttribute('cx')];document.getElementById('reset').click();return {start,end,reset:document.getElementById('metricValue').textContent}})()");
    assert.deepEqual(h,{start:['180 Н','147'],end:['11,25 Н','318'],reset:'80 Н'});
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    const home=origin+dir+'index.html';
    await call('Page.navigate',{url:home});
    for(let i=0;i<180;i++){
      const status=await evaluate("({ready:document.readyState,title:document.querySelector('#lesson-title')?.textContent})");
      if(status.ready==='complete'&&status.title?.includes('Гравитация'))break;
      if(i===179)throw Error('Home latest lesson was not displayed: '+JSON.stringify(status));
      await sleep(100);
    }
    const dashboard=await evaluate("({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,href:document.querySelector('#latestLessonCta')?.getAttribute('href')})");
    assert.ok(dashboard.scroll<=dashboard.client+2,'Home mobile overflow');
    assert.ok(dashboard.href?.includes('24.10.26.html'),'Home link wrong');
    assert.deepEqual(errors,[],'Uncaught JS errors');
    assert.deepEqual(failedRequests,[],'4xx/5xx network requests');
  }finally{
    try{ws?.close()}catch{}
    if(browser){browser.kill('SIGTERM');await sleep(400)}
    if(profile)fs.rmSync(profile,{force:true,recursive:true,maxRetries:20,retryDelay:150});
    await new Promise(resolve=>server.close(resolve));
  }
});
