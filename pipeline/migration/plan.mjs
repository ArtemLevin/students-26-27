import fs from 'node:fs';
import path from 'node:path';
import {createOverlayFsView} from '../fs/view.mjs';
import {validateStudentPackage} from '../student/contract.mjs';
import {evaluateArchitectureRatchet} from './audit-ratchet.mjs';
import {buildMigrationCandidate} from './build/candidate.mjs';
import {buildMigrationCoverage} from './coverage.mjs';
import {inspectLegacyLearningState} from './legacy/inspect-learning-state.mjs';
import {inventoryStudents} from './inventory-students.mjs';

function json(value){return JSON.stringify(value,null,2)+'\n';}
function fileKind(root,relative){
  return fs.existsSync(path.join(root,...relative.split('/')))?'update':'create';
}
function write(root,pathValue,content){
  return {kind:fileKind(root,pathValue),path:pathValue,content};
}
function sortedArchitectureCounts(value){
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en')));
}
export function projectMigrationBaseline({current,inventory,migrationDate}={}){
  if(!current||current.version!==1)throw new Error('migration plan: unsupported migration baseline');
  const total=inventory.summary.total;
  const v2=inventory.summary.byArchitecture.v2||0;
  return {
    version:1,
    measuredAt:migrationDate,
    total,
    minV2:v2,
    maxNonV2:total-v2,
    byArchitecture:sortedArchitectureCounts(inventory.summary.byArchitecture)
  };
}

export function buildValidatedMigrationPlan({
  root=process.cwd(),
  manifest,
  migrationDate
}={}){
  const candidate=buildMigrationCandidate({root,manifest,migrationDate});
  const studentId=manifest.studentId;
  const legacyState=inspectLegacyLearningState({root,studentId});

  if(!candidate.executable){
    const coverage=buildMigrationCoverage({
      manifest,
      candidate,
      legacyState,
      migrationDate,
      writePaths:[]
    });
    return {
      version:1,
      operation:'student-migration',
      studentId,
      sourceArchitecture:manifest.sourceArchitecture,
      migrationDate,
      executable:false,
      reviewItems:[...candidate.reviewItems],
      conflicts:[...candidate.conflicts],
      blockers:[...candidate.blockers],
      warnings:[...candidate.warnings],
      preconditions:[],
      writes:[],
      coverage,
      validation:null,
      inventory:null,
      projectedBaseline:null,
      candidateDiagnostics:candidate.diagnostics||null
    };
  }

  const candidateOverlay=createOverlayFsView({
    root,
    writes:candidate.writes
  });
  const packageValidation=validateStudentPackage({
    root,
    studentId,
    fsView:candidateOverlay
  });
  const inventory=inventoryStudents(root,{fsView:candidateOverlay});
  const migrated=inventory.students.find(item=>item.studentId===studentId);
  if(!migrated||migrated.architecture!=='v2'){
    throw new Error('migration plan: candidate overlay did not classify '+studentId+' as v2');
  }

  const currentInventory=inventoryStudents(root);
  if(currentInventory.summary.total!==inventory.summary.total){
    throw new Error('migration plan: migration must not change total student count');
  }

  const baselinePath=path.join(root,'pipeline','migration','baseline.json');
  const currentBaseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  const projectedBaseline=projectMigrationBaseline({
    current:currentBaseline,
    inventory,
    migrationDate
  });
  const ratchet=evaluateArchitectureRatchet(inventory,projectedBaseline);
  if(!ratchet.ok){
    throw new Error('migration plan: projected baseline does not satisfy ratchet: '+ratchet.violations.join('; '));
  }

  const baselineRelative='pipeline/migration/baseline.json';
  const reportRelative='pipeline/migration/reports/'+studentId+'.json';
  const prospectivePaths=[
    ...candidate.writes.map(item=>item.path),
    baselineRelative,
    reportRelative
  ];

  const coverage=buildMigrationCoverage({
    manifest,
    candidate,
    legacyState,
    migrationDate,
    writePaths:prospectivePaths
  });

  const baselineWrite=write(root,baselineRelative,json(projectedBaseline));
  const reportWrite=write(root,reportRelative,json(coverage));
  const writes=[
    ...candidate.writes,
    baselineWrite,
    reportWrite
  ].sort((a,b)=>a.path.localeCompare(b.path,'en'));

  const fullOverlay=createOverlayFsView({root,writes});
  const finalValidation=validateStudentPackage({
    root,
    studentId,
    fsView:fullOverlay
  });
  const finalInventory=inventoryStudents(root,{fsView:fullOverlay});
  const finalStudent=finalInventory.students.find(item=>item.studentId===studentId);
  if(!finalStudent||finalStudent.architecture!=='v2'){
    throw new Error('migration plan: final overlay lost v2 classification');
  }

  return {
    version:1,
    operation:'student-migration',
    studentId,
    sourceArchitecture:manifest.sourceArchitecture,
    migrationDate,
    executable:coverage.complete,
    reviewItems:[...candidate.reviewItems],
    conflicts:[...candidate.conflicts],
    blockers:[...candidate.blockers],
    warnings:[...candidate.warnings],
    preconditions:[],
    writes,
    coverage,
    validation:{
      package:finalValidation,
      ratchet,
      candidatePackage:packageValidation
    },
    inventory:finalInventory.summary,
    projectedBaseline,
    candidateDiagnostics:candidate.diagnostics
  };
}
