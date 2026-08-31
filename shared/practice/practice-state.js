import {isCalendarDate,resolveActivationPolicy} from './activation-policy.js';

export const PRACTICE_SCHEMA_VERSION=2;
export const MAX_PRACTICE_EVENTS=200;
export const MAX_PRACTICE_SESSIONS=60;
export const MAX_SYNC_CONFLICTS=20;

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const integer=(value,fallback=0,min=0)=>value!==null&&value!==''&&Number.isInteger(Number(value))?Math.max(min,Number(value)):fallback;
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const date=value=>isCalendarDate(value)?value:null;
const text=value=>typeof value==='string'?value:null;
const clientId=()=>globalThis.crypto?.randomUUID?.()||`practice-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function stableHash(value){let hash=2166136261;for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
function migratedEventId(value,index){return `migrated-${stableHash(JSON.stringify([value.timestamp,value.sessionId,value.exerciseId,value.competencyId,value.outcome,value.rating,index]))}`;}

export function createEmptyPracticeState(now=()=>new Date().toISOString(),instanceId=clientId()){
  return {schemaVersion:PRACTICE_SCHEMA_VERSION,revision:0,clientInstanceId:instanceId,updatedAt:now(),competencies:{},sessions:{},events:[],sync:{bound:false,outbox:[],lastSuccessfulSyncAt:null,lastError:null,conflicts:[]}};
}

export function normalizeCompetencyPractice(raw={}){
  const value=object(raw);
  return {
    status:value.status==='inactive'?'inactive':'active',activatedAt:iso(value.activatedAt),dueAt:date(value.dueAt),intervalStep:integer(value.intervalStep,-1,-1),intervalDays:integer(value.intervalDays,0),attempts:integer(value.attempts),correct:integer(value.correct),streak:integer(value.streak),lapses:integer(value.lapses),consecutiveLapses:integer(value.consecutiveLapses),repeatedLapse:Boolean(value.repeatedLapse),hintsUsedTotal:integer(value.hintsUsedTotal),lastAttemptAt:iso(value.lastAttemptAt),lastRating:['again','hard','good','easy'].includes(value.lastRating)?value.lastRating:null,lastOutcome:['correct','incorrect'].includes(value.lastOutcome)?value.lastOutcome:null,lastExerciseSeed:text(value.lastExerciseSeed),lastGeneratorKey:text(value.lastGeneratorKey),lastGeneratorVersion:integer(value.lastGeneratorVersion,0)
  };
}

function normalizeSessionItem(raw={}){
  const value=object(raw);if(!text(value.competencyId)||!text(value.seed)||!text(value.generatorKey))return null;
  return {competencyId:value.competencyId,seed:value.seed,generatorKey:value.generatorKey,generatorVersion:integer(value.generatorVersion,1,1),difficulty:Math.max(1,Math.min(3,integer(value.difficulty,1,1))),status:['pending','answering','awaiting-rating','completed'].includes(value.status)?value.status:'pending',attemptCount:integer(value.attemptCount),hintsUsed:integer(value.hintsUsed),outcome:['correct','incorrect'].includes(value.outcome)?value.outcome:null,rating:['again','hard','good','easy'].includes(value.rating)?value.rating:null,startedAt:iso(value.startedAt),checkedAt:iso(value.checkedAt),durationMs:integer(value.durationMs),remediation:Boolean(value.remediation)};
}

function normalizeSession(raw,key){
  const value=object(raw),items=Array.isArray(value.items)?value.items.map(normalizeSessionItem).filter(Boolean):[];
  return {sessionId:text(value.sessionId)||key,date:date(value.date)||date(key)||null,startedAt:iso(value.startedAt),completedAt:iso(value.completedAt),status:value.status==='completed'?'completed':value.status==='active'?'active':'planned',currentIndex:Math.max(0,Math.min(items.length?items.length-1:0,integer(value.currentIndex))),items,exerciseIds:items.map(item=>`${item.generatorKey}:v${item.generatorVersion}:${item.seed}`),correct:items.filter(item=>item.status==='completed'&&item.outcome==='correct').length,total:items.length};
}

function normalizeEvent(raw={},index=0){
  const value=object(raw);if(!text(value.sessionId)||!text(value.exerciseId)||!text(value.competencyId)||!iso(value.timestamp))return null;
  return {eventVersion:2,eventId:text(value.eventId)||migratedEventId(value,index),timestamp:value.timestamp,sessionId:value.sessionId,exerciseId:value.exerciseId,competencyId:value.competencyId,generatorKey:text(value.generatorKey)||'',generatorVersion:integer(value.generatorVersion,1,1),seed:text(value.seed)||'',difficulty:Math.max(1,Math.min(3,integer(value.difficulty,1,1))),attemptCount:integer(value.attemptCount),hintsUsed:integer(value.hintsUsed),outcome:value.outcome==='correct'?'correct':'incorrect',rating:['again','hard','good','easy'].includes(value.rating)?value.rating:'again',durationMs:integer(value.durationMs)};
}

function uniqueEvents(events=[]){const seen=new Set(),result=[];for(const event of events){if(!event||seen.has(event.eventId))continue;seen.add(event.eventId);result.push(event);}return result;}
function normalizeSync(raw,events,{legacy=false}={}){
  const value=object(raw),outbox=legacy?events:(Array.isArray(value.outbox)?value.outbox.map(normalizeEvent).filter(Boolean):[]);
  return {bound:Boolean(value.bound),outbox:uniqueEvents(outbox),lastSuccessfulSyncAt:iso(value.lastSuccessfulSyncAt),lastError:text(value.lastError),conflicts:(Array.isArray(value.conflicts)?value.conflicts.filter(item=>item&&typeof item==='object'):[]).slice(-MAX_SYNC_CONFLICTS)};
}

export function normalizePracticeState(raw,now=()=>new Date().toISOString()){
  const source=object(raw),legacy=integer(source.schemaVersion,1,1)<2,state=createEmptyPracticeState(now,text(source.clientInstanceId)||clientId());
  state.revision=integer(source.revision,0);state.updatedAt=iso(source.updatedAt)||state.updatedAt;
  state.competencies=Object.fromEntries(Object.entries(object(source.competencies)).map(([id,value])=>[id,normalizeCompetencyPractice(value)]));
  const sessions=Object.entries(object(source.sessions)).map(([key,value])=>[key,normalizeSession(value,key)]).filter(([,value])=>value.date);
  state.sessions=Object.fromEntries(sessions.sort(([a],[b])=>b.localeCompare(a)).slice(0,MAX_PRACTICE_SESSIONS));
  state.events=uniqueEvents((Array.isArray(source.events)?source.events:[]).map((event,index)=>normalizeEvent(event,index)).filter(Boolean)).slice(-MAX_PRACTICE_EVENTS);
  state.sync=normalizeSync(source.sync,state.events,{legacy});return state;
}

export function migratePracticeState(raw,now=()=>new Date().toISOString()){return normalizePracticeState(raw,now);}
export function serverPracticeState(state,now=()=>new Date().toISOString()){
  const value=normalizePracticeState(state,now);return {schemaVersion:2,revision:value.revision,clientInstanceId:value.clientInstanceId,updatedAt:value.updatedAt,competencies:value.competencies,sessions:value.sessions,events:value.events};
}
export function acknowledgePracticeEvents(state,eventIds=[],now=()=>new Date().toISOString()){
  const next=normalizePracticeState(state,now),acked=new Set(eventIds);next.sync.outbox=next.sync.outbox.filter(event=>!acked.has(event.eventId));next.updatedAt=now();return next;
}
export function updatePracticeSyncMeta(state,{revision,bound,lastSuccessfulSyncAt,lastError,conflict}={},now=()=>new Date().toISOString()){
  const next=normalizePracticeState(state,now);if(Number.isInteger(revision)&&revision>=0)next.revision=revision;if(bound!==undefined)next.sync.bound=Boolean(bound);if(lastSuccessfulSyncAt!==undefined)next.sync.lastSuccessfulSyncAt=lastSuccessfulSyncAt?iso(lastSuccessfulSyncAt):null;if(lastError!==undefined)next.sync.lastError=lastError?String(lastError):null;if(conflict)next.sync.conflicts=[...next.sync.conflicts,structuredClone(conflict)].slice(-MAX_SYNC_CONFLICTS);next.updatedAt=now();return next;
}

export function activateCompetency(state,competencyId,{today,now=()=>new Date().toISOString()}={}){
  const next=normalizePracticeState(state,now),current=next.competencies[competencyId];let changed=false;
  if(current){if(current.status==='inactive'){current.status='active';changed=true;}if(!current.dueAt&&today){current.dueAt=today;changed=true;}}
  else{next.competencies[competencyId]={...normalizeCompetencyPractice({status:'active'}),activatedAt:now(),dueAt:today||null};changed=true;}
  if(changed)next.updatedAt=now();return next;
}

export function syncLessonActivations(state,lessons=[],config={},today,now=()=>new Date().toISOString()){
  let next=normalizePracticeState(state,now);if(!config.features?.lessonAutoActivation||!isCalendarDate(today))return next;const mappings=config.competencies||{},ordered=[...lessons].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  for(const lesson of ordered){if(!isCalendarDate(lesson?.date)||lesson.date>today)continue;for(const outcome of lesson.outcomes||[]){const mapping=outcome?.competencyId?mappings[outcome.competencyId]:null;if(!mapping||resolveActivationPolicy(mapping)!=='lesson')continue;const existed=next.competencies[outcome.competencyId];next=activateCompetency(next,outcome.competencyId,{today,now});if(!existed)next.competencies[outcome.competencyId].activatedAt=`${lesson.date}T12:00:00.000Z`;}}
  return next;
}

export function saveSession(state,session,now=()=>new Date().toISOString()){
  const next=normalizePracticeState(state,now),normalized=normalizeSession(session,session.date||session.sessionId);if(!normalized.date)throw new Error('Session date is required');next.sessions[normalized.date]=normalized;next.updatedAt=now();return normalizePracticeState(next,now);
}

export function appendPracticeEvent(state,event,now=()=>new Date().toISOString()){
  const next=normalizePracticeState(state,now),normalized=normalizeEvent(event,next.events.length);if(!normalized)throw new Error('Invalid practice event');
  next.events=uniqueEvents([...next.events,normalized]).slice(-MAX_PRACTICE_EVENTS);next.sync.outbox=uniqueEvents([...next.sync.outbox,normalized]);next.updatedAt=now();return next;
}
