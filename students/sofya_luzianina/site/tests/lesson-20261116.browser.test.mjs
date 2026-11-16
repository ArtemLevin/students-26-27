import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../');
const site='/students/sofya_luzianina/site/';
const chromium=['chromium','google-chrome','chromium-browser','google-chrome-stable']
  .map(name=>spawnSync('which',[name],{encoding:'utf8'}))
  .find(result=>result.status===0)?.stdout.trim();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('Sofya lesson publication intent is valid and publisher accepts dry-run',()=>{
  const command=spawnSync(process.execPath,[
    'scripts/publish-lesson.mjs','sofya_luzianina','16.11.26','--intent',
    'students/sofya_luzianina/16.11.26.intent.json','--dry-run'
  ],{cwd:root,encoding:'utf8',timeout:40_000});
  assert.equal(command.status,0,'Publisher dry-run failed: '+command.stderr);
  const plan=JSON.parse(command.stdout);
  assert.equal(plan.architecture,'v2');
  assert.equal(plan.dryRun,true);
  assert.equal(plan.executable,true,'Publication plan must be executable');
  assert.deepEqual(plan.reviewItems,[],'Publication intent needs manual review');
  assert.deepEqual(plan.conflicts,[],'Publication has conflicts');
  assert.ok(
    plan.changedFiles.some(p=>p.endsWith('2026-11-16.lesson.json'))||
      fs.existsSync(path.join(root,'students/sofya_luzianina/site/data/lessons/2026-11-16.lesson.json')),
    'Publisher must either create or retain canonical metadata on repeat dry-run'
  );
});




test('canonical Sofya 16 November lesson publication has registry, KTP and evidence parity',()=>{
  const dir=path.join(root,'students/sofya_luzianina/site');
  const lesson=JSON.parse(fs.readFileSync(path.join(dir,'data/lessons/2026-11-16.lesson.json'),'utf8'));
  const state=JSON.parse(fs.readFileSync(path.join(dir,'data/ktp-state.json'),'utf8'));
  const registry=fs.readFileSync(path.join(dir,'lesson-registry.js'),'utf8');
  const html=fs.readFileSync(path.join(dir,'16.11.26.html'),'utf8');
  assert.equal(lesson.studentId,'sofya_luzianina');
  assert.equal(lesson.date,'2026-11-16');
  assert.equal(lesson.materials.html,'16.11.26.html');
  assert.equal(lesson.materials.lab,'16.11.26-lab.html');
  assert.deepEqual(lesson.ktpRefs,['ktp-002','ktp-003','ktp-004','ktp-005']);
  for(const id of lesson.ktpRefs){
    assert.equal(state.records[id].status,'in_progress',id);
    assert.equal(state.records[id].coverage,'partial',id);
    assert.deepEqual(state.records[id].lessonRefs,['2026-11-16'],id);
  }
  assert.equal(state.records['ktp-001'].status,'planned','Uncovered KTP must remain planned');
  for(const outcome of lesson.outcomes){
    assert.equal(outcome.masteryClaim,null,'No unverified mastery');
    assert.equal(outcome.relation,'practiced');
    assert.ok(html.includes('id="'+outcome.evidenceAnchor+'"'),'Missing evidence anchor');
  }
  assert.equal((registry.match(/"date": "2026-11-16"/g)||[]).length,1,'Lesson registry must contain exactly one dated entry');
});
