import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(site,file),'utf8');
const page=read('26.10.26.html');
const lessonScript=read('lesson-26.10.26.js');
const intent=JSON.parse(read('data/lesson-publication-intents/2026-10-26.json'));

test('lesson and controls have stable source-based anchors',()=>{
  for(const id of ['main','proportion','physics','four-forms','linear','fraction-equations','denominator','negative','wups','training','dayTabs','exerciseList','methodTabs']){
    assert.match(page,new RegExp('id="'+id+'"'));
  }
  assert.match(page,/href="index.html#map"/);
  assert.match(page,/data-atlas-accent="plum"/);
  assert.match(page,/href="lesson-26\.10\.26\.css"/);
  assert.match(page,/src="lesson-26\.10\.26\.js"/);
});
test('exactly six daily sets with ten tasks each and three WUPS tasks',()=>{
  const source=lessonScript.match(/const DAYS=(\[[\s\S]*?\]);\nconst completed/);
  assert.ok(source,'DAYS array must be defined explicitly');
  const days=vm.runInNewContext(source[1],Object.create(null),{timeout:1000});
  assert.equal(days.length,6);
  assert.equal(days.reduce((sum,day)=>sum+day.tasks.length,0),60);
  for(const day of days){
    assert.equal(day.tasks.length,10);
    for(let i=7;i<10;i++)assert.match(day.tasks[i][0],/^ВУПС/);
    assert.ok(day.tasks.every(pair=>Array.isArray(pair)&&pair.length===2&&pair[0]&&pair[1]));
  }
  new vm.Script(lessonScript,{filename:'lesson-26.10.26.js'});
});
test('publication intent links to real anchors and never asserts unobserved mastery',()=>{
  assert.equal(intent.version,1);
  assert.equal(intent.studentId,'volodia_khachaturian_math');
  assert.equal(intent.lessonDate,'2026-10-26');
  assert.deepEqual(intent.ktpMatches,[]);
  assert.ok(intent.outcomes.length>=6);
  for(const outcome of intent.outcomes){
    assert.ok(page.includes('id="'+outcome.evidenceAnchor+'"'),outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(outcome.relation));
    assert.equal(outcome.confidence,'exact');
    assert.equal(outcome.decision,'apply');
  }
});
test('practice interaction does not write to canonical mastery state',()=>{
  assert.doesNotMatch(lessonScript,/fetch\(.*method\s*:\s*['"](?:PATCH|PUT|POST)/is);
  assert.doesNotMatch(lessonScript,/mastery(?:-state|-authority)?\.js(?:on)?/);
  assert.match(page,/не меняют.*официальные уровни освоения/);
});
