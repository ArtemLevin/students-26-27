import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROOT} from '../inventory-students.mjs';
import {inspectLegacyLearningState} from '../legacy/inspect-learning-state.mjs';
import {createLegacySandbox,executeLegacySource} from '../legacy/sandbox.mjs';
import {parseArgs as parseInspectArgs} from '../inspect-legacy-state.mjs';

function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function fixture(studentId='demo_student'){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'legacy-state-'));
  const site=path.join(root,'students',studentId,'site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'dashboard.js'),'export {};');
  write(path.join(site,'lesson-registry.js'),'export const LESSONS=[];');
  return {root,studentId,site};
}
function catalog(ids=['a','b']){
  return `window.COMPETENCY_MAP_DATA={groups:[{id:'g',name:'Group',items:${JSON.stringify(ids.map(id=>({id,title:id.toUpperCase()})))} }]};\n`;
}

test('literal teacherSeed becomes repository mastery and preserves explicit zero',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog());
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherSeed={a:2,b:0};window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();\n"
  );
  const report=inspectLegacyLearningState(x);
  assert.equal(report.catalog.count,2);
  assert.equal(report.automaticEligible,true);
  assert.deepEqual(
    report.mastery.resolved.map(item=>[item.competencyId,item.level,item.sourceKind]),
    [['a',2,'teacher-seed'],['b',0,'teacher-seed']]
  );
});

test('teacherMastery explicitly overrides computed teacherSeed provenance',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog());
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherMastery={a:3};const lessons=[{ids:['a','b']}];const teacherSeed={};for(const lesson of lessons)for(const id of lesson.ids)teacherSeed[id]=2;Object.assign(teacherSeed,teacherMastery);window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();\n"
  );
  const report=inspectLegacyLearningState(x);
  const a=report.mastery.resolved.find(item=>item.competencyId==='a');
  const b=report.mastery.resolved.find(item=>item.competencyId==='b');
  assert.equal(a.level,3);
  assert.equal(a.sourceKind,'teacher-mastery');
  assert.equal(a.sourceSymbol,'teacherMastery');
  assert.equal(b.level,2);
  assert.equal(b.sourceKind,'teacher-seed');
  assert.equal(report.mastery.conflicts.length,0);
});

test('baselineLevels transported through teacherSeed are treated as an alias, not duplicate mastery',()=>{
  const x=fixture();
  write(
    path.join(x.site,'competency-map-data.js'),
    "(()=>{const groups=[{id:'g',items:[{id:'a',title:'A'},{id:'b',title:'B'}]}];const baselineLevels={a:2,b:0};window.COMPETENCY_MAP_DATA={groups,baselineLevels};})();\n"
  );
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const data=window.COMPETENCY_MAP_DATA;window.STUDENT_COMPETENCE_CONFIG={teacherSeed:data.baselineLevels};})();\n"
  );
  const report=inspectLegacyLearningState(x);
  assert.equal(report.mastery.claims.length,2);
  assert.equal(report.diagnostics.aliases.length,1);
  assert.equal(report.diagnostics.aliases[0].targetKind,'baseline-levels');
  assert.ok(report.mastery.resolved.every(item=>item.sourceKind==='baseline-levels'));
});

test('mastery-authority wrapper is indirect when it reuses dashboard-data levels',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog(['a']));
  write(
    path.join(x.site,'dashboard-data.js'),
    "(()=>{const levels={a:3};window.__teacherLevels=levels;})();\n"
  );
  write(
    path.join(x.site,'mastery-authority.js'),
    "(()=>{const teacherLevels=window.__teacherLevels||{};window.__authoritySeen=teacherLevels;})();\n"
  );
  const report=inspectLegacyLearningState(x);
  assert.equal(report.mastery.claims.length,1);
  assert.equal(report.mastery.resolved[0].sourceKind,'dashboard-data');
  assert.equal(report.diagnostics.indirectSources.length,1);
  assert.equal(report.diagnostics.indirectSources[0].sourceKind,'mastery-authority');
});

test('empty stage04 mastery source is valid and does not invent claims',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog(['a']));
  write(path.join(x.site,'stage04-mastery.js'),'export const stage04Mastery={};\n');
  const report=inspectLegacyLearningState(x);
  assert.equal(report.mastery.claims.length,0);
  assert.equal(report.mastery.resolved.length,0);
  assert.equal(report.automaticEligible,true);
});

test('dynamically constructed baselineLevels are extracted after execution',()=>{
  const x=fixture();
  write(
    path.join(x.site,'competency-map-data.js'),
    "(()=>{const groups=[{id:'g',items:[{id:'a',title:'A'},{id:'b',title:'B'}]}];const baselineLevels=Object.fromEntries(groups.flatMap(g=>g.items.map(item=>[item.id,0])));baselineLevels.a=2;window.CUSTOM_COMPETENCY_DATA={groups,baselineLevels};})();\n"
  );
  const report=inspectLegacyLearningState(x);
  assert.deepEqual(
    report.mastery.resolved.map(item=>[item.competencyId,item.level]),
    [['a',2],['b',0]]
  );
  assert.equal(report.catalog.count,2);
});

test('different authoritative levels create a conflict instead of taking max',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog(['a']));
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherSeed={a:2};window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();\n"
  );
  write(path.join(x.site,'stage04-mastery.js'),'export const stage04Mastery={a:3};\n');
  const report=inspectLegacyLearningState(x);
  assert.equal(report.automaticEligible,false);
  assert.equal(report.mastery.resolved.length,0);
  assert.equal(report.mastery.conflicts.length,1);
  assert.deepEqual(
    report.mastery.conflicts[0].claims.map(item=>item.level).sort(),
    [2,3]
  );
});

test('equal independent claims resolve once while retaining secondary provenance',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog(['a']));
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherSeed={a:2};window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();\n"
  );
  write(path.join(x.site,'stage04-mastery.js'),'export const stage04Mastery={a:2};\n');
  const report=inspectLegacyLearningState(x);
  assert.equal(report.automaticEligible,true);
  assert.equal(report.mastery.resolved.length,1);
  assert.equal(report.mastery.resolved[0].sourceKind,'stage04-mastery');
  assert.equal(report.mastery.resolved[0].alsoDeclaredBy.length,1);
});

test('mastery IDs absent from catalog are reported as orphan claims',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog(['a']));
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherSeed={missing_skill:2};window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();\n"
  );
  const report=inspectLegacyLearningState(x);
  assert.equal(report.automaticEligible,false);
  assert.equal(report.diagnostics.orphanClaims.length,1);
  assert.equal(report.diagnostics.orphanClaims[0].competencyId,'missing_skill');
});

test('embedded legacyUrl catalog is extracted from inline groups without using item levels as mastery',()=>{
  const x=fixture();
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherSeed={a:2};window.STUDENT_COMPETENCE_CONFIG={teacherSeed,legacyUrl:'legacy.html'};})();\n"
  );
  write(
    path.join(x.site,'legacy.html'),
    "<!doctype html><script>const groups=[{id:'g',items:[{id:'a',title:'A',level:4},{id:'b',title:'B',level:3}]}];</script>"
  );
  const report=inspectLegacyLearningState(x);
  assert.equal(report.catalog.count,2);
  assert.equal(report.mastery.claims.length,1);
  assert.equal(report.mastery.resolved[0].competencyId,'a');
  assert.equal(report.mastery.resolved[0].level,2);
  assert.equal(report.catalog.sourcePath,'site/legacy.html');
});

test('sandbox hides host process, require and fetch and disables string code generation',()=>{
  const sandbox=createLegacySandbox();
  executeLegacySource({
    sandbox,
    label:'security-fixture.js',
    source:"window.__security={processType:typeof process,requireType:typeof require,fetchType:typeof fetch,now:Date.now(),random:Math.random()};"
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.window.__security)),
    {
      processType:'undefined',
      requireType:'undefined',
      fetchType:'undefined',
      now:Date.parse('2026-10-01T00:00:00Z'),
      random:0.5
    }
  );
  assert.throws(
    ()=>executeLegacySource({
      sandbox,
      label:'codegen-fixture.js',
      source:"Function('return 1')();"
    }),
    /Code generation from strings disallowed/
  );
});

test('inspection is deterministic across repeated runs',()=>{
  const x=fixture();
  write(path.join(x.site,'competency-map-data.js'),catalog(['a']));
  write(
    path.join(x.site,'competence-config.js'),
    "(()=>{const teacherSeed={a:2};window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();\n"
  );
  assert.deepEqual(
    inspectLegacyLearningState(x),
    inspectLegacyLearningState(x)
  );
});

test('inspect CLI parser is read-only and explicit',()=>{
  const parsed=parseInspectArgs(['demo_student','--json']);
  assert.equal(parsed.studentId,'demo_student');
  assert.equal(parsed.json,true);
  assert.throws(()=>parseInspectArgs([]),/studentId is required/);
  assert.throws(()=>parseInspectArgs(['a','b']),/Unexpected argument/);
});

test('real Kirill legacy source format preserves explicit teacherMastery overrides and is migration-eligible',()=>{
  const x=fixture('kirill_legacy_fixture');
  for(const name of ['competency-map-data.js','competence-config.js']){
    write(
      path.join(x.site,name),
      fs.readFileSync(
        path.join(ROOT,'students','kirill_zinoviev','site',name),
        'utf8'
      )
    );
  }
  const report=inspectLegacyLearningState({root:x.root,studentId:x.studentId});
  const item=report.mastery.resolved.find(entry=>entry.competencyId==='fractions_16');
  assert.ok(report.catalog?.count>0);
  assert.equal(item?.level,3);
  assert.equal(item?.sourceKind,'teacher-mastery');
  assert.equal(report.mastery.conflicts.length,0);
  assert.equal(report.diagnostics.orphanClaims.length,0);
  assert.equal(report.automaticEligible,true);
});

test('real Volodia competence-config format detects baselineLevels→teacherSeed alias',()=>{
  const x=fixture('volodia_legacy_fixture');
  write(
    path.join(x.site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={storageNamespace:'volodia-oge-physics-v1',groups:[{id:'g',name:'G',items:[{id:'kin_01',title:'Kinematics'}]}],baselineLevels:{kin_01:2},evidence:{},topicMaterials:{}};\n"
  );
  write(
    path.join(x.site,'competence-config.js'),
    fs.readFileSync(
      path.join(ROOT,'students','volodia_khachaturian','site','competence-config.js'),
      'utf8'
    )
  );
  const report=inspectLegacyLearningState({root:x.root,studentId:x.studentId});
  assert.equal(report.catalog?.count,1);
  assert.ok(report.diagnostics.aliases.some(item=>item.targetKind==='baseline-levels'));
  assert.equal(report.mastery.conflicts.length,0);
});

test('real Nikol legacy sources resolve dashboard-data mastery and indirect authority after v2 migration',()=>{
  const x=fixture('nikol_legacy_fixture');
  for(const name of ['dashboard-data.js','mastery-authority.js','index-original.html']){
    write(
      path.join(x.site,name),
      fs.readFileSync(
        path.join(ROOT,'students','nikol_sarkisyants','site',name),
        'utf8'
      )
    );
  }
  const report=inspectLegacyLearningState({root:x.root,studentId:x.studentId});
  assert.equal(report.catalog?.count,284);
  assert.equal(report.mastery.resolved.length,103);
  assert.ok(report.mastery.resolved.every(item=>item.sourceKind==='dashboard-data'));
  assert.ok(report.diagnostics.indirectSources.some(item=>item.sourceKind==='mastery-authority'));
  assert.equal(report.mastery.conflicts.length,0);
  assert.deepEqual(report.diagnostics.orphanClaims,[]);
  assert.equal(report.automaticEligible,true);
});

test('real Sofya legacy sources resolve their embedded competency catalog and stay migration-eligible',()=>{
  const x=fixture('sofya_legacy_fixture');
  for(const name of ['competence-config.js','index-19.08.26-base.html']){
    write(
      path.join(x.site,name),
      fs.readFileSync(
        path.join(ROOT,'students','sofya_kalney','site',name),
        'utf8'
      )
    );
  }
  const report=inspectLegacyLearningState({root:x.root,studentId:x.studentId});
  assert.equal(report.catalog?.count,324);
  assert.equal(report.mastery.resolved.length,29);
  assert.equal(report.mastery.conflicts.length,0);
  assert.deepEqual(report.diagnostics.orphanClaims,[]);
  assert.equal(report.automaticEligible,true);
});


test('real Timofey legacy sources apply the runtime EGE-2027 catalog transform and stay migration-eligible',()=>{
  const x=fixture('timofey_legacy_fixture');
  for(const name of ['competence-config.js','dashboard.js','index-legacy.html']){
    write(
      path.join(x.site,name),
      fs.readFileSync(
        path.join(ROOT,'students','timofey','site',name),
        'utf8'
      )
    );
  }
  const report=inspectLegacyLearningState({root:x.root,studentId:x.studentId});
  const ids=new Set(report.catalog?.ids||[]);
  assert.ok(report.catalog?.count>0);
  assert.ok(report.mastery.resolved.length>0);
  assert.equal(report.mastery.conflicts.length,0);
  assert.deepEqual(report.diagnostics.orphanClaims,[]);
  for(const id of [
    'ege2027_t17_analysis',
    'ege2027_t17_constraints',
    'ege2027_t17_interpretation',
    'ege2027_t17_optimization',
    'ege2027_t17_relations',
    'ege2027_t17_variables'
  ])assert.equal(ids.has(id),true,id);
  assert.ok(
    report.diagnostics.catalogTransforms.some(item=>item.transform==='ege-profile-2027')
  );
  assert.equal(report.automaticEligible,true);
});
