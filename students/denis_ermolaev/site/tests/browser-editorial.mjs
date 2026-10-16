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
if(!chrome)throw Error('Chromium required for Denis browser QA');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  res.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 }catch(_){res.writeHead(500);res.end('Error');}
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'denis-editorial-browser-'));
const screenshots=path.join(root,'denis-editorial-artifacts');
fs.mkdirSync(screenshots,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0',
 '--no-first-run','--disable-extensions','--remote-allow-origins=*','--user-data-dir='+profile],{stdio:'ignore'});
let ws;let index=0;const pending=new Map(),errors=[],badUrls=[];
try{
 let port=0;
 for(let i=0;i<150;i++){
  const file=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
  if(child.exitCode!==null)throw Error('Chromium exited');
  await sleep(100);
 }
 if(!port)throw Error('Chromium DevTools unavailable');
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=targets.find(x=>x.type==='page');
 assert.ok(target,'Chromium page target');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{
  const packet=JSON.parse(e.data);
  if(packet.id&&pending.has(packet.id)){const fn=pending.get(packet.id);pending.delete(packet.id);fn(packet);}
  if(packet.method==='Runtime.exceptionThrown')errors.push(packet.params?.exceptionDetails?.text||'Runtime error');
  if(packet.method==='Network.responseReceived'&&packet.params.response.status>=400)!packet.params.response.url.endsWith('/favicon.ico')&&badUrls.push(packet.params.response.url);
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++index;pending.set(id,packet=>packet.error?reject(Error(packet.error.message)):resolve(packet.result));
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async code=>{
  const result=await call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.text||'evaluation failed');
  return result.result.value;
 };
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 async function visit(page,width,height){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
  const url=origin+'/students/denis_ermolaev/site/'+page;
  await call('Page.navigate',{url});
  for(let i=0;i<120;i++){
   const data=await run('({url:location.href,ready:document.readyState,loaded:document.getElementById("dataStatus")?.textContent})');
   if(data.url.startsWith(url)&&data.ready==='complete'&&(
     page==='archive.html'?await run('document.getElementById("archiveTotal")?.textContent==="0"'):
     await run('document.querySelectorAll("#radialMap .radial-cell").length===354')))break;
   if(i===119)throw Error('Page never became ready '+page+': '+JSON.stringify(data));
   await sleep(100);
  }
  const size=await run('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');
  assert.ok(size.scroll<=size.client+2,page+' '+width+' overflow '+JSON.stringify(size));
  assert.equal(await run('document.querySelectorAll("a[href^=\"students/xenia\"]").length'),0,'foreign links');
  const filename=page.replace('.html','')+'-'+width;
  const png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(screenshots,filename+'.png'),Buffer.from(png.data,'base64'));
 }
 for(const [w,h] of [[1440,900],[1024,768],[768,1024],[390,844],[360,800]]){
  await visit('index.html',w,h);
  assert.equal(await run('document.getElementById("totalCount").textContent'), '354');
  assert.equal(await run('document.getElementById("evaluatedCount").textContent'), '0');
  assert.equal(await run('document.getElementById("detailId").hidden'),true);
  await visit('archive.html',w,h);
  assert.equal(await run('(()=>{document.querySelector("#archiveTheme").click();return document.body.hasAttribute("data-theme")})()'),false);
  const darkIndex=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(screenshots,'archive-'+w+'-dark.png'),Buffer.from(darkIndex.data,'base64'));
  await run('document.querySelector("#archiveTheme").click()');
  assert.equal(await run('document.querySelectorAll(".archive-tile").length'),0);
  assert.ok((await run('document.getElementById("archiveRoot").textContent')).includes('Опубликованных занятий пока нет'));
 }
 await visit('index.html',390,844);
 assert.equal(await run('(()=>{document.querySelector("#menuButton").click();return document.querySelector("#sidebar").getBoundingClientRect().right>0 && document.querySelector("#menuButton").getAttribute("aria-expanded")==="true"})()'),true);
 assert.equal(await run('(()=>{document.querySelector("#sidebarClose").click();return document.querySelector("#menuButton").getAttribute("aria-expanded")==="false"})()'),true);
 assert.equal(await run('(()=>{document.querySelector("#mobileThemeToggle").click();return document.body.dataset.theme})()'),'dark');
 assert.equal(await run('document.querySelectorAll("#catalogList .atlas-item").length'),354);
 assert.ok(await run('(()=>{const i=document.querySelector("#search");i.value="тригонометрия";i.dispatchEvent(new Event("input",{bubbles:true}));return [...document.querySelectorAll("#catalogList .atlas-item")].filter(x=>!x.hidden).length>0})()'));
 assert.ok(await run('(()=>{const i=document.querySelector("#search");i.value="";i.dispatchEvent(new Event("input",{bubbles:true}));const b=document.querySelector("#catalogList .atlas-item");b.click();return document.querySelector("#detailTitle").textContent.length>2})()'));
 assert.deepEqual(errors,[],'browser runtime errors');
 assert.deepEqual(badUrls,[],'failed static assets');
 console.log('Denis browser QA: five viewports, archive, map, menu, search, filters, theme, screenshots OK');
}finally{
 try{ws?.close();}catch(_){}
 child.kill();
 server.close();
 try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:120});}catch(cleanupError){console.warn('Chromium temporary profile cleanup:',cleanupError.message);}
}
