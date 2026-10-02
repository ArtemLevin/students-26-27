#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run as runValidate} from '../pipeline/student/validate.mjs';
import {run as runInventory} from '../pipeline/migration/inventory-students.mjs';
import {run as runMigrate} from '../pipeline/migration/migrate-student.mjs';
import {run as runValidateManifest} from '../pipeline/migration/validate-manifest.mjs';
import {run as runInspectLegacyState} from '../pipeline/migration/inspect-legacy-state.mjs';
import {run as runReadiness} from '../pipeline/migration/readiness-inventory.mjs';
import {run as runSteadyStateAudit} from '../pipeline/student/audit-steady-state.mjs';

export function helpText(){
  return [
    'Student Platform CLI',
    '',
    'Usage:',
    '  node scripts/student.mjs validate [student_id] [--json]',
    '  node scripts/student.mjs audit [--json|--markdown] [--root ROOT]',
    '  node scripts/student.mjs inventory [--json] [--json-output FILE] [--markdown-output FILE]',
    '',
    'Recovery / historical migration commands:',
    '  node scripts/student.mjs migrate STUDENT (--dry-run|--apply) [--manifest FILE] [--date YYYY-MM-DD] [--json]',
    '  node scripts/student.mjs validate-manifest --manifest FILE [--root ROOT] [--json]',
    '  node scripts/student.mjs inspect-legacy-state STUDENT [--root ROOT] [--json]',
    '  node scripts/student.mjs readiness [--json] [--json-output FILE] [--markdown-output FILE]',
    '',
    'Steady-state operations are validate, audit and inventory.',
    'Migration commands remain available for recovery and historical verification.'
  ].join('\n')+'\n';
}

export function run(argv=process.argv.slice(2)){
  const command=argv[0],rest=argv.slice(1);
  if(!command||command==='help'||command==='--help'||command==='-h'){
    process.stdout.write(helpText());
    return null;
  }
  if(command==='validate')return runValidate(rest);
  if(command==='audit')return runSteadyStateAudit(rest);
  if(command==='inventory')return runInventory(rest);
  if(command==='migrate')return runMigrate(rest);
  if(command==='validate-manifest')return runValidateManifest(rest);
  if(command==='inspect-legacy-state')return runInspectLegacyState(rest);
  if(command==='readiness')return runReadiness(rest);
  throw new Error('Unknown command: '+command);
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){process.stderr.write('student: '+error.message+'\n');process.exitCode=1;}
}
