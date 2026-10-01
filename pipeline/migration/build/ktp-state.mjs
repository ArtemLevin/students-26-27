import {
  validateKtpPlanData,
  validateKtpStateData
} from '../../student/contract.mjs';

function uniquePush(array,value){
  if(!array.includes(value))array.push(value);
}

export function buildRollingKtpPlan({studentId}={}){
  const plan={
    version:1,
    studentId,
    programVersion:'rolling-migration-v1',
    lessons:[]
  };
  validateKtpPlanData(plan,{studentId});
  return plan;
}

export function buildInitialKtpState({
  studentId,
  plan,
  manifest,
  migrationDate
}={}){
  const records={};
  for(const lesson of plan.lessons){
    records[lesson.id]={
      status:'planned',
      ...(lesson.plannedDate?{scheduledDate:lesson.plannedDate}:{}),
      lessonRefs:[]
    };
  }

  const mappings=[...manifest.lessonMappings].sort((a,b)=>
    a.lessonDate.localeCompare(b.lessonDate)
  );
  for(const mapping of mappings){
    for(const match of mapping.ktpMatches){
      if(match.confidence!=='exact'){
        throw new Error(
          'migration KTP state: non-exact mapping reached deterministic builder for '+
          mapping.lessonDate+' '+match.ktpId
        );
      }
      const record=records[match.ktpId];
      if(!record){
        throw new Error(
          'migration KTP state: '+match.ktpId+' is absent from the extracted KTP plan'
        );
      }
      uniquePush(record.lessonRefs,mapping.lessonDate);

      if(record.status==='done')continue;

      if(match.coverage==='complete'){
        record.status='done';
        record.actualDate=mapping.lessonDate;
        record.coverage='complete';
        continue;
      }

      record.status='in_progress';
      record.coverage=match.coverage;
      delete record.actualDate;
    }
  }

  const state={
    version:1,
    studentId,
    programVersion:plan.programVersion,
    updated:migrationDate,
    records
  };
  validateKtpStateData(state,{studentId,plan});
  return state;
}
