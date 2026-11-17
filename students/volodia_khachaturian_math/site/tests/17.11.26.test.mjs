import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {LESSONS} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const read=(rel)=>fs.readFileSync(path.join(site,rel),'utf8');
const page=read('17.11.26.html');
const intent=JSON.parse(read('data/lesson-publication-intents/2026-11-17.json'));
const metadata=JSON.parse(read('data/lessons/2026-11-17.lesson.json'));

test('17 Nov lesson is first in the canonical journal and its files exist',()=>{
  assert.equal(LESSONS[0].date,'2026-11-17');
  assert.equal(LESSONS.filter(x=>x.date==='2026-11-17').length,1);
  const entry=LESSONS[0];
  assert.equal(entry.href,'17.11.26.html');
  assert.deepEqual(entry.materials,metadata.materials);
  for(const rel of Object.values(entry.materials)){
    assert.ok(fs.existsSync(path.resolve(site,rel)),'missing material '+rel);
  }
  assert.ok(fs.existsSync(path.join(student,'images','17.11.26-poster.svg')));
  assert.match(page,/href="\.\.\/images\/17\.11\.26-poster\.svg"/);
});

test('17 Nov publication evidence only names real anchors and does not claim mastery',()=>{
  assert.equal(intent.studentId,'volodia_khachaturian_math');
  assert.deepEqual(intent.ktpMatches,[]);
  assert.deepEqual(metadata.ktpCoverage,[]);
  assert.equal(metadata.date,'2026-11-17');
  assert.ok(intent.outcomes.length>=8);
  for(const outcome of intent.outcomes){
    assert.match(page,new RegExp('id="'+outcome.evidenceAnchor+'"'));
    assert.equal(outcome.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(outcome.relation));
  }
  assert.equal(metadata.outcomes.length,intent.outcomes.length);
  assert.equal(LESSONS[0].outcomes.length,intent.outcomes.length);
});

test('Path A has precisely 10 checkable tasks and 10 matching answers',()=>{
  const tasks=[...page.matchAll(/data-task="(\d+)"/g)].map(x=>Number(x[1]));
  assert.deepEqual(tasks,[1,2,3,4,5,6,7,8,9,10]);
  const answers=page.match(/<ol class="answers">([\s\S]*?)<\/ol>/)?.[1]||'';
  assert.equal((answers.match(/<li>/g)||[]).length,10);
  assert.match(page,/id="progress"/);
  assert.match(page,/id="answers"/);
  assert.match(page,/localStorage/);
});

test('interactive number line cases and JS are valid',()=>{
  for(const id of ['a','b','c']){
    assert.match(page,new RegExp('data-case="'+id+'"'));
    assert.match(page,new RegExp('data-plot="'+id+'"'));
  }
  const script=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script);
  new vm.Script(script[1],{filename:'17.11.26.html.inline.js'});
  assert.doesNotMatch(script[1],/\.innerHTML\s*=/);
  assert.match(page,/prefers-reduced-motion/);
  assert.match(page,/@media print/);
});

test('marine summary preserves the critical algebraic formulas',()=>{
  const poster=fs.readFileSync(path.join(student,'images','17.11.26-poster.svg'),'utf8');
  assert.match(poster,/a² − b² = \(a − b\)\(a \+ b\)/);
  assert.match(poster,/\(a − b\)² = a² − 2ab \+ b²/);
  assert.match(poster,/1,4 : 0,25 = 140 : 25 = 5,6/);
  assert.match(poster,/−x ≤ −9  →  x ≥ 9/);
});
