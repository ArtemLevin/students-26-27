import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createOverlayFsView} from '../../fs/view.mjs';
import {validateStudentPackage} from '../../student/contract.mjs';
import {buildMigrationCandidate} from '../build/candidate.mjs';
import {buildMigrationCoverage} from '../coverage.mjs';
import {inspectLegacyLearningState} from '../legacy/inspect-learning-state.mjs';
import {inspectStudent,inventoryStudents} from '../inventory-students.mjs';
import {buildValidatedMigrationPlan,projectMigrationBaseline} from '../plan.mjs';
import {
  loadMigrationManifest,
  parseArgs as parseMigrationArgs
} from '../migrate-student.mjs';

function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'validated-migration-plan-'));
  const studentId='demo_student';
  const base=path.join(root,'students',studentId);
  const site=path.join(base,'site');

  write(path.join(site,'index.html'),'<!doctype html><h1>Demo Student</h1>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'dashboard.js'),'export {};');
  write(
    path.join(site,'lesson-registry.js'),
    'export const LESSONS='+JSON.stringify([{
      date:'2026-09-30',
      href:'30.09.26.html',
      title:'Прикладные формулы',
      summary:'Формулы и ограничения.',
      topics:['формулы'],
      outcomes:[{
        competencyId:'text_15',
        label:'Формулы',
        level:2,
        tone:'process'
      }]
    }],null,2)+';\n'
  );
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'text',name:'Текстовые задачи',items:[{id:'text_15',title:'Прикладные формулы'}]}]};"
  );
  write(
    path.join(site,'competence-config.js'),
    "window.STUDENT_COMPETENCE_CONFIG={teacherSeed:{text_15:2}};"
  );
  write(
    path.join(site,'30.09.26.html'),
    '<!doctype html><html><head><meta name="description" content="Формулы и ограничения."></head><body><h1>Прикладные формулы</h1><section id="border"></section></body></html>'
  );
  write(path.join(base,'tex_docs','30.09.26.tex'),'tex');
  write(path.join(base,'pdf_docs','30.09.26.pdf'),'pdf');
  write(path.join(site,'30.09.26-lab.html'),'<div>lab</div>');

  const baseline={
    version:1,
    measuredAt:'2026-10-01',
    total:1,
    minV2:0,
    maxNonV2:1,
    byArchitecture:{'modern-shared':1}
  };
  write(
    path.join(root,'pipeline','migration','baseline.json'),
    JSON.stringify(baseline,null,2)+'\n'
  );

  const manifest={
    version:1,
    studentId,
    identity:{studentName:'Demo Student',program:'Demo Program'},
    sourceArchitecture:'modern-shared',
    planning:{mode:'rolling',ktpExtraction:null},
    lessonMappings:[{lessonDate:'2026-09-30',ktpMatches:[]}],
    competencyMappings:[{
      lessonDate:'2026-09-30',
      competencyId:'text_15',
      evidenceAnchor:'border',
      relation:'practiced',
      masteryClaim:null,
      confidence:'exact',
      basis:'Direct practice evidence.'
    }],
    preserveMastery:[{
      competencyId:'text_15',
      level:2,
      sourcePath:'site/competence-config.js',
      sourceKind:'teacher-seed',
      confidence:'exact',
      basis:'Repository teacherSeed explicitly stores level 2.'
    }],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
  const manifestPath=path.join(root,'pipeline','migration','manifests',studentId+'.json');
  write(manifestPath,JSON.stringify(manifest,null,2)+'\n');

  return {
    root,studentId,base,site,baseline,manifest,manifestPath,
    baselinePath:path.join(root,'pipeline','migration','baseline.json'),
    reportPath:path.join(root,'pipeline','migration','reports',studentId+'.json'),
    contractPath:path.join(base,'student-contract.json')
  };
}

test('validated plan sees a full v2 package through overlay while disk remains legacy',()=>{
  const x=fixture();
  const baselineBefore=fs.readFileSync(x.baselinePath);
  const diskBefore=inventoryStudents(x.root);

  const plan=buildValidatedMigrationPlan({
    root:x.root,
    manifest:x.manifest,
    migrationDate:'2026-10-01'
  });

  assert.equal(plan.executable,true);
  assert.equal(plan.coverage.complete,true);
  assert.equal(plan.validation.package.contractVersion,2);
  assert.equal(plan.validation.package.lessonMetadata,1);
  assert.deepEqual(plan.coverage.lessons,{
    source:1,candidate:1,missing:[],extra:[]
  });
  assert.deepEqual(plan.coverage.competencies,{
    source:1,candidate:1,missing:[],extra:[]
  });
  assert.deepEqual(plan.coverage.mastery,{
    resolvedSource:1,candidate:1,conflicts:0,orphans:0
  });
  assert.deepEqual(plan.coverage.materials,{html:1,pdf:1,tex:1,lab:1});
  assert.deepEqual(plan.coverage.preservation.protectedFilesChanged,[]);

  assert.equal(plan.inventory.total,1);
  assert.equal(plan.inventory.byArchitecture.v2,1);
  assert.equal(plan.projectedBaseline.minV2,1);
  assert.equal(plan.projectedBaseline.maxNonV2,0);
  assert.equal(plan.projectedBaseline.total,1);

  assert.ok(plan.writes.some(item=>item.path==='students/demo_student/student-contract.json'));
  assert.ok(plan.writes.some(item=>item.path==='pipeline/migration/baseline.json'));
  assert.ok(plan.writes.some(item=>item.path==='pipeline/migration/reports/demo_student.json'));

  assert.equal(inspectStudent(x.root,x.studentId).architecture,'modern-shared');
  assert.equal(fs.existsSync(x.contractPath),false);
  assert.equal(fs.existsSync(x.reportPath),false);
  assert.deepEqual(fs.readFileSync(x.baselinePath),baselineBefore);
  assert.deepEqual(inventoryStudents(x.root),diskBefore);
});

test('full migration plan overlay independently passes production package validation',()=>{
  const x=fixture();
  const plan=buildValidatedMigrationPlan({
    root:x.root,
    manifest:x.manifest,
    migrationDate:'2026-10-01'
  });
  const overlay=createOverlayFsView({root:x.root,writes:plan.writes});

  const result=validateStudentPackage({
    root:x.root,
    studentId:x.studentId,
    fsView:overlay
  });
  assert.equal(result.contractVersion,2);
  assert.equal(result.planningMode,'rolling');

  const virtualInventory=inventoryStudents(x.root,{fsView:overlay});
  const migrated=virtualInventory.students.find(item=>item.studentId===x.studentId);
  assert.equal(migrated.architecture,'v2');
  assert.equal(inspectStudent(x.root,x.studentId).architecture,'modern-shared');
});

test('production validator rejects a corrupted candidate overlay',()=>{
  const x=fixture();
  const candidate=buildMigrationCandidate({
    root:x.root,
    manifest:x.manifest,
    migrationDate:'2026-10-01'
  });
  const metadataPath='students/demo_student/site/data/lessons/2026-09-30.lesson.json';
  const writes=candidate.writes.map(item=>{
    if(item.path!==metadataPath)return item;
    const value=JSON.parse(item.content);
    value.outcomes[0].competencyId='missing_skill';
    return {...item,content:JSON.stringify(value,null,2)+'\n'};
  });
  const overlay=createOverlayFsView({root:x.root,writes});

  assert.throws(
    ()=>validateStudentPackage({
      root:x.root,
      studentId:x.studentId,
      fsView:overlay
    }),
    /competency missing_skill is absent from the competency catalog/
  );
});

test('coverage fails closed when a protected legacy asset appears in writes',()=>{
  const x=fixture();
  const candidate=buildMigrationCandidate({
    root:x.root,
    manifest:x.manifest,
    migrationDate:'2026-10-01'
  });
  const legacy=inspectLegacyLearningState({root:x.root,studentId:x.studentId});
  const coverage=buildMigrationCoverage({
    manifest:x.manifest,
    candidate,
    legacyState:legacy,
    migrationDate:'2026-10-01',
    writePaths:[
      ...candidate.writes.map(item=>item.path),
      'students/demo_student/site/index.html'
    ]
  });

  assert.equal(coverage.complete,false);
  assert.deepEqual(
    coverage.preservation.protectedFilesChanged,
    ['students/demo_student/site/index.html']
  );
});

test('ineligible identity produces an incomplete zero-write validated plan',()=>{
  const x=fixture();
  const manifest=structuredClone(x.manifest);
  delete manifest.identity;

  const plan=buildValidatedMigrationPlan({
    root:x.root,
    manifest,
    migrationDate:'2026-10-01'
  });

  assert.equal(plan.executable,false);
  assert.equal(plan.coverage.complete,false);
  assert.deepEqual(plan.writes,[]);
  assert.equal(plan.validation,null);
  assert.ok(plan.reviewItems.some(item=>item.type==='identity-missing'));
  assert.equal(fs.existsSync(x.contractPath),false);
});

test('projected baseline tightens exactly to the candidate inventory',()=>{
  const projected=projectMigrationBaseline({
    current:{
      version:1,measuredAt:'2026-09-30',total:24,minV2:1,maxNonV2:23,
      byArchitecture:{v2:1,'modern-shared':6,'legacy-ktp':2,'legacy-structured':15}
    },
    inventory:{
      summary:{
        total:24,
        byArchitecture:{v2:2,'modern-shared':5,'legacy-ktp':2,'legacy-structured':15}
      }
    },
    migrationDate:'2026-10-01'
  });
  assert.deepEqual(projected,{
    version:1,
    measuredAt:'2026-10-01',
    total:24,
    minV2:2,
    maxNonV2:22,
    byArchitecture:{
      'legacy-ktp':2,
      'legacy-structured':15,
      'modern-shared':5,
      v2:2
    }
  });
});

test('validated dry-run CLI parser accepts manifest/date and keeps apply disabled as a separate mode',()=>{
  const parsed=parseMigrationArgs([
    'demo_student',
    '--manifest','pipeline/migration/manifests/demo_student.json',
    '--date','2026-10-01',
    '--dry-run',
    '--json'
  ]);
  assert.equal(parsed.studentId,'demo_student');
  assert.equal(parsed.dryRun,true);
  assert.equal(parsed.apply,false);
  assert.equal(parsed.date,'2026-10-01');
  assert.equal(parsed.manifestPath,'pipeline/migration/manifests/demo_student.json');

  assert.throws(
    ()=>parseMigrationArgs(['demo_student','--dry-run','--apply']),
    /mutually exclusive/
  );
  assert.throws(
    ()=>parseMigrationArgs(['demo_student','--dry-run','--date','2026-02-31']),
    /valid YYYY-MM-DD/
  );
});

test('manifest loader reads root-relative reviewed manifest',()=>{
  const x=fixture();
  const loaded=loadMigrationManifest({
    root:x.root,
    manifestPath:'pipeline/migration/manifests/demo_student.json'
  });
  assert.deepEqual(loaded,x.manifest);
});
