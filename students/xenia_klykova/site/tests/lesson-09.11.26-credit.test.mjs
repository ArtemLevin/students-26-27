import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const lesson=read('09.11.26.html');
const lab=read('09.11.26-lab.html');
const metadata=JSON.parse(read('data/lessons/2026-11-09.lesson.json'));
const intent=JSON.parse(read('data/publication-intents/2026-11-09.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-09.json'));
const ids=src=>[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);

test('09 November is canonical latest and older finance lesson remains',()=>{
 assert.equal(validateLessonRegistry().latest,'09.11.26.html');
 assert.equal(LESSONS[0].date,'2026-11-09');
 assert.ok(LESSONS.some(x=>x.date==='2026-11-06'));
 assert.equal(metadata.date,'2026-11-09');
 assert.equal(metadata.materials.html,'09.11.26.html');
 assert.equal(metadata.materials.lab,'09.11.26-lab.html');
 assert.equal(intent.lessonDate,metadata.date);
 assert.equal(practice.lessonDate,metadata.date);
 assert.equal(intent.outcomes.length,metadata.outcomes.length);
 assert.equal(practice.outcomes.length,metadata.outcomes.length);
 assert.ok(metadata.outcomes.length>0);
 for(const item of metadata.outcomes){
  assert.equal(item.masteryClaim,null);
  assert.ok(['touched','practiced'].includes(item.relation));
  assert.ok(ids(lesson).includes(item.evidenceAnchor));
 }
 for(const m of Object.values(metadata.materials)){
  assert.ok(fs.existsSync(path.resolve(site,m)),'Missing linked material: '+m);
 }
});
test('lesson and lab have valid source-only navigation and scripts',()=>{
 for(const [name,html] of [['lesson',lesson],['lab',lab]]){
  const all=ids(html);assert.equal(all.length,new Set(all).size,name+' duplicate ids');
  for(const x of html.matchAll(/href="#([^"]+)"/g))assert.ok(all.includes(x[1]),name+' missing local anchor '+x[1]);
  for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
   const parsed=spawnSync(process.execPath,['--check'],{input:script[1],encoding:'utf8'});
   assert.equal(parsed.status,0,name+' JS parse: '+parsed.stderr);
  }
 }
 assert.equal((lesson.match(/<article class="task" id="task-/g)||[]).length,10);
 assert.match(lesson,/09\.11\.26-lab\.html#schedule/);
 assert.match(lesson,/09\.11\.26-lab\.html#limits/);
 assert.match(lesson,/09\.11\.26-lab\.html#total/);
 assert.match(lab,/09\.11\.26\.html/);
});
test('independent repayment arithmetic matches the printed examples',()=>{
 const calculate=(amount,rate,balances)=>balances.slice(0,-1).map((start,i)=>start*(1+rate)-balances[i+1]);
 const first=calculate(750,.12,[750,600,480,0]);
 assert.deepEqual(first.map(x=>Math.round(x*100)/100),[240,192,537.6]);
 const total=first.reduce((sum,x)=>sum+x,0);
 assert.ok(Math.abs(total-969.6)<1e-8);
 assert.ok(Math.abs((total/750-1)*100-29.28)<1e-8);
 const limit=calculate(8,.2,[8,6.4,3.2,0]);assert.ok(Math.max(...limit)<5);
 const sum4=amount=>calculate(amount,.15,[amount,.8*amount,.5*amount,.1*amount,0]).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(sum4(36)-48.96)<1e-8);
 assert.ok(Math.abs(sum4(37)-50.32)<1e-8);
 assert.ok(sum4(36)<50&&sum4(37)>=50);
 assert.ok(Math.abs(.05*(1+.9+.8+.7+.6+.5)*100-22.5)<1e-9);
});
