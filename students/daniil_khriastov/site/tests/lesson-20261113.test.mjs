import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const page=fs.readFileSync(path.join(site,'13.11.26.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-11-13.json'),'utf8'));
const catalog=fs.readFileSync(path.join(site,'competency-map-data.js'),'utf8');
const check=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,actual+' differs from '+expected);
const log=(a,x)=>Math.log(x)/Math.log(a);

test('13 Nov lesson: math content and interactions',()=>{
 assert.equal((page.match(/id="exercise-[0-9]+"/g)||[]).length,10);
 assert.ok((page.match(/<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/g)||[]).length>=40);
 assert.equal((page.match(/<math /g)||[]).length,(page.match(/<\/math>/g)||[]).length);
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'duplicate id');
 for(const id of ['foundation','properties','change-base','worked','equations','algorithm','practice','exercise-10','step-prev','step-next','step-reset','root-result','task-progress']){
   assert.ok(page.includes('id="'+id+'"'),'missing '+id);
 }
 assert.match(page,/prefers-reduced-motion/);
});
test('only existing local resources are linked',()=>{
 for(const [dir,ext] of [['pdf_docs','pdf'],['tex_docs','tex']]){
   assert.ok(fs.existsSync(path.join(student,dir,'13.11.26.'+ext)));
   assert.ok(page.includes('../'+dir+'/13.11.26.'+ext));
 }
 assert.ok(!page.includes('../images/13.11.26.png'));
});
test('intent: exact stable IDs, no unsupported mastery claims',()=>{
 assert.equal(intent.studentId,'daniil_khriastov');
 assert.equal(intent.lessonDate,'2026-11-13');
 assert.deepEqual(intent.ktpMatches,[]);
 assert.equal(intent.outcomes.length,6);
 for(const entry of intent.outcomes){
   assert.ok(catalog.includes('"id": "'+entry.competencyId+'"'),entry.competencyId);
   assert.ok(page.includes('id="'+entry.evidenceAnchor+'"'),entry.evidenceAnchor);
   assert.equal(entry.masteryClaim,null);
 }
});
test('training answers and exclusions',()=>{
 check(log(2,128),7);
 check(7**log(7,11),11);
 check(log(5,5*(5**5)**2),11);
 check(-(3*4-1),-11);
 check(log(3,10-1),2);
 check(log(3,81),4);
 check(log(5,25),2);
 check(log(2,7-(-57)),6);
 check(log(2,2*Math.sqrt(5)),log(4,5)+1);
 check(log(2,2/6),log(.5,2+1));
 const roots=[-3,2].filter(x=>x/6>0&&x+1>0);
 assert.deepEqual(roots,[2]);
});
