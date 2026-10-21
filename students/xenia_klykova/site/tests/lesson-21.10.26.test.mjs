import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {LESSONS} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.dirname(site);
const day='2026-10-21';
const lesson=LESSONS.find(x=>x.date===day);
const html=fs.readFileSync(path.join(site,'21.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'21.10.26-lab.html'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-21.lesson.json'),'utf8'));
const sidecar=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-21.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-10-21.json'),'utf8'));

test('21 October is latest exactly once; the 19 October lesson remains in archive',()=>{
 assert.equal(LESSONS[0].date,day);
 assert.equal(LESSONS.filter(x=>x.date===day).length,1);
 assert.ok(LESSONS.some(x=>x.date==='2026-10-19'));
 assert.deepEqual(LESSONS.map(x=>x.date),[...LESSONS.map(x=>x.date)].sort().reverse());
 assert.equal(lesson.href,metadata.materials.html);
 assert.deepEqual(lesson.topics,metadata.topics);
 assert.deepEqual(lesson.materials,metadata.materials);
});

test('21 October canonical links, evidence anchors and manual practice decisions',()=>{
 assert.equal(metadata.studentId,'xenia_klykova');
 assert.equal(intent.lessonDate,day);
 assert.equal(metadata.outcomes.length,6);
 assert.equal(sidecar.outcomes.length,6);
 assert.ok(metadata.outcomes.every(x=>x.masteryClaim===null));
 for(const outcome of metadata.outcomes){
   assert.match(html,new RegExp('id="'+outcome.evidenceAnchor+'"'));
   assert.ok(sidecar.outcomes.some(p=>p.competencyId===outcome.competencyId&&p.evidenceAnchor===outcome.evidenceAnchor&&p.relation===outcome.relation&&p.practiceDisposition==='manual'));
   assert.ok(intent.outcomes.some(p=>p.competencyId===outcome.competencyId&&p.evidenceAnchor===outcome.evidenceAnchor&&p.relation===outcome.relation&&p.masteryClaim===null));
 }
 for(const ref of Object.values(metadata.materials))assert.ok(fs.existsSync(path.resolve(site,ref)),ref);
 assert.ok(fs.existsSync(path.join(student,'images/21.10.26.png')));
 assert.match(html,/\.\.\/images\/21\.10\.26\.png/);
});

test('lesson and lab are syntactically valid, accessible and use unique ids',()=>{
 for(const source of [html,lab]){
  assert.match(source,/<html lang="ru"/);
  assert.match(source,/data-theme/);
  assert.match(source,/prefers-reduced-motion/);
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const [,script] of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script);
 }
 assert.equal((html.split('<ol class="practice-list">')[1]?.split('</ol>')[0]?.match(/<li>/g)||[]).length,10);
 for(const name of ['time','play','pause','reset','choose50','choose150','feedback'])assert.match(lab,new RegExp('id="'+name+'"'));
 assert.match(lab,/aria-live="polite"/);
});

test('physics and mixture invariants from lesson are consistent',()=>{
 const H=t=>20*(1-t/100)**2;
 assert.equal(H(0),20);
 assert.equal(H(50),5);
 assert.equal(H(100),0);
 assert.equal(H(150),5);
 assert.equal((5*(1.3**2-1.1**2)).toFixed(2),'2.40');
 assert.equal(Math.sqrt(10*.4),2);
 assert.equal(25+100,125);
 assert.equal(.05*25+.30*100,.25*125);
 assert.equal(.1*570,.95*60);
 for(let t=1;t<=100;t++)assert.ok(H(t)<=H(t-1)+1e-12,'the tank must drain monotonically');
});
