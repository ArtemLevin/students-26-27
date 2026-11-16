import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const site='/students/sofya_luzianina/site/';
const chromium=['chromium','google-chrome','chromium-browser','google-chrome-stable']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(result=>result.status===0)?.stdout.trim();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('Sofya lesson publication intent is valid and publisher accepts dry-run',()=>{
  const command=spawnSync(process.execPath,[
    'scripts/publish-lesson.mjs','sofya_luzianina','16.11.26','--intent',
    'students/sofya_luzianina/16.11.26.intent.json','--dry-run'
  ],{cwd:root,encoding:'utf8',timeout:40_000});
  assert.equal(command.status,0,'Publisher dry-run failed: '+command.stderr);
  const plan=JSON.parse(command.stdout);
  assert.equal(plan.architecture,'v2');
  assert.equal(plan.dryRun,true);
  assert.equal(plan.executable,true,'Publication plan must be executable');
  assert.deepEqual(plan.reviewItems,[],'Publication intent needs manual review');
  assert.deepEqual(plan.conflicts,[],'Publication has conflicts');
  assert.ok(plan.changedFiles.some(p=>p.endsWith('2026-11-16.lesson.json')),'Expected canonical lesson metadata');
});


test('Sofya 16 November lesson and projectile lab: real Chromium release gate',{timeout:180_000},async t=>{
  assert.ok(chromium,'Chromium must be installed for release gate');
  const errors=[],notFound=[];
  const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
    '.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png',
    '.svg':'image/svg+xml','.pdf':'application/pdf','.tex':'text/plain; charset=utf-8'};
  const server=http.createServer((request,response)=>{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const target=path.resolve(root,'.'+pathname);
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      if(!pathname.endsWith('/favicon.ico'))notFound.push(pathname);
      response.writeHead(404).end('Missing');return;
    }
    response.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(target).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port,base='http://127.0.0.1:'+port+site;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sofya-lesson-review-'));
  const chrome=spawn(chromium,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
    '--no-first-run','--no-zygote','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
  let ws;
  t.after(async()=>{
    try{ws?.close();}catch{}
    try{chrome.kill('SIGTERM');}catch{}
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  });
  let debugPort=0;
  for(let i=0;i<160;i++){const file=path.join(profile,'DevToolsActivePort');if(fs.existsSync(file)){
    debugPort=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;
  }if(chrome.exitCode!==null)break;await delay(100);}
  assert.ok(debugPort,'Chromium DevTools endpoint');
  const targets=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();
  const target=targets.find(item=>item.type==='page');
  assert.ok(target,'Chromium page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let seq=0;
  const callbacks=new Map();
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&callbacks.has(message.id)){callbacks.get(message.id)(message);callbacks.delete(message.id);}
    if(message.method==='Runtime.exceptionThrown'){
      errors.push(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text||'JS exception');
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;callbacks.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  async function waitFor(predicate,description){
    for(let i=0;i<120;i++){try{if(await run(predicate))return;}catch{}
      await delay(100);
    }throw Error('Waiting for '+description+' timed out');
  }
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  let sequence=0;
  async function go(page,width,height=900){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    await call('Page.navigate',{url:base+page+(page.includes('?')?'&':'?')+'review='+ ++sequence});
    const ready=page.startsWith('16.11.26-lab')?
      "document.readyState==='complete' && !!document.querySelector('#trail') && document.querySelector('#T')?.textContent!=='—'":
      "document.readyState==='complete' && document.querySelectorAll('[data-quiz]').length===3";
    await waitFor(ready,page+' at '+width+'px');
  }
  const checkLayout=async(label)=>{
    const data=await run("({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('button')].filter(x=>!x.textContent.trim()&&!x.getAttribute('aria-label')).length,emptyLinks:document.querySelectorAll('a[href=\"\"]').length,imgs:[...document.images].filter(x=>!x.hasAttribute('alt')).length})");
    assert.ok(data.scroll<=data.width+2,label+' horizontal overflow: '+JSON.stringify(data));
    assert.equal(data.buttons,0,label+' unnamed buttons');
    assert.equal(data.emptyLinks,0,label+' empty hyperlinks');
    assert.equal(data.imgs,0,label+' image alt');
  }
  for(const width of [375,768,1024,1366]){
    await go('16.11.26.html',width,width===375?812:900);
    await checkLayout('lesson '+width);
    assert.equal(await run("document.querySelectorAll('math').length"),56,'native MathML present');
    assert.equal(await run("document.querySelectorAll('.exercise').length"),10);
    assert.ok(await run("!!document.querySelector('#graph svg') || !!document.querySelector('#graph figure svg')"),'source graph present');
    if(width===1366){
      await run("document.querySelector('[data-quiz=\"0\"] button[data-choice=\"1\"]').click()");
      assert.match(await run("document.querySelector('[data-quiz=\"0\"] .feedback').textContent"),/Верно/);
      await run("document.querySelector('#resetQuiz').click()");
      assert.equal(await run("document.querySelector('[data-quiz=\"0\"] button[data-choice=\"1\"]').getAttribute('aria-pressed')"),'false');
      await run("document.querySelector('#theme').click()");
      assert.equal(await run("document.documentElement.dataset.theme"),'dark');
      await checkLayout('lesson dark');
    }
  }
  await go('16.11.26-lab.html?mode=horizontal',1366);
  await checkLayout('lab desktop dark');
  assert.equal(await run("document.documentElement.dataset.theme"),'dark','theme shared across pages');
  const read=id=>run("Number(document.querySelector('"+id+"').textContent.replace(',','.'))");
  assert.ok(Math.abs(await read('#T')-2)<.01,'horizontal T = 2 s');
  assert.ok(Math.abs(await read('#L')-30)<.01,'horizontal L = 30 m');
  assert.ok(Math.abs(await read('#Vimpact')-25)<.01,'horizontal impact speed = 25 m/s');
  await run("document.querySelector('#scenario').value='angled';document.querySelector('#scenario').dispatchEvent(new Event('change',{bubbles:true}))");
  assert.ok(Math.abs(await read('#L')-40)<.02,'angled range = 40 m');
  assert.ok(Math.abs(await read('#T')-2.83)<.02,'angled total time');
  await run("document.querySelector('#angle').value='60';document.querySelector('#angle').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await run("document.querySelector('#scenario').value"),'custom','custom scenario when slider changes');
  assert.ok(Math.abs(await read('#L')-34.64)<.05,'range at 60°');
  await run("document.querySelector('#height').value='0';document.querySelector('#height').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#angle').value='0';document.querySelector('#angle').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await read('#T'),0,'ground-level horizontal edge case');
  await run("document.querySelector('#reset').click()");
  assert.ok(Math.abs(await read('#T')-2)<.01,'reset has deterministic baseline');
  for(const width of [390,768,1024]){
    await go('16.11.26-lab.html?mode=angled',width,width===390?844:900);
    await checkLayout('lab '+width);
    assert.ok(Math.abs(await read('#L')-40)<.02,'deep-link mode '+width);
    await run("document.querySelector('#theme').click()");
    await checkLayout('lab toggled theme '+width);
  }
  assert.deepEqual(notFound,[],'No local resource 404');
  assert.deepEqual(errors,[],'No runtime exception');
});
