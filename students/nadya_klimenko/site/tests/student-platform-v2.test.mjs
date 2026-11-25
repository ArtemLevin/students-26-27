import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

const root='students/nadya_klimenko/';
const baseline={
  "div_03": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_04": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_05": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_06": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_07": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_08": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_09": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_10": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_11": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "div_14": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "pattern_05": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "pattern_06": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "frac_08": [
    4,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "frac_09": [
    4,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "frac_11": [
    4,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "dec_07": [
    4,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "strategy_10": [
    4,
    "site/data/lessons/2026-10-03.lesson.json"
  ],
  "frac_10": [
    3,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "frac_12": [
    3,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "alg_11": [
    4,
    "site/data/lessons/2026-10-06.lesson.json"
  ],
  "alg_13": [
    4,
    "site/data/lessons/2026-10-06.lesson.json"
  ]
};

test('nadya_klimenko satisfies Student Platform v2 contract and preserves assessed mastery',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'nadya_klimenko'});
  assert.equal(result.contractVersion,2);
  const mastery=JSON.parse(fs.readFileSync(root+'site/data/mastery-state.json','utf8'));
  assert.equal(mastery.updated,'2026-10-06');
  assert.equal(Object.keys(mastery.levels).length,Object.keys(baseline).length);
  for(const [id,[level,sourcePath]] of Object.entries(baseline)){
    const entry=mastery.levels[id];
    assert.ok(entry,id+' must remain in mastery');
    assert.equal(entry.level,level,id);
    assert.equal(entry.sourceKind,'lesson-assessment',id);
    assert.equal(entry.sourcePath,sourcePath,id);
    const lesson=JSON.parse(fs.readFileSync(root+sourcePath,'utf8'));
    const claim=lesson.outcomes.find(x=>x.competencyId===id&&x.relation==='assessed'&&x.masteryClaim?.level===level);
    assert.ok(claim,id+' must be backed by assessed lesson evidence');
  }
});
