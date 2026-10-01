import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateStudentMigrationManifest} from '../manifest.mjs';

function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function fixture({seedLevel=2,stage04=null,seedId='skill_a'}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-mastery-'));
  const studentId='demo_student';
  const site=path.join(root,'students',studentId,'site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'dashboard.js'),'export {};');
  write(path.join(site,'lesson-registry.js'),'export const LESSONS=[];');
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'core',items:[{id:'skill_a',title:'Skill A'},{id:'skill_b',title:'Skill B'}]}]};"
  );
  write(
    path.join(site,'competence-config.js'),
    `(()=>{const teacherSeed={${JSON.stringify(seedId)}:${seedLevel}};window.STUDENT_COMPETENCE_CONFIG={teacherSeed};})();`
  );
  if(stage04!==null){
    write(
      path.join(site,'stage04-mastery.js'),
      `export const stage04Mastery={skill_a:${stage04}};\n`
    );
  }
  write(
    path.join(site,'30.09.26.html'),
    '<section id="skill-a-evidence"></section><section id="skill-b-evidence"></section>'
  );
  return {root,studentId,site};
}
function manifest({
  preserve=true,
  preservedLevel=2,
  sourceKind='teacher-seed',
  sourcePath='site/competence-config.js',
  competencyId='skill_a'
}={}){
  return {
    version:1,
    studentId:'demo_student',
    identity:{studentName:'Demo Student',program:'Demo Program'},
    sourceArchitecture:'modern-shared',
    planning:{mode:'rolling',ktpExtraction:null},
    lessonMappings:[
      {lessonDate:'2026-09-30',ktpMatches:[]}
    ],
    competencyMappings:[
      {
        lessonDate:'2026-09-30',
        competencyId:'skill_a',
        evidenceAnchor:'skill-a-evidence',
        relation:'practiced',
        masteryClaim:null,
        confidence:'exact',
        basis:'Direct lesson evidence.'
      }
    ],
    preserveMastery:preserve?[{
      competencyId,
      level:preservedLevel,
      sourcePath,
      sourceKind,
      confidence:'exact',
      basis:'Explicit repository mastery.'
    }]:[],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
}

test('manifest mastery exactly matching extracted repository authority is eligible',()=>{
  const x=fixture();
  const report=validateStudentMigrationManifest({
    root:x.root,
    manifest:manifest()
  });
  assert.equal(report.automaticEligible,true);
  assert.deepEqual(report.reviewItems,[]);
  assert.deepEqual(report.legacyLearningState,{
    automaticEligible:true,
    catalogCount:2,
    resolvedMastery:1,
    masteryConflicts:0,
    orphanClaims:0,
    aliases:0,
    indirectSources:0,
    warnings:0
  });
});

test('every resolved legacy mastery level must be preserved',()=>{
  const x=fixture();
  assert.throws(
    ()=>validateStudentMigrationManifest({
      root:x.root,
      manifest:manifest({preserve:false})
    }),
    /missing preserved mastery for skill_a at level 2/
  );
});

test('manifest cannot change repository mastery level during migration',()=>{
  const x=fixture();
  assert.throws(
    ()=>validateStudentMigrationManifest({
      root:x.root,
      manifest:manifest({preservedLevel:3})
    }),
    /does not match an extracted repository mastery claim/
  );
});

test('manifest sourceKind and sourcePath must identify a real extracted claim',()=>{
  const x=fixture();
  assert.throws(
    ()=>validateStudentMigrationManifest({
      root:x.root,
      manifest:manifest({sourceKind:'baseline-levels'})
    }),
    /does not match an extracted repository mastery claim/
  );

  const wrong=manifest({sourcePath:'site/competency-map-data.js'});
  assert.throws(
    ()=>validateStudentMigrationManifest({root:x.root,manifest:wrong}),
    /does not match an extracted repository mastery claim/
  );
});

test('equal duplicate claims allow either real provenance while preserving one level',()=>{
  const x=fixture({stage04:2});
  const report=validateStudentMigrationManifest({
    root:x.root,
    manifest:manifest()
  });
  assert.equal(report.automaticEligible,true);
  assert.equal(report.legacyLearningState.resolvedMastery,1);
  assert.equal(report.legacyLearningState.masteryConflicts,0);
});

test('legacy mastery conflict must be declared explicitly and cannot be silently preserved',()=>{
  const x=fixture({stage04:3});
  assert.throws(
    ()=>validateStudentMigrationManifest({
      root:x.root,
      manifest:manifest({preserve:false})
    }),
    /legacy mastery conflict for skill_a must be declared as a mastery ambiguity/
  );

  const value=manifest({preserve:false});
  value.ambiguities.push({
    kind:'mastery',
    reference:'skill_a',
    reason:'teacherSeed and Stage 04 disagree; manual review is required.'
  });
  const report=validateStudentMigrationManifest({root:x.root,manifest:value});
  assert.equal(report.automaticEligible,false);
  assert.ok(report.reviewItems.some(item=>item.type==='legacy-mastery-conflict'));
});

test('manifest cannot choose one side of an unresolved mastery conflict',()=>{
  const x=fixture({stage04:3});
  const value=manifest();
  value.ambiguities.push({
    kind:'mastery',
    reference:'skill_a',
    reason:'Conflicting repository authorities.'
  });
  assert.throws(
    ()=>validateStudentMigrationManifest({root:x.root,manifest:value}),
    /cannot preserve unresolved legacy mastery conflict for skill_a/
  );
});

test('orphan mastery claim requires explicit ambiguity and blocks automatic migration',()=>{
  const x=fixture({seedId:'missing_skill'});
  const value=manifest({preserve:false});
  assert.throws(
    ()=>validateStudentMigrationManifest({root:x.root,manifest:value}),
    /orphan legacy mastery claim missing_skill must be declared as an ambiguity/
  );

  value.ambiguities.push({
    kind:'mastery',
    reference:'missing_skill',
    reason:'Legacy authority references an ID absent from the catalog.'
  });
  const report=validateStudentMigrationManifest({root:x.root,manifest:value});
  assert.equal(report.automaticEligible,false);
  assert.equal(report.legacyLearningState.orphanClaims,1);
  assert.ok(report.reviewItems.some(item=>item.type==='legacy-mastery-orphan'));
});

test('extracted legacy catalog validates competency mappings without external competencyIds',()=>{
  const x=fixture();
  const value=manifest();
  value.competencyMappings[0].competencyId='unknown_skill';
  assert.throws(
    ()=>validateStudentMigrationManifest({root:x.root,manifest:value}),
    /unknown competencyId unknown_skill in extracted legacy catalog/
  );
});

test('explicit zero mastery is subject to the same preservation completeness rule',()=>{
  const x=fixture({seedLevel:0});
  const valid=manifest({preservedLevel:0});
  assert.equal(
    validateStudentMigrationManifest({root:x.root,manifest:valid}).automaticEligible,
    true
  );

  assert.throws(
    ()=>validateStudentMigrationManifest({
      root:x.root,
      manifest:manifest({preserve:false})
    }),
    /missing preserved mastery for skill_a at level 0/
  );
});
