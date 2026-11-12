import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(site,relative),'utf8');
const html=read('12.11.26.html');
const metadata=JSON.parse(read('data/lessons/2026-11-12.lesson.json'));
const intent=JSON.parse(read('data/publication-intents/2026-11-12.json'));
const catalog=JSON.parse(read('data/competency-catalog.json'));

test('12 November percentage lesson is registered exactly once with real materials',()=>{
  validateLessonRegistry(LESSONS);
  const lessons=LESSONS.filter(x=>x.date==='2026-11-12');
  assert.equal(lessons.length,1);
  assert.equal(lessons[0].href,'12.11.26.html');
  for(const ref of Object.values(lessons[0].materials)){
    assert.ok(fs.existsSync(path.resolve(site,ref)), 'missing local material '+ref);
  }
  assert.equal(metadata.studentId,'xenia_vasilchenko');
  assert.equal(metadata.date,'2026-11-12');
  assert.deepEqual(metadata.topics,lessons[0].topics);
});

test('percentage lesson source has ten tasks, one answer for each and no dead anchors',()=>{
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'duplicate HTML id');
  for(const m of html.matchAll(/href="#([^"]+)"/g)){
    assert.ok(ids.includes(m[1]),'missing section id '+m[1]);
  }
  assert.equal([...html.matchAll(/data-task="\d+"/g)].length,10);
  assert.equal([...html.matchAll(/<tr><td>(?:10|[1-9])<\/td>/g)].length,10);
  assert.match(html,/<math\b/);
  assert.doesNotMatch(html,/<script[^>]+src=["']https?:/);
  assert.doesNotMatch(html,/<link[^>]+href=["']https?:/);
  assert.doesNotMatch(html,/\bTODO\b|\blorem ipsum\b|\bhref="#"/i);
  const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(source.length,1);
  assert.doesNotThrow(()=>new vm.Script(source[0],{filename:'12.11.26.inline.js'}));
});

test('12 November evidence uses valid competency IDs and anchors, never claims mastery',()=>{
  const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  const known=new Set(catalog.groups.flatMap(g=>g.items.map(x=>x.id)));
  assert.equal(intent.lessonDate,'2026-11-12');
  assert.deepEqual(intent.ktpMatches,[]);
  assert.equal(metadata.outcomes.length,intent.outcomes.length);
  for(const outcome of metadata.outcomes){
    assert.ok(known.has(outcome.competencyId),outcome.competencyId);
    assert.ok(ids.has(outcome.evidenceAnchor),outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(outcome.relation));
    assert.ok(intent.outcomes.some(x=>x.competencyId===outcome.competencyId&&x.evidenceAnchor===outcome.evidenceAnchor&&x.relation===outcome.relation));
  }
  assert.match(read('index.html'),/competency-map-lesson-20261112\.js/);
  assert.match(read('atlas-editorial.js'),/'2026-11-12'/);
});

test('worked examples and training answers are arithmetically correct',()=>{
  assert.equal(275*.2,55);
  assert.equal(320*.3,96);
  assert.equal(12.5*.06,.75);
  assert.equal(24/.3,80);
  assert.equal(42/120*100,35);
  assert.equal(1200*.85,1020);
  assert.equal(840/.8,1050);
  assert.equal(1040/.8,1300);
  assert.deepEqual([
    250*.14,12.5*.08,27/.3,45/180*100,
    36000*(1-.25-.4),2400*.85,720/.8,64/160*100,520*(1-.25-.45),1700/.85
  ].map(x=>Math.round(x*1e6)/1e6),[35,1,90,25,12600,2040,900,40,156,2000]);
});
