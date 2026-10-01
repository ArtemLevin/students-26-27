import {
  executeAtomicPlan,
  StaleTransactionPlanError
} from '../fs/atomic-transaction.mjs';
import {verifyMigrationPostflight} from './postflight.mjs';

export class StaleMigrationPlanError extends StaleTransactionPlanError{
  constructor(message){
    super(message);
    this.name='StaleMigrationPlanError';
    this.code='STALE_MIGRATION_PLAN';
  }
}

export function executeMigrationTransaction({
  root=process.cwd(),
  plan,
  postflight=verifyMigrationPostflight,
  faultInjector=null
}={}){
  if(!plan||plan.operation!=='student-migration'){
    throw new Error('migration transaction: student-migration plan is required');
  }

  const result=executeAtomicPlan({
    root,
    plan,
    postflight,
    faultInjector,
    StaleError:StaleMigrationPlanError,
    planLabel:'migration',
    rollbackMessage:'Migration changes were rolled back.'
  });

  return {
    studentId:plan.studentId,
    status:'applied',
    architecture:'v2',
    changedFiles:result.changedFiles,
    verification:result.verification,
    coverage:plan.coverage,
    rolledBack:result.rolledBack
  };
}
