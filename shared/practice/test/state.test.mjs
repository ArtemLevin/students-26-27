import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PRACTICE_EVENTS,PRACTICE_SCHEMA_VERSION,activateCompetency,appendPracticeEvent,createEmptyPracticeState,normalizePracticeState,syncLessonActivations} from '../practice-state.js';
import {LocalStoragePracticeStorage} from '../practice-storage.js';

class Storage{constructor(seed={}){this.map=new Map(Object.entries(seed));}getItem(key){return this.map.get(key)??null;}setItem(key,value){this.map.set(key,String(value));}removeItem(key){this.map.delete(key);}}
const now=()=> '2026-08-31T12:00:00.000Z';
const lessonConfig={features:{lessonAutoActivation:true},competencies:{skill:{generator:'x',activation:'lesson'}}};
const lesson=date=>[{date,outcomes:[{competencyId:'skill'}]}];

test('state normalization is idempotent and forward-compatible',()=>{
  const raw={schemaVersion:99,unknown:'safe',competencies:{skill:{status:'active',attempts:'3',futureField:true}},sessions:{},events:[]};
  const first=normalizePracticeState(raw,now),second=normalizePracticeState(first,now);
  assert.deepEqual(second,first);assert.equal(first.schemaVersion,PRACTICE_SCHEMA_VERSION);assert.equal(first.competencies.skill.attempts,3);assert.equal('unknown' in first,false);
});

test('storage recovers corrupted JSON and reports unavailable writes',()=>{
  const backend=new Storage({practice:'{broken'}),storage=new LocalStoragePracticeStorage({key:'practice',storage:backend,now});
  assert.equal(storage.load().schemaVersion,1);assert.equal(storage.diagnostics().recovered,true);
  const failing=new LocalStoragePracticeStorage({key:'practice',storage:{getItem(){throw new DOMException('blocked','SecurityError');},setItem(){throw new DOMException('blocked','SecurityError');}},now});
  assert.equal(failing.load().schemaVersion,1);assert.equal(failing.save(createEmptyPracticeState(now)),false);assert.equal(failing.diagnostics().available,false);
});

test('yesterday lesson activates',()=>{
  const state=syncLessonActivations(createEmptyPracticeState(now),lesson('2026-08-30'),lessonConfig,'2026-08-31',now);
  assert.equal(state.competencies.skill.dueAt,'2026-08-31');assert.equal(state.competencies.skill.activatedAt,'2026-08-30T12:00:00.000Z');
});

test('today lesson activates',()=>{
  const state=syncLessonActivations(createEmptyPracticeState(now),lesson('2026-08-31'),lessonConfig,'2026-08-31',now);
  assert.equal(state.competencies.skill.dueAt,'2026-08-31');assert.equal(state.competencies.skill.activatedAt,'2026-08-31T12:00:00.000Z');
});

test('tomorrow lesson stays inactive',()=>{
  const state=syncLessonActivations(createEmptyPracticeState(now),lesson('2026-09-01'),lessonConfig,'2026-08-31',now);
  assert.equal(state.competencies.skill,undefined);
});

test('repeated lesson sync preserves dueAt, attempts and interval step',()=>{
  const seeded=normalizePracticeState({schemaVersion:1,updatedAt:now(),competencies:{skill:{status:'active',activatedAt:'2026-08-28T12:00:00.000Z',dueAt:'2026-09-05',intervalStep:3,intervalDays:14,attempts:7,lapses:1}},sessions:{},events:[]},now);
  const first=syncLessonActivations(seeded,lesson('2026-08-28'),lessonConfig,'2026-08-31',now),second=syncLessonActivations(first,lesson('2026-08-28'),lessonConfig,'2026-08-31',now);
  assert.deepEqual(second,first);assert.equal(first.competencies.skill.dueAt,'2026-09-05');assert.equal(first.competencies.skill.attempts,7);assert.equal(first.competencies.skill.intervalStep,3);assert.equal(first.competencies.skill.intervalDays,14);
});

test('todayProvider boundary activates a future skill exactly once',()=>{
  const before=syncLessonActivations(createEmptyPracticeState(now),lesson('2026-09-01'),lessonConfig,'2026-08-31',now);
  assert.equal(before.competencies.skill,undefined);
  const onDate=syncLessonActivations(before,lesson('2026-09-01'),lessonConfig,'2026-09-01',now),again=syncLessonActivations(onDate,lesson('2026-09-01'),lessonConfig,'2026-09-01',now);
  assert.equal(onDate.competencies.skill.activatedAt,'2026-09-01T12:00:00.000Z');assert.equal(onDate.competencies.skill.dueAt,'2026-09-01');assert.deepEqual(again,onDate);
});

test('config policy migration never resets an existing active history entry',()=>{
  const state=normalizePracticeState({schemaVersion:1,updatedAt:now(),competencies:{skill:{status:'active',activatedAt:'2026-08-20T12:00:00.000Z',dueAt:'2026-09-03',intervalStep:2,attempts:5,lapses:2}},sessions:{},events:[]},now);
  const migrated=syncLessonActivations(state,[],lessonConfig,'2026-08-31',now);
  assert.deepEqual(migrated,state);
});

test('legacy activation remains idempotent without touching mastery',()=>{
  const mastery={studentLevels:{skill:4}},config={features:{lessonAutoActivation:true},competencies:{skill:{generator:'x',active:false}}},lessons=[{date:'2026-08-28',outcomes:[{competencyId:'skill'}]}];
  const first=syncLessonActivations(createEmptyPracticeState(now),lessons,config,'2026-08-31',now),second=syncLessonActivations(first,lessons,config,'2026-08-31',now);
  assert.deepEqual(second,first);assert.deepEqual(mastery,{studentLevels:{skill:4}});
  const activated=activateCompetency(first,'skill',{today:'2026-09-01',now});assert.equal(activated.competencies.skill.activatedAt,'2026-08-28T12:00:00.000Z');
});

test('event history is bounded',()=>{
  let state=createEmptyPracticeState(now);
  for(let index=0;index<MAX_PRACTICE_EVENTS+20;index+=1)state=appendPracticeEvent(state,{timestamp:`2026-08-31T12:${String(index%60).padStart(2,'0')}:00.000Z`,sessionId:'s',exerciseId:`e${index}`,competencyId:'skill',generatorKey:'test.generator',generatorVersion:1,seed:String(index),difficulty:1,attemptCount:1,hintsUsed:0,outcome:'correct',rating:'good',durationMs:1},now);
  assert.equal(state.events.length,MAX_PRACTICE_EVENTS);assert.equal(state.events.at(-1).exerciseId,`e${MAX_PRACTICE_EVENTS+19}`);
});
