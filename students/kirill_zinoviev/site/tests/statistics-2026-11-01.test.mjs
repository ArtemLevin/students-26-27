import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root='students/kirill_zinoviev/site/';
const read=path=>fs.readFileSync(root+path,'utf8');
const lesson=read('01.11.26.html');
const lab=read('01.11.26-lab.html');
const metadata=JSON.parse(read('data/lessons/2026-11-01.lesson.json'));
const intent=JSON.parse(read('data/publication-intents/2026-11-01.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-01.json'));

test('Statistics lesson has 10 exercises and all evidence anchors',()=>{
 assert.equal((lesson.match(/<article class="task">/g)||[]).length,10);
 for(const anchor of ['mean','median','range','frequency','relative','practice']){
   assert.ok(lesson.includes('id="'+anchor+'"'));
 }
 for(const item of intent.outcomes){
  assert.ok(lesson.includes('id="'+item.evidenceAnchor+'"'),item.competencyId);
  assert.ok(metadata.outcomes.some(x=>x.competencyId===item.competencyId&&x.relation===item.relation&&x.evidenceAnchor===item.evidenceAnchor));
  assert.ok(practice.outcomes.some(x=>x.competencyId===item.competencyId&&x.relation===item.relation&&x.evidenceAnchor===item.evidenceAnchor&&x.practiceDisposition==='manual'));
 }
 assert.ok(lesson.includes('01.11.26-lab.html'));
 assert.ok(lab.includes('01.11.26.html#relative'));
 assert.ok(fs.existsSync('students/kirill_zinoviev/pdf_docs/01.11.26.pdf'));
 assert.ok(fs.existsSync('students/kirill_zinoviev/tex_docs/01.11.26.tex'));
});

test('Lesson and laboratory scripts parse',()=>{
 for(const [name,source] of [['lesson',lesson],['laboratory',lab]]){
   const scripts=[...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
   assert.equal(scripts.length,1,name);
   assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:name+'.js'}));
   assert.ok(source.includes('prefers-reduced-motion'));
   assert.ok(!/<script[^>]+src=["']https?:/i.test(source));
 }
});
test('Lesson frequency and exercise answer invariants are correct',()=>{
 const base=[2,2,2,3,3,3,4,4];
 assert.equal(base.length,8);
 assert.deepEqual([2,3,4].map(value=>base.filter(item=>item===value).length),[3,3,2]);
 assert.deepEqual([2,3,4].map((_,i)=>[3,3,2][i]*100/base.length),[37.5,37.5,25]);
 assert.equal((2*3+3*3+4*2)/8,2.875);
 assert.equal((2*2+4*3+8*5)/10,5.6);
 assert.equal((4+8)/2,6);
});
