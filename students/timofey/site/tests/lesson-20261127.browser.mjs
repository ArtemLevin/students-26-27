import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.QA_OUT||'/tmp/timofey-271126-qa';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
const context=await browser.newContext();
const page=await context.newPage();
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
const url=(name,hash='')=>pathToFileURL(path.join(site,name)).href+hash;
const widths=[320,390,768,900,1024,1440];
const names=['27.11.26.html','27.11.26-lab.html'];
try{
  for(const name of names){
    await page.goto(url(name),{waitUntil:'load'});
    for(const theme of ['dark','light']){
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      for(const width of widths){
        await page.setViewportSize({width,height:width<768?812:960});
        const data=await page.evaluate(()=>({
          width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
          math:document.querySelectorAll('math').length,
          duplicateIds:([...document.querySelectorAll('[id]')].map(e=>e.id).filter((v,i,a)=>a.indexOf(v)!==i)),
          unlabeled:[...document.querySelectorAll('button,input,select')].filter(e=>e.tagName==='BUTTON'?!e.textContent.trim()&&!e.getAttribute('aria-label'):!e.labels?.length&&!e.getAttribute('aria-label')).map(e=>e.outerHTML)
        }));
        assert.ok(data.scroll<=data.width+1,name+' '+theme+' '+width+' overflow: '+data.scroll);
        assert.ok(data.math>0,'MathML required');
        assert.equal(data.duplicateIds.length,0);
        assert.equal(data.unlabeled.length,0,JSON.stringify(data.unlabeled));
        if([390,1440].includes(width))await page.screenshot({path:path.join(out,name+'-'+theme+'-'+width+'.png'),fullPage:name==='27.11.26.html'});
      }
    }
  }
  await page.goto(url('27.11.26.html'));
  assert.equal(await page.locator('.tasks li').count(),10);
  assert.equal(await page.locator('.tasks details').count(),10);
  await page.locator('.tasks details summary').first().click();
  assert.ok(await page.locator('.tasks details').first().evaluate(e=>e.open));
  await page.locator('.quiz').first().locator('[data-option="0"]').click();
  assert.match(await page.locator('.quiz').first().locator('.feedback').textContent(),/Проверьте/);
  await page.locator('.quiz').first().locator('[data-option="1"]').click();
  assert.match(await page.locator('.quiz').first().locator('.feedback').textContent(),/Верно/);
  await page.locator('#quizReset').click();
  assert.equal(await page.locator('.quiz').first().locator('.feedback').textContent(),'');
  await page.locator('[data-skill="0"]').check();
  assert.match(await page.locator('#progress').textContent(),/1 из 4/);
  await page.locator('[data-skill="0"]').uncheck();
  const hrefs=await page.locator('a[href]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')).filter(x=>!x.startsWith('#')));
  for(const href of hrefs)assert.ok(fs.existsSync(path.resolve(site,href.split('#')[0])),href+' missing');
  for(const mode of ['median','double','area','sine']){
    await page.goto(url('27.11.26-lab.html','#'+mode));
    assert.equal(await page.locator('#mode').inputValue(),mode);
    assert.equal(await page.locator('#metrics output').count(),4);
    for(const [a,b,t] of [[2,2,20],[12,2,150],[2,12,90],[12,12,20],[12,12,150]]){
      await page.evaluate(([a,b,t])=>{for(const [id,value] of [['a',a],['b',b],['angle',t]]){const e=document.getElementById(id);e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}))}},[a,b,t]);
      const values=await page.locator('#metrics output').allTextContents();
      assert.ok(values.every(x=>x&&!/NaN|Infinity|∞/.test(x)),values.join(','));
    }
  }
  await page.locator('#preset1').click();
  assert.equal(await page.locator('#mode').inputValue(),'double');
  assert.match(await page.locator('#metrics').textContent(),/2,646/);
  await page.locator('#preset2').click();
  assert.equal(await page.locator('#mode').inputValue(),'area');
  const metrics=await page.locator('#metrics output').allTextContents();
  assert.equal(metrics[0],'48');
  assert.equal(metrics[1],'48');
  await page.locator('#snapshot').click();
  assert.match(await page.locator('#comparison').textContent(),/Запомнено/);
  await page.locator('#reset').click();
  assert.equal(await page.locator('#mode').inputValue(),'median');
  assert.equal(await page.locator('#a').inputValue(),'2');
  assert.equal(await page.locator('#b').inputValue(),'4');
  assert.equal(await page.locator('#clear').isDisabled(),true);
  await page.locator('#a').focus();
  await page.keyboard.press('ArrowRight');
  assert.ok(Number(await page.locator('#a').inputValue())>2);
  assert.deepEqual(errors,[]);
  console.log('Browser QA PASS: 24 responsive/theme combinations, 20 boundary-mode cases, links, quiz, checklist, presets, comparison, reset and keyboard');
}finally{await browser.close()}
