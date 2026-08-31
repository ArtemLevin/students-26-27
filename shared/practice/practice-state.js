export const PRACTICE_SCHEMA_VERSION=1;
export const MAX_PRACTICE_EVENTS=200;
export const MAX_PRACTICE_SESSIONS=60;

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const integer=(value,fallback=0,min=0)=>value!==null&&value!==''&&Number.isInteger(Number(value))?Math.max(min,Number(value)):fallback;
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;
const text=value=>typeof value==='string'?value:null;

export function createEmptyPracticeState(now=()=>new Date().toISOString()){
  return {schemaVersion:PRACTICE_SCHEMA_VERSION,updatedAt:now(),competencies:{},sessions:{},events:[]};
}

export function normalizeCompetencyPractice(raw={}){
  const value=object(raw);
  return {
    status:value.status==='inactive'?'inactive':'active',
    activatedAt:iso(value.activatedAt),
    dueAt:date(value.dueAt),
    intervalStep:integer(value.intervalStep,-1,-1),
    intervalDays:integer(value.intervalDays,0),
    attempts:integer(value.attempts),
    correct:integer(value.correct),
    streak:integer(value.streak),
    lapses:integer(value.lapses),
    consecutiveLapses:integer(value.consecutiveLapses),
    repeatedLapse:Boolean(value.repeatedLapse),
    hintsUsedTotal:integer(value.hintsUsedTotal),
    lastAttemptAt:iso(value.lastAttemptAt),
    lastRating:['again','hard','good','easy'].includes(value.lastRating)?value.lastRating:null,
    lastOutcome:['correct','incorrect'].includes(value.lastOutcome)?value.lastOutcome:null,
    lastExerciseSeed:text(value.lastExerciseSeed),
    lastGeneratorKey:text(value.lastGeneratorKey),
    lastGeneratorVersion:integer(value.lastGeneratorVersion,0)
  };
}

function normalizeSessionItem(raw={}){
  const value=object(raw);
  if(!text(value.competencyId)||!text(value.seed)||!text(value.generatorKey))return null;
  return {
    competencyId:value.competencyId,
    seed:value.seed,
    generatorKey:value.generatorKey,
    generatorVersion:integer(value.generatorVersion,1,1),
    difficulty:Math.max(1,Math.min(3,integer(value.difficulty,1,1))),
    status:['pending','answering','awaiting-rating','completed'].includes(value.status)?value.status:'pending',
    attemptCount:integer(value.attemptCount),
    hintsUsed:integer(value.hintsUsed),
    outcome:['correct','incorrect'].includes(value.outcome)?value.outcome:null,
    rating:['again','hard','good','easy'].includes(value.rating)?value.rating:null,
    startedAt:iso(value.startedAt),
    checkedAt:iso(value.checkedAt),
    durationMs:integer(value.durationMs),
    remediation:Boolean(value.remediation)
  };
}

function normalizeSession(raw,key){
  const value=object(raw),items=Array.isArray(value.items)?value.items.map(normalizeSessionItem).filter(Boolean):[];
  return {
    sessionId:text(value.sessionId)||key,
    date:date(value.date)||date(key)||null,
    startedAt:iso(value.startedAt),
    completedAt:iso(value.completedAt),
    status:value.status==='completed'?'completed':value.status==='active'?'active':'planned',
    currentIndex:Math.max(0,Math.min(items.length?items.length-1:0,integer(value.currentIndex))),
    items,
    exerciseIds:items.map(item=>`${item.generatorKey}:v${item.generatorVersion}:${item.seed}`),
    correct:items.filter(item=>item.status==='completed'&&item.outcome==='correct').length,
    total:items.length
  };
}

function normalizeEvent(raw={}){
  const value=object(raw);
  if(!text(value.sessionId)||!text(value.exerciseId)||!text(value.competencyId)||!iso(value.timestamp))return null;
  return {
    eventVersion:1,timestamp:value.timestamp,sessionId:value.sessionId,exerciseId:value.exerciseId,
    competencyId:value.competencyId,generatorKey:text(value.generatorKey)||'',generatorVersion:integer(value.generatorVersion,1,1),
    seed:text(value.seed)||'',difficulty:Math.max(1,Math.min(3,integer(value.difficulty,1,1))),attemptCount:integer(value.attemptCount),
    hintsUsed:integer(value.hintsUsed),outcome:value.outcome==='correct'?'correct':'incorrect',
    rating:['again','hard','good','easy'].includes(value.rating)?value.rating:'again',durationMs:integer(value.durationMs)
  };
}

export function normalizePracticeState(raw,now=()=>new Date().toISOString()){
  const source=object(raw),state=createEmptyPracticeState(now);
  state.updatedAt=iso(source.updatedAt)||state.updatedAt;
  state.competencies=Object.fromEntries(Object.entries(object(source.competencies)).map(([id,value])=>[id,normalizeCompetencyPractice(value)]));
  const sessions=Object.entries(object(source.sessions)).map(([key,value])=>[key,normalizeSession(value,key)]).filter(([,value])=>value.date);
  state.sessions=Object.fromEntries(sessions.sort(([a],[b])=>b.localeCompare(a)).slice(0,MAX_PRACTICE_SESSIONS));
  state.events=(Array.isArray(source.events)?source.events:[]).map(normalizeEvent).filter(Boolean).slice(-MAX_PRACTICE_EVENTS);
  return state;
}

export function migratePracticeState(raw,now=()=>new Date().toISOString()){
  return normalizePracticeState(raw,now);
}

export function activateCompetency(state,competencyId,{today,now=()=>new Date().toISOString()}={}){
  const next=normalizePracticeState(state,now),current=next.competencies[competencyId];
  let changed=false;
  if(current){
    if(current.status==='inactive'){current.status='active';changed=true;}
    if(!current.dueAt&&today){current.dueAt=today;changed=true;}
  }else{
    next.competencies[competencyId]={...normalizeCompetencyPractice({status:'active'}),activatedAt:now(),dueAt:today||null};
    changed=true;
  }
  if(changed)next.updatedAt=now();
  return next;
}

export function syncLessonActivations(state,lessons=[],config={},today,now=()=>new Date().toISOString()){
  let next=normalizePracticeState(state,now);
  if(!config.features?.lessonAutoActivation)return next;
  const configured=new Set(Object.keys(config.competencies||{}));
  const ordered=[...lessons].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  for(const lesson of ordered){
    for(const outcome of lesson.outcomes||[]){
      if(!outcome?.competencyId||!configured.has(outcome.competencyId))continue;
      const existed=next.competencies[outcome.competencyId];
      next=activateCompetency(next,outcome.competencyId,{today,now});
      if(!existed&&lesson.date)next.competencies[outcome.competencyId].activatedAt=`${lesson.date}T12:00:00.000Z`;
    }
  }
  return next;
}

export function saveSession(state,session,now=()=>new Date().toISOString()){
  const next=normalizePracticeState(state,now),normalized=normalizeSession(session,session.date||session.sessionId);
  if(!normalized.date)throw new Error('Session date is required');
  next.sessions[normalized.date]=normalized;
  next.updatedAt=now();
  return normalizePracticeState(next,now);
}

export function appendPracticeEvent(state,event,now=()=>new Date().toISOString()){
  const next=normalizePracticeState(state,now),normalized=normalizeEvent(event);
  if(!normalized)throw new Error('Invalid practice event');
  next.events=[...next.events,normalized].slice(-MAX_PRACTICE_EVENTS);
  next.updatedAt=now();
  return next;
}
