'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const root=process.cwd(),site='students/kirill_zinoviev/site/';
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.png':'image/png','.pdf':'application/pdf','.tex':'text/plain;charset=utf-8','.woff2':'font/woff2'};
const problems=[];
const server=http.createServer((req,res)=>{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let f=path.resolve(root,'.'+pathname);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);res.end('404 '+pathname);return}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(data)})});
const prefix='/'+site;
const sizes=[[375,812],[390,844],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
const short=s=>String(s).slice(0,230);
function flag(message){problems.push(message);console.error('FAIL',message)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const [file,kind] of [['17.10.26.html','lesson'],['17.10.26-lab.html','lab'],['index.html','home']]){
 for(const [w,h] of sizes){
  for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce',colorScheme:theme});
   await context.addInitScript(v=>{try{localStorage.setItem('kirill-dashboard-theme-v1',v)}catch{}},theme);
   const page=await context.newPage();
   const errs=[],missing=[];
   page.on('pageerror',e=>errs.push(short(e.message)));page.on('console',e=>{if(e.type()==='error')errs.push(short(e.text()))});
   page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url().slice(-95))});
   page.on('requestfailed',r=>missing.push('requestfailed '+r.url().slice(-95)));
   await page.goto('http://127.0.0.1:8765'+prefix+file,{waitUntil:'networkidle',timeout:30000});
   await page.waitForTimeout(100);
   const dimensions=await page.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,doc:document.documentElement.scrollWidth,invalidLinks:[...document.querySelectorAll('a[href="#"]')].length,missingNames:[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length,theme:document.documentElement.dataset.theme||document.body.dataset.theme||'dark'}));
   if(dimensions.doc>w+1||dimensions.body>w+1)flag(kind+' '+w+' '+theme+' horizontal overflow '+JSON.stringify(dimensions));
   if(dimensions.invalidLinks||dimensions.missingNames)flag(kind+' '+w+' '+theme+' inert or nameless '+JSON.stringify(dimensions));
   if(dimensions.theme!==theme)flag(kind+' '+w+' theme mismatch '+dimensions.theme);
   if(errs.length)flag(kind+' '+w+' '+theme+' console '+errs.join('|'));
   if(missing.length)flag(kind+' '+w+' '+theme+' network '+missing.join('|'));
   if([375,768,1440].includes(w)){fs.mkdirSync('/tmp/kirill-review-screens',{recursive:true});await page.screenshot({path:'/tmp/kirill-review-screens/'+kind+'-'+w+'-'+theme+'.png',fullPage:true})}
   if(w===1440&&theme==='light'){
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    console.log('AXE',kind,'violations',result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,targets:v.nodes.map(n=>n.target.join(' ')).slice(0,4)})));
    if(kind!=='home')for(const v of result.violations)if(['critical','serious'].includes(v.impact))flag('A11Y '+kind+' '+v.id+' '+v.nodes.map(n=>n.target.join(' ')).slice(0,4).join(';'));
   }
   if(kind==='lesson'&&w===1440&&theme==='light'){
    assert.equal(await page.locator('ol.tasks>li').count(),10);
    await page.getByText('Посмотреть ответ').first().click();assert.equal(await page.locator('ol.tasks details[open]').count(),1);
    await page.locator('#selfcheck input').first().check();assert.match(await page.locator('#progress').innerText(),/1 из 4/);
    await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   }
   if(kind==='lab'&&w===1440&&theme==='light'){
    const expected={value:['−6','−2','Да'],square:['−4','7','Да'],table:['0','0','Да'],domain:['7','—','Нет']};
    for(const mode of ['value','square','table','domain']){
     await page.locator('[data-mode="'+mode+'"]').click();const actual=await Promise.all(['argument','value','valid'].map(id=>page.locator('#'+id).innerText()));assert.deepEqual(actual,expected[mode],mode);
     const slider=page.locator('#argumentRange');
     await slider.evaluate(e=>{e.value=e.max;e.dispatchEvent(new Event('input',{bubbles:true}))});
     await page.locator('#reset').click();
     assert.equal(await page.locator('#argument').innerText(),expected[mode][0]);
     await page.locator('#capture').click();
     await page.locator('#next').click();
     assert.match(await page.locator('#snapshot').innerText(),/Было:/);
     await page.locator('#clear-capture').click();
    }
    await page.goto('http://127.0.0.1:8765'+prefix+'17.10.26-lab.html?mode=domain');assert.match(await page.locator('#mode-label').innerText(),/область определения/i);
    await page.locator('#argumentRange').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}))});
    assert.equal(await page.locator('#argument').innerText(),'−6');
    assert.equal(await page.locator('#value').innerText(),'−1/13','non-terminating rational must display as exact fraction');
    assert.equal(await page.locator('#argumentRange').getAttribute('aria-valuetext'),'x = −6');
    await page.locator('#formula').selectOption('1');
    assert.equal(await page.locator('#value').innerText(),'−2/3');
    assert.equal(await page.locator('#graph button[aria-pressed=true]').count(),1);

   }
   if(kind==='home'&&w===1440&&theme==='light'){
    const title=await page.locator('#lesson-title').innerText();console.log('HOME LATEST',title);
    if(!title.includes('Функция'))flag('latest lesson not functions: '+title);
    const href=await page.locator('#latestLessonCta').getAttribute('href');if(!href?.includes('17.10.26.html'))flag('lesson CTA broken '+href);
   }
   console.log('CHECK',kind,w,theme,'OK');
   await context.close();
  }
 }
}
}finally{await browser.close();server.close()}
console.log('RESULT',{problems:problems.length});if(problems.length)process.exitCode=1;
})().catch(e=>{console.error('FATAL',e.stack||e);server.close();process.exitCode=1});