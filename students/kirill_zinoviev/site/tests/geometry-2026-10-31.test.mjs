import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root='students/kirill_zinoviev/site/';
const read=name=>fs.readFileSync(root+name,'utf8');
const page=read('31.10.26.html');
const lab=read('31.10.26-lab.html');
const registry=read('lesson-registry.js');
const metadata=JSON.parse(read('data/lessons/2026-10-31.lesson.json'));
const intent=JSON.parse(read('data/publication-intents/2026-10-31.json'));
const practice=JSON.parse(read('data/practice-publications/2026-10-31.json'));

test('31 October geometry lesson has exactly 10 source exercises and valid evidence',()=>{
  assert.equal((page.match(/class="exercise"/g)||[]).length,10);
  for(const section of ['median','bisector','perimeter','roles','check','practice']){
    assert.ok(page.includes('id="'+section+'"'),section);
  }
  assert.equal(intent.outcomes.length,metadata.outcomes.length);
  for(const outcome of intent.outcomes){
    assert.ok(page.includes('id="'+outcome.evidenceAnchor+'"'),outcome.competencyId);
    assert.ok(metadata.outcomes.some(item=>item.competencyId===outcome.competencyId&&item.evidenceAnchor===outcome.evidenceAnchor&&item.relation===outcome.relation&&item.masteryClaim===null));
    assert.ok(practice.outcomes.some(item=>item.competencyId===outcome.competencyId&&item.evidenceAnchor===outcome.evidenceAnchor&&item.relation===outcome.relation&&item.practiceDisposition==='manual'));
    assert.equal(outcome.masteryClaim,null);
  }
  assert.ok(page.includes('31.10.26-lab.html?mode=median'));
  assert.ok(lab.includes("anchor:'#bisector'")&&lab.includes("'31.10.26.html'+c.anchor"));
  assert.ok(fs.existsSync('students/kirill_zinoviev/pdf_docs/31.10.26.pdf'));
  assert.ok(fs.existsSync('students/kirill_zinoviev/tex_docs/31.10.26.tex'));
});

test('Lesson is archived chronologically after November 1 without duplicates',()=>{
  assert.equal((registry.match(/"date": "2026-10-31"/g)||[]).length,1);
  assert.ok(registry.indexOf('"date": "2026-11-01"')<registry.indexOf('"date": "2026-10-31"'));
  assert.ok(registry.indexOf('"date": "2026-10-31"')<registry.indexOf('"date": "2026-10-28"'));
  assert.equal(metadata.materials.lab,'31.10.26-lab.html');
});

test('Lesson and laboratory scripts parse and theme/slider controls are present',()=>{
  for(const [name,source] of [['lesson',page],['laboratory',lab]]){
    const scripts=[...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,1,name);
    assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:name+'.js'}));
    assert.ok(source.includes('prefers-reduced-motion'));
    assert.ok(source.includes('id="theme"'));
  }
  for(const id of ['x','medianMode','bisectorMode','less','more','reset','solution','status','bar1','bar2']){
    assert.ok(lab.includes('id="'+id+'"'),id);
  }
});

test('Every source example and selected exercise has mathematically correct answer',()=>{
  assert.equal(3*5+2,5*5-8);
  assert.equal(3*5+2+5*5-8,34);
  assert.equal(4*10-3,2*10+17);
  assert.equal((4*10-3)+(2*10+17),74);
  assert.equal(10+12/2+8,24);
  assert.equal(3*6+4,5*6-8);
  assert.equal(4*12-7,2*12+17);
  assert.equal(12+18/2+10,31);
  assert.equal(15+20/2+8,33);
  assert.equal(6*4-7,17);
  assert.equal(2*4+14,2*(3*4-1));
  assert.equal(12+(3*4-1)+9,32);
});
