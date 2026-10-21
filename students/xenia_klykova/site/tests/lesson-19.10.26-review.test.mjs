import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {LESSONS} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.dirname(site);
const html=fs.readFileSync(path.join(site,'19.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'19.10.26-lab.html'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-19.lesson.json'),'utf8'));
const sidecar=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-19.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-10-19.json'),'utf8'));

test('19 October is unique, canonical, published and keeps 17 October',()=>{
 const lesson=LESSONS.find(l=>l.date==='2026-10-19');
 assert.ok(lesson,'The 19 October lesson remains in the archive');
 assert.equal(LESSONS.filter(l=>l.date==='2026-10-19').length,1);
 assert.ok(LESSONS.some(l=>l.date==='2026-10-17'));
 assert.equal(lesson.href,metadata.materials.html);
 assert.deepEqual(lesson.topics,metadata.topics);
 assert.deepEqual(lesson.materials,metadata.materials);
 assert.deepEqual([...LESSONS].map(l=>l.date),[...LESSONS].map(l=>l.date).sort().reverse());
});

test('source materials, evidence anchors and practice decisions are complete',()=>{
 assert.equal(metadata.outcomes.length,5);
 assert.equal(sidecar.outcomes.length,5);
 assert.equal(intent.outcomes.length,5);
 assert.ok(metadata.outcomes.every(o=>o.masteryClaim===null));
 for(const o of metadata.outcomes){
  assert.ok(html.includes('id="'+o.evidenceAnchor+'"'),o.evidenceAnchor);
  assert.ok(sidecar.outcomes.some(p=>p.competencyId===o.competencyId&&p.evidenceAnchor===o.evidenceAnchor&&p.relation===o.relation&&p.practiceDisposition==='manual'));
 }
 for(const reference of Object.values(metadata.materials)){
   assert.ok(fs.existsSync(path.resolve(site,reference)),reference);
 }
 assert.ok(fs.existsSync(path.join(student,'images/19.10.26.png')));
 assert.equal(intent.lessonDate,'2026-10-19');
});

test('both pages parse inline JS, use unique ids and support theme/reduced motion',()=>{
 for(const source of [html,lab]){
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const [,script] of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
    new vm.Script(script);
  }
  assert.match(source,/prefers-reduced-motion/);
  assert.match(source,/<html lang="ru"/);
  assert.match(source,/data-theme/);
 }
 for(const id of ['slider','number','candidates','result','all','reset','conclusion','cells'])assert.ok(lab.includes('id="'+id+'"'));
 assert.match(lab,/aria-live="polite"/);
});

test('10 original exercises, checked arithmetic and interactive sqrt criterion',()=>{
 const exerciseRegion=html.split('<ol class="practice-list">')[1]?.split('</ol>')[0];
 assert.ok(exerciseRegion);
 assert.equal((exerciseRegion.match(/<li>/g)||[]).length,10);
 assert.equal((exerciseRegion.match(/<details>/g)||[]).length,10);
 const primes=n=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true;};
 assert.equal(primes(97),true);
 assert.equal(primes(89),true);
 assert.equal(primes(113),true);
 assert.equal(primes(127),true);
 assert.equal(primes(143),false);
 assert.equal(primes(221),false);
 assert.equal(143,11*13);
 assert.equal(221,13*17);
 for(let n=1;n<=100;n++){
   assert.equal(8*n*n+10*n+3,(2*n+1)*(4*n+3));
   assert.equal(n*n+5*n+6,(n+2)*(n+3));
   assert.equal(6*n*n+11*n+3,(3*n+1)*(2*n+3));
   assert.equal((2n**(4n*BigInt(n))-1n)%15n,0n);
 }
 for(let n=-100;n<=100;n++){
   assert.equal(Math.abs((n*n*n-n)%6),0);
   assert.equal(Math.abs((n**5-n)%6),0);
 }
 assert.match(lab,/candidatesFor/);
 assert.match(lab,/Math\.floor\(Math\.sqrt\(n\)\)/);
});