import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStageSchema,validateStageResult,stageExitCode,Stage04ValidationError} from '../validate-stage-result.mjs';
import {buildPracticePatch} from '../build-practice-patch.mjs';
import {replaceLessonRegistrySource,replacePracticeConfigSource} from '../apply-practice-patch.mjs';

const generator={key:'probability.independent-product',competencyIds:['t5_product']};
const registry={has:key=>key===generator.key,get:key=>{if(key!==generator.key)throw new Error('unknown');return generator;}};

function contracts(overrides={}){
  return {
    studentId:'xenia_klykova',lessonDate:'2026-08-31',competencyIds:new Set(['t5_product']),generatorRegistry:registry,curatedBanks:new Map(),
    LESSONS:[],PRACTICE_CONFIG:{studentId:'xenia_klykova',competencies:{}},
    artifact:{href:'31.08.26.html',title:'Тестовый урок',summary:'Итоги урока',materials:{tex:'../tex_docs/31.08.26.tex'}},
    ...overrides
  };
}

function analysis(overrides={}){
  return {
    schemaVersion:1,studentId:'xenia_klykova',lessonDate:'2026-08-31',lessonHref:'31.08.26.html',
    lesson:{title:'Тестовый урок',topics:['Вероятность']},
    outcomes:[{label:'Умножение независимых событий',practiceDisposition:'generator',competencyId:'t5_product',generatorKey:generator.key,difficulty:[1,2],confidence:'exact',evidence:['решено на уроке'],reason:'точное соответствие'}],
    gaps:[],warnings:[],...overrides
  };
}

test('Stage 04 JSON Schema exposes every disposition',()=>{
  const schema=loadStageSchema();
  assert.equal(schema.properties.schemaVersion.const,1);
  assert.ok(schema.properties.outcomes.items.properties.practiceDisposition.enum.includes('coverage-gap'));
  assert.ok(schema.properties.outcomes.items.properties.practiceDisposition.enum.includes('ambiguous'));
});

test('arbitrary competencyId is rejected before patch building',()=>{
  const bad=analysis({outcomes:[{...analysis().outcomes[0],competencyId:'invented_id'}]});
  assert.throws(()=>validateStageResult(bad,contracts()),error=>error instanceof Stage04ValidationError&&error.exitCode===3&&error.details.some(item=>item.includes('unknown competencyId invented_id')));
});

test('registered generator must declare the selected competency',()=>{
  const badRegistry={has:()=>true,get:()=>({key:generator.key,competencyIds:['another_id']})};
  assert.throws(()=>validateStageResult(analysis(),contracts({generatorRegistry:badRegistry})),error=>error.details.some(item=>item.includes('does not declare t5_product')));
});

test('Xenia 31.08 style material/registry drift produces an automatic lesson upsert',()=>{
  const validation=validateStageResult(analysis(),contracts());
  const patch=buildPracticePatch(validation,contracts());
  assert.equal(patch.status,'ready');
  assert.deepEqual(patch.operations.map(item=>item.type),['upsert-lesson','add-practice-mappings']);
  assert.equal(patch.lesson.date,'2026-08-31');
  assert.equal(patch.lesson.outcomes[0].competencyId,'t5_product');
  assert.equal(patch.lesson.outcomes[0].practiceDisposition,'generator');
  assert.equal(patch.mappings[0].mapping.activation,'lesson');
  assert.equal('active' in patch.mappings[0].mapping,false);
});

test('exact patch preserves existing lesson mastery metadata',()=>{
  const existing={date:'2026-08-31',href:'31.08.26.html',title:'Урок',outcomes:[{label:'Умножение независимых событий',level:3,tone:'good'}]};
  const c=contracts({LESSONS:[existing]});
  const patch=buildPracticePatch(validateStageResult(analysis(),c),c);
  assert.equal(patch.lesson.outcomes[0].level,3);
  assert.equal(patch.lesson.outcomes[0].tone,'good');
  assert.equal(patch.lesson.outcomes[0].competencyId,'t5_product');
});

test('text patcher updates only registry/config contracts and is stable on generated content',()=>{
  const c=contracts(),patch=buildPracticePatch(validateStageResult(analysis(),c),c);
  const lessonSource="export const RECENT_LIMIT=3;\nexport const LESSONS=[\n{date:'2026-08-28',href:'28.08.26.html',title:'Старый урок'}\n];\n";
  const configSource="export const PRACTICE_CONFIG={studentId:'xenia_klykova',storageKey:'x',enabled:true,competencies:{\n}};\n";
  const nextLessons=replaceLessonRegistrySource(lessonSource,patch.lesson);
  const nextConfig=replacePracticeConfigSource(configSource,patch.mappings);
  assert.match(nextLessons,/2026-08-31/);
  assert.match(nextConfig,/t5_product/);
  assert.match(nextConfig,/probability\.independent-product/);
  assert.match(nextConfig,/"activation":"lesson"/);
  assert.equal(replaceLessonRegistrySource(nextLessons,patch.lesson),nextLessons);
});

test('second semantic run becomes zero diff',()=>{
  const firstContracts=contracts(),first=buildPracticePatch(validateStageResult(analysis(),firstContracts),firstContracts);
  const mapping=first.mappings[0].mapping;
  const secondContracts=contracts({LESSONS:[first.lesson],PRACTICE_CONFIG:{studentId:'xenia_klykova',competencies:{t5_product:mapping}}});
  const second=buildPracticePatch(validateStageResult(analysis(),secondContracts),secondContracts);
  assert.equal(second.status,'noop');
  assert.equal(second.changed,false);
  assert.deepEqual(second.operations,[]);
});

test('coverage gaps return exit 2 and ambiguous mappings return exit 4',()=>{
  const gap=analysis({outcomes:[{label:'Новый навык',practiceDisposition:'coverage-gap',confidence:'exact',evidence:['урок'],reason:'генератора нет'}],gaps:[]});
  const gapValidation=validateStageResult(gap,contracts());
  assert.equal(stageExitCode(gapValidation),2);
  assert.deepEqual(gapValidation.result.gaps,['Новый навык']);
  const ambiguous=analysis({outcomes:[{label:'Неоднозначный навык',practiceDisposition:'ambiguous',confidence:'medium',evidence:['урок'],reason:'несколько кандидатов'}],gaps:[]});
  assert.equal(stageExitCode(validateStageResult(ambiguous,contracts())),4);
});
