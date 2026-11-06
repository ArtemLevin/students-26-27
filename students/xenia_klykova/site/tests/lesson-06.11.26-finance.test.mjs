import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const lesson=read('06.11.26.html');
const lab=read('06.11.26-lab.html');
const meta=JSON.parse(read('data/lessons/2026-11-06.lesson.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-06.json'));
const intent=JSON.parse(read('data/publication-intents/2026-11-06.json'));
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);

test('06.11.26 publication and navigation are coherent',()=>{
 assert.equal(validateLessonRegistry().latest,'06.11.26.html');
 assert.equal(LESSONS[0].date,'2026-11-06');
 assert.equal(LESSONS[0].materials.html,'06.11.26.html');
 assert.equal(meta.date,'2026-11-06');
 assert.equal(intent.lessonDate,meta.date);
 assert.equal(practice.lessonDate,meta.date);
 assert.equal(meta.outcomes.length,practice.outcomes.length);
 assert.equal(meta.outcomes.length,intent.outcomes.length);
 assert.equal(new Set(LESSONS.map(item=>item.date)).size,LESSONS.length);
 const declared=new Set(ids(lesson));
 for(const x of meta.outcomes)assert.ok(declared.has(x.evidenceAnchor),'Missing evidence anchor '+x.evidenceAnchor);
 for(const x of meta.outcomes)assert.equal(x.masteryClaim,null,'Do not infer mastery from guided lesson');
 for(const dest of Object.values(meta.materials))assert.ok(fs.existsSync(path.resolve(site,dest)),'Missing material '+dest);
 assert.match(read('dashboard.js'),/lesson-registry\.js\?v=20261106/);
 assert.match(read('index.html'),/dashboard\.js\?v=20261106/);
 assert.match(read('archive.js'),/lesson-registry\.js\?v=20261106/);
});
test('finance lesson and interactive model contain no duplicate anchors or dead local hash links',()=>{
 for(const [name,html] of [['lesson',lesson],['lab',lab]]){
  const pageIds=ids(html);
  assert.equal(new Set(pageIds).size,pageIds.length,name+' duplicate IDs');
  for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(pageIds.includes(match[1]),name+' dead anchor '+match[1]);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  for(const [,script] of scripts){const check=spawnSync(process.execPath,['--check'],{input:script,encoding:'utf8'});assert.equal(check.status,0,name+' script syntax: '+check.stderr);}
 }
 assert.equal((lesson.match(/class="exercise"/g)||[]).length,10);
 assert.match(lab,/captureA/);
 assert.match(lab,/captureB/);
 assert.match(lab,/Math\.pow\(k,-n\)/);
});
test('independent EGE reference calculations reproduce printed results',()=>{
 const deposit=750*1.14**2+450*1.14;
 assert.ok(Math.abs(deposit-1487.7)<1e-7);
 const diff=2500*(1+0.15*(4+1)/2);
 assert.ok(Math.abs(diff-3437.5)<1e-7);
 const annuityPayment=496.5*1.1**3/(1+1.1+1.1**2);
 assert.ok(Math.abs(annuityPayment-199.65)<1e-7);
 assert.ok(Math.abs(3*annuityPayment-598.95)<1e-7);
 assert.equal(Math.sqrt(2916),54);
 assert.equal(Math.sqrt(7056),84);
 assert.equal(210*1.1**2/(1+1.1)*2,242);
});
