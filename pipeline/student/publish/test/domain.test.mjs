import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverLessonArtifact} from '../artifact.mjs';
import {
  buildLessonMetadata,
  samePublicationContribution
} from '../metadata.mjs';
import {applyKtpPublication} from '../ktp-state.mjs';
import {applyMasteryPublication} from '../mastery-state.mjs';
import {deriveRegistrySource} from '../registry.mjs';
import {buildV2PublicationPlan} from '../plan.mjs';
import {validateLessonMetadataData,validateStudentPackage} from '../../contract.mjs';

function writeJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
function registrySource(lessons){
  return 'export const LESSONS='+JSON.stringify(lessons,null,2)+';\n';
}
function repoFixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'p4-2a-'));
  const studentId='test_student';
  const studentRoot=path.join(root,'students',studentId);
  const site=path.join(studentRoot,'site');
  const metadataDir=path.join(site,'data','lessons');
  fs.mkdirSync(metadataDir,{recursive:true});
  fs.mkdirSync(path.join(studentRoot,'pdf_docs'),{recursive:true});
  fs.mkdirSync(path.join(studentRoot,'tex_docs'),{recursive:true});

  const contract={
    version:2,
    studentId,
    studentName:'Тестовый Ученик',
    program:'ЕГЭ, профильная математика',
    planning:{
      mode:'fixed',
      plan:'site/data/ktp-plan.json',
      state:'site/data/ktp-state.json'
    },
    lessons:{
      registry:'site/lesson-registry.js',
      metadataDir:'site/data/lessons'
    },
    competencies:{
      catalog:'site/competency-map-data.js',
      mastery:'site/mastery-authority.js'
    },
    practice:{config:null}
  };
  const lessons=[
    {
      id:'ktp-001',order:1,plannedDate:'2026-09-30',
      stageId:'adapt',stage:'Адаптация',block:'Формулы',topic:'Формулы',
      content:'Формулы.',result:'Решает.',check:'Проверка.',homework:'ДЗ.',
      targetCompetencies:['text_15']
    },
    {
      id:'ktp-002',order:2,plannedDate:'2026-10-07',
      stageId:'adapt',stage:'Адаптация',block:'Графики',topic:'Графики',
      content:'Графики.',result:'Читает график.',check:'Новая задача.',homework:'ДЗ.',
      targetCompetencies:['func_17']
    },
    {
      id:'ktp-003',order:3,plannedDate:'2026-10-14',
      stageId:'adapt',stage:'Адаптация',block:'Модели',topic:'Модели',
      content:'Модели.',result:'Строит модель.',check:'Новая модель.',homework:'ДЗ.',
      targetCompetencies:['text_15']
    }
  ];
  const plan={
    version:1,
    studentId,
    programVersion:'test-program-v1',
    lessons
  };
  const state={
    version:1,
    studentId,
    programVersion:'test-program-v1',
    updated:'2026-09-30',
    records:{
      'ktp-001':{
        status:'done',
        scheduledDate:'2026-09-30',
        actualDate:'2026-09-30',
        coverage:'complete',
        actualSummary:'Первый урок.',
        lessonRefs:['2026-09-30']
      },
      'ktp-002':{
        status:'planned',
        scheduledDate:'2026-10-07',
        lessonRefs:[]
      },
      'ktp-003':{
        status:'planned',
        scheduledDate:'2026-10-14',
        lessonRefs:[]
      }
    }
  };
  const oldMetadata={
    version:1,
    studentId,
    date:'2026-09-30',
    title:'Формулы',
    summary:'Первый урок.',
    topics:['формулы'],
    ktpRefs:['ktp-001'],
    outcomes:[{
      competencyId:'text_15',
      evidenceAnchor:'old-anchor',
      relation:'practiced',
      masteryClaim:null
    }],
    materials:{html:'30.09.26.html'}
  };
  const oldRegistry={
    date:'2026-09-30',
    ktpRefs:['ktp-001'],
    href:'30.09.26.html',
    title:'Формулы',
    navTitle:'Формулы',
    navSubtitle:'Первый урок.',
    summary:'Первый урок.',
    topics:['формулы'],
    outcomes:[{
      competencyId:'text_15',
      evidenceAnchor:'old-anchor',
      relation:'practiced'
    }],
    materials:{html:'30.09.26.html'}
  };

  writeJson(path.join(studentRoot,'student-contract.json'),contract);
  writeJson(path.join(site,'data','ktp-plan.json'),plan);
  writeJson(path.join(site,'data','ktp-state.json'),state);
  writeJson(path.join(metadataDir,'2026-09-30.lesson.json'),oldMetadata);
  fs.writeFileSync(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'core',items:[{id:'text_15'},{id:'func_17'}]}]};\n"
  );
  fs.writeFileSync(path.join(site,'mastery-authority.js'),'export const mastery={};\n');
  fs.writeFileSync(path.join(site,'lesson-registry.js'),registrySource([oldRegistry]));
  fs.writeFileSync(
    path.join(site,'30.09.26.html'),
    '<!doctype html><section id="old-anchor"></section>\n'
  );
  fs.writeFileSync(
    path.join(site,'07.10.26.html'),
    '<!doctype html><html><head><meta name="description" content="Описание из HTML"></head><body><h1>Графики №12</h1><section id="graph-model"></section><section id="text-model"></section></body></html>\n'
  );
  return {root,studentId,studentRoot,site,metadataDir,plan,state};
}

function intent(studentId='test_student'){
  return {
    version:1,
    studentId,
    lessonDate:'2026-10-07',
    topics:['графики','формула'],
    actualSummary:'Фактически разобраны графики.',
    ktpMatches:[{
      ktpId:'ktp-002',
      confidence:'exact',
      decision:'apply',
      coverage:'complete',
      reason:'Плановый результат достигнут.'
    }],
    outcomes:[{
      competencyId:'func_17',
      evidenceAnchor:'graph-model',
      relation:'practiced',
      confidence:'exact',
      decision:'apply',
      masteryClaim:null,
      basis:'Навык отрабатывался на уроке.'
    }],
    warnings:[]
  };
}
function applyPlanForTest(root,plan){
  for(const write of plan.writes){
    const file=path.join(root,...write.path.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,write.content);
  }
}

test('artifact discovery is deterministic and always includes lesson HTML',()=>{
  const x=repoFixture();
  const artifact=discoverLessonArtifact({
    root:x.root,studentId:x.studentId,lessonDate:'2026-10-07'
  });
  assert.equal(artifact.date,'2026-10-07');
  assert.equal(artifact.title,'Графики №12');
  assert.equal(artifact.summary,'Описание из HTML');
  assert.deepEqual(artifact.materials,{html:'07.10.26.html'});
});

test('metadata builder records only applied mappings and keeps KTP coverage provenance',()=>{
  const x=repoFixture();
  const value=intent(x.studentId);
  value.ktpMatches.push({
    ktpId:'ktp-003',
    confidence:'probable',
    decision:'review',
    coverage:'partial',
    reason:'Нужно проверить.'
  });
  value.outcomes.push({
    competencyId:'text_15',
    evidenceAnchor:'text-model',
    relation:'touched',
    confidence:'exact',
    decision:'ignore',
    masteryClaim:null,
    basis:'Смежная тема.'
  });
  const artifact=discoverLessonArtifact({
    root:x.root,studentId:x.studentId,lessonDate:value.lessonDate
  });
  const metadata=buildLessonMetadata({
    studentId:x.studentId,artifact,intent:value
  });
  assert.deepEqual(metadata.ktpRefs,['ktp-002']);
  assert.deepEqual(metadata.ktpCoverage,[{ktpId:'ktp-002',coverage:'complete'}]);
  assert.deepEqual(metadata.outcomes.map(item=>item.competencyId),['func_17']);
  assert.equal(metadata.summary,'Описание из HTML');
});

test('metadata validation requires ktpCoverage to match ktpRefs exactly',()=>{
  const x=repoFixture();
  const artifact=discoverLessonArtifact({
    root:x.root,studentId:x.studentId,lessonDate:'2026-10-07'
  });
  const metadata=buildLessonMetadata({
    studentId:x.studentId,artifact,intent:intent(x.studentId)
  });
  metadata.ktpCoverage[0].ktpId='ktp-003';
  assert.throws(
    ()=>validateLessonMetadataData(metadata,{studentId:x.studentId,plan:x.plan}),
    /must cover exactly the same KTP IDs as ktpRefs/
  );
});

test('KTP state machine supports partial then complete across lessons',()=>{
  const x=repoFixture();
  const first=applyKtpPublication({
    state:x.state,
    plan:x.plan,
    lessonDate:'2026-10-07',
    actualSummary:'Первая часть.',
    matches:[{ktpId:'ktp-002',coverage:'partial'}]
  }).state;
  assert.equal(first.records['ktp-002'].status,'in_progress');
  assert.equal(first.records['ktp-002'].coverage,'partial');
  assert.equal('actualDate' in first.records['ktp-002'],false);

  const second=applyKtpPublication({
    state:first,
    plan:x.plan,
    lessonDate:'2026-10-14',
    actualSummary:'Завершение.',
    matches:[{ktpId:'ktp-002',coverage:'complete'}]
  }).state;
  assert.equal(second.records['ktp-002'].status,'done');
  assert.equal(second.records['ktp-002'].actualDate,'2026-10-14');
  assert.deepEqual(second.records['ktp-002'].lessonRefs,['2026-10-07','2026-10-14']);
});

test('completed KTP item never regresses during later review',()=>{
  const x=repoFixture();
  const after=applyKtpPublication({
    state:x.state,
    plan:x.plan,
    lessonDate:'2026-10-21',
    actualSummary:'Повторение.',
    matches:[{ktpId:'ktp-001',coverage:'partial'}]
  }).state.records['ktp-001'];
  assert.equal(after.status,'done');
  assert.equal(after.coverage,'complete');
  assert.equal(after.actualDate,'2026-09-30');
  assert.equal(after.actualSummary,'Первый урок.');
  assert.deepEqual(after.lessonRefs,['2026-09-30','2026-10-21']);
});

test('one lesson can update several KTP items independently',()=>{
  const x=repoFixture();
  const result=applyKtpPublication({
    state:x.state,
    plan:x.plan,
    lessonDate:'2026-10-07',
    actualSummary:'Комбинированный урок.',
    matches:[
      {ktpId:'ktp-002',coverage:'complete'},
      {ktpId:'ktp-003',coverage:'partial'}
    ]
  }).state;
  assert.equal(result.records['ktp-002'].status,'done');
  assert.equal(result.records['ktp-003'].status,'in_progress');
  assert.equal(result.records['ktp-003'].coverage,'partial');
});

test('mastery publication applies exact assessed claims and preserves higher levels',()=>{
  const initial={
    version:1,
    studentId:'test_student',
    updated:'2026-09-30',
    levels:{
      text_15:{
        level:4,
        sourcePath:'site/data/seed.json',
        sourceKind:'teacher-mastery',
        basis:'Подтверждено преподавателем.'
      }
    }
  };
  const result=applyMasteryPublication({
    state:initial,
    lessonDate:'2026-10-07',
    sourcePath:'site/data/lessons/2026-10-07.lesson.json',
    outcomes:[
      {
        competencyId:'func_17',
        relation:'assessed',
        masteryClaim:{
          level:3,
          confidence:'exact',
          basis:'Самостоятельная проверка.'
        }
      },
      {
        competencyId:'text_15',
        relation:'assessed',
        masteryClaim:{
          level:2,
          confidence:'exact',
          basis:'Более низкая оценка одного урока.'
        }
      },
      {
        competencyId:'ignored',
        relation:'practiced',
        masteryClaim:null
      }
    ]
  });

  assert.equal(result.state.updated,'2026-10-07');
  assert.equal(result.state.levels.func_17.level,3);
  assert.equal(result.state.levels.func_17.sourceKind,'lesson-assessment');
  assert.equal(result.state.levels.text_15.level,4);
  assert.deepEqual(result.preservedDowngrades,[{
    competencyId:'text_15',
    existingLevel:4,
    claimedLevel:2
  }]);
});

test('equal mastery claim is idempotent and does not rewrite provenance',()=>{
  const entry={
    level:3,
    sourcePath:'site/data/lessons/2026-10-01.lesson.json',
    sourceKind:'lesson-assessment',
    basis:'Ранее подтверждено.'
  };
  const initial={
    version:1,
    studentId:'test_student',
    updated:'2026-10-01',
    levels:{func_17:entry}
  };
  const result=applyMasteryPublication({
    state:initial,
    lessonDate:'2026-10-07',
    sourcePath:'site/data/lessons/2026-10-07.lesson.json',
    outcomes:[{
      competencyId:'func_17',
      relation:'assessed',
      masteryClaim:{
        level:3,
        confidence:'exact',
        basis:'Повторная проверка.'
      }
    }]
  });
  assert.deepEqual(result.state,initial);
  assert.deepEqual(result.changes,{});
});

test('registry derivation preserves Stage 04 enrichment on canonical outcomes',()=>{
  const source=registrySource([{
    date:'2026-10-07',
    ktpRefs:['ktp-002'],
    href:'07.10.26.html',
    title:'Графики №12',
    navTitle:'Графики',
    navSubtitle:'чтение графика',
    summary:'Описание',
    topics:['графики'],
    outcomes:[{
      competencyId:'func_17',
      evidenceAnchor:'graph-model',
      relation:'practiced',
      label:'Чтение графика',
      level:3,
      tone:'good',
      practiceDisposition:'generator'
    }],
    materials:{html:'07.10.26.html'}
  }]);
  const metadata={
    version:1,
    studentId:'test_student',
    date:'2026-10-07',
    title:'Графики №12',
    summary:'Описание',
    topics:['графики'],
    ktpRefs:['ktp-002'],
    ktpCoverage:[{ktpId:'ktp-002',coverage:'complete'}],
    outcomes:[{
      competencyId:'func_17',
      evidenceAnchor:'graph-model',
      relation:'practiced',
      masteryClaim:null
    }],
    materials:{html:'07.10.26.html'}
  };

  const result=deriveRegistrySource({source,metadata});
  assert.equal(result.record.outcomes.length,1);
  assert.deepEqual(result.record.outcomes[0],{
    competencyId:'func_17',
    evidenceAnchor:'graph-model',
    relation:'practiced',
    label:'Чтение графика',
    level:3,
    tone:'good',
    practiceDisposition:'generator'
  });
});

test('registry is derived from metadata while preserving navigation labels',()=>{
  const x=repoFixture();
  const metadata={
    version:1,studentId:x.studentId,date:'2026-09-30',
    title:'Новое полное название',summary:'Новая сводка.',
    topics:['формулы'],ktpRefs:['ktp-001'],
    ktpCoverage:[{ktpId:'ktp-001',coverage:'complete'}],
    outcomes:[{
      competencyId:'text_15',evidenceAnchor:'old-anchor',relation:'practiced',masteryClaim:null
    }],
    materials:{html:'30.09.26.html'}
  };
  const before=fs.readFileSync(path.join(x.site,'lesson-registry.js'),'utf8');
  const result=deriveRegistrySource({source:before,metadata});
  assert.equal(result.record.title,'Новое полное название');
  assert.equal(result.record.navTitle,'Формулы');
  assert.equal(result.record.navSubtitle,'Первый урок.');
  assert.ok(result.changed);
});

test('publication plan builds all candidates in memory and performs zero writes',()=>{
  const x=repoFixture();
  const statePath=path.join(x.site,'data','ktp-state.json');
  const registryPath=path.join(x.site,'lesson-registry.js');
  const metadataPath=path.join(x.metadataDir,'2026-10-07.lesson.json');
  const beforeState=fs.readFileSync(statePath,'utf8');
  const beforeRegistry=fs.readFileSync(registryPath,'utf8');

  const result=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });

  assert.equal(result.executable,true);
  assert.deepEqual(result.reviewItems,[]);
  assert.deepEqual(result.conflicts,[]);
  assert.deepEqual(
    result.writes.map(item=>[item.kind,item.path]),
    [
      ['create','students/test_student/site/data/lessons/2026-10-07.lesson.json'],
      ['update','students/test_student/site/data/ktp-state.json'],
      ['update','students/test_student/site/lesson-registry.js']
    ]
  );
  assert.equal(result.candidates.metadata.ktpCoverage[0].coverage,'complete');
  assert.equal(result.candidates.state.records['ktp-002'].status,'done');
  assert.equal(fs.existsSync(metadataPath),false);
  assert.equal(fs.readFileSync(statePath,'utf8'),beforeState);
  assert.equal(fs.readFileSync(registryPath,'utf8'),beforeRegistry);
});

test('review mappings make the publication plan non-executable',()=>{
  const x=repoFixture();
  const value=intent(x.studentId);
  value.ktpMatches[0].decision='review';
  value.ktpMatches[0].confidence='probable';
  const result=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:value
  });
  assert.equal(result.executable,false);
  assert.equal(result.reviewItems.length,1);
  assert.deepEqual(result.candidates.metadata.ktpRefs,[]);
});

test('an identical publication rerun is idempotent',()=>{
  const x=repoFixture();
  const first=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  applyPlanForTest(x.root,first);
  validateStudentPackage({root:x.root,studentId:x.studentId});

  const second=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  assert.equal(second.executable,true);
  assert.deepEqual(second.conflicts,[]);
  assert.deepEqual(second.writes,[]);
});

test('semantic republish changes are reported as a conflict',()=>{
  const x=repoFixture();
  const first=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  applyPlanForTest(x.root,first);
  validateStudentPackage({root:x.root,studentId:x.studentId});

  const changed=intent(x.studentId);
  changed.ktpMatches[0].coverage='partial';
  const second=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:changed
  });
  assert.equal(second.executable,false);
  assert.equal(second.conflicts[0].type,'existing-publication-contribution');
});

test('publication contribution equality ignores presentation fields but detects semantic changes',()=>{
  const left={
    ktpCoverage:[{ktpId:'ktp-002',coverage:'complete'}],
    outcomes:[{competencyId:'func_17',evidenceAnchor:'graph-model',relation:'practiced',masteryClaim:null}],
    title:'A'
  };
  const right={...structuredClone(left),title:'B'};
  assert.equal(samePublicationContribution(left,right),true);
  right.ktpCoverage[0].coverage='partial';
  assert.equal(samePublicationContribution(left,right),false);
});
