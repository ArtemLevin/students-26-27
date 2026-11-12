import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {LESSONS} from '../lesson-registry.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const STUDENT='/students/jaroslav_gavrilov/site/';
const art=path.join(ROOT,'jaroslav-0911-review-artifacts');fs.mkdirSync(art,{recursive:true});
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>spawnSync('which',[x],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!chrome)throw Error('CHROMIUM_UNAVAILABLE');
const server=http.createServer((req,res)=>{
 try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(ROOT,'.'+p);
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Missing');return}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.pdf':'application/pdf','.tex':'text/plain','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res)}catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const host='http://127.0.0.1:'+server.address().port,wait=ms=>new Promise(ok=>setTimeout(ok,ms));
let profile,proc,ws,serial=0;const pending=new Map(),errors=[],bad=[];
function call(method,params={}){return new Promise((ok,no)=>{const id=++serial;pending.set(id,r=>r.error?no(Error(r.error.message)):ok(r.result));ws.send(JSON.stringify({id,method,params}))})}
async function js(source){const r=await call('Runtime.evaluate',{expression:source,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
try{
 let port;
 for(let attempt=0;attempt<3&&!port;attempt++){
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'jaroslav-0911-'));
 proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
 for(let i=0;i<180;i++){const f=path.join(profile,'DevToolsActivePort');if(fs.existsSync(f)){port=+fs.readFileSync(f,'utf8').split('\n')[0];break}if(proc.exitCode!==null)break;await wait(100)}
 if(!port){proc.kill('SIGKILL');await wait(150);try{fs.rmSync(profile,{recursive:true,force:true})}catch(_){}}
 }
 assert.ok(port,'Chrome DevTools unavailable');
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=tabs.find(x=>x.type==='page');assert.ok(target);
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no});
 ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.id&&pending.has(v.id)){pending.get(v.id)(v);pending.delete(v.id)}if(v.method==='Runtime.exceptionThrown')errors.push(v.params.exceptionDetails?.text);if(v.method==='Network.responseReceived'&&v.params.response?.status>=400)bad.push(v.params.response.url)};
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 async function visit(page,width,height,dark){
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
 const url=host+STUDENT+page;await call('Page.navigate',{url});
 for(let n=0;n<150;n++){const r=await js('({url:location.href,ready:document.readyState})');if(r.url.startsWith(url)&&r.ready==='complete')break;await wait(80)}
 await js('document.documentElement.dataset.theme='+JSON.stringify(dark?'dark':'light'));await wait(120);
 const v=await js("(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return {width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,duplicates:ids.filter((x,i)=>ids.indexOf(x)!==i),h1:document.querySelectorAll('h1').length,empty:[...document.querySelectorAll('a[href]')].filter(x=>['','#'].includes(x.getAttribute('href'))).length}})()");
 assert.ok(v.width<=v.client+2,page+' '+width+' dark='+dark+' overflow '+JSON.stringify(v));assert.deepEqual(v.duplicates,[]);assert.equal(v.h1,1);assert.equal(v.empty,0);
 }
 async function shot(name){let v=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(art,name+'.png'),Buffer.from(v.data,'base64'))}
 const sizes=[[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
 for(const [w,h] of sizes){for(const dark of [false,true]){await visit('09.11.26.html',w,h,dark);await visit('09.11.26-lab.html',w,h,dark);if([390,1440].includes(w))await shot('lab-'+w+'-'+(dark?'dark':'light'))}}
 await visit('09.11.26.html',1440,900,false);
 const lesson=await js("(()=>({tasks:document.querySelectorAll('[id^=task-]').length,answers:document.querySelectorAll('#answers tbody tr').length,ol:[...document.querySelectorAll('#practice ol')].map(x=>({start:x.start,count:x.querySelectorAll(':scope > li').length})),math:document.querySelectorAll('math').length,links:[...document.querySelectorAll('a[href]')].map(x=>x.getAttribute('href'))}))()");
 assert.equal(lesson.tasks,10);assert.equal(lesson.answers,10);
 assert.ok(lesson.math>=8,'semantic MathML for the core formulas');
 assert.deepEqual(lesson.ol,[{start:1,count:3},{start:4,count:3},{start:7,count:3},{start:10,count:1}]);
 let quiz=await js("(()=>{document.querySelector('#quiz input[value=b]').click();document.querySelector('#quiz button').click();return document.getElementById('quizResult').textContent})()");
 assert.match(quiz,/Верно/);
 await js("window.dispatchEvent(new Event('beforeprint'))");assert.equal(await js("document.querySelector('#answers details').open"),true,'print answers shown');
 await js("window.dispatchEvent(new Event('afterprint'))");assert.equal(await js("document.querySelector('#answers details').open"),false,'answers restored');
 assert.equal(LESSONS[0].date,'2026-11-12');assert.equal(LESSONS.filter(x=>x.date==='2026-11-09').length,1);
 assert.equal(LESSONS.filter(x=>x.date==='2026-11-12').length,1,'new lesson published once');
 for(const [w,h] of [[390,844],[1440,900]]){await visit('index.html',w,h,false);const a=await js("document.getElementById('latestLessonCta').getAttribute('href')");assert.equal(a,'12.11.26.html')}
 await visit('09.11.26-lab.html#delay',1440,900,false);
 const start=await js("(()=>({d:document.getElementById('distance').value,delta:document.getElementById('delayHours').value,ta:document.getElementById('timeA').textContent,tb:document.getElementById('timeB').textContent,x:document.getElementById('meetX').textContent}))()");
 assert.deepEqual(start,{d:'645',delta:'3',ta:'6',tb:'3',x:'420'},'deep link delay');
 const mathLab=await js("(()=>{let eq=document.getElementById('equation');return {tag:eq.tagName.toLowerCase(),ns:eq.namespaceURI,values:[...eq.querySelectorAll('mn')].map(x=>x.textContent)}})()");
 assert.equal(mathLab.tag,'math');assert.equal(mathLab.ns,'http://www.w3.org/1998/Math/MathML');assert.deepEqual(mathLab.values,['70','75','3','645']);
 for(const [name,expected] of [['simultaneous',['4','4','240']],['delay',['6','3','420']],['point',['4','3','200']],['clock',['6','4','420']]]){
 const r=await js("(()=>{document.querySelector('[data-scene="+name+"]').click();return [document.getElementById('timeA').textContent,document.getElementById('timeB').textContent,document.getElementById('meetX').textContent]})()");
 assert.deepEqual(r,expected,'scene '+name)
 }
 const x=await js("(()=>{document.querySelector('[data-scene=delay]').click();document.getElementById('end').click();return {a:+document.getElementById('carA').getAttribute('cx'),b:+document.getElementById('carB').getAttribute('cx'),ya:+document.getElementById('carALabel').getAttribute('y'),yb:+document.getElementById('carBLabel').getAttribute('y'),caption:document.getElementById('journeyCaption').textContent}})()");
 assert.ok(Math.abs(x.a-x.b)<.001,'cars coincide at meeting');assert.notEqual(x.ya,x.yb,'no overlapping car labels');
 const reset=await js("(()=>{const d=document.getElementById('delayHours');d.value='6';d.dispatchEvent(new Event('input',{bubbles:true}));const invalid=document.getElementById('play').disabled;document.getElementById('reset').click();return {invalid,d:d.value,s:document.getElementById('speedA').value}})()");
 assert.deepEqual(reset,{invalid:false,d:'3',s:'70'});
 const invalid=await js("(()=>{let move=(id,v)=>{const x=document.getElementById(id);x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}))};move('distance',300);move('speedA',110);move('delayHours',6);return {disabled:document.getElementById('play').disabled,answer:document.getElementById('meetX').textContent}})()");
 assert.deepEqual(invalid,{disabled:true,answer:'—'});
 for(const href of new Set(lesson.links.filter(x=>x&&!x.startsWith('#')))){const resp=await fetch(new URL(href,host+STUDENT+'09.11.26.html'));assert.equal(resp.status,200,'link '+href)}
 assert.deepEqual(errors,[],'JS exceptions');assert.deepEqual(bad,[],'Network errors');
 console.log('JAROSLAV_0911_REVIEW_PASS',JSON.stringify({sizes:sizes.length,lesson,scenarios:4,artifacts:fs.readdirSync(art).length}));
}finally{try{ws?.close()}catch(_){}try{proc?.kill('SIGKILL')}catch(_){}server.close();try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150})}catch(_){}}