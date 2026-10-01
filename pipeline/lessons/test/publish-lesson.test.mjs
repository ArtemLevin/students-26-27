import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {publishLesson,normalizeLessonDate,replaceRegistryImportVersion,parseArgs} from '../../../scripts/publish-lesson.mjs';
import {verifyPublishedPlan} from '../../student/publish/verify.mjs';

function tempRepo({registry=true,indexLink=true,design=true,roster=true}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'lesson-publish-'));
  const site=path.join(root,'students','demo_student','site');
  fs.mkdirSync(site,{recursive:true});
  fs.mkdirSync(path.join(root,'students','demo_student','tex_docs'),{recursive:true});
  fs.mkdirSync(path.join(root,'students','demo_student','pdf_docs'),{recursive:true});
  fs.mkdirSync(path.join(root,'design-system'),{recursive:true});
  fs.writeFileSync(path.join(site,'index.html'),`<!doctype html><a href="${indexLink?'29.09.26.html':'28.09.26.html'}">lesson</a>`);
  if(design)fs.writeFileSync(path.join(site,'design.json'),'{}\n');
  if(roster)fs.writeFileSync(path.join(root,'design-system','STUDENT_ROSTER.md'),'| Student | Composition | Accent | Density | Geometry | Typography | Motion |\n|---|---|---|---|---|---|---|\n| demo_student | cartographer | ochre | airy | circular | editorial | calm |\n');
  fs.writeFileSync(path.join(site,'29.09.26.html'),'<!doctype html><html><head><meta name="description" content="Краткое описание урока"></head><body><h1>Новый урок</h1></body></html>');
  fs.writeFileSync(path.join(root,'students','demo_student','tex_docs','29.09.26.tex'),'lesson');
  fs.writeFileSync(path.join(root,'students','demo_student','pdf_docs','29.09.26.pdf'),'pdf');
  if(registry){
    fs.writeFileSync(path.join(site,'28.09.26.html'),'<!doctype html><h1>Старый урок</h1>');
    fs.writeFileSync(path.join(site,'lesson-registry.js'),"export const RECENT_LIMIT=3;\nexport const ARCHIVE_PAGE_SIZE=10;\nexport const LESSONS=[\n{date:'2026-09-28',href:'28.09.26.html',title:'Старый урок',navTitle:'Старый урок',navSubtitle:'старое',summary:'старое',topics:[],outcomes:[],materials:{}}\n];\n");
    fs.writeFileSync(path.join(site,'dashboard.js'),"import {LESSONS} from './lesson-registry.js?v=20260928';\nconsole.log(LESSONS.length);\n");
  }
  return {root,site};
}


function writeJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}

function v2Repo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'lesson-publish-v2-'));
  const student='demo_student';
  const studentRoot=path.join(root,'students',student);
  const site=path.join(studentRoot,'site');
  const metadataDir=path.join(site,'data','lessons');
  fs.mkdirSync(metadataDir,{recursive:true});
  fs.mkdirSync(path.join(root,'design-system'),{recursive:true});

  fs.writeFileSync(path.join(site,'index.html'),'<!doctype html><main>v2</main>\n');
  fs.writeFileSync(path.join(site,'design.json'),'{}\n');
  fs.writeFileSync(
    path.join(root,'design-system','STUDENT_ROSTER.md'),
    '| Student | Composition | Accent | Density | Geometry | Typography | Motion |\n|---|---|---|---|---|---|---|\n| demo_student | cartographer | ochre | airy | circular | editorial | calm |\n'
  );

  const contract={
    version:2,
    studentId:student,
    studentName:'Demo Student',
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
    studentId:student,
    programVersion:'test-v1',
    lessons:[
      {
        id:'ktp-001',order:1,plannedDate:'2026-09-29',
        stageId:'adapt',stage:'Адаптация',block:'Графики',topic:'Графики',
        content:'Графики.',result:'Читает график.',check:'Проверка.',homework:'ДЗ.',
        targetCompetencies:['func_17']
      }
    ]
  };
  const state={
    version:1,
    studentId:student,
    programVersion:'test-v1',
    updated:'2026-09-28',
    records:{
      'ktp-001':{
        status:'planned',
        scheduledDate:'2026-09-29',
        lessonRefs:[]
      }
    }
  };
  const intent={
    version:1,
    studentId:student,
    lessonDate:'2026-09-29',
    topics:['графики'],
    actualSummary:'Разобраны графики.',
    ktpMatches:[{
      ktpId:'ktp-001',
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
      basis:'Навык отрабатывался на занятии.'
    }],
    warnings:[]
  };

  writeJson(path.join(studentRoot,'student-contract.json'),contract);
  writeJson(path.join(site,'data','ktp-plan.json'),plan);
  writeJson(path.join(site,'data','ktp-state.json'),state);
  fs.writeFileSync(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'func',items:[{id:'func_17'}]}]};\n"
  );
  fs.writeFileSync(path.join(site,'mastery-authority.js'),'export const mastery={};\n');
  fs.writeFileSync(path.join(site,'lesson-registry.js'),'export const LESSONS=[];\n');
  fs.writeFileSync(
    path.join(site,'29.09.26.html'),
    '<!doctype html><html><head><meta name="description" content="Графики"></head><body><h1>Графики</h1><section id="graph-model"></section></body></html>\n'
  );
  const intentPath=path.join(root,'29.09.26.publish.json');
  writeJson(intentPath,intent);

  return {
    root,student,site,intent,intentPath,
    metadataPath:path.join(metadataDir,'2026-09-29.lesson.json'),
    statePath:path.join(site,'data','ktp-state.json'),
    registryPath:path.join(site,'lesson-registry.js')
  };
}

test('normalizes public lesson date formats',()=>{
  assert.deepEqual(normalizeLessonDate('29.09.26'),{iso:'2026-09-29',base:'29.09.26',cacheVersion:'20260929'});
  assert.deepEqual(normalizeLessonDate('2026-09-29'),{iso:'2026-09-29',base:'29.09.26',cacheVersion:'20260929'});
  assert.throws(()=>normalizeLessonDate('31.02.26'),/Invalid lesson date/);
});

test('registry-backed publication upserts lesson and cache version idempotently',async()=>{
  const {root,site}=tempRepo();
  const first=await publishLesson({root,student:'demo_student',date:'29.09.26',verifyChanges:false});
  assert.equal(first.mode,'registry-upsert');
  assert.deepEqual(first.changedFiles.sort(),['students/demo_student/site/dashboard.js','students/demo_student/site/lesson-registry.js']);
  const registry=fs.readFileSync(path.join(site,'lesson-registry.js'),'utf8');
  assert.match(registry,/"date": "2026-09-29"/);
  assert.match(registry,/"pdf": "\.\.\/pdf_docs\/29\.09\.26\.pdf"/);
  assert.match(registry,/"tex": "\.\.\/tex_docs\/29\.09\.26\.tex"/);
  assert.match(fs.readFileSync(path.join(site,'dashboard.js'),'utf8'),/lesson-registry\.js\?v=20260929/);
  const second=await publishLesson({root,student:'demo_student',date:'2026-09-29',verifyChanges:false});
  assert.deepEqual(second.changedFiles,[]);
});

test('existing lesson metadata survives a publication rerun',async()=>{
  const {root,site}=tempRepo();
  fs.writeFileSync(path.join(site,'lesson-registry.js'),"export const RECENT_LIMIT=3;\nexport const ARCHIVE_PAGE_SIZE=10;\nexport const LESSONS=[\n{date:'2026-09-29',href:'29.09.26.html',title:'Новый урок',navTitle:'Коротко',navSubtitle:'Подзаголовок',summary:'Сводка',topics:['Тема'],outcomes:[{label:'Навык',practiceDisposition:'manual'}],materials:{}},\n{date:'2026-09-28',href:'28.09.26.html',title:'Старый урок',navTitle:'Старый',navSubtitle:'старое',summary:'старое',topics:[],outcomes:[],materials:{}}\n];\n");
  await publishLesson({root,student:'demo_student',date:'29.09.26',verifyChanges:false});
  const registry=fs.readFileSync(path.join(site,'lesson-registry.js'),'utf8');
  assert.match(registry,/"label": "Навык"/);
  assert.match(registry,/"practiceDisposition": "manual"/);
  assert.match(registry,/"navTitle": "Коротко"/);
});

test('dry-run reports registry changes without writing them',async()=>{
  const {root,site}=tempRepo();
  const before=fs.readFileSync(path.join(site,'lesson-registry.js'),'utf8');
  const result=await publishLesson({root,student:'demo_student',date:'29.09.26',verifyChanges:false,dryRun:true});
  assert.equal(result.dryRun,true);
  assert.ok(result.changedFiles.includes('students/demo_student/site/lesson-registry.js'));
  assert.equal(fs.readFileSync(path.join(site,'lesson-registry.js'),'utf8'),before);
});

test('bespoke publication requires index registration',async()=>{
  const missing=tempRepo({registry:false,indexLink:false});
  await assert.rejects(()=>publishLesson({root:missing.root,student:'demo_student',date:'29.09.26',verifyChanges:false}),/index\.html must link to 29\.09\.26\.html/);
  const linked=tempRepo({registry:false,indexLink:true});
  const result=await publishLesson({root:linked.root,student:'demo_student',date:'29.09.26',verifyChanges:false});
  assert.equal(result.mode,'bespoke-index-verified');
  assert.deepEqual(result.changedFiles,[]);
});

test('publication refuses an incomplete student scaffold',async()=>{
  const {root}=tempRepo({design:false});
  await assert.rejects(()=>publishLesson({root,student:'demo_student',date:'29.09.26',verifyChanges:false}),/New students must be created with node scripts\/create-student\.mjs/);
});

test('verification failure rolls back registry and dashboard writes',async()=>{
  const {root,site}=tempRepo();
  const registryPath=path.join(site,'lesson-registry.js'),dashboardPath=path.join(site,'dashboard.js');
  const beforeRegistry=fs.readFileSync(registryPath,'utf8'),beforeDashboard=fs.readFileSync(dashboardPath,'utf8');
  await assert.rejects(()=>publishLesson({root,student:'demo_student',date:'29.09.26'}),/Publication changes were rolled back/);
  assert.equal(fs.readFileSync(registryPath,'utf8'),beforeRegistry);
  assert.equal(fs.readFileSync(dashboardPath,'utf8'),beforeDashboard);
});

test('production CLI does not expose a verification bypass',()=>{
  assert.throws(()=>parseArgs(['demo_student','29.09.26','--no-verify']),/Unknown option: --no-verify/);
});

test('dashboard cache-buster rewrite accepts imports with or without a version',()=>{
  assert.equal(replaceRegistryImportVersion("import {LESSONS} from './lesson-registry.js';",'20260929'),"import {LESSONS} from './lesson-registry.js?v=20260929';");
  assert.equal(replaceRegistryImportVersion("import {LESSONS} from './lesson-registry.js?v=old';",'20260929'),"import {LESSONS} from './lesson-registry.js?v=20260929';");
  assert.throws(()=>replaceRegistryImportVersion("import './other.js';",'20260929'),/does not import/);
});

test('CLI parses --intent without changing legacy positional syntax',()=>{
  assert.deepEqual(
    parseArgs(['demo_student','29.09.26','--intent','intent.json','--dry-run']),
    {
      student:'demo_student',
      date:'29.09.26',
      intentPath:'intent.json',
      dryRun:true,
      verifyChanges:true,
      help:false
    }
  );
  assert.throws(
    ()=>parseArgs(['demo_student','29.09.26','--intent']),
    /--intent requires a file path/
  );
});

test('v2 dispatch fails closed when publication intent is missing',async()=>{
  const x=v2Repo();
  await assert.rejects(
    ()=>publishLesson({
      root:x.root,
      student:x.student,
      date:'29.09.26',
      dryRun:true
    }),
    /requires --intent <file>/
  );
  assert.equal(fs.existsSync(x.metadataPath),false);
});

test('v2 dry-run builds a transactional plan without writing files',async()=>{
  const x=v2Repo();
  const beforeState=fs.readFileSync(x.statePath,'utf8');
  const beforeRegistry=fs.readFileSync(x.registryPath,'utf8');

  const result=await publishLesson({
    root:x.root,
    student:x.student,
    date:'29.09.26',
    intentPath:'29.09.26.publish.json',
    dryRun:true
  });

  assert.equal(result.architecture,'v2');
  assert.equal(result.mode,'transactional-v2');
  assert.equal(result.executable,true);
  assert.ok(result.changedFiles.includes('students/demo_student/site/data/lessons/2026-09-29.lesson.json'));
  assert.equal(fs.existsSync(x.metadataPath),false);
  assert.equal(fs.readFileSync(x.statePath,'utf8'),beforeState);
  assert.equal(fs.readFileSync(x.registryPath,'utf8'),beforeRegistry);
});

test('v2 production dispatch executes the transaction engine with explicit intent',async()=>{
  const x=v2Repo();
  const result=await publishLesson({
    root:x.root,
    student:x.student,
    date:'2026-09-29',
    intentPath:'29.09.26.publish.json',
    v2Postflight:verifyPublishedPlan
  });

  assert.equal(result.architecture,'v2');
  assert.equal(result.mode,'transactional-v2');
  assert.equal(result.rolledBack,false);
  assert.ok(fs.existsSync(x.metadataPath));
  const state=JSON.parse(fs.readFileSync(x.statePath,'utf8'));
  assert.equal(state.records['ktp-001'].status,'done');
  assert.equal(state.records['ktp-001'].actualDate,'2026-09-29');
});

test('v2 dispatch rejects intent for a different lesson date before writes',async()=>{
  const x=v2Repo();
  x.intent.lessonDate='2026-09-30';
  writeJson(x.intentPath,x.intent);
  const beforeState=fs.readFileSync(x.statePath,'utf8');

  await assert.rejects(
    ()=>publishLesson({
      root:x.root,
      student:x.student,
      date:'29.09.26',
      intentPath:'29.09.26.publish.json',
      v2Postflight:verifyPublishedPlan
    }),
    /does not match requested lesson date/
  );

  assert.equal(fs.existsSync(x.metadataPath),false);
  assert.equal(fs.readFileSync(x.statePath,'utf8'),beforeState);
});

test('legacy publication ignores v2 dispatch and preserves the established workflow',async()=>{
  const {root}=tempRepo();
  const result=await publishLesson({
    root,
    student:'demo_student',
    date:'29.09.26',
    verifyChanges:false
  });
  assert.equal(result.architecture,'legacy');
  assert.equal(result.mode,'registry-upsert');
});
