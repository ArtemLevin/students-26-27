import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const intent='students/daniil_khriastov/site/data/publication-intents/2026-11-11.json';
const script='scripts/publish-lesson.mjs';
const args=['daniil_khriastov','11.11.26','--intent',intent];
function run(extra=[]){
  return spawnSync(process.execPath,[script,...args,...extra],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
}
test('handoff: run canonical v2 publisher and expose generated artifacts from isolated CI checkout',()=>{
  const dry=run(['--dry-run']);
  assert.equal(dry.status,0,'dry-run: '+String(dry.stderr||dry.stdout));
  const plan=JSON.parse(dry.stdout);
  assert.equal(plan.architecture,'v2');
  assert.equal(plan.conflicts.length,0,'conflicts: '+JSON.stringify(plan.conflicts));
  assert.equal(plan.executable,true,'nonexecutable plan: '+dry.stdout);
  const apply=run();
  assert.equal(apply.status,0,'apply: '+String(apply.stderr||apply.stdout));
  const produced=JSON.parse(apply.stdout);
  assert.ok(produced.changedFiles.length>=2,'expected canonical generated files');
  for(const file of produced.changedFiles){
    assert.ok(file.startsWith('students/daniil_khriastov/site/'),'unexpected file '+file);
    const content=fs.readFileSync(path.join(root,file));
    console.log('DANIIL_PUBLICATION_ARTIFACT '+file+' '+content.toString('base64'));
  }
});
