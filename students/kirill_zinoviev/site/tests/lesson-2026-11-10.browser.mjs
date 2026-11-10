import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const out=process.env.QA_OUT||'/tmp/kirill-10-qa';
fs.mkdirSync(out,{recursive:true});
const playwright=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await playwright.chromium.launch({headless:true});
const failures=[];
async function visit(file,width,height,label){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await page.goto(pathToFileURL(path.join(root,file)).href);
  await page.waitForLoadState('domcontentloaded');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  assert.equal(overflow,false,'Horizontal overflow '+label);
  return {page,errors,label};
}
try{
  for(const [width,height,label] of [[1440,900,'desktop'],[390,844,'mobile']]){
    const lesson=await visit('10.11.26.html',width,height,'lesson-'+label);
    const page=lesson.page;
    assert.match(await page.title(),/Пересечение графиков/);
    assert.equal(await page.locator('article.exercise').count(),10);
    await page.locator('#next').click();
    assert.match(await page.locator('#step-state').innerText(),/Шаг 2/);
    await page.locator('#all').click();
    assert.equal(await page.locator('#steps li:visible').count(),4);
    await page.locator('input[name=belongs][value=yes]').check();
    await page.locator('#quiz-form button[type=submit]').click();
    assert.match(await page.locator('#quiz-feedback').innerText(),/Верно/);
    await page.locator('#theme').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.screenshot({path:path.join(out,'lesson-'+label+'.png'),fullPage:true});
    assert.deepEqual(lesson.errors,[],'JS errors '+lesson.label);
    await page.close();

    const lab=await visit('10.11.26-lab.html',width,height,'lab-'+label);
    const q=lab.page;
    assert.equal(await q.locator('#tab-intersection').getAttribute('aria-selected'),'true');
    await q.locator('#pair').selectOption('second');
    await q.locator('#reveal').click();
    assert.match(await q.locator('#exact').innerText(),/0,5/);
    await q.locator('#tab-membership').click();
    await q.locator('#preset-b').click();
    assert.match(await q.locator('#explanation').innerText(),/различаются/);
    await q.locator('#preset-a').click();
    assert.match(await q.locator('#explanation').innerText(),/совпали/);
    await q.screenshot({path:path.join(out,'lab-'+label+'.png'),fullPage:true});
    assert.deepEqual(lab.errors,[],'JS errors '+lab.label);
    await q.close();
  }
  const deep=await visit('10.11.26-lab.html',768,1024,'lab-deep-link');
  await deep.page.goto(pathToFileURL(path.join(root,'10.11.26-lab.html')).href+'?mode=membership');
  assert.equal(await deep.page.locator('#tab-membership').getAttribute('aria-selected'),'true');
  assert.deepEqual(deep.errors,[],'JS errors deep link');
  await deep.page.close();
  assert.ok(fs.existsSync(path.resolve(root,'../pdf_docs/10.11.26.pdf')));
  assert.ok(fs.existsSync(path.resolve(root,'../tex_docs/10.11.26.tex')));
  assert.ok(fs.existsSync(path.resolve(root,'../images/10.11.26.png')));
  console.log('Kirill 10 November: lesson/lab browser smoke, responsive, links PASS');
}catch(error){failures.push(error);console.error(error);}finally{await browser.close();}
if(failures.length)process.exitCode=1;
