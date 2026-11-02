import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const host='http://127.0.0.1:8687';
const root='students/kirill_zinoviev/site/';
const out=process.env.QA_OUT||'/tmp/kirill-31-geometry-qa';
fs.mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','8687','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const errors=[];
const check=async(page,label)=>{
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 assert(size.scroll<=size.client+2,label+' overflow '+JSON.stringify(size));
 const duplicate=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)});
 assert.deepEqual(duplicate,[],label+' duplicate ids');
};
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true});
 for(const file of ['31.10.26.html','31.10.26-lab.html']){
  for(const config of [{name:'desktop-light',width:1440,height:900,dark:false},{name:'mobile-dark',width:375,height:812,dark:true},{name:'tablet',width:768,height:1024,dark:false},{name:'narrow',width:320,height:700,dark:false}]){
   const context=await browser.newContext({viewport:{width:config.width,height:config.height},reducedMotion:'reduce'});
   const page=await context.newPage();
   const label=file+':'+config.name;
   page.on('pageerror',e=>errors.push(label+' pageerror '+e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(label+' console '+m.text())});
   page.on('response',r=>{if(r.status()>=400)errors.push(label+' HTTP '+r.status()+' '+r.url())});
   const response=await page.goto(host+'/'+root+file,{waitUntil:'networkidle',timeout:40000});
   assert.equal(response.status(),200,label);
   if(config.dark){await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark')}
   await check(page,label);
   await page.screenshot({path:path.join(out,file.replace('.html','')+'-'+config.name+'.png'),fullPage:true});
   if(config.dark){await page.emulateMedia({media:'print'});const color=await page.evaluate(()=>getComputedStyle(document.body).color);assert.equal(color,'rgb(22, 22, 22)',label+' dark print text');await page.emulateMedia({media:'screen'})}
   if(file==='31.10.26.html'){
     assert.equal(await page.locator('.exercise').count(),10);
     assert.equal(await page.locator('#page-title').count(),1);
     await page.locator('.exercise summary').first().click();
     assert.match(await page.locator('.exercise details').first().innerText(),/11 см/);
   }else{
     await page.locator('#solution').click();
     assert.equal(await page.locator('#x').inputValue(),'5');
     assert.equal(await page.locator('#value1').innerText(),'17');
     assert.equal(await page.locator('#value2').innerText(),'17');
     assert.match(await page.locator('#status').innerText(),/Равенство выполнено/);
     await page.locator('#bisectorMode').click();
     assert.match(page.url(),/mode=bisector/);
     await page.locator('#solution').click();
     assert.equal(await page.locator('#x').inputValue(),'10');
     assert.equal(await page.locator('#value1').innerText(),'37');
     assert.equal(await page.locator('#value2').innerText(),'37');
     await page.locator('#reset').click();
     assert.equal(await page.locator('#x').inputValue(),'8');
     await page.locator('#more').click();
     assert.equal(await page.locator('#x').inputValue(),'9');
     await check(page,label+' after interactions');
   }
   if(process.env.AXE_SCRIPT){
    await page.addScriptTag({path:process.env.AXE_SCRIPT});
    const issues=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target).slice(0,5)}))});
    assert.deepEqual(issues,[],label+' accessibility serious');
   }
   await context.close();
  }
 }
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage();
 await page.goto(host+'/'+root+'index.html',{waitUntil:'networkidle',timeout:40000});
 await check(page,'dashboard');
 assert.match(await page.locator('#lesson-title').innerText(),/Статистические характеристики/);
 for(const uri of ['31.10.26.html','31.10.26-lab.html','../pdf_docs/31.10.26.pdf','../tex_docs/31.10.26.tex']){
   const response=await page.request.get(new URL(uri,host+'/'+root+'index.html').toString());
   assert.equal(response.status(),200,'missing linked file '+uri);
 }
 await context.close();
 assert.deepEqual(errors,[],'JS/console/HTTP errors');
 console.log('PASS 31 October lesson, laboratory, links and dashboard; screenshots '+fs.readdirSync(out).length);
}catch(err){console.error(err);console.error(errors);process.exitCode=1}
finally{await browser?.close();server.kill()}
