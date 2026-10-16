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
  assert.ok(basic.focus,'focus control missing '+width);
  assert.ok(basic.lesson==='Вклады. Часть 2','latest lesson wrong '+width);
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
  assert.equal(archive.counts,9,'archive lesson count '+width);
  assert.equal(archive.months,2,'archive month groups '+width);
  assert.ok(Math.max(...archive.heights)-Math.min(...archive.heights)<=2,'unequal tiles '+width+': '+JSON.stringify(archive.heights));
  assert.equal(archive.clipped,0,'clipped archive card '+width);
  assert.equal(archive.titles,0,'clipped archive title '+width);
  if(width===390){assert.equal(await page.locator('body').getAttribute('data-theme'),null,'archive theme not retained');}
  await page.locator('#archiveSearch').fill('вклады');
  assert.equal(await page.locator('.archive-tile:visible').count(),1,'archive search failed '+width);
  await page.locator('#archiveSearch').fill('');
  assert.equal(await page.locator('.archive-tile:visible').count(),9,'archive reset failed '+width);
  await page.screenshot({path:path.join(artifactDir,'archive-'+width+'.png'),fullPage:true});
  assert.deepEqual(failures,[],'browser console/page errors '+width+': '+failures.join('; '));
  console.log('PASS',width+'x'+height,JSON.stringify({map:basic.map,tiles:archive.counts,heights:archive.heights,theme:width===390?'dark':'light'}));
  completed++;await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
assert.equal(completed,resolutions.length);
