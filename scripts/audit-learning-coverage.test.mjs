import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EXCLUDED_IDS,readMastery,markdown} from './audit-learning-coverage.mjs';

test('approved exclusion scope preserves math cabinet',()=>{
  assert.equal(EXCLUDED_IDS.length,8);
  assert.equal(new Set(EXCLUDED_IDS).size,8);
  assert.ok(EXCLUDED_IDS.includes('kiril_zinoviev_physics'));
  assert.ok(!EXCLUDED_IDS.includes('kirill_zinoviev'));
  assert.ok(!EXCLUDED_IDS.includes('timofey'));
});
test('mastery inspection is static and fails closed for unknown JS',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'coverage-mastery-'));
  try{
    const js=path.join(dir,'authority.js'),json=path.join(dir,'state.json');
    fs.writeFileSync(js,'export const mastery={};\nexport default mastery;\n');
    assert.deepEqual(readMastery(js),{format:'js-empty-literal',levels:{}});
    fs.writeFileSync(js,'throw Error("must never execute"); export const mastery={};');
    assert.deepEqual(readMastery(js),{format:'js-review-required',levels:null});
    fs.writeFileSync(json,JSON.stringify({levels:{skill:{level:2}}}));
    assert.deepEqual(readMastery(json),{format:'json',levels:{skill:{level:2}}});
    fs.writeFileSync(json,'{}');
    assert.throws(()=>readMastery(json),/Unsupported JSON mastery shape/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('markdown distinguishes unresolved mastery from zero',()=>{
  const report={scope:{excludedIds:EXCLUDED_IDS,activeCabinets:1,canonicalCabinets:2},
    totals:{lessons:1,empty:1},students:[{id:'sample',lessons:[{coveredIds:[],unlinked:[]}],
      covered:0,catalogSize:4,masteryOutsideCoverage:null,parity:'ok'}]};
  assert.match(markdown(report),/\| sample \| 1 \| 1 \| 0\/4 \| 0 \| review \| ok \|/);
});
