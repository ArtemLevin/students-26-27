import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildV2PublicationPlan} from '../plan.mjs';
import {
  executeV2Publication,
  StalePublicationPlanError
} from '../transaction.mjs';
import {validateStudentPackage} from '../../contract.mjs';

function writeJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
function registrySource(lessons){
  return 'export const LESSONS='+JSON.stringify(lessons,null,2)+';\n';
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'p4-2b-'));
  const studentId='test_student';
  const studentRoot=path.join(root,'students',studentId);
  const site=path.join(studentRoot,'site');
  const metadataDir=path.join(site,'data','lessons');
  fs.mkdirSync(metadataDir,{recursive:true});

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
  const plan={
    version:1,
    studentId,
    programVersion:'test-v1',
    lessons:[
      {
        id:'ktp-001',order:1,plannedDate:'2026-09-30',
        stageId:'adapt',stage:'Адаптация',block:'Формулы',topic:'Формулы',
        content:'Формулы.',result:'Решает.',check:'Проверка.',homework:'ДЗ.',
        targetCompetencies:['text_15']
      },
      {
        id:'ktp-002',order:2,plannedDate:'2026-10-07',
        stageId:'adapt',stage:'Адаптация',block:'Графики',topic:'Графики',
        content:'Графики.',result:'Читает график.',check:'Проверка.',homework:'ДЗ.',
        targetCompetencies:['func_17']
      }
    ]
  };
  const state={
    version:1,
    studentId,
    programVersion:'test-v1',
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
    '<!doctype html><html><head><meta name="description" content="Графики"></head><body><h1>Графики №12</h1><section id="graph-model"></section></body></html>\n'
  );

  return {
    root,studentId,studentRoot,site,metadataDir,
    statePath:path.join(site,'data','ktp-state.json'),
    registryPath:path.join(site,'lesson-registry.js'),
    metadataPath:path.join(metadataDir,'2026-10-07.lesson.json'),
    htmlPath:path.join(site,'07.10.26.html')
  };
}
function intent(studentId='test_student'){
  return {
    version:1,
    studentId,
    lessonDate:'2026-10-07',
    topics:['графики'],
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
function snapshot(files){
  return new Map(files.map(file=>[
    file,
    fs.existsSync(file)?fs.readFileSync(file):null
  ]));
}
function assertSnapshot(before){
  for(const [file,bytes] of before){
    if(bytes===null){
      assert.equal(fs.existsSync(file),false,file+' must remain absent');
    }else{
      assert.ok(fs.existsSync(file),file+' must exist');
      assert.deepEqual(fs.readFileSync(file),bytes,file+' must be restored byte-for-byte');
    }
  }
}
function tempFiles(root){
  const found=[];
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);
      else if(entry.name.includes('.publish-'))found.push(full);
    }
  }
  walk(root);
  return found;
}

test('successful transaction commits metadata, KTP state and registry then passes postflight',()=>{
  const x=fixture();
  const plan=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  const result=executeV2Publication({root:x.root,plan});

  assert.deepEqual(result.changedFiles,plan.writes.map(item=>item.path));
  assert.equal(result.rolledBack,false);
  assert.ok(fs.existsSync(x.metadataPath));

  const state=JSON.parse(fs.readFileSync(x.statePath,'utf8'));
  assert.equal(state.records['ktp-002'].status,'done');
  assert.equal(state.records['ktp-002'].actualDate,'2026-10-07');

  const validated=validateStudentPackage({root:x.root,studentId:x.studentId});
  assert.equal(validated.lessonMetadata,2);
  assert.deepEqual(tempFiles(x.root),[]);
});

test('stale HTML precondition aborts before the first write',()=>{
  const x=fixture();
  const plan=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  const before=snapshot([x.metadataPath,x.statePath,x.registryPath]);
  fs.appendFileSync(x.htmlPath,'<!-- changed after plan -->\n');

  assert.throws(
    ()=>executeV2Publication({root:x.root,plan}),
    error=>error instanceof StalePublicationPlanError&&error.code==='STALE_PUBLICATION_PLAN'
  );
  assertSnapshot(before);
  assert.deepEqual(tempFiles(x.root),[]);
});

test('stale state precondition aborts before staging publication writes',()=>{
  const x=fixture();
  const plan=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  const external=JSON.parse(fs.readFileSync(x.statePath,'utf8'));
  external.updated='2026-10-01';
  writeJson(x.statePath,external);
  const expectedState=fs.readFileSync(x.statePath);
  const before=snapshot([x.metadataPath,x.registryPath]);

  assert.throws(
    ()=>executeV2Publication({root:x.root,plan}),
    /content changed since the publication plan was built/
  );
  assert.deepEqual(fs.readFileSync(x.statePath),expectedState);
  assertSnapshot(before);
  assert.deepEqual(tempFiles(x.root),[]);
});

test('failure after partial application rolls every target back byte-for-byte',()=>{
  const x=fixture();
  const plan=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  const before=snapshot([x.metadataPath,x.statePath,x.registryPath]);

  assert.throws(
    ()=>executeV2Publication({
      root:x.root,
      plan,
      faultInjector:event=>{
        if(event.phase==='after-write'&&event.index===1){
          throw new Error('forced partial-write failure');
        }
      }
    }),
    /Publication changes were rolled back/
  );

  assertSnapshot(before);
  assert.deepEqual(tempFiles(x.root),[]);
  validateStudentPackage({root:x.root,studentId:x.studentId});
});

test('postflight failure rolls back all committed targets',()=>{
  const x=fixture();
  const plan=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  const before=snapshot([x.metadataPath,x.statePath,x.registryPath]);

  assert.throws(
    ()=>executeV2Publication({
      root:x.root,
      plan,
      postflight:()=>{
        throw new Error('forced postflight failure');
      }
    }),
    /forced postflight failure[\s\S]*rolled back/
  );

  assertSnapshot(before);
  assert.deepEqual(tempFiles(x.root),[]);
  validateStudentPackage({root:x.root,studentId:x.studentId});
});

test('identical rerun is a validated no-op transaction',()=>{
  const x=fixture();
  const first=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  executeV2Publication({root:x.root,plan:first});

  const second=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:intent(x.studentId)
  });
  assert.deepEqual(second.writes,[]);

  const result=executeV2Publication({root:x.root,plan:second});
  assert.deepEqual(result.changedFiles,[]);
  assert.equal(result.rolledBack,false);
  assert.equal(result.verification.contractVersion,2);
});

test('non-executable plan is rejected without touching files',()=>{
  const x=fixture();
  const value=intent(x.studentId);
  value.ktpMatches[0].decision='review';
  value.ktpMatches[0].confidence='probable';
  const plan=buildV2PublicationPlan({
    root:x.root,studentId:x.studentId,intent:value
  });
  const before=snapshot([x.metadataPath,x.statePath,x.registryPath]);
  assert.equal(plan.executable,false);

  assert.throws(
    ()=>executeV2Publication({root:x.root,plan}),
    /plan is not executable/
  );
  assertSnapshot(before);
});
