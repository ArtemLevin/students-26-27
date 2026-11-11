import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const page=fs.readFileSync(path.join(site,'11.11.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'11.11.26-lab.html'),'utf8');
const index=fs.readFileSync(path.join(site,'index.html'),'utf8');
const map=fs.readFileSync(path.join(site,'competency-map-data-assemble.js'),'utf8');
const meta=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-11-11.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-11-11.json'),'utf8'));

test('Exactly ten probability exercises with ten answer reveals',()=>{
 assert.equal(page.split('class="exercise"').length-1,10);
 assert.equal(page.split('<summary>Проверить ответ</summary>').length-1,10);
 assert.ok(page.includes('13/27'));
 assert.ok(page.includes('0,3456'));
 assert.ok(!page.includes('выколотые точки'));
});

test('All local lesson and lab links resolve',()=>{
 for(const [name,html] of [['lesson',page],['lab',lab]]){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,name+' duplicate IDs');
  for(const [,url] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   if(url.startsWith('#')||url.startsWith('data:')||/^https?:/.test(url))continue;
   const target=url.split(/[?#]/,1)[0];
   if(target)assert.ok(fs.existsSync(path.resolve(site,target)),name+' missing '+target);
  }
 }
});

test('Inline JavaScript parses',()=>{
 for(const [name,html] of [['lesson',page],['lab',lab]]){
  for(const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
   if(script.trim())assert.doesNotThrow(()=>new vm.Script(script,{filename:name+'.js'}));
  }
 }
});

test('Source mathematics: ordered pairs, products, Bernoulli and intervals',()=>{
 let favorable=0;
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(a+b===8)favorable++;
 assert.equal(favorable,5);
 assert.equal(36,6*6);
 assert.equal(4/36,1/9);
 assert.ok(Math.abs(0.9**2-0.81)<1e-12);
 assert.ok(Math.abs(1-0.1**2-0.99)<1e-12);
 assert.ok(Math.abs(3*(0.5**3)-0.375)<1e-12);
 assert.ok(Math.abs(6*0.6**2*0.4**2-0.3456)<1e-12);
 assert.ok(Math.abs(1-0.9**3-0.271)<1e-12);
 assert.ok(Math.abs(0.94-(1-0.87)-0.81)<1e-12);
 assert.equal(13/27,(14-1)/(28-1));
});

test('New canonical lesson metadata, evidence and dashboard links',()=>{
 assert.equal(meta.date,'2026-11-11');
 assert.equal(meta.materials.html,'11.11.26.html');
 assert.equal(meta.outcomes.length,intent.outcomes.length);
 assert.ok(meta.outcomes.every(x=>x.masteryClaim===null));
 assert.equal(intent.ktpMatches.length,0);
 assert.ok(index.includes('Последнее занятие · 11.11.26'));
 assert.ok(index.includes('href="11.11.26.html"'));
 assert.ok(index.includes('href="06.11.26.html"'));
 assert.ok(map.includes("date:'11.11.26'"));
 assert.ok(lab.includes('a+b===8'));
 for(const x of meta.outcomes){
  assert.ok(page.includes('id="'+x.evidenceAnchor+'"'),x.evidenceAnchor);
  assert.ok(map.includes('"'+x.competencyId+'"'),x.competencyId);
 }
});
