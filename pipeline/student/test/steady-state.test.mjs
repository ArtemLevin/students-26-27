import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {auditStudentPlatformSteadyState} from '../audit-steady-state.mjs';

function writeJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'steady-state-'));
  fs.mkdirSync(path.join(root,'.github','workflows'),{recursive:true});
  for(const id of ['alpha','beta']){
    const site=path.join(root,'students',id,'site');
    fs.mkdirSync(site,{recursive:true});
    fs.writeFileSync(path.join(site,'index.html'),'<!doctype html>\n');
    writeJson(path.join(root,'students',id,'student-contract.json'),{version:2,studentId:id});
  }
  writeJson(path.join(root,'pipeline','migration','baseline.json'),{
    version:1,
    measuredAt:'2026-10-02',
    total:2,
    minV2:2,
    maxNonV2:0,
    byArchitecture:{v2:2}
  });
  return root;
}
const validator=()=>({contractVersion:2});

test('all-v2 repository with exact baseline passes steady-state audit',()=>{
  const root=fixture();
  const report=auditStudentPlatformSteadyState({root,packageValidator:validator});
  assert.equal(report.ok,true);
  assert.equal(report.v2,2);
  assert.equal(report.nonV2,0);
  assert.deepEqual(report.violations,[]);
});

test('legacy student is rejected in steady state',()=>{
  const root=fixture();
  fs.rmSync(path.join(root,'students','beta','student-contract.json'));
  const report=auditStudentPlatformSteadyState({root,packageValidator:validator});
  assert.equal(report.ok,false);
  assert.equal(report.nonV2,1);
  assert.ok(report.violations.some(item=>item.includes('requires every student to be v2')));
});

test('architecture baseline must exactly ratchet with all-v2 inventory',()=>{
  const root=fixture();
  writeJson(path.join(root,'pipeline','migration','baseline.json'),{
    version:1,total:2,minV2:1,maxNonV2:1,byArchitecture:{v2:1,'legacy-structured':1}
  });
  const report=auditStudentPlatformSteadyState({root,packageValidator:validator});
  assert.equal(report.ok,false);
  assert.ok(report.violations.some(item=>item.includes('minV2')));
  assert.ok(report.violations.some(item=>item.includes('maxNonV2')));
  assert.ok(report.violations.some(item=>item.includes('legacy-structured')));
});

test('branch-only migration workflows are forbidden on steady-state main',()=>{
  const root=fixture();
  fs.writeFileSync(
    path.join(root,'.github','workflows','student-migration-preflight.yml'),
    'name: temp\n'
  );
  const report=auditStudentPlatformSteadyState({root,packageValidator:validator});
  assert.equal(report.ok,false);
  assert.deepEqual(
    report.temporaryMigrationWorkflows,
    ['.github/workflows/student-migration-preflight.yml']
  );
});

test('v2 package failures fail the steady-state audit',()=>{
  const root=fixture();
  const report=auditStudentPlatformSteadyState({
    root,
    packageValidator:({studentId})=>{
      if(studentId==='beta')throw new Error('broken package');
      return {contractVersion:2};
    }
  });
  assert.equal(report.ok,false);
  assert.deepEqual(report.packageFailures,[{studentId:'beta',message:'broken package'}]);
});
