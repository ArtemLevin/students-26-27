function clone(value){return structuredClone(value);}
function maxDate(left,right){
  if(!left)return right;
  if(!right)return left;
  return left>=right?left:right;
}

export function applyMasteryPublication({
  state,
  lessonDate,
  sourcePath,
  outcomes=[]
}={}){
  if(!state||typeof state!=='object')throw new Error('mastery publication: state is required');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(lessonDate||''))){
    throw new Error('mastery publication: lessonDate must be ISO');
  }
  if(typeof sourcePath!=='string'||!sourcePath){
    throw new Error('mastery publication: sourcePath is required');
  }
  if(!Array.isArray(outcomes))throw new Error('mastery publication: outcomes must be an array');

  const next=clone(state);
  next.levels=next.levels||{};
  const changes={};
  const preservedDowngrades=[];

  for(const outcome of outcomes){
    const claim=outcome?.masteryClaim;
    if(
      outcome?.relation!=='assessed'||
      claim===null||
      claim===undefined||
      claim.confidence!=='exact'
    )continue;

    const competencyId=outcome.competencyId;
    const before=next.levels[competencyId]??null;
    if(before&&before.level>=claim.level){
      if(before.level>claim.level){
        preservedDowngrades.push({
          competencyId,
          existingLevel:before.level,
          claimedLevel:claim.level
        });
      }
      continue;
    }

    const after={
      level:claim.level,
      sourcePath,
      sourceKind:'lesson-assessment',
      basis:claim.basis
    };
    next.levels[competencyId]=after;
    changes[competencyId]={before:before?clone(before):null,after:clone(after)};
  }

  if(Object.keys(changes).length){
    next.updated=maxDate(next.updated,lessonDate);
  }

  return {state:next,changes,preservedDowngrades};
}
