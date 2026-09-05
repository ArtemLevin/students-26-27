import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,MASTERY_SPECS} from '../discover-student-contracts.mjs';
import {readMasteryLevels,replaceMasteryLevels} from '../mastery-source.mjs';
import {buildMasteryPatch} from '../build-mastery-patch.mjs';
import {applyMasteryPatch} from '../apply-mastery-patch.mjs';
import {buildPracticePatch} from '../build-practice-patch.mjs';

function masteryContracts(levels={}){
  return {studentId:'student',mastery:{levels,source:'const stage04Mastery={};',locator:{kind:'symbol',name:'stage04Mastery'},path:'/repo/mastery.js'},root:'/repo'};
}

function validation(outcomes,overrides={}){
  return {result:{outcomes,gaps:[],warnings:[]},existingLesson:null,blocks:[],hasGaps:false,...overrides};
}

test('all supported students expose a parseable GitHub mastery contract',()=>{
  assert.deepEqual(Object.keys(MASTERY_SPECS).sort(),[
    'kirill_zinoviev','nastya_pavlova','nikol_sarkisyants','sofya_kalney','timofey','volodia_khachaturian','xenia_klykova'
  ].sort());
  for(const [studentId,spec] of Object.entries(MASTERY_SPECS)){
    const source=fs.readFileSync(path.join(ROOT,spec.path),'utf8');
    const levels=readMasteryLevels(source,spec.locator);
    assert.ok(levels&&typeof levels==='object'&&!Array.isArray(levels),`${studentId}: mastery levels object`);
    for(const [id,level] of Object.entries(levels))assert.ok(id&&Number.isInteger(level)&&level>=0&&level<=4,`${studentId}: ${id} has valid level`);
  }
});

test('mastery source helper supports symbol and property contracts idempotently',()=>{
  const symbol='const stage04Mastery={a:2};';
  assert.deepEqual(readMasteryLevels(symbol,{kind:'symbol',name:'stage04Mastery'}),{a:2});
  const symbolNext=replaceMasteryLevels(symbol,{a:1,b:4},{kind:'symbol',name:'stage04Mastery'});
  assert.deepEqual(readMasteryLevels(symbolNext,{kind:'symbol',name:'stage04Mastery'}),{a:1,b:4});
  assert.equal(replaceMasteryLevels(symbolNext,{a:1,b:4},{kind:'symbol',name:'stage04Mastery'}),symbolNext);

  const property='window.CONFIG={teacherSeed:{a:3},evidence:{}};';
  const propertyNext=replaceMasteryLevels(property,{a:2,b:1},{kind:'property',name:'teacherSeed'});
  assert.deepEqual(readMasteryLevels(propertyNext,{kind:'property',name:'teacherSeed'}),{a:2,b:1});
});

test('exact competency + exact confidence + explicit level produces an authoritative mastery update',()=>{
  const patch=buildMasteryPatch(validation([
    {label:'Навык',competencyId:'skill',confidence:'exact',level:3}
  ]),masteryContracts({skill:2}));
  assert.equal(patch.status,'ready');
  assert.deepEqual(patch.levels,{skill:3});
  assert.deepEqual(patch.operations,[{type:'set-mastery-levels',levels:{skill:3}}]);
});

test('mastery update may lower a level when exact lesson evidence says so',()=>{
  const patch=buildMasteryPatch(validation([
    {label:'Навык',competencyId:'skill',confidence:'exact',level:1}
  ]),masteryContracts({skill:4}));
  assert.deepEqual(patch.levels,{skill:1});
});

test('missing competencyId or non-exact confidence never mutates mastery',()=>{
  const patch=buildMasteryPatch(validation([
    {label:'Без id',confidence:'exact',level:3},
    {label:'Неуверенное сопоставление',competencyId:'skill',confidence:'medium',level:4}
  ]),masteryContracts({skill:2}));
  assert.equal(patch.status,'noop');
  assert.deepEqual(patch.operations,[]);
  assert.equal(patch.warnings.length,2);
});

test('conflicting levels for one competency block the whole mastery patch',()=>{
  const patch=buildMasteryPatch(validation([
    {label:'A',competencyId:'skill',confidence:'exact',level:2},
    {label:'B',competencyId:'skill',confidence:'exact',level:3}
  ]),masteryContracts({}));
  assert.equal(patch.status,'blocked');
  assert.match(patch.blocks[0],/conflicting mastery levels/);
});

test('dry-run mastery application reports the managed source and preserves repository bytes',()=>{
  const source='const stage04Mastery={skill:3};\n';
  const contracts={root:'/repo',studentId:'student',mastery:{source,levels:{skill:3},locator:{kind:'symbol',name:'stage04Mastery'},path:'/repo/mastery.js'}};
  const patch={status:'ready',blocks:[],operations:[{type:'set-mastery-levels',levels:{skill:1}}]};
  const application=applyMasteryPatch(patch,contracts,{dryRun:true});
  assert.deepEqual(application.changedFiles,['mastery.js']);
  assert.deepEqual(readMasteryLevels(application.sources.mastery,contracts.mastery.locator),{skill:1});
});

test('existing lesson metadata follows an explicit Stage 04 level while omitted level is preserved',()=>{
  const existing={date:'2026-09-05',href:'05.09.26.html',title:'Урок',outcomes:[{label:'Навык',competencyId:'skill',level:3,tone:'good',practiceDisposition:'manual'}]};
  const contracts={artifact:{href:'05.09.26.html',title:'Урок',summary:'',materials:{}},PRACTICE_CONFIG:{competencies:{}},LESSONS:[existing]};
  const explicit=buildPracticePatch({result:{lessonDate:'2026-09-05',lessonHref:'05.09.26.html',outcomes:[{label:'Навык',practiceDisposition:'manual',confidence:'exact',competencyId:'skill',evidence:['урок'],reason:'диагностика',level:1,tone:'alert'}],gaps:[],warnings:[]},existingLesson:existing,blocks:[],hasGaps:false},contracts);
  assert.equal(explicit.lesson.outcomes[0].level,1);
  assert.equal(explicit.lesson.outcomes[0].tone,'alert');
  const omitted=buildPracticePatch({result:{lessonDate:'2026-09-05',lessonHref:'05.09.26.html',outcomes:[{label:'Навык',practiceDisposition:'manual',confidence:'exact',competencyId:'skill',evidence:['урок'],reason:'без новой оценки'}],gaps:[],warnings:[]},existingLesson:existing,blocks:[],hasGaps:false},contracts);
  assert.equal(omitted.lesson.outcomes[0].level,3);
  assert.equal(omitted.lesson.outcomes[0].tone,'good');
});
