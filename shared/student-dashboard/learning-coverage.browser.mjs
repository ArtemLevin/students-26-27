// Browser contract for every canonical coverage page. Real HTTP, one Chromium instance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {syncCoverage} from '../../scripts/sync-learning-coverage.mjs';
import {loadCompetencyCatalog,parseLessonRegistrySource} from '../../pipeline/student/publication-contract.mjs';
import {cumulativeCoverage,normalizeCoverageCatalog} from './learning-coverage.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const report=syncCoverage({root});assert.equal(report.missing.length,0);
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
assert.ok(chrome,'Chromium is required for coverage release QA');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(500);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-coverage-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
let socket,seq=0;const pending=new Map(),failures=[];
try{
 let port=0;
 for(let i=0;i<300;i++){
  const file=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
  if(chromeProcess.exitCode!==null)throw Error('Chromium exited before initialization');
  await pause(100);
 }
 assert.ok(port,'No Chrome DevTools port');
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 socket=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);
 await new Promise((ok,no)=>{socket.onopen=ok;socket.onerror=no});
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const f=pending.get(m.id);pending.delete(m.id);f(m);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);
  pending.set(id,m=>{clearTimeout(timer);m.error?reject(Error(m.error.message)):resolve(m.result);});
  socket.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 async function until(expression){
  for(let i=0;i<200;i++){try{const value=await run(expression);if(value)return value;}catch{}await pause(75);}
  throw Error('Timed out waiting for '+expression);
 }
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 // The module is local; remote images/fonts/services must not delay the release gate.
 await call('Network.setBlockedURLs',{urls:['https://*']});
 for(const page of report.files){
  try{
   const studentRoot=path.join(root,page.split('/').slice(0,2).join('/'));
   const contract=JSON.parse(fs.readFileSync(path.join(studentRoot,'student-contract.json'),'utf8'));
   const catalog=normalizeCoverageCatalog(loadCompetencyCatalog(path.join(studentRoot,contract.competencies.catalog)).data);
   const lessons=parseLessonRegistrySource(fs.readFileSync(path.join(studentRoot,contract.lessons.registry),'utf8'));
   const model=cumulativeCoverage(lessons,{knownIds:catalog.ids,includeLegacy:true});
   const native=report.native.includes(page);
   const mobile=page.includes('filipp_luzianin/site/heatmap.html')||page.includes('anna_bannova/');
   await call('Emulation.setDeviceMetricsOverride',{width:mobile?390:1366,height:900,deviceScaleFactor:1,mobile});
   const url=origin+'/'+page;
   await call('Page.navigate',{url});
   await until('location.href==='+JSON.stringify(url)+' && document.readyState!=="loading"');
   if(native){
    await until("document.getElementById('map')?.dataset.mapView==='coverage' && document.getElementById('coverageSummary')?.textContent.includes('За весь курс:')");
    assert.equal(await run("document.querySelectorAll('#radialMap [data-coverage]').length"),model.byId.size);
    await run("document.querySelector('[data-filter=new-latest]').click()");
    assert.equal(await run("document.querySelectorAll('#radialMap [data-coverage]:not(.is-dimmed)').length"),model.newIds.size);
    await run("document.querySelector('[data-map-mode=mastery]').click()");
    assert.equal(await run("document.getElementById('map').dataset.mapView"),'mastery');
   }else{
    const status=await until("(()=>{const h=document.querySelector('atlas-learning-coverage');return h&&['ready','error'].includes(h.dataset.status)?h.dataset.status:null})()");
    assert.equal(status,'ready');
    const actual=await run("(()=>{const h=document.querySelector('atlas-learning-coverage');return {total:+h.dataset.total,covered:+h.dataset.covered,fresh:+h.dataset.newCount,cells:h.shadowRoot.querySelectorAll('button[data-skill]').length}})()");
    assert.deepEqual(actual,{total:catalog.ids.size,covered:model.byId.size,fresh:model.newIds.size,cells:catalog.ids.size});
    const newCount=await run("(()=>{const r=document.querySelector('atlas-learning-coverage').shadowRoot;const s=r.querySelector('select');s.value='new';s.dispatchEvent(new Event('change'));return r.querySelectorAll('button[data-skill]').length})()");
    assert.equal(newCount,model.newIds.size);
    const coveredCount=await run("(()=>{const r=document.querySelector('atlas-learning-coverage').shadowRoot;const s=r.querySelector('select');s.value='covered';s.dispatchEvent(new Event('change'));return r.querySelectorAll('button[data-skill]').length})()");
    assert.equal(coveredCount,model.byId.size);
    if(coveredCount){
     const result=await run("(()=>{const r=document.querySelector('atlas-learning-coverage').shadowRoot;const b=r.querySelector('button[data-skill]');b.click();return {pressed:b.getAttribute('aria-pressed'),heading:r.querySelector('[data-coverage-detail] h3')?.textContent,entries:r.querySelectorAll('[data-coverage-detail] li').length}})()");
     assert.equal(result.pressed,'true');assert.ok(result.heading);assert.ok(result.entries>0);
    }
    const empty=await run("(()=>{const r=document.querySelector('atlas-learning-coverage').shadowRoot;const q=r.querySelector('input');q.value='zzzz-no-such-skill';q.dispatchEvent(new Event('input'));return r.querySelectorAll('button[data-skill]').length})()");
    assert.equal(empty,0);
   }
   console.log('PASS',page,model.byId.size+'/'+catalog.ids.size);
  }catch(error){failures.push(page+': '+error.message);console.error('FAIL',failures.at(-1));}
 }
 assert.deepEqual(failures,[],'Coverage browser failures');
 console.log('PASS: all '+report.pages+' coverage pages / '+report.students+' canonical cabinets');
}finally{
 socket?.close();chromeProcess.kill('SIGTERM');server.closeAllConnections();await new Promise(ok=>server.close(ok));
 await pause(300);try{fs.rmSync(profile,{recursive:true,force:true});}catch{}
}
