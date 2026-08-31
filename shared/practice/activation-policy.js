export const ACTIVATION_POLICIES=Object.freeze(['lesson','always','manual','disabled']);

export function isCalendarDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  const stamp=new Date(Date.UTC(year,month-1,day));
  return stamp.getUTCFullYear()===year&&stamp.getUTCMonth()===month-1&&stamp.getUTCDate()===day;
}

export function assertCalendarDate(value,label='date'){
  if(!isCalendarDate(value))throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

export function resolveActivationPolicy(mapping={}){
  if(mapping.activation!==undefined){
    if(!ACTIVATION_POLICIES.includes(mapping.activation))throw new Error(`Invalid activation policy: ${mapping.activation}`);
    return mapping.activation;
  }
  if(mapping.active===true)return 'always';
  if(mapping.active===false)return 'lesson';
  return 'lesson';
}

export function validateActivationMapping(mapping={},label='mapping'){
  const policy=resolveActivationPolicy(mapping);
  if(mapping.active!==undefined&&typeof mapping.active!=='boolean')throw new Error(`${label}: active must be boolean when present`);
  if(mapping.activation!==undefined&&mapping.active!==undefined){
    const legacy=mapping.active?'always':'lesson';
    if(policy!==legacy)throw new Error(`${label}: activation ${policy} conflicts with legacy active:${mapping.active}`);
  }
  return policy;
}

export function validateLessonDates(lessons=[]){
  for(const lesson of lessons){
    if(!isCalendarDate(lesson?.date))throw new Error(`Invalid lesson date: ${lesson?.date}`);
  }
  return true;
}
