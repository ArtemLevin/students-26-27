import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../..');
const student='nikol_sarkisyants';
const date='05.11.26';
const intent='students/nikol_sarkisyants/site/data/lesson-publication-intents/2026-11-05.json';
const run=(cmd,args,cwd)=>execFileSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:3*1024*1024,timeout:120000});

test('05.11 publication is equivalent to the transactional v2 publisher',t=>{
 let isGit=false;
 try{isGit=run('git',['rev-parse','--is-inside-work-tree'],repo).trim()==='true'}catch{}
 if(!isGit){t.skip('Repository git metadata is required for isolated transactional publication verification');return}
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nikol-20261105-'));
 const checkout=path.join(temp,'repo');
 let installed=false;
 try{
  run('git',['worktree','add','--detach',checkout,'HEAD'],repo);
  installed=true;
  const args=['scripts/publish-lesson.mjs',student,date,'--intent',intent];
  const dry=JSON.parse(run(process.execPath,[...args,'--dry-run'],checkout));
  assert.equal(dry.architecture,'v2');
  assert.equal(dry.executable,true);
  assert.deepEqual(dry.reviewItems,[]);
  assert.deepEqual(dry.conflicts,[]);
  const result=JSON.parse(run(process.execPath,args,checkout));
  assert.equal(result.architecture,'v2');
  assert.equal(result.rolledBack,false);
  const drift=run('git',['status','--porcelain'],checkout).trim();
  assert.equal(drift,'','Publisher would change committed files: '+drift);
 }finally{
  if(installed){
   try{run('git',['worktree','remove','--force',checkout],repo)}catch{}
  }
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
