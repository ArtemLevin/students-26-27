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
  assert.ok(plan.changedFiles.some(p=>p.endsWith('2026-11-16.lesson.json')),'Expected canonical lesson metadata');
});


