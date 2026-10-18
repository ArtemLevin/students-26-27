'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const AxeBuilder=require('@axe-core/playwright').default;
const root=process.cwd(),base='/students/kirill_zinoviev/site/';
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.json':'application/json;charset=utf-8','.tex':'text/plain;charset=utf-8','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{let location=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+location);
if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end(location)}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(data)});
});
async function check(page,file,mode,width){
const state=await page.evaluate(()=>{
const math=[...document.querySelectorAll('math')];
return {mathCount:math.length,nonNamespace:math.filter(e=>e.namespaceURI!=='http://www.w3.org/1998/Math/MathML').length,
numberFractions:document.querySelectorAll('mfrac').length,powers:document.querySelectorAll('msup').length,
overhang:document.documentElement.scrollWidth-innerWidth,
plainVariables:(()=>{
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),texts=[];let n;
while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.closest('math,script,style,option'))continue;
if(/(^|[\s(,])(?:x|y)(?=($|[\s).,:]))/.test(n.nodeValue))texts.push(n.nodeValue.trim())}
return texts.slice(0,8)})()};
});
console.log('MATHML',file,mode,width,state);
assert.equal(state.nonNamespace,0,'All math nodes must be MathML');
assert.ok(state.mathCount>(file==='lesson'?100:20),'Missing semantic math');
assert.ok(state.numberFractions>0,'Fractions must use mfrac');
assert.ok(state.overhang<=1,'Horizontal overhang');
assert.deepEqual(state.plainVariables,[],'Visible math variable outside MathML');
}
async function main(){
await new Promise(r=>server.listen(8766,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const theme of ['light','dark'])for(const width of [375,768,1024,1440]){
const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
await context.addInitScript(v=>{localStorage.setItem('kirill-dashboard-theme-v1',v)},theme);
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
await page.goto('http://127.0.0.1:8766'+base+'17.10.26.html',{waitUntil:'networkidle'});
await check(page,'lesson','static',width);
assert.equal(await page.locator('ol.tasks>li').count(),10);
assert.equal(await page.locator('math msup').count()>0,true);
if(theme==='light'&&width===1440){const v=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();console.log('Axe lesson',v.violations.map(x=>x.id));assert.equal(v.violations.filter(x=>['serious','critical'].includes(x.impact)).length,0)}
await page.goto('http://127.0.0.1:8766'+base+'17.10.26-lab.html',{waitUntil:'networkidle'});
for(const mode of ['value','square','table','domain']){
await page.locator('[data-mode="'+mode+'"]').click();
await check(page,'lab',mode,width);
assert.equal(await page.locator('#equation math').count(),1);
assert.equal(await page.locator('#formulaPreview math').count(),1);
assert.equal(await page.locator('#argument math').count(),1);
assert.equal(await page.locator('#value math').count(),1);
assert.equal(await page.locator('#thead math').count()>2,true);
await page.locator('#capture').click();
await page.locator('#next').click();
assert.equal(await page.locator('#snapshot math').count(),6);
await page.locator('[data-prediction=yes]').click();
assert.equal(await page.locator('#feedback math').count(),1);
await page.locator('#reset').click();
}
await page.locator('[data-mode=domain]').click();
await page.locator('#argumentRange').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
assert.ok(await page.locator('#value mfrac').count(),'Exact rational values are fractions');
await page.locator('#formula').selectOption('1');
assert.ok(await page.locator('#value mfrac').count(),'Exact second rational value');
assert.ok(await page.locator('#equation mfrac').count(),'Formula uses native fraction');
assert.ok(await page.locator('#graph math').count(),'Diagram uses native MathML');
if(theme==='light'&&width===1440){const v=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();console.log('Axe lab',v.violations.map(x=>x.id));assert.equal(v.violations.filter(x=>['serious','critical'].includes(x.impact)).length,0)}
if(errors.length)throw Error('Browser errors '+errors.join('\n'));
await context.close();
}
}finally{await browser.close();server.close()}
console.log('ALL MathML + UI browser tests passed');
}
main().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
