import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

const root=process.cwd();
const site=path.join(root,'students','anna_bannova','site');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const readJson=name=>JSON.parse(read(name));

test('Anna Bannova satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root,studentId:'anna_bannova'});
  assert.equal(result.contractVersion,2);
  assert.equal(result.planningMode,'fixed');
  assert.equal(result.ktpLessons,174);
  assert.equal(result.lessonMetadata,1);
});

test('Anna dashboard inline module is syntactically valid JavaScript',()=>{
  const html=read('index.html');
  const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,'module script not found');
  const temp=path.join(os.tmpdir(),'anna-dashboard-'+process.pid+'.mjs');
  fs.writeFileSync(temp,source);
  const result=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});
  fs.rmSync(temp,{force:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Anna dashboard keeps canonical learning state outside index.html',()=>{
  const html=read('index.html');
  const contract=JSON.parse(fs.readFileSync(path.join(root,'students','anna_bannova','student-contract.json'),'utf8'));
  const mastery=readJson('data/mastery-state.json');
  assert.equal(contract.competencies.mastery,'site/data/mastery-state.json');
  assert.deepEqual(mastery.levels,{});
  assert.match(html,/student-contract\.json/);
  assert.match(html,/contract\.competencies\.mastery/);
  assert.doesNotMatch(html,/baselineLevels\s*=/);
  assert.doesNotMatch(html,/mastery[^\n]{0,80}localStorage\.setItem/i);
});

test('Anna dashboard student-facing shell contains no architecture jargon',()=>{
  const html=read('index.html');
  const visibleShell=html.split('<script type="module">')[0];
  assert.doesNotMatch(visibleShell,/canonical|mastery|lesson registry|Student Platform|\bheatmap\b|\bcompetency\b|\bevidence\b/i);
  assert.match(visibleShell,/Круговая карта компетенций/);
  assert.match(visibleShell,/Лёвин Артём Александрович эксклюзивно для Анны Банновой/);
});

test('Anna dashboard preserves map accessibility and mobile map priority',()=>{
  const html=read('index.html');
  assert.match(html,/id="radialMap"[^>]+role="group"/);
  assert.match(html,/path\.setAttribute\('tabindex','-1'\)/);
  assert.match(html,/ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1/);
  assert.match(html,/\.map-panel\{order:1\}\.catalog\{order:2\}/);
  assert.match(html,/@media print/);
});

test('Anna KTP plan remains complete and calendar-consistent',()=>{
  const plan=readJson('data/ktp-plan.json');
  assert.equal(plan.lessons.length,174);
  assert.equal(plan.lessons[0].plannedDate,'2026-10-02');
  assert.equal(plan.lessons.at(-1).plannedDate,'2028-05-28');
  for(const [index,lesson] of plan.lessons.entries()){
    assert.equal(lesson.order,index+1);
    assert.equal(lesson.id,'ktp-'+String(index+1).padStart(3,'0'));
    const day=new Date(lesson.plannedDate+'T00:00:00Z').getUTCDay();
    assert.ok(day===0||day===5,lesson.id+' must be Friday or Sunday');
  }
});
