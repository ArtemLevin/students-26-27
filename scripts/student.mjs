#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run as runValidate} from '../pipeline/student/validate.mjs';
import {run as runInventory} from '../pipeline/migration/inventory-students.mjs';
import {run as runMigrate} from '../pipeline/migration/migrate-student.mjs';
import {run as runValidateManifest} from '../pipeline/migration/validate-manifest.mjs';
import {run as runInspectLegacyState} from '../pipeline/migration/inspect-legacy-state.mjs';

export function helpText(){
  return [
    'Student Platform CLI',
    '',
    'Usage:',
    '  node scripts/student.mjs validate [student_id] [--json]',
    '  node scripts/student.mjs inventory [--json] [--json-output FILE] [--markdown-output FILE]',
    '  node scripts/student.mjs migrate STUDENT (--dry-run|--apply) [--manifest FILE] [--date YYYY-MM-DD] [--json]',
    '  node scripts/student.mjs validate-manifest --manifest FILE [--root ROOT] [--json]',
    '  node scripts/student.mjs inspect-legacy-state STUDENT [--root ROOT] [--json]',
    '',
    'Migration apply requires a reviewed manifest and runs through optimistic preconditions, atomic writes, postflight validation, and rollback.',
    'The CLI is the single entry point for Student Platform v2 architecture operations.'
  ].join('\n')+'\n';
}

export function run(argv=process.argv.slice(2)){
  const command=argv[0],rest=argv.slice(1);
  if(!command||command==='help'||command==='--help'||command==='-h'){
    process.stdout.write(helpText());
    return null;
  }
  if(command==='validate')return runValidate(rest);
  if(command==='inventory')return runInventory(rest);
  if(command==='migrate')return runMigrate(rest);
  if(command==='validate-manifest')return runValidateManifest(rest);
  if(command==='inspect-legacy-state')return runInspectLegacyState(rest);
  throw new Error('Unknown command: '+command);
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){process.stderr.write('student: '+error.message+'\n');process.exitCode=1;}
}
