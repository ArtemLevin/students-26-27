import test from 'node:test';
import assert from 'node:assert/strict';
import {buildExerciseSeed,createRandom} from '../random.js';
test('same seed yields the same sequence and different seeds diverge',()=>{
  const values=seed=>{const random=createRandom(seed);return Array.from({length:20},()=>random.int(-3,7));};
  assert.deepEqual(values('same'),values('same'));assert.notDeepEqual(values('same'),values('other'));
});
test('random helpers respect boundaries and never mutate shuffle input',()=>{
  const random=createRandom('range'),source=[1,2,3,4];for(let index=0;index<1000;index+=1){const value=random.int(2,5);assert.ok(value>=2&&value<=5);assert.ok(source.includes(random.pick(source)));}
  const shuffled=random.shuffle(source);assert.deepEqual(source,[1,2,3,4]);assert.deepEqual([...shuffled].sort(),source);
});
test('exercise seed includes every reproducibility input',()=>{
  const a=buildExerciseSeed({studentId:'s',competencyId:'c',date:'2026-08-31',ordinal:0,generatorVersion:1}),b=buildExerciseSeed({studentId:'s',competencyId:'c',date:'2026-08-31',ordinal:1,generatorVersion:1});assert.notEqual(a,b);assert.equal(a,buildExerciseSeed({studentId:'s',competencyId:'c',date:'2026-08-31',ordinal:0,generatorVersion:1}));
});
