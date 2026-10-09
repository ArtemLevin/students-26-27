import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const lessonHTML=fs.readFileSync(path.join(root,'students/ekaterina_gnedkova/site/09.10.26.html'),'utf8');
for(const match of lessonHTML.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(match[1]);
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(result=>result.status===0)?.stdout.trim();
if(!chrome)throw Error('Chromium required for browser QA');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  try {
    const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  } catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ekaterina-cdp-'));
const artifacts=path.join(root,'ekaterina-browser-artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,serial=0,scenes=0;
const pending=new Map(),errors=[],failedResources=[];
try{
  let port;
  for(let i=0;i<200;i++){
    const file=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
    if(chromeProcess.exitCode!==null)throw Error('Chromium terminated before CDP');
    await sleep(100);
  }
  assert.ok(port,'DevTools port unavailable');
  const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=tabs.find(item=>item.type==='page');
  assert.ok(target,'No CDP page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}
    if(message.method==='Runtime.exceptionThrown')
      errors.push(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text);
    if(message.method==='Network.responseReceived'&&message.params?.response?.status>=400)
      failedResources.push(message.params.response.url+' '+message.params.response.status);
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async expression=>{
    const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);
    return response.result.value;
  };
  const execute=func=>run('('+func.toString()+')()');
  const wait=async predicate=>{
    for(let i=0;i<80;i++){if(await run(predicate))return;await sleep(100);}
    throw Error('Wait timeout: '+predicate);
  };
  const navigate=async file=>{
    await call('Page.navigate',{url:origin+'/students/ekaterina_gnedkova/site/'+file});
    await wait('document.readyState==="complete"');
  };
  const screenshot=async name=>{
    const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'));scenes++;
  };
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  for(const view of [{name:'desktop',w:1440,h:900},{name:'mobile',w:360,h:780},{name:'narrow',w:320,h:700}]){
    await call('Emulation.setDeviceMetricsOverride',{width:view.w,height:view.h,deviceScaleFactor:1,mobile:view.w<500});
    await navigate('09.10.26.html');
    await wait('document.querySelectorAll("#loanRows tr").length===3');
    for(const theme of ['light','dark']){
      await run('document.documentElement.dataset.theme="'+theme+'"');
      const metrics=await execute(()=>{
        return {width:document.documentElement.scrollWidth,viewport:innerWidth,
          tasks:document.querySelectorAll('.task').length,uniqueIds:(()=>{
          const list=[...document.querySelectorAll('[id]')].map(e=>e.id);return list.length===new Set(list).size;})()};
      });
      assert.ok(metrics.width<=metrics.viewport+2,view.name+'/'+theme+' horizontal overflow '+JSON.stringify(metrics));
      assert.equal(metrics.tasks,10);assert.equal(metrics.uniqueIds,true);
      assert.ok((await run('document.querySelectorAll("math").length'))>140,'MathML missing');
      assert.ok(await run('[...document.querySelectorAll("#loanRows tr")].every(tr=>[...tr.cells].every(c=>!!c.querySelector("math")))'),'Dynamic MathML missing');
      await screenshot('lesson-'+view.name+'-'+theme);
    }
    const state=await execute(()=>{
      const select=document.querySelector('#scenario'),results=[];
      for(const [value,expected] of [['annuity',3],['diff',3],['arbitrary',2]]){
        select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));
        const trs=[...document.querySelectorAll('#loanRows tr')];
        results.push({value,count:trs.length,final:trs.at(-1).lastElementChild.textContent,
          rowHeaders:trs.filter(tr=>tr.querySelector('th[scope=row]')).length});
        if(trs.length!==expected||trs.at(-1).lastElementChild.textContent!=='0')
          throw Error('Incorrect final debt for '+value);
      }
      select.value='diff';select.dispatchEvent(new Event('change',{bubbles:true}));
      document.querySelector('#nextYear').click();
      if(!document.querySelector('#yearReadout').textContent.includes('2 из 3'))throw Error('Next year broken');
      document.querySelector('#resetYear').click();
      if(!document.querySelector('#yearReadout').textContent.includes('1 из 3'))throw Error('Reset broken');
      const details=[...document.querySelectorAll('.task details')];
      if(details.length!==10)throw Error('Missing answer controls');
      window.dispatchEvent(new Event('beforeprint'));
      if(details.some(el=>!el.open))throw Error('Print answers hidden');
      window.dispatchEvent(new Event('afterprint'));
      if(details.some(el=>el.open))throw Error('Print answer visibility not restored');
      return results;
    });
    assert.equal(state.length,3);
    assert.ok(state.every(x=>x.rowHeaders===x.count));
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await navigate('index.html');await wait('!!window.COMPETENCY_MAP_DATA && !!document.querySelector("#latestLessonTitle")');
  const home=await execute(()=>{
    const data=window.COMPETENCY_MAP_DATA;
    const credit=data.groups.flatMap(g=>g.items).filter(i=>
      ['Кредит с аннуитетной схемой','Кредит с дифференцированными платежами','Поиск процентной ставки'].includes(i.title));
    return {latest:data.materials[0].date,
      visibleLatest:document.querySelector('#latestLessonTitle').textContent,
      links:[...document.querySelectorAll('a[href*="09.10.26"]')].length,
      evidence:credit.map(i=>({title:i.title,exists:i.evidence?.some(e=>e.date==='09.10.26')})),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.equal(home.latest,'09.10.26');
  assert.match(home.visibleLatest,/Кредитные задачи/);
  assert.ok(home.links>=4);
  assert.equal(home.evidence.length,3);
  assert.ok(home.evidence.every(x=>x.exists),'Missing credit evidence '+JSON.stringify(home.evidence));
  assert.equal(home.horizontalOverflow,false);
  await screenshot('home-desktop');
  await call('Emulation.setDeviceMetricsOverride',{width:375,height:780,deviceScaleFactor:1,mobile:true});
  await navigate('index.html');await wait('!!window.COMPETENCY_MAP_DATA');
  await screenshot('home-mobile');
  const mobile=await execute(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(mobile.width<=mobile.viewport+2,'Home mobile overflow '+JSON.stringify(mobile));
  assert.deepEqual(errors,[],'Browser JavaScript errors');
  assert.deepEqual(failedResources,[],'Broken requests');
  console.log(JSON.stringify({ok:true,scenes,home,errors,failedResources},null,2));
}finally{
  try{ws?.close()}catch{}
  chromeProcess.kill('SIGTERM');server.close();
  // Chrome may still be writing its profile after SIGTERM; do not mask QA failures.
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:150});}catch(error){console.warn('Temporary Chrome profile cleanup:',error.code)}
}
