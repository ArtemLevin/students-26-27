import fs from 'node:fs';
import path from 'node:path';
import {
  executeAtomicPlan,
  StaleTransactionPlanError,
  verifyTransactionPreconditions
} from '../../fs/atomic-transaction.mjs';
import {verifyPublishedPlan} from './verify.mjs';

function resolveInsideRoot(root,relative,label='path'){
  const base=path.resolve(root);
  const target=path.resolve(base,...String(relative).split('/'));
  if(target!==base&&!target.startsWith(base+path.sep)){
    throw new Error('publication transaction: '+label+' escapes repository root: '+relative);
  }
  return target;
}

export class StalePublicationPlanError extends StaleTransactionPlanError{
  constructor(message){
    super(message);
    this.name='StalePublicationPlanError';
    this.code='STALE_PUBLICATION_PLAN';
  }
}

export function verifyPublicationPreconditions({
  root=process.cwd(),
  preconditions=[]
}={}){
  return verifyTransactionPreconditions({
    root,
    preconditions,
    StaleError:StalePublicationPlanError,
    planLabel:'publication'
  });
}

function assertLegacyPublicationContract({root,plan}){
  if(!plan||typeof plan!=='object'){
    throw new Error('publication transaction: plan is required');
  }
  if(plan.version!==1){
    throw new Error('publication transaction: unsupported plan version');
  }
  if(!plan.executable){
    throw new Error('publication transaction: plan is not executable');
  }
  if((plan.reviewItems||[]).length){
    throw new Error('publication transaction: unresolved review items');
  }
  if((plan.conflicts||[]).length){
    throw new Error('publication transaction: unresolved conflicts');
  }

  for(const write of plan.writes||[]){
    if(!['create','update'].includes(write.kind)){
      throw new Error('publication transaction: unsupported write kind '+write.kind);
    }
    const target=resolveInsideRoot(root,write.path,'write');
    const parent=path.dirname(target);
    if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()){
      throw new Error(
        'publication transaction: target directory is missing: '+
        path.relative(root,parent)
      );
    }
  }
}

export function executeV2Publication({
  root=process.cwd(),
  plan,
  postflight=verifyPublishedPlan,
  faultInjector=null
}={}){
  assertLegacyPublicationContract({root,plan});

  const result=executeAtomicPlan({
    root,
    plan,
    postflight,
    faultInjector,
    StaleError:StalePublicationPlanError,
    planLabel:'publication',
    rollbackMessage:'Publication changes were rolled back.'
  });

  return {
    studentId:plan.studentId,
    lessonDate:plan.lessonDate,
    changedFiles:result.changedFiles,
    verification:result.verification,
    rolledBack:result.rolledBack
  };
}
