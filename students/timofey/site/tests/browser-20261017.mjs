import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(proc=>proc.status===0)?.stdout.trim();
if(!chrome)throw new Error('17.10.26 browser QA requires Chromium/Chrome');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.tex':'text/plain'};
const server=http.createServer((request,response)=>{
  try{
    const url=new URL(request.url,'http://127.0.0.1');
    if(url.pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
    const relative=decodeURIComponent(url.pathname);
    const absolute=path.resolve(root,'.'+relative);
    if(!absolute.startsWith(root+path.sep)||!fs.existsSync(absolute)||!fs.statSync(absolute).isFile()){
      response.writeHead(404);response.end('Not found');return;
    }
    response.setHeader('Content-Type',mime[path.extname(absolute)]||'application/octet-stream');
    fs.createReadStream(absolute).pipe(response);
  }catch(error){response.writeHead(500);response.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const screenshots=path.join(root,'timofey-site-review-artifacts');
fs.mkdirSync(screenshots,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let processChrome=null,profile=null,ws=null;
const errors=[],badNetwork=[],requests=[];
const pending=new Map();
let serial=0;
try{
  // Retry Chrome startup: concurrent GitHub Actions browser jobs can temporarily
  // fail to expose DevToolsActivePort, independently of the tested page.
  let port=0;
  for(let attempt=0;attempt<3&&!port;attempt++){
    profile=fs.mkdtempSync(path.join(os.tmpdir(),'timofey-1710-chrome-'));
    processChrome=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0',
      '--user-data-dir='+profile],{stdio:'ignore'});
    for(let tick=0;tick<170;tick++){
      const filename=path.join(profile,'DevToolsActivePort');
      if(fs.existsSync(filename)){port=Number(fs.readFileSync(filename,'utf8').split('\n')[0]);break;}
      if(processChrome.exitCode!==null)break;
      await sleep(100);
    }
    if(!port){processChrome.kill('SIGKILL');await sleep(300);fs.rmSync(profile,{recursive:true,force:true});}
  }
  assert.ok(port,'Chromium DevTools port unavailable after three startup attempts');
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=targets.find(item=>item.type==='page');
  assert.ok(target,'Chromium has no page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)){
      const cb=pending.get(message.id);pending.delete(message.id);cb(message);
    }
    if(message.method==='Runtime.exceptionThrown'){
      errors.push(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text);
    }
    if(message.method==='Network.responseReceived'&&message.params?.response?.status>=400){
      badNetwork.push(message.params.response.url+' '+message.params.response.status);
    }
    if(message.method==='Network.loadingFailed'&&!message.params?.canceled){
      requests.push(message.params?.errorText||'Network request failed');
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?reject(new Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');

  async function screenshot(name){const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(screenshots,name+'.png'),Buffer.from(result.data,'base64'));}

  async function navigate(filename,width=1440,height=900,theme='dark'){
    const pageUrl=origin+'/students/timofey/site/'+filename;
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    errors.length=0;badNetwork.length=0;requests.length=0;
    await call('Page.navigate',{url:pageUrl});
    let loaded=false;
    for(let tick=0;tick<200;tick++){
      let state=await run('({href:location.href,ready:document.readyState})');
      if(state.href===pageUrl&&state.ready==='complete'){loaded=true;break;}
      await sleep(60);
    }
    assert.ok(loaded,'Page did not load '+filename);
    await sleep(130);
    if(filename.startsWith('index.')){
      await run("document.body.dataset.theme='"+theme+"'");
    }else{
      await run("document.documentElement.dataset.theme='"+theme+"'");
    }
    const sizes=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
    assert.ok(sizes.scroll<=sizes.client+2,filename+' '+width+' '+theme+' horizontal overflow: '+JSON.stringify(sizes));
    assert.deepEqual(errors,[],filename+' JS exceptions');
    assert.deepEqual(badNetwork,[],filename+' unsuccessful network requests');
    assert.deepEqual(requests,[],filename+' failed network loads');
  }

  // Responsive and color-scheme matrix for lesson, lab and personal dashboard.
  for(const page of ['17.10.26.html','17.10.26-lab.html','20.10.26.html','20.10.26-lab.html','24.10.26.html','index.html']){
    for(const [width,height] of [[1440,900],[390,844]]){
      for(const theme of ['light','dark']){
        await navigate(page,width,height,theme);
        await screenshot(page.replace('.html','')+'-'+width+'-'+theme);
        if(page==='24.10.26.html'){
          assert.equal(await run("document.querySelectorAll('.task-list input[data-task]').length"),10);
          assert.equal(await run("document.querySelectorAll('#answerTable tbody tr').length"),10);
          assert.equal(await run("document.querySelector('#answerTable').hidden"),true);
          assert.equal(await run("(()=>{document.querySelector('#toggleAnswers').click();return !document.querySelector('#answerTable').hidden})()"),true);
          assert.equal(await run("(()=>{document.querySelector('#plotNegative').click();return document.querySelector('#plotNegative').getAttribute('aria-pressed')})()"),'true');
        }
        if(page==='20.10.26.html'){
          assert.equal(await run("document.querySelectorAll('#practice .exercises li').length"),10);
          assert.equal(await run("new Promise(resolve=>{const image=document.querySelector('img[src$=\"20.10.26.svg\"]');image.loading='eager';image.scrollIntoView();if(image.complete)return resolve(image.naturalWidth>0);image.addEventListener('load',()=>resolve(image.naturalWidth>0),{once:true});image.addEventListener('error',()=>resolve(false),{once:true});})"),true,'Oct 20 poster loads');
        }
        if(page==='20.10.26-lab.html'){
          assert.equal(await run("document.querySelector('#diffTotal').textContent !== '—'"),true);
          assert.equal(await run("document.querySelector('#annTotal').textContent !== '—'"),true);
        }
        if(page==='17.10.26.html'){
          assert.equal(await run("document.querySelectorAll('#practice .practice-list li').length"),10);
          assert.equal(await run("([...document.querySelectorAll('.hero-formula > div')].length===2 && [...document.querySelectorAll('.hero-formula > div')].every(el=>{const label=el.querySelector('small').getBoundingClientRect();const formula=el.querySelector('strong').getBoundingClientRect();return formula.top>=label.bottom && formula.width<=document.documentElement.clientWidth;}))"),true,'Hero formula labels are visually separated from values');
          assert.equal(await run("document.querySelectorAll('a[href*=\"?mode=\"]').length >= 4"),true);
          assert.equal(await run("new Promise(resolve=>{const image=document.querySelector('.figure img');image.loading='eager';image.scrollIntoView();if(image.complete)return resolve(image.naturalWidth>0);image.addEventListener('load',()=>resolve(image.naturalWidth>0),{once:true});image.addEventListener('error',()=>resolve(false),{once:true});})"),true,'Poster loads when requested');
        }
      }
    }
  }

  await navigate('17.10.26.html');
  // All mathematical notation on the static lesson page must use native MathML.
  assert.ok(await run("document.querySelectorAll('main math').length >= 140"));
  assert.ok(await run("document.querySelectorAll('mfrac').length >= 7"));
  assert.ok(await run("document.querySelectorAll('msup').length >= 4"));
  assert.ok(await run("document.querySelectorAll('msub').length >= 8"));
  assert.equal(await run("[...document.querySelectorAll('math')].every(e=>e.namespaceURI==='http://www.w3.org/1998/Math/MathML')"),true);
  assert.equal(await run("[...document.querySelectorAll('.equation')].every(e=>e.querySelector('math[display=block]'))"),true);
  assert.equal(await run("[...document.querySelectorAll('main .table-scroll td')].every(e=>e.querySelector('math'))"),true);
  assert.equal(await run("[...document.querySelectorAll('#practice .practice-list li')].every(e=>e.querySelector('math'))"),true);
  assert.equal(await run("[...document.querySelectorAll('#practice .answers > div')].every(e=>e.querySelector('math'))"),true);
  assert.ok(await run("document.querySelectorAll('.hero-formula math').length===2"));
  assert.equal(await run("(()=>{document.querySelector('[data-choice=arbitrary]').click();return document.querySelector('#quizResult').textContent.includes('Верно')})()"),true);
  assert.equal(await run("(()=>{document.querySelector('[data-choice=annuity]').click();return document.querySelector('#quizResult').textContent.includes('Проверьте')})()"),true);
  assert.equal(await run("(()=>{document.querySelector('#theme').click();return document.documentElement.dataset.theme})()"),'light');
  assert.equal(await run("(()=>{const link=document.querySelector('a[href=\"17.10.26-lab.html?mode=annuity\"]');link.focus();return document.activeElement===link})()"),true);

  async function testMode(mode,expectedTotal,years){
    await navigate('17.10.26-lab.html?mode='+mode);
    assert.equal(await run("document.querySelector('[data-mode=\""+mode+"\"]').getAttribute('aria-pressed')"),'true');
    assert.ok((await run("document.querySelector('#total').textContent")).includes(expectedTotal));
    assert.equal(await run("document.querySelectorAll('#ledger tr').length"),1);
    assert.equal(await run("(()=>{document.querySelector('#all').click();return document.querySelectorAll('#ledger tr').length})()"),years);
    assert.ok((await run("document.querySelector('#ledger tr:last-child td:last-child').textContent")).includes('0'));
    assert.equal(await run("document.querySelectorAll('math[display=block][data-for]:not([hidden])').length"),1);
    assert.equal(await run("document.querySelectorAll('.metrics math').length"),3);
    assert.equal(await run("[...document.querySelectorAll('#ledger td')].every(c=>c.querySelector('math'))"),true);
    assert.equal(await run("[...document.querySelectorAll('#ledger math')].every(e=>e.namespaceURI==='http://www.w3.org/1998/Math/MathML')"),true);
    assert.ok(await run("document.querySelectorAll('#step p math').length >= 5"));
    assert.equal(await run("document.querySelectorAll('.bar-row b math').length"),years*2);
    assert.equal(await run("document.querySelectorAll('.bar-rem').length"),years);
    await run("document.querySelector('#bars').scrollIntoView()");
    await screenshot('lab-'+mode+'-all-years');
    assert.equal(await run("document.querySelectorAll('.bar-pay').length"),years);
    assert.equal(await run("(()=>{document.querySelector('#prev').click();return document.querySelectorAll('#ledger tr').length})()"),years-1);
    assert.equal(await run("(()=>{document.querySelector('#reset').click();return document.querySelectorAll('#ledger tr').length})()"),1);
  }
  await testMode('arbitrary','1\u00a0826\u00a0400',4);
  await testMode('annuity','1\u00a0009\u00a0200',2);
  await testMode('differentiated','1\u00a0650\u00a0000',4);

  await navigate('17.10.26-lab.html#annuity');
  assert.equal(await run("document.querySelector('[data-mode=annuity]').getAttribute('aria-pressed')"),'true');
  assert.equal(await run("(()=>{document.querySelector('[data-mode=differentiated]').click();return new URL(location.href).searchParams.get('mode')})()"),'differentiated');
  assert.equal(await run("(()=>{const rate=document.querySelector('#rate');rate.value='0.08';rate.dispatchEvent(new Event('change'));return document.querySelector('#total').textContent})()"),'1\u00a0440\u00a0000 ₽');
  assert.equal(await run("(()=>{document.querySelector('#reset').click();return document.querySelector('#rate').value})()"),'0.15');
  assert.equal(await run("(()=>{const e=document.querySelector('#years');e.focus();return document.activeElement===e&&e.labels.length>0})()"),true);
  assert.equal(await run("(()=>{dispatchEvent(new Event('beforeprint'));return document.querySelectorAll('#ledger tr').length})()"),4);
  assert.equal(await run("(()=>{dispatchEvent(new Event('afterprint'));return document.querySelectorAll('#ledger tr').length})()"),1);

  await navigate('index.html');
  assert.ok(await run("document.querySelector('#lesson-title').textContent.includes('Повторение')"));
  assert.ok(await run("document.querySelector('#latestLessonCta').href.endsWith('/24.10.26.html')"));
  assert.equal(await run("document.querySelector('#latestLabLink').hidden"),true);
  assert.ok(await run("document.querySelector('#latestPdfLink').href.endsWith('/24.10.26.pdf')"));
  assert.ok(await run("document.querySelector('#latestTexLink').href.endsWith('/24.10.26.tex')"));
  assert.equal(await run("document.querySelectorAll('#recentLessons a[href=\"17.10.26.html\"]').length"),1);

  console.log('Timofey through 24.10.26 browser QA: desktop/mobile, themes, URL modes, calculations, controls, network, console and navigator PASS');
}finally{
  if(ws){try{ws.close();}catch(_){}}
  if(processChrome){processChrome.kill('SIGKILL');await sleep(450);}
  await new Promise(resolve=>server.close(resolve));
  if(profile){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
    catch(error){console.warn('Chrome temp profile cleanup delayed: '+error.message);}}
}
