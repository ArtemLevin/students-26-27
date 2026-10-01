#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {discoverV2Students,validateStudentPackage} from './contract.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

export function validateAllStudentPackages({root=ROOT,studentId=null}={}){
  const students=studentId?[studentId]:discoverV2Students(root);
  const results=students.map(id=>validateStudentPackage({root,studentId:id}));
  return {architectureVersion:2,count:results.length,students:results};
}

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
  return out;
}

export function helpText(){
  return [
    'Student Platform v2 contract validator',
    '',
    'Usage:',
    '  node pipeline/student/validate.mjs [student_id] [--json] [--root <path>]',
    '',
    'With no student_id, validates every student that already has student-contract.json.',
    'Legacy students are intentionally ignored during the migration period.'
  ].join('\n')+'\n';
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){process.stdout.write(helpText());return null;}
  const report=validateAllStudentPackages(options);
  if(options.json)process.stdout.write(JSON.stringify(report,null,2)+'\n');
  else{
    process.stdout.write('✓ Student Platform v2: '+report.count+' contract(s) validated\n');
    for(const item of report.students){
      process.stdout.write('  ✓ '+item.studentId+': '+item.ktpLessons+' KTP items, '+item.lessonMetadata+' lesson metadata record(s)\n');
    }
  }
  return report;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){process.stderr.write('student-contract: '+error.message+'\n');process.exitCode=1;}
}
