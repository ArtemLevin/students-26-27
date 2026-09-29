import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {publishLesson,normalizeLessonDate,replaceRegistryImportVersion} from '../../../scripts/publish-lesson.mjs';

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

test('dashboard cache-buster rewrite accepts imports with or without a version',()=>{
  assert.equal(replaceRegistryImportVersion("import {LESSONS} from './lesson-registry.js';",'20260929'),"import {LESSONS} from './lesson-registry.js?v=20260929';");
  assert.equal(replaceRegistryImportVersion("import {LESSONS} from './lesson-registry.js?v=old';",'20260929'),"import {LESSONS} from './lesson-registry.js?v=20260929';");
  assert.throws(()=>replaceRegistryImportVersion("import './other.js';",'20260929'),/does not import/);
});
