import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAllPracticeConfigs} from '../validate-configs.mjs';
import {selectCuratedItem,validateCuratedBank} from '../curated-bank.js';

test('every connected student config resolves against its real catalog and registry',async()=>{
  const report=await validateAllPracticeConfigs();assert.equal(report.length,7);assert.ok(report.every(item=>item.competencies>=5));
});
test('curated bank validates and avoids recent deterministic repeats',()=>{
  const bank={bankKey:'geometry.right-triangle',version:1,competencyIds:['g'],items:[
    {id:'a',prompt:'A?',answerSpec:{type:'integer',value:1},hints:['h'],solution:['s'],difficulty:1},
    {id:'b',prompt:'B?',answerSpec:{type:'integer',value:2},hints:['h'],solution:['s'],difficulty:1}
  ]};assert.equal(validateCuratedBank(bank),true);assert.equal(selectCuratedItem(bank,{seed:'x',recentIds:['a']}).id,'b');assert.deepEqual(selectCuratedItem(bank,{seed:'same'}),selectCuratedItem(bank,{seed:'same'}));
});
