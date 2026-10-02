import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
  executeAtomicPlan,
  sha256,
  StaleTransactionPlanError
} from '../fs/atomic-transaction.mjs';
import {validateStudentPackage} from '../student/contract.mjs';
import {applyPracticePatch} from './apply-practice-patch.mjs';
import {applyMasteryPatch} from './apply-mastery-patch.mjs';

export class StaleStage04PlanError extends StaleTransactionPlanError{
  constructor(message){
    super(message);
    this.name='StaleStage04PlanError';
    this.code='STALE_STAGE04_PLAN';
  }
}

function relative(root,file){
  return path.relative(root,file).replaceAll('\\','/');
}

function filePrecondition(root,file){
  return {
    kind:'file',
    path:relative(root,file),
    exists:true,
    sha256:sha256(fs.readFileSync(file))
  };
}

function updateWrite(root,file,before,after){
  if(after===before)return null;
  return {kind:'update',path:relative(root,file),content:after};
}

export function buildStage04TransactionPlan({
  contracts,
  practicePatch,
  masteryPatch
}={}){
  if(!contracts?.root||!contracts?.studentId)throw new Error('Stage 04 transaction: contracts are required');
  if(!practicePatch||!masteryPatch)throw new Error('Stage 04 transaction: both patches are required');
  if(practicePatch.status==='blocked'||masteryPatch.status==='blocked'){
    throw new Error('Stage 04 transaction: blocked patch cannot be planned');
  }

  const practiceCandidate=applyPracticePatch(practicePatch,contracts,{dryRun:true});
  const masteryCandidate=applyMasteryPatch(masteryPatch,contracts,{dryRun:true});
  const writes=[
    updateWrite(
      contracts.root,
      contracts.paths.lessonRegistryPath,
      contracts.sources.lessonRegistry,
      practiceCandidate.sources.lessonRegistry
    ),
    updateWrite(
      contracts.root,
      contracts.paths.practiceConfigPath,
      contracts.sources.practiceConfig,
      practiceCandidate.sources.practiceConfig
    ),
    updateWrite(
      contracts.root,
      contracts.paths.masteryPath,
      contracts.sources.mastery,
      masteryCandidate.sources.mastery
    )
  ].filter(Boolean);

  return {
    version:1,
    operation:'stage-04',
    studentId:contracts.studentId,
    lessonDate:contracts.lessonDate,
    executable:true,
    reviewItems:[],
    conflicts:[],
    preconditions:[
      filePrecondition(contracts.root,contracts.paths.lessonRegistryPath),
      filePrecondition(contracts.root,contracts.paths.practiceConfigPath),
      filePrecondition(contracts.root,contracts.paths.masteryPath)
    ],
    writes
  };
}

function syntaxCheck(file,root){
  const result=spawnSync(process.execPath,['--check',relative(root,file)],{
    cwd:root,
    encoding:'utf8'
  });
  if(result.status!==0){
    throw new Error(
      'Stage 04 postflight syntax failed for '+relative(root,file)+': '+
      String(result.stderr||result.stdout||'').trim()
    );
  }
}

export function verifyStage04Transaction({root,plan,contracts}={}){
  for(const write of plan.writes||[]){
    const file=path.join(root,...write.path.split('/'));
    if(!fs.existsSync(file))throw new Error('Stage 04 postflight: missing '+write.path);
    if(fs.readFileSync(file,'utf8')!==write.content){
      throw new Error('Stage 04 postflight: written content mismatch '+write.path);
    }
  }
  validateStudentPackage({root,studentId:plan.studentId});
  syntaxCheck(contracts.paths.lessonRegistryPath,root);
  syntaxCheck(contracts.paths.practiceConfigPath,root);
  return {
    studentId:plan.studentId,
    lessonDate:plan.lessonDate,
    contractVersion:2,
    validatedWrites:(plan.writes||[]).map(item=>item.path)
  };
}

export function executeStage04Transaction({
  contracts,
  practicePatch,
  masteryPatch,
  dryRun=false,
  faultInjector=null,
  postflight=null
}={}){
  const plan=buildStage04TransactionPlan({contracts,practicePatch,masteryPatch});
  if(dryRun){
    return {
      plan,
      changedFiles:plan.writes.map(item=>item.path),
      verification:null,
      rolledBack:false
    };
  }
  const result=executeAtomicPlan({
    root:contracts.root,
    plan,
    postflight:postflight||(({root,plan})=>verifyStage04Transaction({root,plan,contracts})),
    faultInjector,
    StaleError:StaleStage04PlanError,
    planLabel:'Stage 04',
    rollbackMessage:'Stage 04 changes were rolled back.'
  });
  return {plan,...result};
}
