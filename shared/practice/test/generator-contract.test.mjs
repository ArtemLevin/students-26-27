import test from 'node:test';
import assert from 'node:assert/strict';
import {GeneratorRegistry,validateExercise} from '../generator-registry.js';
import {ALL_GENERATORS} from '../generators/index.js';
import {referenceAnswerForSpec,validateAnswer} from '../answer-engine.js';
import {combination} from '../generators/shared.js';

test('all generators satisfy the contract across 1000 seeds',()=>{
  const registry=new GeneratorRegistry(ALL_GENERATORS);assert.equal(registry.list().length,19);
  for(const generator of registry.list())for(let index=0;index<1000;index+=1){
    const competencyId=generator.competencyIds[index%generator.competencyIds.length],exercise=registry.generate(generator.key,{seed:`${generator.key}:${index}`,difficulty:index%3+1,competencyId});
    assert.equal(validateExercise(exercise,generator),true);assert.equal(exercise.competencyId,competencyId);assert.equal(validateAnswer(exercise.answerSpec,referenceAnswerForSpec(exercise.answerSpec)).status,'correct');
    assert.ok(exercise.prompt.length>8);assert.ok(exercise.solution.length);assert.ok(!exercise.prompt.includes('NaN'));
    if(exercise.answerSpec.type==='fraction'){assert.notEqual(exercise.answerSpec.denominator,0);const value=exercise.answerSpec.numerator/exercise.answerSpec.denominator;assert.ok(Number.isFinite(value));if(generator.key.startsWith('probability.'))assert.ok(value>=0&&value<=1);}
    if(generator.key==='probability.bernoulli'){const p=exercise.parameters;assert.equal(p.coefficient,combination(p.n,p.k));}
  }
});
test('same generator seed reproduces the complete exercise',()=>{
  const registry=new GeneratorRegistry(ALL_GENERATORS);for(const generator of registry.list()){const args={seed:'fixed',difficulty:2,competencyId:generator.competencyIds[0]};assert.deepEqual(registry.generate(generator.key,args),registry.generate(generator.key,args));}
});
