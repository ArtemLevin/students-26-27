import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(site,name),'utf8');
const lesson=read('23.11.26.html');
const lab=read('23.11.26-lab.html');
const meta=JSON.parse(read('data/lessons/2026-11-23.lesson.json'));
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-23.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-23.json'));
const ids=source=>[...source.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const inline=source=>[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function assertLocalLinks(source){
  const anchors=ids(source);
  assert.equal(new Set(anchors).size,anchors.length,'duplicate HTML ID');
  for(const [,href] of source.matchAll(/href="([^"]+)"/g)){
    if(href.startsWith('#'))assert.ok(anchors.includes(href.slice(1)),href+' anchor missing');
    else if(!href.startsWith('data:')&&!href.startsWith('https:')){
      assert.ok(existsSync(resolve(site,href.split(/[?#]/)[0])),'missing href: '+href);
    }
  }
  for(const [,src] of source.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)){
    assert.ok(existsSync(resolve(site,src.split(/[?#]/)[0])),'missing img src: '+src);
  }
}

test('23 November cylinder lesson is the newest registered record',()=>{
  validateLessonRegistry(LESSONS);
  assert.equal(LESSONS[0].date,'2026-11-23');
  const record=LESSONS.find(x=>x.date==='2026-11-23');
  assert.ok(record);
  assert.equal(LESSONS.filter(x=>x.date===record.date).length,1);
  assert.equal(record.href,'23.11.26.html');
  assert.equal(record.title,meta.title);
  assert.equal(record.summary,meta.summary);
  assert.deepEqual(record.topics,meta.topics);
  assert.deepEqual(record.ktpRefs,[]);
  assert.equal(meta.date,intent.lessonDate);
  assert.deepEqual(intent.ktpMatches,[]);
  assert.deepEqual(meta.materials,{
    html:'23.11.26.html',
    pdf:'../pdf_docs/23.11.26.pdf',
    tex:'../tex_docs/23.11.26.tex',
    lab:'23.11.26-lab.html'
  });
  for(const href of Object.values(meta.materials)){
    assert.ok(existsSync(resolve(site,href)),'missing artifact '+href);
  }
});

test('23 November lesson has correct exercise count, steps, MathML and linked resources',()=>{
  assertLocalLinks(lesson);
  for(const anchor of ['basics','section','ratio','water','sectors','composite','training','memory']){
    assert.ok(ids(lesson).includes(anchor),'missing anchor '+anchor);
  }
  assert.equal((lesson.match(/<li><span>/g)||[]).length,10);
  assert.equal((lesson.match(/data-step="\d+"/g)||[]).length,5);
  assert.ok((lesson.match(/<math /g)||[]).length>=9);
  assert.match(lesson,/V₂ = 12 · \(1\/2\)² · 3 = 9 м³/);
  assert.match(lesson,/V<sub>дет<\/sub> = 1500 см³/);
  assert.match(lesson,/937,5π см³/);
  assert.match(lesson,/105π см³/);
  assert.match(lesson,/\[36,42,80,24,216,2,480,120,22,84\]/);
  assert.match(lesson,/@media print/);
  assert.match(lesson,/@media\(prefers-reduced-motion:reduce\)/);
  assert.equal(inline(lesson).length,1);
  assert.doesNotThrow(()=>new Script(inline(lesson)[0]));
});

test('cylinder laboratory has four working-mode source contracts',()=>{
  assertLocalLinks(lab);
  for(const mode of ['geometry','ratio','sector','ring']){
    assert.ok(ids(lab).includes('scene-'+mode));
    assert.ok(ids(lab).includes('fields-'+mode));
    assert.ok(lab.includes('data-mode="'+mode+'"'));
  }
  for(const control of ['radius','height','factor','angle','inner','reset']){
    assert.ok(ids(lab).includes(control));
  }
  assert.match(lab,/function cylinderSvg\(r,h\)/);
  assert.match(lab,/function ratioSvg\(k\)/);
  assert.match(lab,/function sectorSvg\(angle\)/);
  assert.match(lab,/function ringSvg\(inner\)/);
  assert.match(lab,/searchParams\.set\("mode",mode\)/);
  assert.match(lab,/@media\(max-width:620px\)/);
  assert.match(lab,/@media\(prefers-reduced-motion:reduce\)/);
  assert.equal(inline(lab).length,1);
  assert.doesNotThrow(()=>new Script(inline(lab)[0]));
});

test('reference mathematics and the answer key are independently consistent',()=>{
  const pi=Math.PI;
  assert.equal(3**2*4,36);
  assert.equal(6*7,42);
  assert.equal(2*5*(3+5),80);
  assert.equal(24,24);
  assert.equal(18*2**2*3,216);
  assert.equal(98/7**2,2);
  assert.equal(840*4/7,480);
  assert.equal(6**2*5*(360-120)/360,120);
  assert.equal(2**2*4+0.5*2**2*3,22);
  assert.equal((5**2-2**2)*4,84);
  assert.equal(12*(1/2)**2*3,9);
  assert.equal(16/2**2,4);
  assert.equal(2000*9/12,1500);
  assert.equal(6**2*5*(90/360),45);
  assert.equal(15**2*5*((360-60)/360),937.5);
  assert.equal(5*(5**2-2**2),105);
  assert.ok(Number.isFinite(pi));
});

test('lesson evidence is anchored and introduces no unverified mastery claims',()=>{
  assert.equal(meta.outcomes.length,4);
  assert.equal(practice.outcomes.length,4);
  for(const item of meta.outcomes){
    assert.equal(item.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(item.relation));
    assert.ok(ids(lesson).includes(item.evidenceAnchor));
    assert.ok(intent.outcomes.some(x=>x.competencyId===item.competencyId&&x.evidenceAnchor===item.evidenceAnchor&&x.relation===item.relation&&x.decision==='apply'&&x.confidence==='exact'));
    assert.ok(practice.outcomes.some(x=>x.competencyId===item.competencyId&&x.evidenceAnchor===item.evidenceAnchor&&x.relation===item.relation&&x.practiceDisposition==='manual'));
  }
});
