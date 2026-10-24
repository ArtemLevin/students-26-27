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
  // The October 9 lesson remains independently tested above.
  // The new October 13 lesson must render and recompute without regressions.
  for(const view of [{name:'desktop',w:1440,h:900},{name:'mobile',w:375,h:812},{name:'narrow',w:320,h:700}]){
    await call('Emulation.setDeviceMetricsOverride',{width:view.w,height:view.h,deviceScaleFactor:1,mobile:view.w<500});
    await navigate('13.10.26.html');
    await wait('document.querySelectorAll("#loanRows tr").length===6');
    for(const theme of ['light','dark']){
      await run('document.documentElement.dataset.theme="'+theme+'"');
      const metrics=await execute(()=>({
        width:document.documentElement.scrollWidth,
        viewport:innerWidth,
        rows:document.querySelectorAll('#loanRows tr').length,
        tasks:document.querySelectorAll('.tasks>li').length,
        overpay:document.querySelector('#overPct').textContent,
        mathml:document.querySelectorAll('main math').length,
        fractions:document.querySelectorAll('main math mfrac').length,
        subscript:document.querySelectorAll('main math msub').length,
        semantic: [...document.querySelectorAll('main math')].every(el=>el.namespaceURI==='http://www.w3.org/1998/Math/MathML'),
        dynamic: [...document.querySelectorAll('#loanRows tr')].every(tr=>[...tr.cells].every(cell=>cell.querySelector('math')?.namespaceURI==='http://www.w3.org/1998/Math/MathML')),
        uniqueIds:(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return new Set(ids).size===ids.length;})()
      }));
      assert.ok(metrics.width<=metrics.viewport+2,'New lesson overflow '+view.name+'/'+theme+' '+JSON.stringify(metrics));
      assert.equal(metrics.rows,6);
      assert.equal(metrics.tasks,10);
      assert.equal(metrics.overpay,'22,5%');
      assert.ok(metrics.mathml>=150,'MathML coverage missing '+JSON.stringify(metrics));
      assert.ok(metrics.fractions>=5,'Semantic MathML fractions missing');
      assert.ok(metrics.subscript>=10,'MathML subscripts missing');
      assert.equal(metrics.semantic,true,'MathML namespace is invalid');
      assert.equal(metrics.dynamic,true,'Interactive table has raw numeric cells');
      assert.equal(metrics.uniqueIds,true);
      await screenshot('lesson-131026-'+view.name+'-'+theme);
    }
    const interaction=await execute(()=>{
      const sum=document.querySelector('#loanSum'),rate=document.querySelector('#loanRate');
      sum.value='2';rate.value='10';rate.dispatchEvent(new Event('input',{bubbles:true}));
      const result={overpay:document.querySelector('#overPct').textContent,
        total:document.querySelector('#totalPaid').textContent,
        tableMath:[...document.querySelectorAll('#loanRows tr')].every(tr=>[...tr.cells].every(cell=>!!cell.querySelector('math')))};
      document.querySelector('#loanReset').click();
      result.reset=document.querySelector('#overPct').textContent;
      for(const [name,value] of [['q1','b'],['q2','c'],['q3','b']]){
        document.querySelector('input[name="'+name+'"][value="'+value+'"]').checked=true;
      }
      document.querySelector('#quiz').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      result.quiz=document.querySelector('#quizFeedback').textContent;
      return result;
    });
    assert.equal(interaction.overpay,'45%');
    assert.equal(interaction.tableMath,true);
    assert.equal(interaction.reset,'22,5%');
    assert.match(interaction.quiz,/Все три ответа верны/);
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
       latestLinks:[...document.querySelectorAll('a[href*="16.10.26"]')].length,
      evidence:credit.map(i=>({title:i.title,exists:i.evidence?.some(e=>e.date==='09.10.26')})),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.equal(home.latest,'23.10.26');
  assert.match(home.visibleLatest,/Комплексное повторение/);
   assert.ok(home.latestLinks>=4,'New lesson links missing');
  assert.ok(home.links>=4);
  assert.equal(home.evidence.length,3);
  assert.ok(home.evidence.every(x=>x.exists),'Missing credit evidence '+JSON.stringify(home.evidence));
  assert.equal(home.horizontalOverflow,false);
  await screenshot('home-desktop');

  // 23 October lesson: revision, interactive motion and work models.
  await navigate('23.10.26.html');
  await wait('!!document.querySelector("#drive-range") && !!document.querySelector("#pump-range")');
  const new23=await execute(()=>{
    const d=document.querySelector('#drive-range'),p=document.querySelector('#pump-range');
    const start={title:document.querySelector('h1').textContent,
      anchors:['powers','exponential','vectors','motion','work','check'].every(id=>!!document.getElementById(id)),
      a:document.getElementById('drive-a').textContent,b:document.getElementById('drive-b').textContent,
      finalPump:document.getElementById('pump-fill').textContent};
    d.value='2';d.dispatchEvent(new Event('input',{bubbles:true}));
    const remaining=document.getElementById('drive-left').textContent;
    p.value='120';p.dispatchEvent(new Event('input',{bubbles:true}));
    const pump120=document.getElementById('pump-fill').textContent;
    p.value='280';p.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('.answers [data-value="3"]').click();
    document.querySelector('#checks input').click();
    document.documentElement.dataset.theme='light';document.querySelector('#theme').click();
    return {...start,remaining,pump120,pumpFinal:document.getElementById('pump-fill').textContent,
      feedback:document.getElementById('answer-feedback').textContent,
      checked:document.getElementById('check-progress').textContent,
      theme:document.documentElement.dataset.theme,
      overflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.match(new23.title,/Комплексное\s*повторение/);
  assert.equal(new23.anchors,true);
  assert.equal(new23.a,'180 км');assert.equal(new23.b,'160 км');
  assert.equal(new23.remaining,'140 км');
  assert.equal(new23.pump120,'55,6%');
  assert.equal(new23.pumpFinal,'100%');
  assert.match(new23.feedback,/Верно/);
  assert.match(new23.checked,/Отмечено 1/);
  assert.equal(new23.theme,'dark');
  assert.equal(new23.overflow,false);
  await screenshot('lesson-23-desktop-dark');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate('23.10.26.html');
  const mobile23=await execute(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,
    title:document.querySelector('h1').textContent,
    ranges:document.querySelectorAll('input[type="range"]').length}));
  assert.equal(mobile23.overflow,false,'23 Oct mobile overflow');
  assert.equal(mobile23.ranges,2);
  await screenshot('lesson-23-mobile');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

  // Release-gate pass: responsive light/dark, MathML, exact vector scale, and ARIA progress.
  for (const view of [
    {width:1280,height:900,mobile:false,theme:'light',label:'desktop-light'},
    {width:1280,height:900,mobile:false,theme:'dark',label:'desktop-dark'},
    {width:390,height:844,mobile:true,theme:'light',label:'mobile-light'},
    {width:390,height:844,mobile:true,theme:'dark',label:'mobile-dark'},
    {width:320,height:720,mobile:true,theme:'light',label:'narrow-light'}
  ]) {
    await call('Emulation.setDeviceMetricsOverride',{width:view.width,height:view.height,
      deviceScaleFactor:1,mobile:view.mobile});
    await navigate('23.10.26.html');
    await run('document.documentElement.dataset.theme="'+view.theme+'"');
    const scan=await execute(()=>{
      const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
      const v=document.querySelector('svg.plot path[marker-end]');
      const d=document.getElementById('drive-range'),p=document.getElementById('pump-range');
      d.value='1';d.dispatchEvent(new Event('input',{bubbles:true}));
      const drive=document.getElementById('drive-track');
      p.value='120';p.dispatchEvent(new Event('input',{bubbles:true}));
      const pump=document.getElementById('pump-track');
      return {
        overflow:document.documentElement.scrollWidth>innerWidth+2,
        mathCount:document.querySelectorAll('math').length,
        fractions:document.querySelectorAll('mfrac').length,
        svgPath:v?.getAttribute('d'),
        uniqueIds:ids.length===new Set(ids).size,
        progress:drive?.getAttribute('aria-valuenow'),
        capacity:pump?.getAttribute('aria-valuenow'),
        labelledRanges:[...document.querySelectorAll('input[type="range"]')].every(el=>!!document.querySelector('label[for="'+el.id+'"]')),
        headings:document.querySelectorAll('h1').length,
        backgrounds:getComputedStyle(document.body).backgroundColor
      };
    });
    assert.equal(scan.overflow,false,'23 Oct layout '+view.label);
    assert.equal(scan.uniqueIds,true,'Duplicate IDs '+view.label);
    assert.ok(scan.mathCount>=5 && scan.fractions>=10,'Missing native math fractions '+view.label);
    assert.equal(scan.svgPath,'M104 210 L224 50','Vector plotted in wrong scale');
    assert.equal(scan.progress,'60');
    assert.equal(scan.capacity,'56');
    assert.equal(scan.labelledRanges,true);
    assert.equal(scan.headings,1);
    await screenshot('lesson-23-review-'+view.label);
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

  // Previous 20 October lesson: formulas, interactive credit comparison and controlled answers.
  await navigate('20.10.26.html');
  await wait('document.querySelectorAll("#ledger tr").length===3');
  const newLesson=await execute(()=>({
    title:document.querySelector('h1').textContent,
    tasks:document.querySelectorAll('.practice>li').length,
    anchors:['deposit','annuity','simulator','compare','practice'].every(id=>!!document.getElementById(id)),
    payment:document.querySelector('#payment').textContent.replace(/\s/g,''),
    totalA:document.querySelector('#totalA').textContent.replace(/\s/g,''),
    totalD:document.querySelector('#totalD').textContent.replace(/\s/g,''),
    overflow:document.documentElement.scrollWidth>innerWidth+2
  }));
  assert.match(newLesson.title,/Вклады и аннуитетный кредит/);
  assert.equal(newLesson.tasks,10);
  assert.equal(newLesson.anchors,true);
  assert.match(newLesson.payment,/47472,53/);
  assert.match(newLesson.totalA,/142417,58/);
  assert.match(newLesson.totalD,/140000/);
  assert.equal(newLesson.overflow,false);
  await screenshot('lesson-20-desktop');
  const recalculated20=await execute(()=>{
    document.querySelector('[data-case="210000,10,2"]').click();
    const payment=document.querySelector('#payment').textContent.replace(/\s/g,'');
    const rows=document.querySelectorAll('#ledger tr').length;
    document.querySelector('#theme').click();
    return {payment,rows,theme:document.documentElement.dataset.theme};
  });
  assert.match(recalculated20.payment,/121000/);
  assert.equal(recalculated20.rows,2);
  assert.equal(recalculated20.theme,'dark');
  await screenshot('lesson-20-dark');
  await call('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  await navigate('20.10.26.html');
  const mobile20=await execute(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,rows:document.querySelectorAll('#ledger tr').length}));
  assert.ok(mobile20.width<=mobile20.viewport+2,'20 October lesson mobile overflow '+JSON.stringify(mobile20));
  assert.equal(mobile20.rows,3);
  await screenshot('lesson-20-mobile');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

  // Previous published lesson and its mathematical laboratory.
  await navigate('16.10.26.html');
  const lesson16=await execute(()=>({
    tasks:document.querySelectorAll('.questions li').length,
    formulas:!!document.querySelector('#formulas'),
    labLink:!!document.querySelector('a[href="16.10.26-lab.html"]'),
    pdfLink:!!document.querySelector('a[href="../pdf_docs/16.10.26.pdf"]'),
    posterLink:!!document.querySelector('a[href="../images/16.10.26.png"]'),
    overflow:document.documentElement.scrollWidth>innerWidth+2,
    mathCount:document.querySelectorAll('#content math').length,
    fractionCount:document.querySelectorAll('#content mfrac').length,
    subscriptCount:document.querySelectorAll('#content msub').length,
    badHtmlSubscripts:document.querySelectorAll('#content sub').length,
    mathNamespace:document.querySelector('#content math')?.namespaceURI,
    numericTableCells:[...document.querySelectorAll('.ledger tbody td')].every(td=>td.querySelector('math > mn, math > mrow > mn'))
  }));
  assert.equal(lesson16.tasks,10);
  assert.ok(lesson16.mathCount>=130,'Expected every task, answer and formula to use MathML');
  assert.ok(lesson16.fractionCount>=14&&lesson16.subscriptCount>=10,'Expected native fraction and subscript nodes');
  assert.equal(lesson16.badHtmlSubscripts,0);
  assert.equal(lesson16.mathNamespace,'http://www.w3.org/1998/Math/MathML');
  assert.equal(lesson16.numericTableCells,true);
  assert.ok(lesson16.formulas&&lesson16.labLink&&lesson16.pdfLink&&lesson16.posterLink);
  assert.equal(lesson16.overflow,false);
  await screenshot('lesson-16-desktop');

  await navigate('16.10.26-lab.html');
  await wait('document.querySelectorAll("#rows tr").length===4');
  const constant16=await execute(()=>({
    rows:document.querySelectorAll('#rows tr').length,
    first:document.querySelector('#first').textContent,
    last:document.querySelector('#last').textContent,
    extra:document.querySelector('#extra').textContent,
    interestStyle:document.querySelector('.interest-part')?.style.height,
    numericCells:[...document.querySelectorAll('#rows td')].every(td=>td.querySelector('math')),
    mathNamespace:document.querySelector('#first math')?.namespaceURI,
    inputMath:[...document.querySelectorAll('#sValue,#nValue,#rValue')].every(el=>!!el.querySelector('math')),
    paymentMath:[...document.querySelectorAll('#first,#last,#extra')].every(el=>!!el.querySelector('math')),
    controlMath:!!document.querySelector('#verify math')
  }));
  assert.equal(constant16.rows,4);
  assert.equal(constant16.first,'0,6');
  assert.equal(constant16.last,'0,43125');
  assert.equal(constant16.extra,'0,5625');
  assert.equal(constant16.mathNamespace,'http://www.w3.org/1998/Math/MathML');
  assert.ok(constant16.numericCells&&constant16.inputMath&&constant16.paymentMath&&constant16.controlMath);
  assert.match(constant16.interestStyle,/^[\d.]+%$/);
  const variable16=await execute(()=>{
    document.querySelector('#variable').click();
    return {
      rows:document.querySelectorAll('#rows tr').length,
      first:document.querySelector('#first').textContent,
      second:document.querySelectorAll('#rows tr')[1]?.cells[5]?.textContent,
      extra:document.querySelector('#extra').textContent,
      overflow:document.documentElement.scrollWidth>innerWidth+2,
      dynamicMath:[...document.querySelectorAll('#rows td')].every(cell=>cell.querySelector('math')),
      variablePresetMath:document.querySelectorAll('#scenarioNote math').length===3
    };
  });
  assert.equal(variable16.rows,3);
  assert.equal(variable16.first,'0,52');
  assert.equal(variable16.second,'0,56');
  assert.equal(variable16.extra,'0,32');
  assert.ok(variable16.dynamicMath&&variable16.variablePresetMath);
  assert.equal(variable16.overflow,false);
  await screenshot('lab-16-variable');

  await call('Emulation.setDeviceMetricsOverride',{width:375,height:780,deviceScaleFactor:1,mobile:true});
  await navigate('16.10.26.html');
  const lessonMobile16=await execute(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(lessonMobile16.width<=lessonMobile16.viewport+2,'16 October lesson mobile overflow '+JSON.stringify(lessonMobile16));
  await screenshot('lesson-16-mobile');
  await navigate('16.10.26-lab.html');
  await wait('document.querySelectorAll("#rows tr").length===4');
  const labMobile16=await execute(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(labMobile16.width<=labMobile16.viewport+2,'16 October lab mobile overflow '+JSON.stringify(labMobile16));
  await screenshot('lab-16-mobile');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

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
