function clone(value){return structuredClone(value);}
function maxDate(left,right){
  if(!left)return right;
  if(!right)return left;
  return left>=right?left:right;
}
function uniqueSorted(values){
  return [...new Set(values)].sort();
}
function baseRecord(planItem,current){
  if(current)return clone(current);
  return {
    status:'planned',
    scheduledDate:planItem?.plannedDate??null,
    lessonRefs:[]
  };
}
function inProgressCoverage(previous,next){
  if(previous==='partial'||next==='partial')return 'partial';
  return 'deferred';
}

export function applyKtpPublication({
  state,
  plan,
  lessonDate,
  actualSummary='',
  matches=[]
}={}){
  if(!state||typeof state!=='object')throw new Error('KTP publication: state is required');
  if(!plan||typeof plan!=='object'||!Array.isArray(plan.lessons))throw new Error('KTP publication: plan is required');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(lessonDate||'')))throw new Error('KTP publication: lessonDate must be ISO');
  if(!Array.isArray(matches))throw new Error('KTP publication: matches must be an array');

  const next=clone(state);
  next.records=next.records||{};
  next.updated=maxDate(next.updated,lessonDate);
  const planById=new Map(plan.lessons.map(item=>[item.id,item]));
  const changes={};

  for(const match of matches){
    const planItem=planById.get(match.ktpId);
    if(!planItem)throw new Error('KTP publication: unknown KTP ID '+match.ktpId);
    if(match.decision&&match.decision!=='apply')continue;
    if(!['complete','partial','deferred'].includes(match.coverage)){
      throw new Error('KTP publication: invalid coverage for '+match.ktpId);
    }

    const before=baseRecord(planItem,next.records[match.ktpId]);
    const after=clone(before);
    after.lessonRefs=uniqueSorted([...(before.lessonRefs||[]),lessonDate]);

    if(before.status==='done'){
      after.status='done';
      after.coverage='complete';
      after.actualDate=before.actualDate;
      after.actualSummary=before.actualSummary??actualSummary;
    }else if(match.coverage==='complete'){
      after.status='done';
      after.coverage='complete';
      after.actualDate=lessonDate;
      after.actualSummary=actualSummary;
    }else{
      after.status='in_progress';
      after.coverage=inProgressCoverage(before.coverage,match.coverage);
      delete after.actualDate;
      after.actualSummary=actualSummary;
    }

    if(after.scheduledDate===undefined){
      after.scheduledDate=planItem.plannedDate??null;
    }

    next.records[match.ktpId]=after;
    changes[match.ktpId]={before,after};
  }

  return {state:next,changes};
}
