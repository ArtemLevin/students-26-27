import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const lesson=read('14.11.26.html');
const lab=read('14.11.26-lab.html');
const meta=JSON.parse(read('data/lessons/2026-11-14.lesson.json'));
const intent=JSON.parse(read('data/publication-intents/2026-11-14.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-14.json'));
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(item=>item[1]);

test('14.11.26 is the latest lesson with consistent v2 metadata and materials',()=>{
  assert.equal(validateLessonRegistry().latest,'14.11.26.html');
  assert.equal(LESSONS[0].date,'2026-11-14');
  assert.equal(LESSONS[0].materials.html,'14.11.26.html');
  assert.equal(meta.date,'2026-11-14');
  assert.equal(intent.lessonDate,meta.date);
  assert.equal(practice.lessonDate,meta.date);
  assert.equal(meta.outcomes.length,5);
  assert.equal(meta.outcomes.length,practice.outcomes.length);
  assert.equal(meta.outcomes.length,intent.outcomes.length);
  for(const outcome of meta.outcomes){
    assert.ok(ids(lesson).includes(outcome.evidenceAnchor),'Missing anchor '+outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null,'Lesson discussion is not mastery assessment');
    const disposition=practice.outcomes.find(item=>item.competencyId===outcome.competencyId&&item.evidenceAnchor===outcome.evidenceAnchor&&item.relation===outcome.relation);
    assert.equal(disposition?.practiceDisposition,'manual','Missing reviewed practice decision');
  }
  for(const file of Object.values(meta.materials))assert.ok(fs.existsSync(path.resolve(site,file)),'Missing material '+file);
  assert.ok(fs.existsSync(path.resolve(site,'../images/14.11.26.png')),'Poster missing');
  assert.equal((lesson.match(/<div class="task">/g)||[]).length,10,'Path A must contain exactly 10 exercises');
});

test('lesson, laboratory and cross-page anchors are valid',()=>{
  const lessonIds=new Set(ids(lesson)),labIds=new Set(ids(lab));
  assert.equal(lessonIds.size,ids(lesson).length,'Lesson duplicate anchor');
  assert.equal(labIds.size,ids(lab).length,'Lab duplicate anchor');
  for(const [page,html] of [['lesson',lesson],['lab',lab]]){
    for(const match of html.matchAll(/href="#([^"]+)"/g)){
      assert.ok(ids(html).includes(match[1]),page+' dead anchor #'+match[1]);
    }
    const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    for(const [,script] of scripts){
      const check=spawnSync(process.execPath,['--check'],{input:script,encoding:'utf8'});
      assert.equal(check.status,0,page+' script syntax: '+check.stderr);
    }
  }
  for(const item of lesson.matchAll(/href="14\.11\.26-lab\.html#([^"]+)"/g)){
    assert.ok(labIds.has(item[1]),'Lesson dead laboratory anchor '+item[1]);
  }
});

test('residue arguments used in the exercises are mathematically valid',()=>{
  const mod=(n,m)=>((n%m)+m)%m;
  assert.equal(mod(250,3),1);
  assert.equal(mod(251,3),2);
  assert.equal(mod(2031,4),3);
  assert.equal(mod(2027,4),3);
  for(let x=-30;x<=30;x++){
    assert.ok([0,1].includes(mod(x*x,4)));
    if(x%2!==0)assert.equal(mod(x*x,8),1);
    for(let y=-15;y<=15;y++)assert.notEqual(mod(x*x+y*y,4),3);
  }
  assert.equal((31*(4+34)/2)%2,1);
});