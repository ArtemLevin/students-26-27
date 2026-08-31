import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {discoverStudentContracts,ROOT} from './discover-student-contracts.mjs';
import {validateStageResult,stageExitCode,Stage04ValidationError} from './validate-stage-result.mjs';
import {buildPracticePatch} from './build-practice-patch.mjs';
import {applyPracticePatch} from './apply-practice-patch.mjs';

function parseArgs(argv){
  const args={dryRun:false};
  for(let index=0;index<argv.length;index+=1){
    const token=argv[index];
    if(token==='--dry-run'){args.dryRun=true;continue;}
    if(token.startsWith('--'))args[token.slice(2)]=argv[++index];
  }
  return args;
}

export async function runStage04({studentId,lessonDate,analysisPath,root=ROOT,dryRun=false}={}){
  if(!studentId||!lessonDate||!analysisPath)throw new Stage04ValidationError('Required arguments: studentId, lessonDate, analysisPath',{exitCode:3});
  const absoluteAnalysis=path.isAbsolute(analysisPath)?analysisPath:path.resolve(root,analysisPath);
  if(!fs.existsSync(absoluteAnalysis))throw new Stage04ValidationError(`Stage 04 analysis file is missing: ${analysisPath}`,{exitCode:3});
  let analysis;
  try{analysis=JSON.parse(fs.readFileSync(absoluteAnalysis,'utf8'));}catch(error){throw new Stage04ValidationError(`Stage 04 analysis is not valid JSON: ${error.message}`,{exitCode:3});}
  const contracts=await discoverStudentContracts(studentId,lessonDate,{root});
  const validation=validateStageResult(analysis,contracts,{expectedStudentId:studentId,expectedLessonDate:lessonDate});
  const patch=buildPracticePatch(validation,contracts);
  const application=patch.status==='blocked'?{changedFiles:[],sources:null}:applyPracticePatch(patch,contracts,{dryRun});
  const exitCode=stageExitCode(validation);
  return {
    stage:'04-spaced-practice',schemaVersion:1,studentId,lessonDate,
    status:patch.status==='blocked'?'blocked':patch.status,
    exitCode,dryRun,changedFiles:application.changedFiles,
    gaps:patch.gaps,blocks:patch.blocks,warnings:patch.warnings,
    operationTypes:patch.operations.map(operation=>operation.type)
  };
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  try{
    const report=await runStage04({studentId:args.student,date:args.date,lessonDate:args.date,analysisPath:args.analysis,root:args.root?path.resolve(args.root):ROOT,dryRun:args.dryRun});
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
    process.exitCode=report.exitCode;
  }catch(error){
    const exitCode=error instanceof Stage04ValidationError?error.exitCode:3;
    const report={stage:'04-spaced-practice',status:'error',exitCode,message:error.message,details:error.details||[]};
    process.stderr.write(`${JSON.stringify(report,null,2)}\n`);
    process.exitCode=exitCode;
  }
}

const invoked=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(invoked)await main();
