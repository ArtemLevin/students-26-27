import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const site=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root=path.resolve(site,'../../..');
const page=fs.readFileSync(path.join(site,'06.11.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'06.11.26-lab.html'),'utf8');
const index=fs.readFileSync(path.join(site,'index.html'),'utf8');
const map=fs.readFileSync(path.join(site,'competency-map-data-assemble.js'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-11-06.json'),'utf8'));
const meta=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-11-06.lesson.json'),'utf8'));
test('Unique IDs and valid local links',()=>{
 for(const html of [page,lab]){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length);
  const links=[...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(x=>x[1]);
  for(const url of links){
   if(url.startsWith('data:')||url.startsWith('#')||/^https?:/.test(url))continue;
   const clean=url.split(/[?#]/,1)[0];
   if(clean)assert.ok(fs.existsSync(path.resolve(site,clean)),'Missing '+clean);
  }
 }
});
test('Inline scripts parse',()=>{
 for(const [name,html] of [['lesson',page],['lab',lab]]){
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
  for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script,{filename:name+'.js'}));
 }
});
test('Exactly ten source exercises and correct worked example answers',()=>{
 assert.equal(page.split('class="exercise"').length-1,10);
 assert.equal(page.split('<summary>Показать ответ</summary>').length-1,10);
 assert.ok(page.includes('0,0512')&&page.includes('0,00512'));
 assert.ok(page.includes('625/3888'));
 assert.ok(fs.existsSync(path.join(root,'students/ekaterina_gnedkova/pdf_docs/06.11.26.pdf')));
 assert.ok(fs.existsSync(path.join(root,'students/ekaterina_gnedkova/tex_docs/06.11.26.tex')));
});
test('Probability math',()=>{
 const choose=(n,k)=>{let c=1;for(let i=1;i<=k;i++)c=c*(n-i+1)/i;return Math.round(c)};
 assert.equal(choose(5,2),10);
 assert.ok(Math.abs(choose(5,2)*0.8**2*0.2**3-0.0512)<1e-12);
 assert.ok(Math.abs(choose(5,3)*(1/6)**3*(5/6)**2-125/3888)<1e-12);
 assert.ok(Math.abs(1-0.8**2-0.36)<1e-12);
});
test('Publication and competency evidence',()=>{
 assert.equal(meta.date,'2026-11-06');
 assert.equal(meta.outcomes.length,intent.outcomes.length);
 assert.equal(meta.outcomes.every(x=>x.masteryClaim===null),true);
 assert.equal(intent.ktpMatches.length,0);
 assert.ok(index.includes('Последнее занятие · 11.11.26'));
 assert.ok(index.includes('href="06.11.26.html"'));
 assert.ok(index.includes('href="28.10.26.html"'));
 for(const x of meta.outcomes){
  assert.ok(page.includes('id="'+x.evidenceAnchor+'"'));
  assert.ok(map.includes('"'+x.competencyId+'"'));
 }
});
test('Model interface and formula are present',()=>{
 for(const id of ['n','p','k','bars','result','fixedvalue','freevalue','atleast','reset'])assert.ok(lab.includes('id="'+id+'"'));
 assert.ok(lab.includes('1-q**nn'));
 assert.ok(lab.includes('combinations(nn,kk)'));
});
