import {
  acknowledgePracticeEvents,
  normalizePracticeState,
  serverPracticeState,
  updatePracticeSyncMeta
} from './practice-state.js';

const json=value=>structuredClone(value);
const exerciseIds=session=>session?.exerciseIds||session?.items?.map(item=>`${item.generatorKey}:v${item.generatorVersion}:${item.seed}`)||[];
const sameList=(left,right)=>JSON.stringify(exerciseIds(left))===JSON.stringify(exerciseIds(right));

function uniqueEvents(events=[]){const seen=new Set(),result=[];for(const event of events){if(!event?.eventId||seen.has(event.eventId))continue;seen.add(event.eventId);result.push(json(event));}return result;}
function mergeCompatibleSession(local,remote){
  if(local.status==='completed'&&remote.status!=='completed')return json(local);
  if(remote.status==='completed'&&local.status!=='completed')return json(remote);
  const merged=json(remote),localByExercise=new Map(exerciseIds(local).map((id,index)=>[id,local.items[index]]));
  merged.items=(remote.items||[]).map((item,index)=>{
    const localItem=localByExercise.get(exerciseIds(remote)[index]);
    if(!localItem)return item;
    if(localItem.status==='completed'&&item.status!=='completed')return json(localItem);
    return item;
  });
  merged.currentIndex=Math.max(Number(local.currentIndex||0),Number(remote.currentIndex||0));
  if(local.status==='completed'||remote.status==='completed'){merged.status='completed';merged.completedAt=remote.completedAt||local.completedAt;}
  return merged;
}

export function reconcilePracticeStates(localRaw,remoteRaw,now=()=>new Date().toISOString()){
  const local=normalizePracticeState(localRaw,now),remote=normalizePracticeState(remoteRaw,now),conflicts=[];
  const competencies={...json(local.competencies),...json(remote.competencies)},sessions={};
  for(const date of new Set([...Object.keys(local.sessions),...Object.keys(remote.sessions)])){
    const localSession=local.sessions[date],remoteSession=remote.sessions[date];
    if(!remoteSession){sessions[date]=json(localSession);continue;}
    if(!localSession){sessions[date]=json(remoteSession);continue;}
    if(sameList(localSession,remoteSession)){sessions[date]=mergeCompatibleSession(localSession,remoteSession);continue;}
    sessions[date]=json(remoteSession);
    conflicts.push({type:'session-exercise-list',date,localExerciseIds:exerciseIds(localSession),remoteExerciseIds:exerciseIds(remoteSession),recordedAt:now()});
  }
  const merged=normalizePracticeState({
    ...remote,
    revision:remote.revision,
    clientInstanceId:local.clientInstanceId,
    updatedAt:[local.updatedAt,remote.updatedAt].filter(Boolean).sort().at(-1)||now(),
    competencies,
    sessions,
    events:uniqueEvents([...remote.events,...local.events]),
    sync:{
      ...local.sync,
      bound:true,
      outbox:local.sync.outbox,
      conflicts:[...local.sync.conflicts,...conflicts]
    }
  },now);
  return merged;
}

export class PracticeSyncConflict extends Error{
  constructor(payload){super('PracticeState revision conflict');this.name='PracticeSyncConflict';this.payload=payload;}
}
export class PracticeSyncAuthError extends Error{
  constructor(status=401){super('Practice sync authentication expired');this.name='PracticeSyncAuthError';this.status=status;}
}

export class PracticeSyncHttpTransport{
  constructor({baseUrl='',csrfToken=null,fetchImpl=globalThis.fetch}={}){if(typeof fetchImpl!=='function')throw new TypeError('fetch implementation is required');this.baseUrl=baseUrl.replace(/\/$/,'');this.csrfToken=csrfToken;this.fetchImpl=fetchImpl;}
  token(){return typeof this.csrfToken==='function'?this.csrfToken():this.csrfToken;}
  async request(path,{method='GET',body=null}={}){
    const headers={'Accept':'application/json'};if(body!==null)headers['Content-Type']='application/json';if(method!=='GET'&&this.token())headers['X-CSRF-Token']=this.token();
    const response=await this.fetchImpl(`${this.baseUrl}${path}`,{method,headers,credentials:'same-origin',body:body===null?undefined:JSON.stringify(body)});
    let payload=null;try{payload=await response.json();}catch(_){payload=null;}
    if(response.status===401)throw new PracticeSyncAuthError(401);
    if(response.status===409&&payload?.state)throw new PracticeSyncConflict(payload);
    if(!response.ok){const error=new Error(payload?.error?.message||`Practice sync HTTP ${response.status}`);error.status=response.status;error.payload=payload;throw error;}
    return payload;
  }
  bootstrap(){return this.request('/api/v1/practice/me/bootstrap');}
  state(){return this.request('/api/v1/practice/me/state');}
  eventsBatch(payload){return this.request('/api/v1/practice/me/events:batch',{method:'POST',body:payload});}
  putState(payload){return this.request('/api/v1/practice/me/state',{method:'PUT',body:payload});}
  putMetadata(payload){return this.request('/api/v1/practice/me/metadata',{method:'PUT',body:payload});}
}

export class PracticeSyncCoordinator{
  constructor({storage,transport,enabled=false,rehydrate=()=>{},metadataProvider=null,now=()=>new Date().toISOString(),batchSize=100}={}){
    if(!storage)throw new TypeError('Practice storage is required');if(!transport)throw new TypeError('Practice sync transport is required');
    this.storage=storage;this.transport=transport;this.enabled=Boolean(enabled);this.rehydrate=rehydrate;this.metadataProvider=metadataProvider;this.now=now;this.batchSize=Math.max(1,Math.min(100,Number(batchSize)||100));
  }
  load(){return normalizePracticeState(this.storage.load(),this.now);}
  save(state,{rehydrate=true}={}){const next=normalizePracticeState(state,this.now);this.storage.save(next);if(rehydrate)this.rehydrate(next);return next;}
  markFailure(state,error){return this.save(updatePracticeSyncMeta(state,{lastError:error?.name||String(error)},this.now),{rehydrate:false});}
  async bootstrap(){
    let local=this.load();if(!this.enabled)return {status:'local-only',state:local};
    try{
      const remote=await this.transport.bootstrap();
      if(!remote.profileExists){
        const created=await this.transport.putState({schemaVersion:1,baseRevision:0,state:{...serverPracticeState(local,this.now),revision:0}});
        local=reconcilePracticeStates(local,created.state,this.now);local=updatePracticeSyncMeta(local,{revision:created.revision,bound:true,lastSuccessfulSyncAt:this.now(),lastError:null},this.now);this.save(local);
      }else{
        local=reconcilePracticeStates(local,remote.state,this.now);local=updatePracticeSyncMeta(local,{revision:remote.revision,bound:true,lastSuccessfulSyncAt:this.now(),lastError:null},this.now);this.save(local);
      }
      const flushed=await this.flushOutbox();return {status:'synced',state:flushed.state,accepted:flushed.accepted};
    }catch(error){this.markFailure(local,error);if(error instanceof PracticeSyncAuthError)return {status:'auth-expired',state:this.load(),error};return {status:'offline',state:this.load(),error};}
  }
  async flushOutbox(){
    let state=this.load(),accepted=0;if(!this.enabled)return {status:'local-only',state,accepted};
    while(state.sync.outbox.length){
      const events=state.sync.outbox.slice(0,this.batchSize),response=await this.transport.eventsBatch({schemaVersion:1,clientInstanceId:state.clientInstanceId,events});
      const acked=[...(response.acceptedEventIds||[]),...(response.duplicateEventIds||[])];accepted+=response.acceptedEventIds?.length||0;
      state=acknowledgePracticeEvents(state,acked,this.now);state=updatePracticeSyncMeta(state,{revision:response.revision,bound:true,lastSuccessfulSyncAt:this.now(),lastError:null},this.now);this.save(state,{rehydrate:false});
      if(!acked.length)break;
    }
    return {status:'synced',state,accepted};
  }
  async pushState({retryConflict=true}={}){
    let local=this.load();if(!this.enabled)return {status:'local-only',state:local};
    try{
      const response=await this.transport.putState({schemaVersion:1,baseRevision:local.revision,state:serverPracticeState(local,this.now)});
      local=reconcilePracticeStates(local,response.state,this.now);local=updatePracticeSyncMeta(local,{revision:response.revision,bound:true,lastSuccessfulSyncAt:this.now(),lastError:null},this.now);return {status:'synced',state:this.save(local),conflict:false};
    }catch(error){
      if(error instanceof PracticeSyncConflict&&retryConflict){
        const canonical=reconcilePracticeStates(local,error.payload.state,this.now);const marked=updatePracticeSyncMeta(canonical,{revision:error.payload.revision,bound:true,conflict:{type:'revision',baseRevision:local.revision,serverRevision:error.payload.revision,recordedAt:this.now()}},this.now);this.save(marked);
        const retried=await this.pushState({retryConflict:false});return {...retried,conflict:true};
      }
      this.markFailure(local,error);if(error instanceof PracticeSyncAuthError)return {status:'auth-expired',state:this.load(),error};return {status:'offline',state:this.load(),error};
    }
  }
  async syncMetadata(){
    if(!this.enabled||typeof this.metadataProvider!=='function'||typeof this.transport.putMetadata!=='function')return {status:'skipped'};
    const payload=this.metadataProvider();if(!payload)return {status:'skipped'};
    const response=await this.transport.putMetadata(payload);return {status:'synced',response};
  }
  async syncNow(){
    const boot=await this.bootstrap();if(boot.status!=='synced')return boot;
    const flushed=await this.flushOutbox();if(flushed.status!=='synced')return flushed;
    const pushed=await this.pushState();if(pushed.status!=='synced')return pushed;
    try{return {...pushed,analyticsMetadata:await this.syncMetadata()};}
    catch(error){return {...pushed,analyticsMetadata:{status:'failed',error}};}
  }
}
