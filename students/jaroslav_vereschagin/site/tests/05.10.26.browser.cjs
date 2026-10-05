const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const out=process.env.TEST_SCREENSHOTS||'/tmp/jaroslav-20261005-screens';fs.mkdirSync(out,{recursive:true});
const root=process.cwd();
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const checks=[];const problems=[];
 for(const name of ['05.10.26.html','index.html']){
  const page=await browser.newPage();
  page.on('pageerror',e=>problems.push(name+': '+e.message));
  page.on('console',m=>{if(m.type()==='error')problems.push(name+': '+m.text())});
  page.on('response',r=>{if(r.status()>=400)problems.push(name+': '+r.status()+' '+r.url())});
  await page.goto('http://127.0.0.1:8765/students/jaroslav_vereschagin/site/'+name,{waitUntil:'networkidle'});
  for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]]){
   await page.setViewportSize({width,height});
   for(const theme of ['light','dark']){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    const state=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,ids:[...document.querySelectorAll('[id]')].map(x=>x.id),math:document.querySelectorAll('math').length,images:[...document.images].filter(i=>!i.alt).length}));
    if(state.scroll>state.width+1)problems.push(`${name} ${width} ${theme}: overflow ${state.scroll}`);
    if(new Set(state.ids).size!==state.ids.length)problems.push(name+': duplicate IDs');
    if(state.images)problems.push(name+': missing alt');
    checks.push({name,width,height,theme,overflow:state.scroll-state.width,mathCount:state.math});
    if([390,1440].includes(width))await page.screenshot({path:`${out}/site-${name}-${width}-${theme}.png`,fullPage:true});
   }
  }
  if(name==='05.10.26.html'){
   await page.setViewportSize({width:1440,height:900});
   await page.locator('[data-stage=base]').click();if(!await page.locator('#holeMarker').evaluate(x=>x.classList.contains('hidden')))problems.push('stage base does not hide hole');
   await page.locator('[data-stage=domain]').click();if(await page.locator('#holeMarker').evaluate(x=>x.classList.contains('hidden')))problems.push('stage domain does not show hole');
   await page.locator('[data-answer="-9"]').click();if(!((await page.locator('#feedback').textContent()).includes('Получаем 9')))problems.push('wrong-answer feedback');
   await page.locator('[data-answer="9"]').click();if(!((await page.locator('#feedback').textContent()).startsWith('Верно')))problems.push('correct-answer feedback');
   await page.locator('[data-check="0"]').check();if(!((await page.locator('#progress').textContent()).includes('1 из 6')))problems.push('check progress');
   await page.reload({waitUntil:'networkidle'});if(!await page.locator('[data-check="0"]').isChecked())problems.push('progress persistence');
   await page.locator('#reset').click();if(await page.locator('[data-check="0"]').isChecked())problems.push('reset');
   await page.locator('#openPoster').click();if(!await page.locator('#posterDialog').evaluate(x=>x.open))problems.push('poster dialog open');
   await page.keyboard.press('Escape');if(!await page.locator('#openPoster').evaluate(x=>document.activeElement===x))problems.push('dialog focus restore');
   const beforeTheme=await page.evaluate(()=>document.documentElement.dataset.theme);await page.locator('#theme').click();if(beforeTheme===await page.evaluate(()=>document.documentElement.dataset.theme))problems.push('theme toggle');
   await page.emulateMedia({reducedMotion:'reduce'});if((await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior))!=='auto')problems.push('reduced motion');
   await page.emulateMedia({media:'print'});await page.pdf({path:'${out}/site-print.pdf',format:'A4',printBackground:true});
   checks.push({interaction:'stage, quiz, persistence, reset, modal Escape/focus, theme, reduced motion, print',status:'passed'});
  }else{
   const archiveCount=await page.locator('#lessonArchiveList .archive-lesson').count();if(archiveCount!==9)problems.push('archive should contain 9 lessons: '+archiveCount);
   if(!((await page.locator('#materials strong').textContent()).includes('Парабола')))problems.push('latest material');
   if(await page.locator('#latestEvidence li').count()!==6)problems.push('evidence links count');
   if(await page.locator('#radialMap [data-topic-id]').count()===0&&await page.locator('#radialMap path').count()===0)problems.push('heatmap did not render');
   checks.push({home:'latest lesson, 9-item archive, 6 evidence links, heatmap',status:'passed'});
  }
  const links=await page.locator('a[href],img[src],script[src],link[rel=stylesheet]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')||x.getAttribute('src')).filter(x=>x&&!x.startsWith('data:')));
  for(const ref of links){if(ref.startsWith('#'))continue;if(/^https?:/.test(ref)){problems.push(name+': external resource '+ref);continue;}const file=path.resolve(path.join(root,'students/jaroslav_vereschagin/site'),ref.split(/[?#]/)[0]);if(!fs.existsSync(file))problems.push(name+': missing link '+ref);}
  await page.close();
 }
 const locked=await browser.newPage();await locked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable')}})});locked.on('pageerror',e=>problems.push('storage denied: '+e.message));await locked.goto('http://127.0.0.1:8765/students/jaroslav_vereschagin/site/05.10.26.html',{waitUntil:'networkidle'});await locked.locator('#theme').click();await locked.close();
 await browser.close();
 fs.writeFileSync(out+'/browser-review.json',JSON.stringify({checks,problems},null,2));
 console.log(JSON.stringify({renderChecks:checks.length,problems},null,2));if(problems.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
