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
  assert.equal(result.lessonMetadata,3);
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
  assert.deepEqual(LESSONS.map(item=>item.date),['2026-10-07','2026-09-30','2026-09-17']);
  assert.deepEqual(LESSONS[0].ktpRefs,['ktp-002']);
  assert.deepEqual(LESSONS[1].ktpRefs,['ktp-001']);
  for(const lesson of LESSONS){
    assert.ok(fs.existsSync(path.join(site,lesson.href)),lesson.href);
  }
});

test('dashboard and competency evidence expose the KTP route',()=>{
  const index=read('index.html');
  const baseline=read('competency-map-baseline.js');
  const map=read('competency-map.js');
  assert.match(index,/href="ktp\.html"/);
  assert.match(index,/ktp\.html\?lesson=ktp-002/);
  assert.match(index,/07\.10\.26\.html/);
  assert.match(index,/competency-map-baseline\.js\?v=20261007-1/);
  assert.match(baseline,/ktp:\s*'ktp\.html\?lesson=ktp-001'/);
  assert.match(baseline,/ktp:\s*'ktp\.html\?lesson=ktp-002'/);
  assert.match(baseline,/data\.updated = '07\.10\.2026'/);
  assert.match(baseline,/func_08:\s*'linear'/);
  assert.match(baseline,/func_10:\s*'hyperbola'/);
  assert.match(map,/Открыть в КТП/);
});

test('07.10 graph lesson preserves source-backed math and robust interaction hooks',()=>{
  const html=read('07.10.26.html');
  for(const anchor of ['method','linear','intersection','parabola','hyperbola']){
    assert.match(html,new RegExp("id=[\\\"']"+anchor+"[\\\"']"));
  }
  assert.doesNotMatch(html,/<mfenced\b/);
  assert.match(html,/aria-labelledby="labSvgTitle labSvgDesc"/);
  assert.match(html,/id="labHandleA"/);
  assert.match(html,/id="labHandleB"/);
  assert.match(html,/const state=\{k:1\.5,b:1,probeX:2/);
  assert.match(html,/<mtext>tg<\/mtext><mi>α<\/mi>/);
  assert.match(html,/ответ на конкретный вопрос/);
  assert.match(html,/aria-controls="labPanelGuide"/);

  const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,'07.10 inline script not found');
  const temp=path.join(os.tmpdir(),'grisha-071026-'+process.pid+'.js');
  fs.writeFileSync(temp,source);
  const result=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});
  fs.rmSync(temp,{force:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('07.10 interactive lab is research-oriented and keeps one model state',()=>{
  const html=read('07.10.26.html');
  assert.match(html,/data-line-lab/);
  assert.match(html,/id="labSvg"/);
  assert.match(html,/data-lab-mode="free"/);
  assert.match(html,/data-lab-mode="guide"/);
  assert.match(html,/data-lab-mode="compare"/);
  assert.match(html,/data-lab-mode="predict"/);
  assert.match(html,/data-lab-mode="challenge"/);
  for(const scenario of ['rise','fall','flat','origin','trap']){
    assert.match(html,new RegExp('data-lab-scenario="'+scenario+'"'));
  }
  assert.match(html,/const state=\{k:1\.5,b:1,probeX:2/);
  assert.match(html,/const scenarios=\{/);
  assert.match(html,/const predictCases=\{/);
  assert.match(html,/const challenges=\[/);
  assert.match(html,/function segment\(k,b\)/);
  assert.match(html,/function renderLab\(\)/);
  assert.match(html,/addEventListener\('pointerdown'/);
  assert.match(html,/requestAnimationFrame\(tick\)/);
  assert.match(html,/prefers-reduced-motion: reduce/);
  assert.match(html,/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(html,/aria-valuetext','b = '/);
  assert.match(html,/Δy=2k/);
  assert.match(html,/k=Δy\/Δx/);
});

