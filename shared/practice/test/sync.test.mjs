import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MemoryPracticeStorage} from '../practice-storage.js';
import {appendPracticeEvent,createEmptyPracticeState,normalizePracticeState,serverPracticeState} from '../practice-state.js';
import {PracticeSyncAuthError,PracticeSyncConflict,PracticeSyncCoordinator,reconcilePracticeStates} from '../practice-sync.js';

const now=()=> '2026-08-31T12:00:00.000Z';
const event=(id='event-1')=>({eventVersion:2,eventId:id,timestamp:now(),sessionId:'2026-08-31',exerciseId:`demo:v1:${id}`,competencyId:'skill',generatorKey:'demo.generator',generatorVersion:1,seed:id,difficulty:1,attemptCount:1,hintsUsed:0,outcome:'correct',rating:'good',durationMs:1000});

class FakeServer{
  constructor(state=createEmptyPracticeState(now,'server-device')){this.state={...serverPracticeState(state,now),revision:0};this.revision=0;this.events=new Map();this.exists=true;}
  async bootstrap(){return {schemaVersion:1,profileExists:this.exists,revision:this.revision,state:this.exists?structuredClone(this.state):null,serverTime:now()};}
  async putState(payload){
    if(!this.exists){if(payload.baseRevision!==0)throw new PracticeSyncConflict({revision:0,state:this.state,serverTime:now()});this.exists=true;}
    if(payload.baseRevision!==this.revision)throw new PracticeSyncConflict({schemaVersion:1,error:'revision-conflict',revision:this.revision,state:structuredClone(this.state),serverTime:now()});
    this.revision+=1;this.state={...structuredClone(payload.state),revision:this.revision};return {schemaVersion:1,revision:this.revision,state:structuredClone(this.state),serverTime:now()};
  }
  async eventsBatch(payload){
    const accepted=[],duplicates=[];
    for(const item of payload.events){if(this.events.has(item.eventId)){duplicates.push(item.eventId);continue;}this.events.set(item.eventId,structuredClone(item));accepted.push(item.eventId);}
    if(accepted.length){this.revision+=1;const merged=new Map((this.state.events||[]).map(item=>[item.eventId,item]));for(const id of accepted)merged.set(id,this.events.get(id));this.state={...this.state,revision:this.revision,events:[...merged.values()].slice(-200)};}
    return {schemaVersion:1,acceptedEventIds:accepted,duplicateEventIds:duplicates,revision:this.revision,serverTime:now()};
  }
}

test('practice-sync-v1 fixture has the expected cross-repo lifecycle',()=>{
  const fixture=JSON.parse(fs.readFileSync('contracts/practice-sync-v1/fixtures/sync-cycle.json','utf8'));
  assert.equal(fixture.schemaVersion,1);assert.equal(fixture.bootstrap.state.schemaVersion,2);assert.equal(fixture.eventBatch.events[0].eventVersion,2);assert.equal(fixture.eventBatch.events[0].eventId,'fixture-event-001');assert.equal(fixture.conflict.error,'revision-conflict');
});

test('offline outbox survives failures and duplicate replay is acknowledged',async()=>{
  let local=appendPracticeEvent(createEmptyPracticeState(now,'device-a'),event(),now),storage=new MemoryPracticeStorage(local,now);
  const offline={bootstrap:async()=>{throw new Error('network down');}};
  const failed=await new PracticeSyncCoordinator({storage,transport:offline,enabled:true,now}).bootstrap();
  assert.equal(failed.status,'offline');assert.equal(storage.load().sync.outbox.length,1);
  const server=new FakeServer();const synced=await new PracticeSyncCoordinator({storage,transport:server,enabled:true,now}).bootstrap();
  assert.equal(synced.status,'synced');assert.equal(storage.load().sync.outbox.length,0);assert.equal(server.events.size,1);
  storage.state.sync.outbox=[event()];const duplicate=await new PracticeSyncCoordinator({storage,transport:server,enabled:true,now}).flushOutbox();assert.equal(duplicate.state.sync.outbox.length,0);assert.equal(server.events.size,1);
});

test('device B bootstrap receives event history uploaded by device A',async()=>{
  const server=new FakeServer(),aStorage=new MemoryPracticeStorage(appendPracticeEvent(createEmptyPracticeState(now,'device-a'),event('a1'),now),now);
  await new PracticeSyncCoordinator({storage:aStorage,transport:server,enabled:true,now}).bootstrap();
  const bStorage=new MemoryPracticeStorage(createEmptyPracticeState(now,'device-b'),now),b=await new PracticeSyncCoordinator({storage:bStorage,transport:server,enabled:true,now}).bootstrap();
  assert.equal(b.status,'synced');assert.equal(b.state.events.some(item=>item.eventId==='a1'),true);assert.equal(b.state.clientInstanceId,'device-b');assert.equal(b.state.revision,server.revision);
});

test('409 reconciliation preserves canonical schedule and retries from server revision',async()=>{
  const remote=createEmptyPracticeState(now,'server');remote.competencies.skill={status:'active',activatedAt:now(),dueAt:'2026-09-05',intervalStep:2,intervalDays:7,attempts:2,correct:2,streak:2,lapses:0,consecutiveLapses:0,repeatedLapse:false,hintsUsedTotal:0,lastAttemptAt:now(),lastRating:'good',lastOutcome:'correct',lastExerciseSeed:'r',lastGeneratorKey:'demo.generator',lastGeneratorVersion:1};
  const server=new FakeServer(remote);server.revision=3;server.state={...serverPracticeState(remote,now),revision:3};
  const local=createEmptyPracticeState(now,'device');local.revision=2;local.competencies.skill={...remote.competencies.skill,dueAt:'2026-09-01',attempts:9};
  const storage=new MemoryPracticeStorage(local,now),result=await new PracticeSyncCoordinator({storage,transport:server,enabled:true,now}).pushState();
  assert.equal(result.status,'synced');assert.equal(result.conflict,true);assert.equal(result.state.competencies.skill.dueAt,'2026-09-05');assert.ok(result.state.sync.conflicts.some(item=>item.type==='revision'));
});

test('same-day incompatible sessions keep server canonical and local diagnostic record',()=>{
  const item=(seed)=>({competencyId:'skill',seed,generatorKey:'demo.generator',generatorVersion:1,difficulty:1,status:'pending',attemptCount:0,hintsUsed:0,outcome:null,rating:null,startedAt:null,checkedAt:null,durationMs:0,remediation:false});
  const local=createEmptyPracticeState(now,'a'),remote=createEmptyPracticeState(now,'b');local.sessions['2026-08-31']={sessionId:'s',date:'2026-08-31',startedAt:now(),completedAt:null,status:'active',currentIndex:0,items:[item('local')]};remote.sessions['2026-08-31']={sessionId:'s',date:'2026-08-31',startedAt:now(),completedAt:null,status:'active',currentIndex:0,items:[item('remote')]};
  const merged=reconcilePracticeStates(local,remote,now);assert.equal(merged.sessions['2026-08-31'].items[0].seed,'remote');assert.ok(merged.sync.conflicts.some(item=>item.type==='session-exercise-list'));
});

test('auth expiry and disabled feature flag both preserve local usability',async()=>{
  const state=appendPracticeEvent(createEmptyPracticeState(now,'device'),event(),now),storage=new MemoryPracticeStorage(state,now),auth={bootstrap:async()=>{throw new PracticeSyncAuthError();}};
  const expired=await new PracticeSyncCoordinator({storage,transport:auth,enabled:true,now}).bootstrap();assert.equal(expired.status,'auth-expired');assert.equal(storage.load().events.length,1);
  const disabled=await new PracticeSyncCoordinator({storage,transport:auth,enabled:false,now}).bootstrap();assert.equal(disabled.status,'local-only');assert.equal(disabled.state.events.length,1);
});
