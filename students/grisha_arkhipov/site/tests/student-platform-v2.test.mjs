import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';
import {LESSONS} from '../lesson-registry.js';

const root=process.cwd();
const studentRoot=path.join(root,'students','grisha_arkhipov');
const site=path.join(studentRoot,'site');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const readJson=name=>JSON.parse(read(name));

test('Grigory is a valid Student Platform v2 package',()=>{
  const result=validateStudentPackage({root,studentId:'grisha_arkhipov'});
  assert.equal(result.contractVersion,2);
  assert.equal(result.planningMode,'fixed');
  assert.equal(result.ktpLessons,88);
  assert.equal(result.ktpRecords,88);
  assert.equal(result.lessonMetadata,2);
});

test('KTP state is repository-backed and first plan item links to the real lesson',()=>{
  const state=readJson('data/ktp-state.json');
  const first=state.records['ktp-001'];
  assert.equal(first.status,'done');
  assert.equal(first.actualDate,'2026-09-30');
  assert.equal(first.coverage,'complete');
  assert.deepEqual(first.lessonRefs,['2026-09-30']);

  const html=read('ktp.html');
  assert.match(html,/data\/ktp-plan\.json/);
  assert.match(html,/data\/ktp-state\.json/);
  assert.match(html,/lesson-registry\.js/);
  assert.doesNotMatch(html,/const LESSONS=\[\{/);
  assert.doesNotMatch(html,/localStorage\.setItem\(STORAGE/);
  assert.doesNotMatch(html,/teacherNote|dTeacherNote|actualWork|dActualWork|correction|dCorrection/);
});

test('KTP module script is syntactically valid JavaScript',()=>{
  const html=read('ktp.html');
  const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,'module script not found');
  const temp=path.join(os.tmpdir(),'grisha-ktp-'+process.pid+'.mjs');
  fs.writeFileSync(temp,source);
  const result=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});
  fs.rmSync(temp,{force:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('lesson registry covers every real Grigory lesson page and KTP mapping',()=>{
  assert.deepEqual(LESSONS.map(item=>item.date),['2026-09-30','2026-09-17']);
  assert.deepEqual(LESSONS[0].ktpRefs,['ktp-001']);
  for(const lesson of LESSONS){
    assert.ok(fs.existsSync(path.join(site,lesson.href)),lesson.href);
  }
});

test('dashboard and competency evidence expose the KTP route',()=>{
  const index=read('index.html');
  const baseline=read('competency-map-baseline.js');
  const map=read('competency-map.js');
  assert.match(index,/href="ktp\.html"/);
  assert.match(index,/ktp\.html\?lesson=ktp-001/);
  assert.match(baseline,/ktp:\s*'ktp\.html\?lesson=ktp-001'/);
  assert.match(map,/Открыть в КТП/);
});
