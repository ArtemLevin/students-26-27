import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PRACTICE_EVENTS,PRACTICE_SCHEMA_VERSION,activateCompetency,appendPracticeEvent,createEmptyPracticeState,normalizePracticeState,syncLessonActivations} from '../practice-state.js';
import {LocalStoragePracticeStorage} from '../practice-storage.js';

class Storage{constructor(seed={}){this.map=new Map(Object.entries(seed));}getItem(key){return this.map.get(key)??null;}setItem(key,value){this.map.set(key,String(value));}removeItem(key){this.map.delete(key);}}
const now=()=> '2026-08-31T12:00:00.000Z';

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

test('activation and lesson sync are idempotent without touching mastery',()=>{
  const mastery={studentLevels:{skill:4}},config={features:{lessonAutoActivation:true},competencies:{skill:{generator:'x'}}},lessons=[{date:'2026-08-28',outcomes:[{competencyId:'skill'}]}];
  const first=syncLessonActivations(createEmptyPracticeState(now),lessons,config,'2026-08-31',now),second=syncLessonActivations(first,lessons,config,'2026-08-31',now);
  assert.deepEqual(second,first);assert.equal(first.competencies.skill.dueAt,'2026-08-31');assert.deepEqual(mastery,{studentLevels:{skill:4}});
  const activated=activateCompetency(first,'skill',{today:'2026-09-01',now});assert.equal(activated.competencies.skill.activatedAt,'2026-08-28T12:00:00.000Z');
});

test('event history is bounded',()=>{
  let state=createEmptyPracticeState(now);
  for(let index=0;index<MAX_PRACTICE_EVENTS+20;index+=1)state=appendPracticeEvent(state,{timestamp:`2026-08-31T12:${String(index%60).padStart(2,'0')}:00.000Z`,sessionId:'s',exerciseId:`e${index}`,competencyId:'skill',generatorKey:'test.generator',generatorVersion:1,seed:String(index),difficulty:1,attemptCount:1,hintsUsed:0,outcome:'correct',rating:'good',durationMs:1},now);
  assert.equal(state.events.length,MAX_PRACTICE_EVENTS);assert.equal(state.events.at(-1).exerciseId,`e${MAX_PRACTICE_EVENTS+19}`);
});
