import fs from 'node:fs';
import path from 'node:path';
import {auditArchitectureRatchet} from './audit-ratchet.mjs';
import {validateMigrationCoverageData} from './coverage.mjs';
import {inventoryStudents} from './inventory-students.mjs';
import {verifyProtectedFiles} from './snapshot.mjs';
import {validateStudentPackage} from '../student/contract.mjs';

function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){
    return Object.fromEntries(
      Object.keys(value).sort().map(key=>[key,stable(value[key])])
    );
  }
  return value;
}
function same(left,right){
  return JSON.stringify(stable(left))===JSON.stringify(stable(right));
}
function readJson(file,label){
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(error){throw new Error('migration postflight: cannot parse '+label+': '+error.message);}
}

export function verifyMigrationPostflight({
  root=process.cwd(),
  plan
}={}){
  if(!plan||plan.operation!=='student-migration'){
    throw new Error('migration postflight: student-migration plan is required');
  }

  for(const write of plan.writes||[]){
    const file=path.join(root,...write.path.split('/'));
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
      throw new Error('migration postflight: expected file is missing: '+write.path);
    }
    const actual=fs.readFileSync(file,'utf8');
    if(actual!==write.content){
      throw new Error('migration postflight: written content mismatch: '+write.path);
    }
  }

  const packageValidation=validateStudentPackage({
    root,
    studentId:plan.studentId
  });

  const inventory=inventoryStudents(root);
  const student=inventory.students.find(item=>item.studentId===plan.studentId);
  if(!student||student.architecture!=='v2'){
    throw new Error('migration postflight: student is not classified as v2');
  }
  if(!same(inventory.summary,plan.inventory)){
    throw new Error('migration postflight: architecture inventory differs from planned inventory');
  }

  const baselinePath=path.join(root,'pipeline','migration','baseline.json');
  const baseline=readJson(baselinePath,'migration baseline');
  if(!same(baseline,plan.projectedBaseline)){
    throw new Error('migration postflight: migration baseline differs from projected baseline');
  }
  const ratchet=auditArchitectureRatchet({
    root,
    baselinePath
  });
  if(!ratchet.ok){
    throw new Error('migration postflight: architecture ratchet failed');
  }

  const reportPath=path.join(
    root,'pipeline','migration','reports',plan.studentId+'.json'
  );
  const coverage=validateMigrationCoverageData(
    readJson(reportPath,'migration coverage report')
  );
  if(!coverage.complete){
    throw new Error('migration postflight: coverage report is incomplete');
  }
  if(coverage.studentId!==plan.studentId){
    throw new Error('migration postflight: coverage report studentId mismatch');
  }
  const plannedWrites=[...(plan.writes||[])].map(item=>item.path).sort();
  const reportedWrites=[...coverage.writes].sort();
  if(JSON.stringify(plannedWrites)!==JSON.stringify(reportedWrites)){
    throw new Error('migration postflight: coverage write set differs from transaction plan');
  }

  const preservation=verifyProtectedFiles({
    root,
    protectedFiles:plan.preservation?.protectedFiles||[]
  });

  return {
    studentId:plan.studentId,
    contractVersion:packageValidation.contractVersion,
    architecture:'v2',
    validatedWrites:plannedWrites,
    coverageComplete:true,
    ratchet:{
      v2:ratchet.v2,
      nonV2:ratchet.nonV2,
      total:ratchet.total
    },
    preservation
  };
}
