
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
  fs.writeFileSync(path.join(site,'lesson-registry.js'),'export const LESSONS=[];\n');
  fs.writeFileSync(path.join(site,'competency-map-data.js'),'window.COMPETENCY_MAP_DATA={};\n');
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
