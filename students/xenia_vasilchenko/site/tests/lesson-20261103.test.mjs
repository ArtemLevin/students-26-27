import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..'),read=p=>fs.readFileSync(path.join(site,p),'utf8');
const page=read('03.11.26.html'),lab=read('03.11.26-lab.html');
const index=read('index.html'),registry=read('lesson-registry.js');
const meta=JSON.parse(read('data/lessons/2026-11-03.lesson.json'));
const intent=JSON.parse(read('data/publication-intents/2026-11-03.json'));
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('original lesson topics, ten tasks and learning route',()=>{
 assert.equal((page.match(/data-task="\d+"/g)||[]).length,10);
 assert.equal((page.match(/<h1\b/g)||[]).length,1);
 assert.equal(ids(page).length,new Set(ids(page)).size);
 for(const id of ['relations','language','examples','rectangle','practice','materials'])assert.ok(ids(page).includes(id));
 for(const text of ['50 × 2/5 = 20','3600 : 0,6 = 6000','1,55 : 0,62 = 2,5','18 3/7 см'])assert.ok(page.includes(text));
 assert.match(page,/prefers-reduced-motion/);
});
test('research laboratory scenarios and accessible controls',()=>{
 assert.equal(ids(lab).length,new Set(ids(lab)).size);
 for(const key of ['fraction','fields','film','part'])assert.ok(lab.includes('data-case="'+key+'"'));
 for(const key of ['N','f','d'])assert.ok(lab.includes('value="'+key+'"'));
 assert.match(lab,/role="status"/);assert.match(lab,/aria-pressed/);
});
test('v2 evidence, index and registry parity without mastery claims',()=>{
 assert.equal(meta.date,'2026-11-03');
 assert.equal(intent.lessonDate,meta.date);
 assert.deepEqual(meta.topics,intent.topics);
 assert.equal(meta.outcomes.length,intent.outcomes.length);
 assert.equal((registry.match(/"date": "2026-11-03"/g)||[]).length,1);
 for(const outcome of intent.outcomes){
  assert.ok(ids(page).includes(outcome.evidenceAnchor));
  assert.equal(outcome.masteryClaim,null);
 }
 assert.match(index,/competency-map-lesson-20261103\.js/);
 const evidence=read('competency-map-lesson-20261103.js');
 assert.doesNotMatch(evidence,/\.baselineLevel\s*=/);
 assert.doesNotMatch(evidence,/\.level\s*=/);
 new vm.Script(evidence);
});
test('all relative links and scripts resolve',()=>{
 for(const [name,html] of [['03.11.26.html',page],['03.11.26-lab.html',lab]]){
  for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   const url=m[1];if(/^(https?:|mailto:|data:)/.test(url))continue;
   const [pathname,hash]=url.split('#'),target=path.resolve(site,pathname||name);
   assert.ok(fs.existsSync(target),name+': '+url);
   if(hash&&target.endsWith('.html'))assert.ok(ids(fs.readFileSync(target,'utf8')).includes(hash),name+': '+url);
  }
  for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 }
 for(const [dir,ext] of [['pdf_docs','pdf'],['tex_docs','tex'],['images','png']])
  assert.ok(fs.existsSync(path.join(student,dir,'03.11.26.'+ext)));
});
test('arithmetic spot checks independently match the checklist',()=>{
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
 near(50*2/5,20);near(20/(2/5),50);near(9/36,.25);
 near(3600/.6,6000);near(1.55/.62,2.5);
 near((19+2/7)/(3+3/14),6);near(2*(6+3+3/14),18+3/7);
 near(64*3/8,24);near(.35*200,70);near(15/(3/7),35);
 near(18/.4,45);near(12/45,4/15);near(84/.3,280);
 near(15/.6,25);near(1.44/.6,2.4);
 near(2*((15+3/4)/(2+1/4)+2+1/4),18.5);
});