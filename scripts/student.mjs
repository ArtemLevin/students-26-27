
#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run as runValidate} from '../pipeline/student/validate.mjs';

export function helpText(){
  return [
    'Student Platform CLI',
    '',
    'Usage:',
    '  node scripts/student.mjs validate [student_id] [--json]',
    '',
    'P0 exposes the v2 validation command. Create, migrate and publish orchestration',
    'will be added on top of this contract in the next implementation stages.'
  ].join('\n')+'\n';
}

export function run(argv=process.argv.slice(2)){
  const command=argv[0],rest=argv.slice(1);
  if(!command||command==='help'||command==='--help'||command==='-h'){
    process.stdout.write(helpText());
    return null;
  }
  if(command==='validate')return runValidate(rest);
  throw new Error('Unknown command: '+command);
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){process.stderr.write('student: '+error.message+'\n');process.exitCode=1;}
}
