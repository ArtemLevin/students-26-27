import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validateStudentMigrationManifest,
  validateStudentMigrationManifestData
} from '../manifest.mjs';
import {parseArgs as parseValidatorArgs} from '../validate-manifest.mjs';

function root(){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'migration-manifest-'));
  fs.mkdirSync(path.join(value,'students'),{recursive:true});
  return value;
}
function write(file,content='fixture'){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function modernShared(repo,id='demo_student'){
  const base=path.join(repo,'students',id),site=path.join(base,'site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'dashboard.js'),'export {};');
  write(path.join(site,'lesson-registry.js'),'export const LESSONS=[];');
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'core',items:[{id:'text_15',title:'Text skill'}]}]};"
  );
  write(path.join(site,'30.09.26.html'),'<section id="border"></section>');
  write(path.join(site,'01.10.26.html'),'<section id="graph-model"></section>');
  write(path.join(site,'competence-config.js'),'window.STUDENT_COMPETENCE_CONFIG={teacherSeed:{text_15:2}};');
  return {base,site};
}
function legacyKtp(repo,id='ktp_student'){
  const base=path.join(repo,'students',id),site=path.join(base,'site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'ktp.html'),'<main>KTP</main>');
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'core',items:[{id:'ktp_skill',title:'KTP skill'}]}]};"
  );
  write(path.join(site,'30.09.26.html'),'<section id="task"></section>');
  return {base,site};
}
function manifest(studentId='demo_student'){
  return {
    version:1,
    studentId,
    identity:{studentName:'Demo Student',program:'Demo Program'},
    sourceArchitecture:'modern-shared',
    planning:{mode:'rolling',ktpExtraction:null},
    lessonMappings:[
      {lessonDate:'2026-09-30',ktpMatches:[]},
      {lessonDate:'2026-10-01',ktpMatches:[]}
    ],
    competencyMappings:[
      {
        lessonDate:'2026-09-30',
        competencyId:'text_15',
        evidenceAnchor:'border',
        relation:'practiced',
        masteryClaim:null,
        confidence:'exact',
        basis:'Direct practice evidence.'
      }
    ],
    preserveMastery:[
      {
        competencyId:'text_15',
        level:2,
        sourcePath:'site/competence-config.js',
        sourceKind:'teacher-seed',
        confidence:'exact',
        basis:'Repository teacherSeed explicitly stores level 2.'
      }
    ],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
}

test('structural manifest validator accepts the canonical v1 shape',()=>{
  const value=manifest();
  assert.equal(validateStudentMigrationManifestData(value),value);
});

test('identity remains structurally optional but is required for automatic migration',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  delete value.identity;
  assert.equal(validateStudentMigrationManifestData(value),value);
  const report=validateStudentMigrationManifest({root:repo,manifest:value});
  assert.equal(report.automaticEligible,false);
  assert.ok(report.reviewItems.some(item=>item.type==='identity-missing'));
});

test('rolling modern-shared manifest can be automatically eligible',()=>{
  const repo=root();modernShared(repo);
  const report=validateStudentMigrationManifest({
    root:repo,
    manifest:manifest(),
    competencyIds:new Set(['text_15'])
  });
  assert.equal(report.automaticEligible,true);
  assert.deepEqual(report.reviewItems,[]);
  assert.deepEqual(report.stats,{
    historicalLessons:2,
    lessonMappings:2,
    ktpMatches:0,
    competencyMappings:1,
    preservedMastery:1,
    ambiguities:0
  });
});

test('probable semantic mapping remains valid but blocks automatic migration',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.competencyMappings[0].confidence='probable';
  const report=validateStudentMigrationManifest({root:repo,manifest:value});
  assert.equal(report.automaticEligible,false);
  assert.equal(report.reviewItems.length,1);
  assert.equal(report.reviewItems[0].type,'competency-mapping');
  assert.equal(report.reviewItems[0].confidence,'probable');
});

test('manifest blockers and ambiguities make migration ineligible without corrupting structure',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.ambiguities.push({
    kind:'competency',
    lessonDate:'2026-09-30',
    reference:'legacy outcome',
    reason:'Two catalog targets are plausible.'
  });
  value.blockers.push('One source file still requires review.');
  const report=validateStudentMigrationManifest({root:repo,manifest:value});
  assert.equal(report.automaticEligible,false);
  assert.equal(report.blockers.length,1);
  assert.equal(report.stats.ambiguities,1);
});

test('every historical lesson HTML must be classified exactly once',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.lessonMappings.pop();
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:value}),
    /missing historical lesson classification for 2026-10-01/
  );

  const extra=manifest();
  extra.lessonMappings.push({lessonDate:'2026-10-02',ktpMatches:[]});
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:extra}),
    /references lesson dates without HTML: 2026-10-02/
  );
});

test('rolling migration forbids historical KTP mappings',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.lessonMappings[0].ktpMatches.push({
    ktpId:'ktp-001',
    coverage:'complete',
    confidence:'exact',
    reason:'Would require a fixed plan.'
  });
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:value}),
    /rolling migration historical lessons must have empty ktpMatches/
  );
});

test('fixed migration requires a real KTP source and tracks non-exact extraction as review',()=>{
  const repo=root();legacyKtp(repo);
  const value={
    version:1,
    studentId:'ktp_student',
    identity:{studentName:'KTP Student',program:'Demo Program'},
    sourceArchitecture:'legacy-ktp',
    planning:{
      mode:'fixed',
      ktpExtraction:{
        source:'site/ktp.html',
        preserveOrder:true,
        confidence:'probable',
        reason:'KTP is present but one row needs semantic review.'
      }
    },
    lessonMappings:[
      {
        lessonDate:'2026-09-30',
        ktpMatches:[{
          ktpId:'ktp-001',
          coverage:'complete',
          confidence:'exact',
          reason:'The lesson corresponds to the first preserved KTP row.'
        }]
      }
    ],
    competencyMappings:[],
    preserveMastery:[],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
  const report=validateStudentMigrationManifest({root:repo,manifest:value});
  assert.equal(report.automaticEligible,false);
  assert.equal(report.reviewItems[0].type,'ktp-extraction');

  value.planning.ktpExtraction.confidence='exact';
  assert.equal(validateStudentMigrationManifest({root:repo,manifest:value}).automaticEligible,true);
});

test('repository source architecture must match manifest declaration',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.sourceArchitecture='legacy-structured';
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:value}),
    /declared legacy-structured but repository inventory is modern-shared/
  );
});

test('evidence anchor must exist in the real lesson HTML',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.competencyMappings[0].evidenceAnchor='invented-anchor';
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:value}),
    /evidence anchor #invented-anchor is missing/
  );
});

test('optional competency catalog set rejects unknown IDs',()=>{
  const repo=root();modernShared(repo);
  assert.throws(
    ()=>validateStudentMigrationManifest({
      root:repo,
      manifest:manifest(),
      competencyIds:new Set(['other_skill'])
    }),
    /unknown competencyId text_15/
  );
});

test('preserved mastery requires an existing repository source file',()=>{
  const repo=root();modernShared(repo);
  const value=manifest();
  value.preserveMastery[0].sourcePath='site/missing-authority.js';
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:value}),
    /referenced mastery source does not exist/
  );
});

test('lesson-derived mastery claim requires exact assessed evidence',()=>{
  const value=manifest();
  value.competencyMappings[0].masteryClaim={
    level:3,
    confidence:'exact',
    basis:'Independent diagnostic evidence.'
  };
  assert.throws(
    ()=>validateStudentMigrationManifestData(value),
    /masteryClaim requires relation assessed/
  );
  value.competencyMappings[0].relation='assessed';
  value.competencyMappings[0].confidence='probable';
  assert.throws(
    ()=>validateStudentMigrationManifestData(value),
    /masteryClaim requires exact mapping confidence/
  );
});

test('linked progress overlay is a valid preserved mastery source kind',()=>{
  const value=manifest();
  value.preserveMastery[0].sourceKind='linked-progress-overlay';
  value.preserveMastery[0].sourcePath='site/lesson-30.09.26-progress.js';
  assert.equal(validateStudentMigrationManifestData(value),value);
});

test('preserved mastery is restricted to exact repository authority',()=>{
  const value=manifest();
  value.preserveMastery[0].confidence='probable';
  assert.throws(
    ()=>validateStudentMigrationManifestData(value),
    /preserved mastery requires exact confidence/
  );
});

test('private migration fields fail closed',()=>{
  const value=manifest();
  value.teacherNote='private';
  assert.throws(
    ()=>validateStudentMigrationManifestData(value),
    /forbids private field teacherNote/
  );
});

test('validator CLI requires an explicit manifest path',()=>{
  assert.deepEqual(
    parseValidatorArgs(['--manifest','manifest.json','--json']),
    {
      root:parseValidatorArgs(['--manifest','manifest.json']).root,
      manifestPath:'manifest.json',
      json:true,
      help:false
    }
  );
  assert.throws(()=>parseValidatorArgs([]),/--manifest is required/);
  assert.throws(()=>parseValidatorArgs(['--manifest']),/--manifest requires a file path/);
});

test('existing KTP cannot be silently downgraded to rolling planning',()=>{
  const repo=root();legacyKtp(repo);
  const value={
    version:1,
    studentId:'ktp_student',
    identity:{studentName:'KTP Student',program:'Demo Program'},
    sourceArchitecture:'legacy-ktp',
    planning:{mode:'rolling',ktpExtraction:null},
    lessonMappings:[{lessonDate:'2026-09-30',ktpMatches:[]}],
    competencyMappings:[],
    preserveMastery:[],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
  assert.throws(
    ()=>validateStudentMigrationManifest({root:repo,manifest:value}),
    /existing KTP source must be preserved with fixed planning/
  );
});
