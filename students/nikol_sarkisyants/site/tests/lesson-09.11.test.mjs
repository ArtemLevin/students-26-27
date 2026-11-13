import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const page=read('09.11.26.html'),lab=read('09.11.26-lab.html');
const metadata=JSON.parse(read('data/lessons/2026-11-09.lesson.json'));
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-09.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-09.json'));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' vs '+b);

test('9 November lesson remains uniquely registered as new lessons publish',()=>{
 const report=validateLessonRegistry(LESSONS);
 assert.equal(report.latest,LESSONS[0].href);
 const lesson09=LESSONS.find(x=>x.date==='2026-11-09');
 assert.ok(lesson09);
 assert.equal(lesson09.href,'09.11.26.html');
 assert.equal(LESSONS.filter(x=>x.date==='2026-11-09').length,1);
 assert.deepEqual(lesson09.topics,metadata.topics);
 assert.equal(lesson09.summary,metadata.summary);
 assert.equal(lesson09.title,metadata.title);
 assert.equal(metadata.date,intent.lessonDate);
 assert.deepEqual(metadata.ktpRefs,[]);
 assert.deepEqual(metadata.ktpCoverage,[]);
 for(const ref of Object.values(metadata.materials))assert.ok(fs.existsSync(path.resolve(site,ref)),ref);
 assert.equal(metadata.materials.lab,'09.11.26-lab.html');
});

test('competence evidence links are exact and never claim unassessed mastery',()=>{
 assert.equal(metadata.outcomes.length,5);
 assert.equal(practice.outcomes.length,5);
 for(const item of metadata.outcomes){
  assert.equal(item.relation,'touched');
  assert.equal(item.masteryClaim,null);
  assert.ok(page.includes('id="'+item.evidenceAnchor+'"'));
  assert.ok(practice.outcomes.some(x=>x.competencyId===item.competencyId&&x.evidenceAnchor===item.evidenceAnchor&&x.relation===item.relation&&x.practiceDisposition==='manual'));
 }
 const evidence=read('dashboard-data-09.11.js');
 for(const item of metadata.outcomes){
  assert.ok(evidence.includes(item.competencyId+':'),item.competencyId);
  assert.ok(evidence.includes('09.11.26.html#'+item.evidenceAnchor),item.evidenceAnchor);
 }
 assert.match(read('index.html'),/dashboard-data-09\.11\.js/);
 assert.match(read('dashboard.js'),/lesson-registry\.js\?v=20\d{6}(?:-[\w-]+)?/);
 assert.match(read('index.html'),/dashboard\.js\?v=20\d{6}(?:-[\w-]+)?/,'Cabinet must use a cache-versioned module');
});

test('lesson and laboratory markup preserve accessibility and ten source exercises',()=>{
 for(const [name,src] of [['page',page],['lab',lab]]){
  assert.ok(src.startsWith('<!doctype html>'),name);
  assert.match(src,/<html lang="ru"/);
  const scripts=[...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1,name);
  assert.doesNotThrow(()=>new Script(scripts[0][1]),name+' JavaScript parse error');
  const ids=[...src.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,name+' duplicate IDs');
 }
 for(const id of ['base','box','cube','prism','surface','scale','practice','review']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.equal((page.match(/<li><p>/g)||[]).length,10);
 assert.match(page,/<details id="answers">/);
 assert.match(lab,/id="solid"/);
 for(const id of ['a','b','h','scale','volume','surface','lateral','diagonal','area-ratio','volume-ratio','reset','verify']){
  assert.match(lab,new RegExp('id="'+id+'"'));
 }
 assert.match(lab,/aria-live="polite"/);
 assert.match(lab,/id="result-status" role="status" aria-live="polite"/,'Screen reader must receive results on slider change');
 assert.match(lab,/id="scale"[^>]+aria-describedby="scale-help"/,'Scale slider explanation must be linked');
 assert.match(lab,/id="model" class="layout" tabindex="-1"/,'Mode deep links must focus their target');
 assert.match(lab,/Гипотенуза прямоугольного треугольника/,'Prism base must be named accurately');
 assert.match(lab,/field\.addEventListener\('change',announce\)/,'Slider commits must report the result');
});

test('geometry and all ten answer keys match the independent formulas',()=>{
 const cuboid=(a,b,c)=>({V:a*b*c,S:2*(a*b+a*c+b*c),d:Math.hypot(a,b,c)});
 const prism=(a,b,h)=>{const base=a*b/2,perimeter=a+b+Math.hypot(a,b);return {V:base*h,S:2*base+perimeter*h}};
 const cube=cuboid(4,4,4);near(cube.V,64);near(cube.S,96);
 const box=cuboid(2,3,6);near(box.V,36);near(box.S,72);near(box.d,7);
 near(168/7,24);
 near(Math.hypot(5,5),5*Math.SQRT2);near(Math.hypot(5,5,5),5*Math.sqrt(3));
 near(2**2,4);near(2**3,8);
 near((3+1)**3-3**3,37);
 const unknown=cuboid(3,4,12);near(unknown.d,13);near(unknown.V,144);near(unknown.S,192);
 const right=prism(3,4,10);near(right.V,60);near(right.S,132);
 const edge=2*Math.sqrt(3),equilateralBase=edge*edge*Math.sqrt(3)/4;
 near(equilateralBase*edge,18);
 near(2*equilateralBase+3*edge*edge,36+6*Math.sqrt(3));
 const ninth=prism(5,12,6);near(ninth.V,180);near(ninth.S,240);
 const tenth=prism(6,8,10);near(tenth.S,288);near(tenth.V,240);
 for(const m of [1,1.25,2,3]){
  const b=cuboid(2*m,3*m,6*m);
  near(b.S/box.S,m*m);
  near(b.V/box.V,m*m*m);
 }
});
