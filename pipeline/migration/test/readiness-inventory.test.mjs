import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildMigrationReadinessInventory,
  migrationReadinessMarkdown,
  parseArgs
} from '../readiness-inventory.mjs';

function root(){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'migration-readiness-'));
  fs.mkdirSync(path.join(value,'students'),{recursive:true});
  return value;
}
function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function scaffold(repo,id,{ktp=false,v2=false,seed='a:2',catalogIds=['a']}={}){
  const base=path.join(repo,'students',id),site=path.join(base,'site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(path.join(site,'design.json'),'{}');
  if(v2){
    write(path.join(base,'student-contract.json'),'{}');
    return;
  }
  if(ktp)write(path.join(site,'ktp.html'),'<html></html>');
  write(
    path.join(site,'competency-map-data.js'),
    `window.COMPETENCY_MAP_DATA={groups:[{id:'g',name:'G',items:${JSON.stringify(catalogIds.map(skill=>({id:skill,title:skill})))} }]};\n`
  );
  if(seed!==null){
    write(
      path.join(site,'competence-config.js'),
      `window.STUDENT_COMPETENCE_CONFIG={teacherSeed:{${seed}}};\n`
    );
  }
}

test('readiness inventory omits v2 and marks clean structured source ready',()=>{
  const repo=root();
  scaffold(repo,'ready_student');
  scaffold(repo,'already_v2',{v2:true});

  const report=buildMigrationReadinessInventory({root:repo});
  assert.equal(report.total,1);
  assert.deepEqual(report.byStatus,{ready:1,review:0,blocked:0});
  const item=report.students[0];
  assert.equal(item.studentId,'ready_student');
  assert.equal(item.architecture,'legacy-structured');
  assert.equal(item.status,'ready');
  assert.equal(item.planningMode,'rolling');
  assert.equal(item.competencies,1);
  assert.equal(item.mastery,1);
  assert.deepEqual(item.reasons,[]);
});

test('orphan mastery is blocked and reported explicitly',()=>{
  const repo=root();
  scaffold(repo,'orphan_student',{seed:'missing_skill:2'});

  const report=buildMigrationReadinessInventory({root:repo});
  const item=report.students[0];
  assert.equal(item.status,'blocked');
  assert.equal(item.orphanClaims,1);
  assert.ok(item.reasons.includes('orphan mastery claims: 1'));
});

test('legacy KTP cabinet is classified for fixed planning',()=>{
  const repo=root();
  scaffold(repo,'ktp_student',{ktp:true});

  const item=buildMigrationReadinessInventory({root:repo}).students[0];
  assert.equal(item.architecture,'legacy-ktp');
  assert.equal(item.planningMode,'fixed');
  assert.equal(item.status,'ready');
});

test('missing design scaffold blocks readiness before manifest work',()=>{
  const repo=root();
  const site=path.join(repo,'students','broken','site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'g',items:[{id:'a',title:'A'}]}]};"
  );

  const item=buildMigrationReadinessInventory({root:repo}).students[0];
  assert.equal(item.status,'blocked');
  assert.ok(item.scaffoldBlockers.includes('site/design.json is missing'));
});

test('readiness markdown is deterministic and exposes actionable status',()=>{
  const repo=root();
  scaffold(repo,'b_ready');
  scaffold(repo,'a_blocked',{seed:'missing_skill:2'});
  const report=buildMigrationReadinessInventory({root:repo});
  const markdown=migrationReadinessMarkdown(report);

  assert.deepEqual(report.students.map(item=>item.studentId),['a_blocked','b_ready']);
  assert.match(markdown,/Ready: \*\*1\*\*/);
  assert.match(markdown,/Blocked: \*\*1\*\*/);
  assert.match(markdown,/a_blocked \| legacy-structured \| blocked/);
  assert.match(markdown,/b_ready \| legacy-structured \| ready/);
});

test('readiness CLI parser supports report outputs',()=>{
  const parsed=parseArgs([
    '--json',
    '--root','/tmp/repo',
    '--json-output','readiness.json',
    '--markdown-output','readiness.md'
  ]);
  assert.equal(parsed.json,true);
  assert.equal(parsed.root,path.resolve('/tmp/repo'));
  assert.equal(parsed.jsonOutput,'readiness.json');
  assert.equal(parsed.markdownOutput,'readiness.md');
  assert.throws(()=>parseArgs(['--unknown']),/Unknown option/);
});
