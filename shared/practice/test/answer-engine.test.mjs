import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAnswer} from '../answer-engine.js';
test('numeric answers support decimal comma, fractions and strict integers',()=>{
  assert.equal(validateAnswer({type:'number',value:1.5,tolerance:0},' 1,5 ').status,'correct');
  assert.equal(validateAnswer({type:'fraction',numerator:5,denominator:16,acceptDecimal:true,tolerance:1e-9},'10/32').status,'correct');
  assert.equal(validateAnswer({type:'fraction',numerator:5,denominator:16,acceptDecimal:true,tolerance:1e-9},'0,3125').status,'correct');
  assert.equal(validateAnswer({type:'integer',value:2},'2.2').status,'incorrect');assert.equal(validateAnswer({type:'number',value:1},'1/0').status,'invalid');
});
test('choice, multi-choice, ordered pairs and vectors are deterministic',()=>{
  assert.equal(validateAnswer({type:'choice',value:'Б'},' б ').status,'correct');
  assert.equal(validateAnswer({type:'multi-choice',values:['1','3']},'3; 1').status,'correct');
  assert.equal(validateAnswer({type:'ordered-pair',values:[-2,4]},'(-2; 4)').status,'correct');
  assert.equal(validateAnswer({type:'vector',values:[3,-1]},'3 -1').status,'correct');
});
test('answer parser never executes input',()=>{
  globalThis.__practicePwned=false;const result=validateAnswer({type:'number',value:4},'(()=>{globalThis.__practicePwned=true;return 4})()');assert.equal(result.status,'invalid');assert.equal(globalThis.__practicePwned,false);delete globalThis.__practicePwned;
});
