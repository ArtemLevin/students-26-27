import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const site=path.resolve(root,'..');
const lesson=fs.readFileSync(path.join(site,'05.11.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'05.11.26-lab.html'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-11-05.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/lesson-publication-intents/2026-11-05.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-11-05.json'),'utf8'));
const sum=values=>values.reduce((a,b)=>a+b,0);
const expectation=(values,probabilities)=>sum(values.map((x,i)=>x*probabilities[i]));
const variance=(values,probabilities)=>expectation(values.map(x=>x*x),probabilities)-expectation(values,probabilities)**2;
const almost=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,actual+' differs from '+expected);

test('05.11 lesson is the latest registered publication with valid parity',()=>{
 const report=validateLessonRegistry(LESSONS);
 assert.equal(report.latest,'05.11.26.html');
 assert.equal(LESSONS[0].date,'2026-11-05');
 assert.equal(LESSONS.filter(x=>x.date==='2026-11-05').length,1);
 const latest=LESSONS[0];
 for(const property of ['title','summary','topics','materials'])assert.deepEqual(latest[property],metadata[property]);
 assert.equal(metadata.date,intent.lessonDate);
 assert.equal(metadata.outcomes.length,practice.outcomes.length);
 for(const outcome of metadata.outcomes){
  assert.equal(outcome.masteryClaim,null);
  assert.match(lesson,new RegExp('id="'+outcome.evidenceAnchor+'"'));
  assert.ok(practice.outcomes.some(x=>x.competencyId===outcome.competencyId && x.evidenceAnchor===outcome.evidenceAnchor && x.relation===outcome.relation && x.practiceDisposition==='manual'));
 }
});

test('all lesson materials exist and anchors are complete',()=>{
 for(const ref of Object.values(metadata.materials)){
  assert.ok(fs.existsSync(path.resolve(site,ref)),'Missing '+ref);
 }
 for(const id of ['main','distribution','expectation','variance','applications','interval','independent','practice','review']){
  assert.ok(lesson.includes('id="'+id+'"'),'Missing anchor '+id);
 }
 assert.match(lesson,/<html lang="ru"/);
 assert.match(lesson,/<math display="block">/);
 assert.match(lesson,/<details id="answers">/);
 assert.equal((lesson.match(/<li><p>/g)||[]).length,10);
 assert.ok(lab.includes('type="range"'));
 assert.ok(lab.includes('aria-live="polite"'));
 assert.ok(lab.includes('id="chart"'));
});

test('independent checks of mathematical content and 10 training answers',()=>{
 almost(expectation([0,1,2,5],[.5,.4,.05,.05]),.75);
 almost(expectation([1,2,3,4,5,6],Array(6).fill(1/6)),3.5);
 almost(expectation([0,2],[.7,.3]),.6);
 almost(variance([0,2],[.7,.3]),.84);
 almost(expectation([0,1,2],[.04,.32,.64]),1.6);
 almost(variance([0,1,2],[.04,.32,.64]),.32);
 almost(expectation([100,500,1000,50000,100000],[1000/50000,100/50000,50/50000,10/50000,2/50000]),18);
 const answers=[
  expectation([1,3,5],[.2,.5,.3]),
  expectation([0,2,5],[.4,.35,.25]),
  variance([0,2],[.7,.3]),
  variance([2,4,6],[.25,.5,.25]),
  sum([.30,.20,.25]),
  (6*.75-1*.25-2.25)/(6-2),
  (100*120+500*30+5000*2)/2000,
  3000-(10000*.08+40000*.04)
 ];
 [3.2,1.95,.84,2,.75,.5,18.5,600].forEach((a,i)=>almost(answers[i],a));
 almost(variance([-2,1,4],[.25,.5,.25]),4.5);
});

test('laboratory derivations preserve the probability sum',()=>{
 for(const p of [0,.05,.3,.5,.7,1]){
  const q=1-p,mu=2*p,e2=4*p,d=e2-mu*mu;
  almost(q+p,1);
  almost(mu,expectation([0,2],[q,p]));
  almost(d,variance([0,2],[q,p]));
  assert.ok(d>=-1e-10);
 }
});
