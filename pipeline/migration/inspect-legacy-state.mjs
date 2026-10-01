#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT} from './inventory-students.mjs';
import {inspectLegacyLearningState} from './legacy/inspect-learning-state.mjs';

export function parseArgs(argv){
  const out={studentId:null,root:ROOT,json:false,help:false};
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--json'){out.json=true;continue;}
    if(token==='--root'){
      const value=args.shift();
      if(!value)throw new Error('--root requires a path');
      out.root=path.resolve(value);
      continue;
    }
    if(token.startsWith('--'))throw new Error('Unknown option: '+token);
    if(out.studentId)throw new Error('Unexpected argument: '+token);
    out.studentId=token;
  }
  if(!out.help&&!out.studentId)throw new Error('studentId is required');
  return out;
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){
    process.stdout.write('Usage: node pipeline/migration/inspect-legacy-state.mjs STUDENT [--root ROOT] [--json]\n');
    return null;
  }
  const report=inspectLegacyLearningState({
    root:options.root,
    studentId:options.studentId
  });
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  return report;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){
    process.stderr.write('inspect-legacy-state: '+error.message+'\n');
    process.exitCode=1;
  }
}
