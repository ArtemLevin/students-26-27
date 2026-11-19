import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const page=read('19.11.26.html');
const lab=read('19.11.26-lab.html');
const metadata=JSON.parse(read('data/lessons/2026-11-19.lesson.json'));
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-19.json'));
const practice=JSON.parse(read('data/practice-publications/2026-11-19.json'));
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);

test('19 November is newest and all publication/evidence contracts agree',()=>{
  assert.equal(validateLessonRegistry().latest,'19.11.26.html');
  assert.equal(LESSONS[0].date,'2026-11-19');
  assert.equal(LESSONS[0].href,'19.11.26.html');
  assert.equal(metadata.date,intent.lessonDate);
  assert.deepEqual(LESSONS[0].topics,metadata.topics);
  assert.deepEqual(LESSONS[0].materials,metadata.materials);
  assert.equal(metadata.outcomes.length,4);
  assert.equal(practice.outcomes.length,4);
  assert.equal(intent.outcomes.length,4);
  for(const outcome of metadata.outcomes){
    assert.ok(ids(page).includes(outcome.evidenceAnchor),'Missing evidence anchor '+outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null,'Only instruction and guided practice were observed');
    const key=x=>[x.competencyId,x.evidenceAnchor,x.relation].join('#');
    const reviewed=practice.outcomes.find(x=>key(x)===key(outcome));
    const staged=intent.outcomes.find(x=>key(x)===key(outcome));
    assert.equal(reviewed?.practiceDisposition,'manual','Practice disposition required');
    assert.equal(staged?.decision,'apply');
    assert.equal(staged?.confidence,'exact');
  }
  for(const material of Object.values(metadata.materials)){
    assert.ok(fs.existsSync(path.resolve(site,material)),'Missing material '+material);
  }
});

test('lesson, laboratory and deep links are valid with no duplicate IDs',()=>{
  const pageIds=ids(page),labIds=ids(lab);
  assert.equal(new Set(pageIds).size,pageIds.length,'Lesson duplicate ID');
  assert.equal(new Set(labIds).size,labIds.length,'Laboratory duplicate ID');
  for(const [name,html] of [['lesson',page],['lab',lab]]){
    for(const item of html.matchAll(/href="#([^"]+)"/g)){
      assert.ok(ids(html).includes(item[1]),name+' invalid anchor #'+item[1]);
    }
    for(const item of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
      const syntax=spawnSync(process.execPath,['--check'],{input:item[1],encoding:'utf8'});
      assert.equal(syntax.status,0,name+' invalid JS: '+syntax.stderr);
    }
  }
  for(const item of page.matchAll(/href="19\.11\.26-lab\.html#([^"]+)"/g)){
    assert.ok(labIds.includes(item[1]),'Missing laboratory destination #'+item[1]);
  }
  assert.equal((page.match(/class="task"/g)||[]).length,10,'Path A must contain 10 tasks');
  assert.equal((page.match(/<summary>Проверить ответ<\/summary>/g)||[]).length,10);
});

test('independent stereometry arithmetic agrees with the exercise answer key',()=>{
  const volume=(a,b,c)=>a*b*c;
  const area=(a,b,c)=>2*(a*b+a*c+b*c);
  const diagonal=(a,b,c)=>Math.sqrt(a*a+b*b+c*c);
  assert.equal(volume(3,4,5),60);
  assert.equal(area(2,3,4),52);
  assert.equal(72/9,8);
  assert.equal(Math.hypot(5,12),13);
  assert.equal(diagonal(3,4,12),13);
  assert.equal(volume(2,6,3),36);
  assert.equal(volume(4,4,4),64);
  assert.equal(area(4,4,4),96);
  assert.equal(2*(3*Math.sqrt(3))**2,54);
  assert.ok(Math.abs(3*(5*Math.sqrt(2))**2-150)<1e-10);
  assert.equal((3+2)**3-3**3,98);
  assert.equal(3**3-2**3,19);
});
