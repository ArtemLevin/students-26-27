import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(site,'../../..');
const basePath='/students/matvey_gorbachev/site/';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf','.tex':'text/plain'};
const server=http.createServer((request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
    const source=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
    response.setHeader('Content-Type',(mime[path.extname(source)]||'application/octet-stream')+'; charset=utf-8');
    fs.createReadStream(source).on('error',()=>{if(!response.headersSent)response.writeHead(404);response.end();}).pipe(response);
  }catch(_){response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const origin='http://127.0.0.1:'+port+basePath;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const resolutions=[[1440,900],[1024,768],[768,1024],[390,844],[360,800]];
const artifactDir=path.join(root,'.matvey-browser-qa');
fs.mkdirSync(artifactDir,{recursive:true});
let completed=0;
try{
 for(const [width,height] of resolutions){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('console',message=>{if(message.type()==='error')failures.push(message.text());});
  await page.goto(origin+'index.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('#competencyMap .radial-cell').length>0,{timeout:15000});
  const basic=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,viewport:window.innerWidth,
    total:document.getElementById('totalCount').textContent.trim(),
    confidence:document.getElementById('confidentCount').textContent.trim(),
    map:document.querySelectorAll('#competencyMap .radial-cell').length,
    focus:Boolean(document.getElementById('focusCard').textContent.trim()),
    lesson:document.getElementById('lesson-title').textContent.trim()
  }));
  assert.ok(basic.width<=basic.viewport+2,'main overflow at '+width+': '+JSON.stringify(basic));
  assert.ok(Number(basic.total)>0,'stats missing '+width);
  assert.ok(basic.map>200,'competency map not populated '+width);
  assert.equal(await page.locator('#competencyMap').getAttribute('role'),'group','interactive map should expose child buttons to assistive technology');
  assert.equal(await page.locator('#competencyMap .radial-cell').first().getAttribute('role'),'button','map cell accessibility semantics');
  assert.ok(basic.focus,'focus control missing '+width);
  assert.ok(basic.lesson==='Как устроен платёж','latest lesson wrong '+width);
  if(width===1440){
    const cell=page.locator('#competencyMap .radial-cell').first();
    await cell.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#topicDialog').evaluate(d=>d.open),true,'competency dialog did not open');
    await page.locator('#dialogClose').click();
    assert.equal(await page.locator('#topicDialog').evaluate(d=>d.open),false,'competency dialog did not close');
    const financeCell=page.locator('#competencyMap .radial-cell[data-id="finance_11"]');
    assert.equal(await financeCell.getAttribute('data-level'),'0','evidence cannot raise mastery automatically');
    await financeCell.focus();
    await page.keyboard.press('Enter');
    const financeHistory=await page.locator('#dialogHistory').innerText();
    assert.ok(financeHistory.includes('18.10.26'),'18 Oct finance evidence missing');
    assert.ok(financeHistory.includes('22.10.26'),'22 Oct finance evidence missing');
    assert.equal(await page.locator('#dialogLevel').innerText().then(x=>x.trim().startsWith('0 / 4')),true,'lesson history must preserve diagnostic level');
    await page.locator('#dialogClose').click();
    const repeatFilter=page.locator('.filter[data-filter="repeat"]');
    await repeatFilter.click();
    assert.equal(await repeatFilter.getAttribute('aria-pressed'),'true','repeat filter not selected');
    await page.locator('.filter[data-filter="all"]').click();
  }
  if(width<=760){
    const button=page.locator('#menuButton');await button.click();
    assert.equal(await button.getAttribute('aria-expanded'),'true','menu did not open '+width);
    await page.waitForTimeout(280); // Respect the CSS transition before inspecting visibility.
    const navState=await page.locator('#primaryNav').evaluate(el=>{
      const cs=getComputedStyle(el),box=el.getBoundingClientRect();
      return {display:cs.display,visibility:cs.visibility,transform:cs.transform,
        left:box.left,right:box.right,bodyOpen:document.body.classList.contains('nav-open')};
    });
    assert.ok(await page.locator('#primaryNav').isVisible(),'mobile nav hidden '+width+': '+JSON.stringify(navState));
    await page.keyboard.press('Escape');
    assert.equal(await button.getAttribute('aria-expanded'),'false','menu did not close '+width);
  }
  if(width===390){
    await page.locator('#themeToggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','theme toggle did not work');
  }
  // The modal and keyboard checks move focus down the long page.
  // Restore the genuine initial viewport before taking full-page screenshots.
  await page.evaluate(()=>{document.activeElement?.blur?.();window.scrollTo(0,0);});
  await page.waitForTimeout(80);
  await page.screenshot({path:path.join(artifactDir,'index-'+width+'.png'),fullPage:true});
  await page.goto(origin+'archive.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('.archive-tile').length>=9,{timeout:15000});
  await page.waitForTimeout(200);
  const archive=await page.evaluate(()=>{
    const tiles=[...document.querySelectorAll('.archive-tile')];
    const visible=tiles.filter(t=>!t.hidden);
    return {width:document.documentElement.scrollWidth,viewport:window.innerWidth,
      counts:tiles.length,months:document.querySelectorAll('.archive-month').length,
      heights:visible.map(t=>Math.round(t.getBoundingClientRect().height)),
      clipped:visible.filter(t=>t.scrollHeight>t.clientHeight+3).length,
      titles:visible.filter(t=>t.querySelector('.archive-tile-title').scrollHeight>t.querySelector('.archive-tile-title').clientHeight+2).length};
  });
  assert.ok(archive.width<=archive.viewport+2,'archive overflow '+width+': '+JSON.stringify(archive));
  assert.equal(archive.counts,11,'archive lesson count '+width);
  assert.equal(archive.months,2,'archive month groups '+width);
  assert.ok(Math.max(...archive.heights)-Math.min(...archive.heights)<=2,'unequal tiles '+width+': '+JSON.stringify(archive.heights));
  assert.equal(archive.clipped,0,'clipped archive card '+width);
  assert.equal(archive.titles,0,'clipped archive title '+width);
  if(width===390){assert.equal(await page.locator('body').getAttribute('data-theme'),null,'archive theme not retained');}
  await page.locator('#archiveSearch').fill('вклады');
  assert.equal(await page.locator('.archive-tile:visible').count(),2,'archive search failed '+width);
  await page.locator('#archiveSearch').fill('');
  assert.equal(await page.locator('.archive-tile:visible').count(),11,'archive reset failed '+width);
  await page.screenshot({path:path.join(artifactDir,'archive-'+width+'.png'),fullPage:true});
  await page.goto(origin+'18.10.26.html',{waitUntil:'networkidle'});
  await page.locator('.poster img').scrollIntoViewIfNeeded();
  await page.locator('.poster img').evaluate(image=>image.decode());
  const lessonState=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    title:document.querySelector('h1')?.textContent.trim(),
    tasks:document.querySelectorAll('.tasks li').length,
    poster:document.querySelector('.poster img')?.complete && document.querySelector('.poster img')?.naturalWidth>0
  }));
  assert.ok(lessonState.width<=lessonState.viewport+2,'new lesson overflow '+width+': '+JSON.stringify(lessonState));
  assert.equal(lessonState.title,'Кредитные платежи','new lesson title '+width);
  assert.equal(lessonState.tasks,10,'new lesson task count '+width);
  assert.ok(lessonState.poster,'new lesson poster missing '+width);
  await page.locator('.answers summary').click();
  assert.equal(await page.locator('.answers li').count(),10,'new lesson answer count '+width);

  await page.goto(origin+'18.10.26-lab.html?mode=compare',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-mode="compare"]').getAttribute('aria-pressed'),'true','lab deep link '+width);
  assert.equal(await page.locator('#scheduleBody tr').count(),4,'lab initial schedule '+width);
  await page.locator('[data-preset="annuity"]').click();
  assert.equal(await page.locator('#scheduleBody tr').count(),3,'lab annuity schedule '+width);
  assert.ok((await page.locator('#total').textContent()).includes('399'), 'lab annuity total '+width);
  await page.locator('[data-preset="mixed"]').click();
  assert.equal(await page.locator('#rateTwoValue').textContent(),'15%','lab variable-rate scenario '+width);
  assert.equal(await page.locator('#scheduleBody tr').count(),4,'lab variable-rate schedule '+width);
  await page.locator('#swap').click();
  assert.equal(await page.locator('[data-mode="compare"]').getAttribute('aria-pressed'),'true','lab comparison '+width);
  const labSize=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(labSize.width<=labSize.viewport+2,'lab overflow '+width+': '+JSON.stringify(labSize));
  if(width===390){
    await page.locator('#theme').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','lab dark theme toggle');
  }

  // The latest published lesson has its own responsive and interactive smoke tests.
  await page.goto(origin+'22.10.26.html',{waitUntil:'networkidle'});
  await page.locator('.book img').scrollIntoViewIfNeeded();
  await page.locator('.book img').evaluate(image=>image.decode());
  const latestLesson=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,viewport:innerWidth,
    title:document.querySelector('h1')?.textContent.trim(),
    tasks:document.querySelectorAll('.tasks li').length,
    image:document.querySelector('.book img')?.naturalWidth>0
  }));
  assert.ok(latestLesson.width<=latestLesson.viewport+2,'22 Oct lesson overflow '+width+': '+JSON.stringify(latestLesson));
  assert.equal(latestLesson.title,'Как устроен платёж','22 Oct lesson title '+width);
  assert.equal(latestLesson.tasks,10,'22 Oct task count '+width);
  const mathStats=await page.evaluate(()=>({
    count:document.querySelectorAll('#models math,#annuity math,#deposit math,#diff math,#model math,#constraints math,#mixed math,#practice math').length,
    fraction:document.querySelectorAll('math mfrac').length,
    indexed:document.querySelectorAll('math msub').length,
    power:document.querySelectorAll('math msup').length,
    invalid:[...document.querySelectorAll('math')].filter(el=>el.namespaceURI!=='http://www.w3.org/1998/Math/MathML').length,
    cell:document.querySelectorAll('.ledger td math').length,
    practice:document.querySelectorAll('.tasks math').length,
    question:document.querySelector('.equation math[display="block"]')?.textContent
  }));
  assert.ok(mathStats.count>=130,'MathML lesson coverage '+width+': '+JSON.stringify(mathStats));
  assert.ok(mathStats.fraction>=5&&mathStats.indexed>=10&&mathStats.power>=5,'MathML semantic structures '+width);
  assert.equal(mathStats.invalid,0,'MathML must be browser-native '+width);
  assert.ok(mathStats.cell>=18&&mathStats.practice>=30,'MathML table and exercises '+width);

  assert.ok(latestLesson.image,'22 Oct poster missing '+width);
  if(width===390)assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','new lesson does not inherit cabinet theme');
  if(width===1440||width===390){
    await page.screenshot({path:path.join(artifactDir,'lesson-22-'+width+'.png'),fullPage:true});
    await page.locator('#themeToggle').click();
    await page.screenshot({path:path.join(artifactDir,'lesson-22-alternate-theme-'+width+'.png'),fullPage:true});
    await page.locator('#themeToggle').click();
  }
  await page.locator('.answers summary').click();
  assert.equal(await page.locator('.answers li').count(),10,'22 Oct answer count '+width);
  await page.goto(origin+'22.10.26-lab.html?mode=arbitrary',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-mode="arbitrary"]').getAttribute('aria-pressed'),'true','new lab default mode '+width);
  assert.equal(await page.locator('#rows tr').count(),3,'new lab arbitrary schedule '+width);
  const mathDynamic=await page.evaluate(()=>({
    fields:document.querySelectorAll('#principalOut math,#rateOut math,#retentionOut math').length,
    totals:document.querySelectorAll('#total math,#overpay math,#overpayPct math').length,
    rows:document.querySelectorAll('#rows td math').length,
    graph:document.querySelectorAll('#graph .amount math').length,
    invalid:[...document.querySelectorAll('math')].filter(el=>el.namespaceURI!=='http://www.w3.org/1998/Math/MathML').length
  }));
  assert.ok(mathDynamic.fields>=3&&mathDynamic.totals>=3,'MathML missing from dynamic lab metrics '+width);
  assert.ok(mathDynamic.rows>=18&&mathDynamic.graph>=3,'MathML missing from updated lab table or chart '+width);
  assert.equal(mathDynamic.invalid,0,'MathML dynamic nodes must use the MathML namespace '+width);

  assert.ok((await page.locator('#total').textContent()).includes('969'),'new lab reference total '+width);
  if(width===390)assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','new lab does not inherit cabinet theme');
  for(const value of ['300','1200','750']){
    await page.locator('#principal').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
    const data=await page.locator('#rows tr').count();
    assert.equal(data,3,'arbitrary schedule missing at principal '+value+' / '+width);
    const pay=await page.locator('#total').textContent();
    assert.ok(!pay.includes('NaN')&&!pay.includes('Infinity'),'invalid payment at principal '+value+' / '+width);
  }
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.controls').evaluate(el=>getComputedStyle(el).display),'none','lab print controls must be hidden '+width);
  await page.emulateMedia({media:'screen'});
  if(width===1440||width===390)await page.screenshot({path:path.join(artifactDir,'lab-22-'+width+'.png'),fullPage:true});
  await page.locator('#snapshot').click();
  await page.locator('#rate').evaluate(el=>{el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.ok((await page.locator('#comparison').textContent()).includes('Изменение'),'new lab compare state '+width);
  await page.locator('[data-mode="limits"]').click();
  assert.equal(await page.locator('#rows tr').count(),3,'new lab limits schedule '+width);
  assert.ok((await page.locator('#insightText').textContent()).includes('каждый < 5: да'),'new lab limits baseline '+width);
  await page.locator('#principal').evaluate(el=>{el.value='10';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.ok((await page.locator('#insightText').textContent()).includes('каждый < 5: нет'),'new lab limits threshold '+width);
  await page.locator('[data-mode="mixed"]').click();
  assert.ok(await page.locator('#rows td math').count()>=18,'MathML must regenerate on mode change '+width);

  assert.equal(await page.locator('#rows tr').count(),5,'new lab mixed schedule '+width);
  assert.ok((await page.locator('#insightText').textContent()).includes('2,16'),'new lab mixed calculation '+width);
  const newLabSize=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(newLabSize.width<=newLabSize.viewport+2,'22 Oct lab overflow '+width+': '+JSON.stringify(newLabSize));
  assert.deepEqual(failures,[],'browser console/page errors '+width+': '+failures.join('; '));
  console.log('PASS',width+'x'+height,JSON.stringify({map:basic.map,tiles:archive.counts,heights:archive.heights,theme:width===390?'dark':'light'}));
  completed++;await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
assert.equal(completed,resolutions.length);
