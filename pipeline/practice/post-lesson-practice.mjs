import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT} from './discover-student-contracts.mjs';
import {runStage04} from './run-stage-04.mjs';
import {Stage04ValidationError} from './validate-stage-result.mjs';

function parseArgs(argv){
  const args={};
  for(let index=0;index<argv.length;index+=1){
    const token=argv[index];
    if(token==='--dry-run'){args.dryRun=true;continue;}
    if(token.startsWith('--'))args[token.slice(2)]=argv[++index];
  }
  return args;
}

export async function postLessonPractice({studentId,lessonDate,analysisPath,root=ROOT,dryRun=false,waiver=null}={}){
  const report=await runStage04({studentId,lessonDate,analysisPath,root,dryRun});
  if(report.exitCode===2&&waiver?.trim())return {...report,status:'gaps-waived',exitCode:0,waiver:waiver.trim()};
  return report;
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  try{
    const report=await postLessonPractice({studentId:args.student,lessonDate:args.date,analysisPath:args.analysis,root:args.root?path.resolve(args.root):ROOT,dryRun:Boolean(args.dryRun),waiver:args.waiver||null});
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
    process.exitCode=report.exitCode;
  }catch(error){
    const exitCode=error instanceof Stage04ValidationError?error.exitCode:3;
    process.stderr.write(`${JSON.stringify({stage:'post-lesson-practice',status:'error',exitCode,message:error.message,details:error.details||[]},null,2)}\n`);
    process.exitCode=exitCode;
  }
}

const invoked=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(invoked)await main();
