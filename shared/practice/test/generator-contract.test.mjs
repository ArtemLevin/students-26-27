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
test('competency-specific algebra modes stay semantically aligned',()=>{
  const registry=new GeneratorRegistry(ALL_GENERATORS);
  const powerCases=[
    ['calc_01','meaning','Смысл степени'],
    ['calc_03','product','Умножение степеней'],
    ['calc_04','quotient','Деление степеней'],
    ['calc_07','power','Степень степени'],
    ['calc_08','negative','Отрицательный показатель степени'],
    ['calc_12','common-base','Приведение к общему основанию']
  ];
  for(const [competencyId,mode,topic] of powerCases){
    const exercise=registry.generate('algebra.powers',{seed:`mode:${mode}`,difficulty:2,competencyId,options:{mode}});
    assert.equal(exercise.metadata.topic,topic);assert.equal(validateAnswer(exercise.answerSpec,referenceAnswerForSpec(exercise.answerSpec)).status,'correct');
  }
  for(const [competencyId,mode,topic] of [['calc_10','root-as-power','Корень как дробная степень'],['calc_11','fractional-power','Дробный показатель степени']]){
    const exercise=registry.generate('algebra.radicals',{seed:`mode:${mode}`,difficulty:2,competencyId,options:{mode}});
    assert.equal(exercise.metadata.topic,topic);assert.equal(validateAnswer(exercise.answerSpec,referenceAnswerForSpec(exercise.answerSpec)).status,'correct');
  }
});