import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildMigrationSnapshot} from '../snapshot.mjs';
import {
  executeMigrationTransaction,
  StaleMigrationPlanError
} from '../transaction.mjs';

function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'migration-tx-'));
  const studentId='demo_student';
  const studentRoot=path.join(root,'students',studentId);
  write(path.join(studentRoot,'site','index.html'),'legacy index\n');
  write(path.join(studentRoot,'site','design.json'),'{}\n');
  write(path.join(studentRoot,'site','dashboard.js'),'export {};\n');
  write(path.join(studentRoot,'state.txt'),'before\n');
  write(
    path.join(root,'pipeline','migration','baseline.json'),
    JSON.stringify({
      version:1,measuredAt:'2026-10-01',total:1,minV2:0,maxNonV2:1,
      byArchitecture:{'modern-shared':1}
    },null,2)+'\n'
  );
  const manifestPath='pipeline/migration/manifests/demo_student.json';
  write(path.join(root,...manifestPath.split('/')),JSON.stringify({
    version:1,studentId
  },null,2)+'\n');
  return {root,studentId,studentRoot,manifestPath};
}
function planFor(x,writes){
  const snapshot=buildMigrationSnapshot({
    root:x.root,
    studentId:x.studentId,
    manifestPath:x.manifestPath,
    writePaths:writes.map(item=>item.path)
  });
  return {
    version:1,
    operation:'student-migration',
    studentId:x.studentId,
    executable:true,
    reviewItems:[],
    conflicts:[],
    blockers:[],
    warnings:[],
    preconditions:snapshot.preconditions,
    writes,
    coverage:{complete:true},
    preservation:{
      protectedFiles:snapshot.protectedFiles,
      manifest:snapshot.manifest,
      baseline:snapshot.baseline
    }
  };
}
function tempRoots(root){
  return fs.readdirSync(root).filter(name=>name.startsWith('.student-tx-'));
}

test('migration transaction commits a guarded plan and returns verification',()=>{
  const x=fixture();
  const target='students/demo_student/student-contract.json';
  const plan=planFor(x,[{kind:'create',path:target,content:'{"version":2}\n'}]);
  const result=executeMigrationTransaction({
    root:x.root,
    plan,
    postflight:()=>({validated:true})
  });

  assert.equal(result.status,'applied');
  assert.equal(result.architecture,'v2');
  assert.equal(result.rolledBack,false);
  assert.deepEqual(result.changedFiles,[target]);
  assert.deepEqual(result.verification,{validated:true});
  assert.equal(
    fs.readFileSync(path.join(x.root,...target.split('/')),'utf8'),
    '{"version":2}\n'
  );
  assert.deepEqual(tempRoots(x.root),[]);
});

test('manifest or protected source drift makes the migration plan stale before writes',()=>{
  const x=fixture();
  const target='students/demo_student/student-contract.json';
  const plan=planFor(x,[{kind:'create',path:target,content:'{}\n'}]);
  fs.appendFileSync(
    path.join(x.root,...x.manifestPath.split('/')),
    '\n'
  );

  assert.throws(
    ()=>executeMigrationTransaction({
      root:x.root,
      plan,
      postflight:()=>({ok:true})
    }),
    error=>
      error instanceof StaleMigrationPlanError&&
      error.code==='STALE_MIGRATION_PLAN'
  );
  assert.equal(fs.existsSync(path.join(x.root,...target.split('/'))),false);
  assert.deepEqual(tempRoots(x.root),[]);
});

test('partial migration failure restores updates and removes newly created directories',()=>{
  const x=fixture();
  const state='students/demo_student/state.txt';
  const created='students/demo_student/site/data/lessons/new.json';
  const plan=planFor(x,[
    {kind:'update',path:state,content:'after\n'},
    {kind:'create',path:created,content:'{}\n'}
  ]);

  assert.throws(
    ()=>executeMigrationTransaction({
      root:x.root,
      plan,
      postflight:()=>({ok:true}),
      faultInjector:event=>{
        if(event.phase==='after-write'&&event.index===1){
          throw new Error('forced migration fault');
        }
      }
    }),
    /Migration changes were rolled back/
  );

  assert.equal(
    fs.readFileSync(path.join(x.root,...state.split('/')),'utf8'),
    'before\n'
  );
  assert.equal(fs.existsSync(path.join(x.root,...created.split('/'))),false);
  assert.equal(fs.existsSync(path.join(x.studentRoot,'site','data')),false);
  assert.deepEqual(tempRoots(x.root),[]);
});

test('postflight failure rolls the complete migration write set back byte-for-byte',()=>{
  const x=fixture();
  const state='students/demo_student/state.txt';
  const created='students/demo_student/student-contract.json';
  const before=fs.readFileSync(path.join(x.root,...state.split('/')));
  const plan=planFor(x,[
    {kind:'update',path:state,content:'after\n'},
    {kind:'create',path:created,content:'{}\n'}
  ]);

  assert.throws(
    ()=>executeMigrationTransaction({
      root:x.root,
      plan,
      postflight:()=>{throw new Error('forced postflight failure');}
    }),
    /forced postflight failure[\s\S]*rolled back/
  );

  assert.deepEqual(fs.readFileSync(path.join(x.root,...state.split('/'))),before);
  assert.equal(fs.existsSync(path.join(x.root,...created.split('/'))),false);
  assert.deepEqual(tempRoots(x.root),[]);
});
