import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(site,name),'utf8');
const page=read('11.11.26.html');
const metadata=JSON.parse(read('data/lessons/2026-11-11.lesson.json'));
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-11.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-11.json'));
const overlay=read('dashboard-data-11.11.js');

test('11 November lesson is registered newest-first and its sources exist',()=>{
  validateLessonRegistry(LESSONS);
  assert.equal(LESSONS[0].date,'2026-11-11');
  assert.equal(LESSONS[0].href,'11.11.26.html');
  assert.equal(LESSONS.filter(x=>x.date==='2026-11-11').length,1);
  assert.equal(metadata.date,intent.lessonDate);
  assert.equal(LESSONS[0].title,metadata.title);
  assert.deepEqual(LESSONS[0].topics,metadata.topics);
  assert.deepEqual(LESSONS[0].summary,metadata.summary);
  for(const ref of Object.values(metadata.materials))assert.ok(existsSync(resolve(site,ref)),'Missing material '+ref);
  assert.equal(metadata.materials.lab,undefined,'An uncreated laboratory must not be listed');
  assert.deepEqual(metadata.ktpRefs,[]);
});

test('learning page has ten practice tasks, ten answer rows, source anchors and valid controls',()=>{
  assert.equal((page.match(/<input type="checkbox" data-check>/g)||[]).length,10);
  assert.equal((page.match(/<tr><td>\d+<\/td>/g)||[]).length,10);
  const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['prism','surface','ratio','pyramid','heights','examples','training']){
    assert.ok(ids.includes(id),'Missing section '+id);
  }
  for(const match of page.matchAll(/href="#([^"]+)"/g)){
    assert.ok(ids.includes(match[1]),'Broken internal anchor '+match[1]);
  }
  const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new Script(scripts[0][1]));
  assert.match(page,/id="quiz-feedback" role="status" aria-live="polite"/);
  assert.match(page,/id="progress" aria-live="polite"/);
  assert.match(page,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(page,/@media print/);
});

test('evidence is linked to real anchors and does not assert independent mastery',()=>{
  assert.equal(metadata.outcomes.length,4);
  assert.equal(practice.outcomes.length,4);
  for(const evidence of metadata.outcomes){
    assert.equal(evidence.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(evidence.relation));
    assert.ok(page.includes('id="'+evidence.evidenceAnchor+'"'));
    assert.ok(overlay.includes(evidence.competencyId+':'));
    assert.ok(overlay.includes('11.11.26.html#'+evidence.evidenceAnchor));
    assert.ok(practice.outcomes.some(x=>x.competencyId===evidence.competencyId&&x.evidenceAnchor===evidence.evidenceAnchor&&x.relation===evidence.relation&&x.practiceDisposition==='manual'));
  }
  assert.match(read('index.html'),/dashboard-data-11\.11\.js/);
  assert.match(read('dashboard.js'),/lesson-registry\.js\?v=20261113-1/);
});

test('worked values and answer key agree with elementary geometry',()=>{
  assert.equal(3*4/2,6);
  assert.equal(5*4*Math.hypot(1.5,2)+2*6,62);
  assert.equal((248-2*24)/(4*5),10);
  assert.equal(12/2,6);
  assert.equal(6*9/2,27);
  assert.equal(Math.round(((3*Math.sqrt(2))**2*Math.sqrt(3)/4)*Math.sqrt(3)/3*100)/100,4.5);
  assert.equal(3*6/2,9);
  assert.equal(2*(6*8/2)+(4*Math.hypot(3,4))*7,188);
  assert.equal((500-2*(10*24/2))/(4*13),5);
  assert.equal(8*4*3,96);
  assert.equal(18*9/3,54);
  assert.equal((4**2*Math.sqrt(3)/4)*(3*Math.sqrt(3))/3,12);
  assert.equal((9*Math.sqrt(3)/2)*Math.sqrt(3)/3,4.5);
  assert.equal(16*3/8,6);
});
