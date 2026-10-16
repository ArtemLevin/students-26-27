import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(result=>result.status===0)?.stdout.trim();
if(!chrome)throw new Error('Chrome/Chromium is required for MathML browser QA');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.tex':'text/plain'};
const server=http.createServer((request,response)=>{
  try {
    const target=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      response.writeHead(404);response.end('Not found');return;
    }
    response.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(response);
  }catch(error){response.writeHead(500);response.end('Error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'denis-mathml-'));
const processChrome=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,serial=0;
const pending=new Map(),jsErrors=[],failedRequests=[];
try{
  let port=0;
  for(let i=0;i<160;i++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    if(processChrome.exitCode!==null)throw Error('Chrome exited unexpectedly');
    await sleep(90);
  }
  assert.ok(port,'Chrome did not open DevTools');
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const tab=tabs.find(x=>x.type==='page');assert.ok(tab);
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.id&&pending.has(msg.id)){const callback=pending.get(msg.id);pending.delete(msg.id);callback(msg);}
    if(msg.method==='Runtime.exceptionThrown')
      jsErrors.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text);
    if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400)
      failedRequests.push(msg.params.response.url+': '+msg.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const data=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(data.exceptionDetails)throw Error(data.exceptionDetails.exception?.description||data.exceptionDetails.text);
    return data.result.value;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  async function navigate(page,width,height,dark){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=768});
    const url=origin+'/students/denis_ermolaev/site/'+page;
    await call('Page.navigate',{url});
    for(let i=0;i<160;i++){
      const current=await run('({url:location.href,ready:document.readyState})');
      if(current.url.startsWith(url)&&current.ready==='complete')break;
      if(i===159)throw Error('Page load timeout '+page);
      await sleep(70);
    }
    await run("document.documentElement.dataset.theme='"+(dark?'dark':'light')+"'");
    const data=await run("(()=>{const all=[...document.querySelectorAll('math')],vis=all.filter(x=>x.getClientRects().length),ns='http://www.w3.org/1998/Math/MathML';return {total:all.length,invalid:all.filter(m=>m.namespaceURI!==ns||[...m.querySelectorAll('*')].some(x=>x.namespaceURI!==ns)).length,unrendered:vis.filter(x=>x.getBoundingClientRect().height<3||x.getBoundingClientRect().width<1).length,width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}})()");
    assert.ok(data.total>=(page.includes('lab')?18:63),'MathML count '+JSON.stringify(data));
    assert.equal(data.invalid,0,'Bad math namespace');
    assert.equal(data.unrendered,0,'Unrendered math');
    assert.ok(data.width<=data.client+2,'Horizontal overflow '+page+' '+width+' '+JSON.stringify(data));
  }
  for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1440,900]]){
    for(const dark of [false,true]){
      await navigate('16.10.26.html',width,height,dark);
      assert.equal(await run("document.querySelectorAll('.exercise details math').length"),10);
      await navigate('16.10.26-lab.html',width,height,dark);
      const result=await run("({axis:document.querySelectorAll('#grid foreignObject math').length,points:document.querySelectorAll('#points foreignObject math').length,values:['base','shift','A','B','asymptote','observation','target','answer'].every(id=>!!document.getElementById(id).querySelector('math'))})");
      assert.ok(result.axis>=6,'Missing MathML axes '+JSON.stringify(result));
      assert.equal(result.points,2,'Missing MathML point coordinates');
      assert.ok(result.values,'Missing MathML lab data');
    }
  }
  await navigate('16.10.26-lab.html',1440,900,false);
  for(const [mode,base,shift,answer] of [['lesson','2','−3','61'],['rise','3','−5','22'],['fall','0,5','−4','4']]){
    const data=await run("(()=>{document.querySelector('[data-case="+JSON.stringify(mode)+"]').click();document.getElementById('reveal').click();const ids=['base','shift','A','B','asymptote','observation','target','answer'];return {base:document.getElementById('base').textContent,shift:document.getElementById('shift').textContent,answer:document.getElementById('answer').textContent,math:ids.every(id=>document.getElementById(id).querySelector('math')?.namespaceURI==='http://www.w3.org/1998/Math/MathML'),points:document.querySelectorAll('#points foreignObject math').length,hidden:document.getElementById('answer').hidden}})()");
    assert.equal(data.base,base);
    assert.equal(data.shift,shift);
    assert.ok(data.answer.includes(answer));
    assert.equal(data.math,true,mode+' changed data must remain MathML');
    assert.equal(data.points,2);
    assert.equal(data.hidden,false);
  }
  assert.deepEqual(jsErrors,[],'Browser JavaScript errors');
  assert.deepEqual(failedRequests,[],'Missing network resources');
  console.log('Denis native MathML browser QA PASS');
}finally{
  try{ws?.close();}catch{}
  processChrome.kill('SIGKILL');server.close();
  if(processChrome.exitCode===null)await new Promise(resolve=>{
    const timer=setTimeout(resolve,2000);processChrome.once('exit',()=>{clearTimeout(timer);resolve();});
  });
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
  catch(error){if(!['ENOTEMPTY','EBUSY'].includes(error.code))throw error;}
}
