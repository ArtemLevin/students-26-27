import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveActivationPolicy,validateActivationMapping,validateLessonDates} from '../activation-policy.js';
import {validateAllPracticeConfigs} from '../validate-configs.mjs';
import {selectCuratedItem,validateCuratedBank} from '../curated-bank.js';

test('every connected student config resolves against its real catalog and registry',async()=>{
  const report=await validateAllPracticeConfigs();assert.equal(report.length,7);assert.ok(report.every(item=>item.competencies>=5));assert.ok(report.every(item=>Object.values(item.policies).reduce((sum,value)=>sum+value,0)===item.competencies));
});

test('activation policy defaults to lesson and preserves legacy aliases',()=>{
  assert.equal(resolveActivationPolicy({}),'lesson');assert.equal(resolveActivationPolicy({active:true}),'always');assert.equal(resolveActivationPolicy({active:false}),'lesson');assert.equal(resolveActivationPolicy({activation:'manual'}),'manual');
  assert.equal(validateActivationMapping({activation:'disabled'},'x'),'disabled');
  assert.throws(()=>validateActivationMapping({activation:'always',active:false},'x'),/conflicts/);
  assert.throws(()=>validateActivationMapping({activation:'future'},'x'),/Invalid activation policy/);
});

test('lesson date validation rejects malformed calendar dates before runtime',()=>{
  assert.equal(validateLessonDates([{date:'2026-08-31'},{date:'2026-09-01'}]),true);
  assert.throws(()=>validateLessonDates([{date:'2026-02-30'}]),/Invalid lesson date/);
  assert.throws(()=>validateLessonDates([{date:'31.08.2026'}]),/Invalid lesson date/);
});

test('curated bank validates and avoids recent deterministic repeats',()=>{
  const bank={bankKey:'geometry.right-triangle',version:1,competencyIds:['g'],items:[
    {id:'a',prompt:'A?',answerSpec:{type:'integer',value:1},hints:['h'],solution:['s'],difficulty:1},
    {id:'b',prompt:'B?',answerSpec:{type:'integer',value:2},hints:['h'],solution:['s'],difficulty:1}
  ]};assert.equal(validateCuratedBank(bank),true);assert.equal(selectCuratedItem(bank,{seed:'x',recentIds:['a']}).id,'b');assert.deepEqual(selectCuratedItem(bank,{seed:'same'}),selectCuratedItem(bank,{seed:'same'}));
});
