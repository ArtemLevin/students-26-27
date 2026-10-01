
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  discoverV2Students,
  validateStudentContractData,
  validateStudentPackage
} from '../contract.mjs';
import {validateAllStudentPackages} from '../validate.mjs';
import {validateLessonPublicationIntentData} from '../publication-contract.mjs';
import {preflightLessonPublication} from '../publish/preflight.mjs';

function writeJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'student-v2-'));
  const student='test_student';
  const base=path.join(root,'students',student);
  const site=path.join(base,'site');
  const metadataDir=path.join(site,'data','lessons');
  fs.mkdirSync(metadataDir,{recursive:true});
  fs.writeFileSync(path.join(site,'competency-map-data.js'),"window.COMPETENCY_MAP_DATA={groups:[{id:'text',items:[{id:'text_15'}]}]};\n");
  fs.writeFileSync(path.join(site,'mastery-authority.js'),'export const mastery={};\n');
  fs.writeFileSync(path.join(site,'30.09.26.html'),'<!doctype html><section id="border"></section>\n');
  fs.mkdirSync(path.join(base,'pdf_docs'),{recursive:true});
  fs.mkdirSync(path.join(base,'tex_docs'),{recursive:true});
  fs.writeFileSync(path.join(base,'pdf_docs','30.09.26.pdf'),'fixture');
  fs.writeFileSync(path.join(base,'tex_docs','30.09.26.tex'),'fixture');

  const contract={
    version:2,
    studentId:student,
    studentName:'Тестовый Ученик',
    program:'ЕГЭ, профильная математика',
    planning:{mode:'fixed',plan:'site/data/ktp-plan.json',state:'site/data/ktp-state.json'},
    lessons:{registry:'site/lesson-registry.js',metadataDir:'site/data/lessons'},
    competencies:{catalog:'site/competency-map-data.js',mastery:'site/mastery-authority.js'},
    practice:{config:null}
  };
  const plan={
    version:1,
    studentId:student,
    programVersion:'ege-test-v1',
    lessons:[{
      id:'ktp-001',order:1,plannedDate:'2026-09-30',
      stageId:'adapt',stage:'Адаптация',block:'Прикладные задачи',
      topic:'Формулы',content:'Чтение формул и ограничений.',
      result:'Решает прикладную модель.',check:'Незнакомая задача.',
      homework:'Четыре задачи.',targetCompetencies:['text_15']
    }]
  };
  const state={
    version:1,studentId:student,programVersion:'ege-test-v1',updated:'2026-10-01',
    records:{
      'ktp-001':{
        status:'done',scheduledDate:'2026-09-30',actualDate:'2026-09-30',
        coverage:'complete',actualSummary:'Формулы и ограничения.',
        lessonRefs:['2026-09-30']
      }
    }
  };
  const metadata={
    version:1,studentId:student,date:'2026-09-30',
    title:'Прикладные задачи',summary:'Формулы и ограничения.',
    topics:['формулы'],ktpRefs:['ktp-001'],
    outcomes:[{
      competencyId:'text_15',evidenceAnchor:'border',relation:'practiced',masteryClaim:null
    }],
    materials:{
      html:'30.09.26.html',
      pdf:'../pdf_docs/30.09.26.pdf',
      tex:'../tex_docs/30.09.26.tex'
    }
  };
  const registryLesson={
    date:metadata.date,
    href:metadata.materials.html,
    title:metadata.title,
    navTitle:metadata.title,
    navSubtitle:metadata.summary,
    summary:metadata.summary,
    topics:metadata.topics,
    ktpRefs:metadata.ktpRefs,
    outcomes:metadata.outcomes.map(({competencyId,evidenceAnchor,relation})=>({
      competencyId,evidenceAnchor,relation
    })),
    materials:metadata.materials
  };
  fs.writeFileSync(
    path.join(site,'lesson-registry.js'),
    'export const LESSONS='+JSON.stringify([registryLesson],null,2)+';\n'
  );
  writeJson(path.join(base,'student-contract.json'),contract);
  writeJson(path.join(site,'data','ktp-plan.json'),plan);
  writeJson(path.join(site,'data','ktp-state.json'),state);
  writeJson(path.join(metadataDir,'2026-09-30.lesson.json'),metadata);
  return {root,student,base,site,contract,plan,state,metadata};
}

test('valid v2 package passes strict cross-reference validation',()=>{
  const x=fixture();
  const result=validateStudentPackage({root:x.root,studentId:x.student});
  assert.equal(result.contractVersion,2);
  assert.equal(result.ktpLessons,1);
  assert.equal(result.ktpRecords,1);
  assert.equal(result.lessonMetadata,1);
});

test('contract paths cannot traverse outside the student directory',()=>{
  const x=fixture();
  const bad=structuredClone(x.contract);
  bad.planning.plan='../other/plan.json';
  assert.throws(()=>validateStudentContractData(bad,{studentId:x.student}),/must not traverse/);
});

test('public KTP state rejects private teacher fields',()=>{
  const x=fixture();
  const file=path.join(x.site,'data','ktp-state.json');
  const bad=structuredClone(x.state);
  bad.records['ktp-001'].teacherPrivateNote='private';
  writeJson(file,bad);
  assert.throws(()=>validateStudentPackage({root:x.root,studentId:x.student}),/forbids private field teacherPrivateNote/);
});

test('done KTP record requires actualDate and coverage',()=>{
  const x=fixture();
  const file=path.join(x.site,'data','ktp-state.json');
  const bad=structuredClone(x.state);
  delete bad.records['ktp-001'].actualDate;
  writeJson(file,bad);
  assert.throws(()=>validateStudentPackage({root:x.root,studentId:x.student}),/done requires actualDate/);
});

test('lesson metadata and KTP state must link bidirectionally',()=>{
  const x=fixture();
  const file=path.join(x.site,'data','ktp-state.json');
  const bad=structuredClone(x.state);
  bad.records['ktp-001'].lessonRefs=[];
  writeJson(file,bad);
  assert.throws(()=>validateStudentPackage({root:x.root,studentId:x.student}),/does not link back to lesson metadata/);
});

test('evidence anchor must exist in lesson HTML',()=>{
  const x=fixture();
  fs.writeFileSync(path.join(x.site,'30.09.26.html'),'<!doctype html><section id="other"></section>\n');
  assert.throws(()=>validateStudentPackage({root:x.root,studentId:x.student}),/evidence anchor #border is missing/);
});

test('validate-all discovers only v2 students during gradual migration',()=>{
  const x=fixture();
  fs.mkdirSync(path.join(x.root,'students','legacy_student','site'),{recursive:true});
  fs.writeFileSync(path.join(x.root,'students','legacy_student','site','index.html'),'legacy');
  assert.deepEqual(discoverV2Students(x.root),[x.student]);
  const report=validateAllStudentPackages({root:x.root});
  assert.equal(report.count,1);
  assert.equal(report.students[0].studentId,x.student);
});

function validIntent(student='test_student'){
  return {
    version:1,
    studentId:student,
    lessonDate:'2026-09-30',
    topics:['формулы'],
    actualSummary:'Формулы и ограничения.',
    ktpMatches:[{
      ktpId:'ktp-001',
      confidence:'exact',
      decision:'apply',
      coverage:'complete',
      reason:'Содержание урока совпадает с ожидаемым результатом пункта КТП.'
    }],
    outcomes:[{
      competencyId:'text_15',
      evidenceAnchor:'border',
      relation:'practiced',
      confidence:'exact',
      decision:'apply',
      masteryClaim:null,
      basis:'Навык отрабатывался на занятии; самостоятельная диагностика не заявлена.'
    }],
    warnings:[]
  };
}

test('lesson metadata competency IDs must exist in the catalog',()=>{
  const x=fixture();
  const file=path.join(x.site,'data','lessons','2026-09-30.lesson.json');
  const bad=structuredClone(x.metadata);
  bad.outcomes[0].competencyId='ghost_99';
  writeJson(file,bad);
  assert.throws(
    ()=>validateStudentPackage({root:x.root,studentId:x.student}),
    /competency ghost_99 is absent from the competency catalog/
  );
});

test('KTP target competency IDs must exist in the catalog',()=>{
  const x=fixture();
  const file=path.join(x.site,'data','ktp-plan.json');
  const bad=structuredClone(x.plan);
  bad.lessons[0].targetCompetencies=['ghost_99'];
  writeJson(file,bad);
  assert.throws(
    ()=>validateStudentPackage({root:x.root,studentId:x.student}),
    /target competency ghost_99 is absent from the competency catalog/
  );
});

test('lesson registry must remain a canonical projection of metadata',()=>{
  const x=fixture();
  fs.writeFileSync(
    path.join(x.site,'lesson-registry.js'),
    'export const LESSONS='+JSON.stringify([{
      date:'2026-09-30',
      href:'30.09.26.html',
      title:'Другая тема',
      summary:'Формулы и ограничения.',
      topics:['формулы'],
      ktpRefs:['ktp-001'],
      outcomes:[{competencyId:'text_15',evidenceAnchor:'border',relation:'practiced'}],
      materials:x.metadata.materials
    }])+';\n'
  );
  assert.throws(
    ()=>validateStudentPackage({root:x.root,studentId:x.student}),
    /does not match canonical lesson metadata projection/
  );
});

test('publication intent allows only exact mappings to be applied',()=>{
  const x=fixture();
  const bad=validIntent(x.student);
  bad.ktpMatches[0].confidence='probable';
  assert.throws(
    ()=>validateLessonPublicationIntentData(bad,{
      studentId:x.student,
      plan:x.plan,
      competencyIds:new Set(['text_15'])
    }),
    /apply requires exact confidence/
  );
});

test('publication intent rejects private teacher fields',()=>{
  const x=fixture();
  const bad=validIntent(x.student);
  bad.teacherNote='private';
  assert.throws(
    ()=>validateLessonPublicationIntentData(bad,{
      studentId:x.student,
      plan:x.plan,
      competencyIds:new Set(['text_15'])
    }),
    /forbids private field teacherNote/
  );
});

test('read-only publication preflight validates package, intent and evidence anchors',()=>{
  const x=fixture();
  const result=preflightLessonPublication({
    root:x.root,
    studentId:x.student,
    intent:validIntent(x.student)
  });
  assert.equal(result.architectureVersion,2);
  assert.deepEqual(result.appliedKtpIds,['ktp-001']);
  assert.deepEqual(result.appliedCompetencyIds,['text_15']);
  assert.deepEqual(result.writes,[]);
});

test('publication preflight fails before writes when an evidence anchor is absent',()=>{
  const x=fixture();
  const bad=validIntent(x.student);
  bad.outcomes[0].evidenceAnchor='missing-anchor';
  assert.throws(
    ()=>preflightLessonPublication({root:x.root,studentId:x.student,intent:bad}),
    /evidence anchor #missing-anchor is missing/
  );
});
