import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectStudent,inventoryStudents} from '../inventory-students.mjs';
import {buildMigrationPlan,parseArgs} from '../migrate-student.mjs';
import {evaluateArchitectureRatchet} from '../audit-ratchet.mjs';

function root(){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'student-migration-'));
  fs.mkdirSync(path.join(value,'students'),{recursive:true});
  return value;
}
function student(repo,id,files=[]){
  const base=path.join(repo,'students',id),site=path.join(base,'site');
  fs.mkdirSync(site,{recursive:true});
  for(const file of files){
    const full=path.join(base,file);
    fs.mkdirSync(path.dirname(full),{recursive:true});
    fs.writeFileSync(full,file.endsWith('.json')?'{}':'fixture');
  }
}

test('inventory classifies v2, shared, KTP and structured legacy cabinets',()=>{
  const repo=root();
  student(repo,'v2_student',['site/index.html','site/design.json','student-contract.json']);
  student(repo,'shared_student',['site/index.html','site/design.json','site/dashboard.js','site/lesson-registry.js']);
  student(repo,'ktp_student',['site/index.html','site/design.json','site/ktp.html']);
  student(repo,'structured_student',['site/index.html','site/design.json','site/competency-map-data.js']);

  assert.equal(inspectStudent(repo,'v2_student').architecture,'v2');
  assert.equal(inspectStudent(repo,'shared_student').architecture,'modern-shared');
  assert.equal(inspectStudent(repo,'ktp_student').architecture,'legacy-ktp');
  assert.equal(inspectStudent(repo,'structured_student').architecture,'legacy-structured');
  assert.equal(inventoryStudents(repo).summary.total,4);
});

test('migration planner is read-only and preserves existing assets',()=>{
  const repo=root();
  student(repo,'legacy',['site/index.html','site/design.json','site/ktp.html','site/30.09.26.html','tex_docs/30.09.26.tex','pdf_docs/30.09.26.pdf']);
  const plan=buildMigrationPlan({root:repo,studentId:'legacy'});
  assert.equal(plan.status,'ready');
  assert.equal(plan.automaticWrites,false);
  assert.equal(plan.recommendedPlanningMode,'fixed');
  assert.ok(plan.semanticTasks.some(item=>item.includes('extract the existing KTP')));
  assert.ok(plan.preserve.includes('existing PDF/TeX/images'));
});

test('v2 student migration is idempotent noop',()=>{
  const repo=root();
  student(repo,'modern',['site/index.html','site/design.json','student-contract.json']);
  const plan=buildMigrationPlan({root:repo,studentId:'modern'});
  assert.equal(plan.status,'noop');
  assert.deepEqual(plan.operations,[]);
});

test('missing scaffold files block migration',()=>{
  const repo=root();
  student(repo,'broken',['site/ktp.html']);
  const plan=buildMigrationPlan({root:repo,studentId:'broken'});
  assert.equal(plan.status,'blocked');
  assert.ok(plan.blockers.includes('site/index.html is missing'));
  assert.ok(plan.blockers.includes('site/design.json is missing'));
});

test('write migration requires explicit future implementation and dry-run is parsed',()=>{
  assert.equal(parseArgs(['alice','--dry-run']).dryRun,true);
  assert.throws(()=>parseArgs([]),/studentId is required/);
});

test('architecture ratchet rejects regressions and requires immediate baseline tightening',()=>{
  const baseline={version:1,minV2:1,maxNonV2:23};

  assert.equal(
    evaluateArchitectureRatchet({summary:{total:24,byArchitecture:{v2:1}}},baseline).ok,
    true
  );

  const regression=evaluateArchitectureRatchet(
    {summary:{total:25,byArchitecture:{v2:1}}},
    baseline
  );
  assert.equal(regression.ok,false);
  assert.ok(regression.violations.some(item=>item.includes('non-v2 count increased')));

  const untightened=evaluateArchitectureRatchet(
    {summary:{total:24,byArchitecture:{v2:2}}},
    baseline
  );
  assert.equal(untightened.ok,false);
  assert.ok(untightened.violations.some(item=>item.includes('baseline was not ratcheted')));

  const tightened=evaluateArchitectureRatchet(
    {summary:{total:24,byArchitecture:{v2:2}}},
    {version:1,minV2:2,maxNonV2:22}
  );
  assert.equal(tightened.ok,true);
});
