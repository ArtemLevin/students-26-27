import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(site,name),'utf8');
const lesson=read('19.11.26.html');
const lab=read('19.11.26-lab.html');
const meta=JSON.parse(read('data/lessons/2026-11-19.lesson.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-19.json'));
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-19.json'));

function idsOf(source){return [...source.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);}
function verifyLinks(source,ids){
  for(const [,href] of source.matchAll(/href="([^"]+)"/g)){
    if(href.startsWith('data:'))continue;
    if(href.startsWith('#')){assert.ok(ids.includes(href.slice(1)),'Missing hash anchor '+href);continue;}
    const pathname=href.split(/[?#]/)[0];
    assert.ok(existsSync(resolve(site,pathname)),'Missing local resource '+pathname);
  }
}
function inlineScripts(source){return [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);}

test('19 November publication is latest, consistent and has all materials',()=>{
  validateLessonRegistry(LESSONS);
  const current=LESSONS.find(x=>x.date==='2026-11-19');
  assert.equal(LESSONS[0].date,'2026-11-19');
  assert.ok(current);
  assert.equal(current.href,'19.11.26.html');
  assert.equal(LESSONS.filter(x=>x.date==='2026-11-19').length,1);
  assert.equal(current.title,meta.title);
  assert.equal(current.summary,meta.summary);
  assert.deepEqual(current.topics,meta.topics);
  assert.deepEqual(current.ktpRefs,[]);
  assert.equal(meta.date,intent.lessonDate);
  assert.equal(intent.ktpMatches.length,0);
  assert.deepEqual(meta.materials,{html:'19.11.26.html',pdf:'../pdf_docs/19.11.26.pdf',tex:'../tex_docs/19.11.26.tex',lab:'19.11.26-lab.html'});
  for(const href of Object.values(meta.materials))assert.ok(existsSync(resolve(site,href)),'Missing artifact '+href);
});

test('lesson HTML has 10 training exercises, exact answers, interactive explanation and safe links',()=>{
  const ids=idsOf(lesson);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['pyramid','surface','volume','hexagon','angle','scale','training','review'])assert.ok(ids.includes(id));
  assert.equal((lesson.match(/<details>/g)||[]).length,10);
  assert.equal((lesson.match(/<summary>Показать ответ<\/summary>/g)||[]).length,10);
  assert.equal((lesson.match(/data-step="\d+"/g)||[]).length,4);
  assert.match(lesson,/S<sub>полн<\/sub> = 48 \+ 36 = <strong>84<\/strong>/);
  assert.match(lesson,/class="hero-svg"/);
  assert.match(lesson,/@media\(max-width:760px\)/);
  assert.match(lesson,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(lesson,/@media print/);
  const scripts=inlineScripts(lesson);assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Script(scripts[0]));
  verifyLinks(lesson,ids);
});

test('laboratory uses a single geometry model and computes every output from parameters',()=>{
  const ids=idsOf(lab);assert.equal(new Set(ids).size,ids.length);
  for(const id of ['base','side','height','factor','diagram','drawing','volume','area','slant','lateral','total','comparison'])assert.ok(ids.includes(id));
  assert.match(lab,/function model\(a,H,n\)/);
  assert.match(lab,/Math\.hypot\(H,r\)/);
  assert.match(lab,/V:B\*H\/3/);
  assert.match(lab,/S=P\*h\/2/);
  assert.match(lab,/function setMode\(next\)/);
  assert.match(lab,/aria-pressed/);
  assert.match(lab,/mode=geometry/);
  assert.match(lab,/@media\(max-width:800px\)/);
  assert.match(lab,/@media\(prefers-reduced-motion:reduce\)/);
  const scripts=inlineScripts(lab);assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Script(scripts[0]));
  verifyLinks(lab,ids);
  const square={a:6,H:4};
  const B=square.a*square.a,h=Math.hypot(square.H,square.a/2);
  assert.equal(h,5);
  assert.equal(4*square.a*h/2,60);
  assert.equal(B+60,96);
  assert.equal(B*square.H/3,48);
  assert.equal(48*2**3,384);
  const hexB=3*Math.sqrt(3)*2**2/2;
  const hexH=Math.sqrt(4**2-2**2);
  assert.ok(Math.abs(hexB*hexH/3-12)<1e-12);
});

test('evidence and practice decisions are anchored without unverified mastery',()=>{
  assert.equal(meta.outcomes.length,4);
  assert.equal(practice.outcomes.length,4);
  for(const e of meta.outcomes){
    assert.ok(lesson.includes('id="'+e.evidenceAnchor+'"'));
    assert.equal(e.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(e.relation));
    assert.ok(intent.outcomes.some(x=>x.competencyId===e.competencyId&&x.evidenceAnchor===e.evidenceAnchor&&x.relation===e.relation&&x.decision==='apply'&&x.confidence==='exact'));
    assert.ok(practice.outcomes.some(x=>x.competencyId===e.competencyId&&x.evidenceAnchor===e.evidenceAnchor&&x.relation===e.relation&&x.practiceDisposition==='manual'));
  }
  assert.match(read('dashboard.js'),/lesson-registry\.js\?v=20261119-1/);
  assert.match(read('index.html'),/dashboard\.js\?v=20261119-1/);
});