import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(site,rel),'utf8');
const page=read('02.11.26.html');
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-02.json'));
const metadata=JSON.parse(read('data/lessons/2026-11-02.lesson.json'));

test('Nov 2 lesson has all required theory and evidence anchors',()=>{
  for(const id of ['main','signs','discriminant','factoring','product','incomplete','like-terms','method','practice']){
    assert.match(page,new RegExp('id="'+id+'"'),id);
  }
  assert.match(page,/data-atlas-accent="plum"/);
  assert.match(page,/href="index.html#map"/);
  assert.match(page,/href="\.\.\/pdf_docs\/02\.11\.26\.pdf"/);
  assert.match(page,/href="\.\.\/tex_docs\/02\.11\.26\.tex"/);
});
test('Path B includes precisely 6 days and 60 full tasks and answers',()=>{
  const tasks=[...page.matchAll(/data-task="(\d)-(\d)"/g)];
  assert.equal(tasks.length,60);
  assert.equal(new Set(tasks.map(v=>v[1]+'-'+v[2])).size,60);
  assert.equal((page.match(/<section class="day" id="day-\d"/g)||[]).length,6);
  assert.equal((page.match(/<ol class="answer-list">/g)||[]).length,6);
  for(let d=0;d<6;d++){
    const set=tasks.filter(x=>Number(x[1])===d);
    assert.deepEqual(set.map(x=>Number(x[2])),[0,1,2,3,4,5,6,7,8,9]);
  }
  assert.match(page,/x=\(1±√73\)\/6/);
  assert.doesNotMatch(page,/dfrac|\\frac|неразборчиво/);
});
test('source-derived outcomes use stable anchors and do not upgrade mastery',()=>{
  assert.equal(intent.studentId,'volodia_khachaturian_math');
  assert.equal(intent.lessonDate,'2026-11-02');
  assert.equal(metadata.date,'2026-11-02');
  assert.deepEqual(intent.ktpMatches,[]);
  assert.ok(intent.outcomes.length>=5);
  for(const x of intent.outcomes){
    assert.match(page,new RegExp('id="'+x.evidenceAnchor+'"'));
    assert.equal(x.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(x.relation));
  }
  assert.deepEqual(metadata.materials,{html:'02.11.26.html',pdf:'../pdf_docs/02.11.26.pdf',tex:'../tex_docs/02.11.26.tex'});
});
test('inline script parses and contains operative controls',()=>{
  const source=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(source);
  new vm.Script(source[1],{filename:'02.11.26.html.inline.js'});
  assert.match(source[1],/addEventListener\('change'/);
  assert.match(source[1],/getElementById\('themeToggle'\)/);
});
