import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPracticeAnalyticsMetadata,PRACTICE_ANALYTICS_METADATA_VERSION} from '../practice-analytics-metadata.js';
import {MemoryPracticeStorage} from '../practice-storage.js';
import {createEmptyPracticeState,serverPracticeState} from '../practice-state.js';
import {PracticeSyncCoordinator} from '../practice-sync.js';

const now=()=> '2026-09-01T09:00:00.000Z';

test('practice-analytics-v1 fixture and schema stay aligned',()=>{
  const schema=JSON.parse(fs.readFileSync('contracts/practice-analytics-v1/schema.json','utf8'));
  const fixture=JSON.parse(fs.readFileSync('contracts/practice-analytics-v1/fixtures/metadata.json','utf8'));
  assert.equal(schema.properties.schemaVersion.const,PRACTICE_ANALYTICS_METADATA_VERSION);
  assert.equal(fixture.schemaVersion,PRACTICE_ANALYTICS_METADATA_VERSION);
  assert.equal(fixture.competencies[0].competencyId,'algebra.linear');
  assert.equal(fixture.competencies[0].masteryLevel,3);
});

test('metadata builder keeps mastery separate and links latest lesson/provider',()=>{
  const groups=[{id:'g',title:'Алгебра',items:[{id:'skill',title:'Линейные уравнения',level:1}]}];
  const lessons=[
    {date:'2026-08-20',href:'20.08.26.html',outcomes:[{competencyId:'skill',practiceDisposition:'generator'}]},
    {date:'2026-08-31',href:'31.08.26.html',outcomes:[{competencyId:'skill',practiceDisposition:'generator'}]}
  ];
  const config={studentId:'student',competencies:{skill:{generator:'algebra.linear'}}};
  const payload=buildPracticeAnalyticsMetadata({studentId:'student',groups,studentLevels:{skill:4},lessons,config,sourceRevision:'abc',generatedAt:now});
  assert.equal(payload.schemaVersion,1);assert.equal(payload.sourceRevision,'abc');
  assert.deepEqual(payload.competencies[0],{
    competencyId:'skill',title:'Линейные уравнения',groupTitle:'Алгебра',masteryLevel:4,
    sourceLessonDate:'2026-08-31',sourceLessonHref:'31.08.26.html',provider:'algebra.linear',coverageStatus:'covered-generator'
  });
});

test('metadata builder falls back to practice mapping ids when visual catalog is unavailable',()=>{
  const payload=buildPracticeAnalyticsMetadata({studentId:'student',studentLevels:{skill:2},lessons:[],config:{competencies:{skill:{generator:'demo'}}},generatedAt:now});
  assert.equal(payload.competencies.length,1);assert.equal(payload.competencies[0].competencyId,'skill');assert.equal(payload.competencies[0].masteryLevel,2);
});

test('canonical sync uploads analytics metadata without making it part of PracticeState',async()=>{
  const storage=new MemoryPracticeStorage(createEmptyPracticeState(now,'device'),now),metadata=[];
  let revision=0,state={...serverPracticeState(storage.load(),now),revision};
  const transport={
    async bootstrap(){return {schemaVersion:1,profileExists:true,revision,state:structuredClone(state),serverTime:now()};},
    async eventsBatch(){return {schemaVersion:1,acceptedEventIds:[],duplicateEventIds:[],revision,serverTime:now()};},
    async putState(payload){revision+=1;state={...structuredClone(payload.state),revision};return {schemaVersion:1,revision,state:structuredClone(state),serverTime:now()};},
    async putMetadata(payload){metadata.push(structuredClone(payload));return {schemaVersion:1,accepted:true,sourceRevision:payload.sourceRevision,updatedAt:now()};}
  };
  const coordinator=new PracticeSyncCoordinator({storage,transport,enabled:true,now,metadataProvider:()=>({schemaVersion:1,sourceStudentKey:'student',sourceRevision:'rev',generatedAt:now(),competencies:[]})});
  const result=await coordinator.syncNow();
  assert.equal(result.status,'synced');assert.equal(result.analyticsMetadata.status,'synced');assert.equal(metadata.length,1);
  assert.equal('masteryLevel' in storage.load(),false);assert.equal('analyticsMetadata' in storage.load(),false);
});

test('analytics metadata failure does not downgrade successful PracticeState sync',async()=>{
  const storage=new MemoryPracticeStorage(createEmptyPracticeState(now,'device'),now);let revision=0,state={...serverPracticeState(storage.load(),now),revision};
  const transport={
    async bootstrap(){return {schemaVersion:1,profileExists:true,revision,state:structuredClone(state),serverTime:now()};},
    async eventsBatch(){return {schemaVersion:1,acceptedEventIds:[],duplicateEventIds:[],revision,serverTime:now()};},
    async putState(payload){revision+=1;state={...structuredClone(payload.state),revision};return {schemaVersion:1,revision,state:structuredClone(state),serverTime:now()};},
    async putMetadata(){throw new Error('analytics disabled');}
  };
  const result=await new PracticeSyncCoordinator({storage,transport,enabled:true,now,metadataProvider:()=>({schemaVersion:1})}).syncNow();
  assert.equal(result.status,'synced');assert.equal(result.analyticsMetadata.status,'failed');assert.equal(storage.load().revision,revision);
});
