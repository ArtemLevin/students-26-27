import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=8686,host='http://127.0.0.1:'+port,root='students/kirill_zinoviev/site/',out=process.env.QA_OUT||'/tmp/kirill-geometry-qa';
fs.mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const errors=[];
const assertClean=async(page,label)=>{
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));
  assert(width.scroll<=width.client+2, label+' horizontal overflow: '+JSON.stringify(width));
  const duplicated=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)});
  assert.deepEqual(duplicated,[],label+' duplicate ids');
};
const fileChecks=async(page)=>{
  for(const uri of ['24.10.26.html','24.10.26-lab.html','../pdf_docs/24.10.26.pdf','../tex_docs/24.10.26.tex','../images/24.10.26.png']){
    const base=new URL(root+'index.html',host+'/');
    const response=await page.request.get(new URL(uri,base).toString());
    assert.equal(response.status(),200,'file missing '+uri);
  }
};
let browser;
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true});
 const viewportCases=[
 {name:'desktop-light',width:1440,height:900,dark:false},
 {name:'desktop-dark',width:1440,height:900,dark:true},
 {name:'mobile-light',width:375,height:812,dark:false},
 {name:'mobile-dark',width:375,height:812,dark:true},
 {name:'narrow-mobile',width:320,height:700,dark:false}
 ];
 for(const file of ['24.10.26.html','24.10.26-lab.html']){
  for(const config of viewportCases){
   const context=await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage(),tag=file.replaceAll('.html','')+'-'+config.name;
   page.on('pageerror',x=>errors.push(tag+' pageerror '+x.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(tag+' console '+m.text())});
   page.on('response',r=>{if(r.status()>=400)errors.push(tag+' HTTP '+r.status()+' '+r.url())});
   const response=await page.goto(host+'/'+root+file,{waitUntil:'networkidle',timeout:40000});
   assert.equal(response.status(),200,tag);
   if(config.dark){await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark')}
   await assertClean(page,tag);
   await page.screenshot({path:path.join(out,tag+'.png'),fullPage:true});
   await page.emulateMedia({media:'print'});
   await page.screenshot({path:path.join(out,tag+'-print.png'),fullPage:true});
   const printTextColor=await page.evaluate(()=>getComputedStyle(document.body).color);
   assert(['rgb(17, 17, 17)','rgb(21, 21, 21)'].includes(printTextColor),tag+' print text must be dark on paper: '+printTextColor);
   if(file==='24.10.26.html')assert.equal(await page.locator('.tasks details[open]').count(),10,tag+' printed solutions must expand');
   await page.emulateMedia({media:'screen'});
   // Chromium's emulateMedia does not guarantee an afterprint event;
   // emulate closing a real print dialog to verify restoration.
   await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
   if(file==='24.10.26.html')assert.equal(await page.locator('.tasks details[open]').count(),0,tag+' printed solutions must restore');
   if(process.env.AXE_SCRIPT){
      await page.addScriptTag({path:process.env.AXE_SCRIPT});
      const violations=await page.evaluate(async()=>{
        const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});
        return result.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target).slice(0,5)}));
      });
      assert.deepEqual(violations,[],tag+' WCAG A/AA serious failures');
   }
   if(file==='24.10.26.html'){
      assert.equal(await page.locator('.tasks>li').count(),10);
      await page.locator('.check').first().check();assert.match(await page.locator('#progressText').innerText(),/1 из 4/);
      await page.reload({waitUntil:'networkidle'});assert(await page.locator('.check').first().isChecked());
      await page.locator('a[href="24.10.26-lab.html"]').first().focus();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'24.10.26-lab.html');
   } else {
      const part=page.locator('#part'),apex=page.locator('#apex');
      for(const [value,expected] of [[3,'17 см = 17 см'],[7,'13 см = 13 см'],[17,'3 см = 3 см']]){
         await part.evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}))},value);
         assert.equal(await page.locator('#remain').innerText(),expected,tag+' AB='+value);
         await assertClean(page,tag+' with part='+value);
      }
      for(const [value,expected] of [[36,'72° = 72°'],[64,'58° = 58°'],[110,'35° = 35°']]){
         await apex.evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}))},value);
         assert.equal(await page.locator('#baseAngle').innerText(),expected,tag+' apex='+value);
      }
      await page.locator('#reset').click();assert.equal(await part.inputValue(),'7');assert.equal(await apex.inputValue(),'64');
      await page.locator('#snapshot').click();assert.match(await page.locator('#oldBC').innerText(),/13/);
      await part.evaluate(e=>{e.value='9';e.dispatchEvent(new Event('input',{bubbles:true}))});assert.match(await page.locator('#newBC').innerText(),/11/);
      await page.getByLabel('Оба уменьшатся, но останутся равными.').check();await page.getByRole('button',{name:'Проверить предсказание'}).click();
      assert.match(await page.locator('#quizStatus').innerText(),/Верно/);
   }
   await context.close();
  }
 }
 {
  const context=await browser.newContext({viewport:{width:375,height:812}});
  const page=await context.newPage();
  page.on('pageerror',x=>errors.push('home pageerror '+x.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('home console '+m.text())});
  page.on('response',r=>{if(r.status()>=400)errors.push('home HTTP '+r.status()+' '+r.url())});
  await page.goto(host+'/'+root+'index.html',{waitUntil:'networkidle',timeout:40000});
  await assertClean(page,'home-mobile');
  await page.screenshot({path:path.join(out,'home-mobile.png'),fullPage:true});
  assert.match(await page.locator('#lesson-title').innerText(),/Равнобедренный треугольник/);
  assert.equal(await page.locator('#latestLessonCta').getAttribute('href'),'24.10.26.html');
  await fileChecks(page);
  await page.setViewportSize({width:320,height:700});
  await assertClean(page,'home-narrow-320');
  await context.close();
 }
 assert.deepEqual(errors,[],'Browser console / HTTP failures');
 console.log('PASS browser QA: lesson, lab and home. Responsive screenshots '+fs.readdirSync(out).length+'; no 404/JS errors/overflow; controls correct.');
}catch(error){console.error(error);console.error('CAPTURED_ERRORS',errors);process.exitCode=1}
finally{await browser?.close();server.kill()}
