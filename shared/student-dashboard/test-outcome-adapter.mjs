import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCompatibleOutcome,
  outcomeSchema,
  presentLessonOutcome
} from './outcome-adapter.js';
import {assertRegistry} from './dashboard-core.js';

test('legacy outcome presentation remains unchanged',()=>{
  const outcome={
    competencyId:'func_17',
    label:'Чтение графика',
    level:3,
    tone:'good',
    practiceDisposition:'manual'
  };
  assert.equal(outcomeSchema(outcome),'legacy');
  assert.deepEqual(
    presentLessonOutcome(outcome,{lessonDate:'2026-10-01'}),
    {
      schema:'legacy',
      competencyId:'func_17',
      label:'Чтение графика',
      tone:'good',
      mark:'✓',
      detail:'3/4'
    }
  );
});

test('canonical v2 outcome renders relation without inventing mastery',()=>{
  const outcome={
    competencyId:'func_17',
    evidenceAnchor:'graph-model',
    relation:'assessed'
  };
  assert.equal(outcomeSchema(outcome),'v2');
  assert.deepEqual(
    presentLessonOutcome(outcome,{lessonDate:'2026-10-01'}),
    {
      schema:'v2',
      competencyId:'func_17',
      label:'func_17',
      tone:'process',
      mark:'◇',
      detail:'проверено'
    }
  );
});

test('canonical presentation may resolve a human label without changing relation semantics',()=>{
  const outcome={
    competencyId:'text_15',
    evidenceAnchor:'border',
    relation:'practiced'
  };
  const result=presentLessonOutcome(outcome,{
    lessonDate:'2026-10-01',
    resolveCompetencyLabel:id=>id==='text_15'?'Прикладные формулы':null
  });
  assert.equal(result.label,'Прикладные формулы');
  assert.equal(result.detail,'практика');
  assert.equal(result.tone,'process');
  assert.equal('level' in result,false);
});

test('mixed legacy and canonical registry records pass dashboard validation',()=>{
  const lessons=[
    {
      date:'2026-10-01',
      href:'01.10.26.html',
      title:'Новый формат',
      outcomes:[
        {competencyId:'func_17',evidenceAnchor:'graph-model',relation:'practiced'}
      ]
    },
    {
      date:'2026-09-30',
      href:'30.09.26.html',
      title:'Старый формат',
      outcomes:[
        {competencyId:'func_17',label:'Графики',level:3,tone:'good'}
      ]
    }
  ];
  assert.equal(assertRegistry(lessons),true);
});

test('malformed outcome fails closed',()=>{
  assert.throws(
    ()=>assertCompatibleOutcome(
      {competencyId:'func_17',relation:'practiced'},
      {lessonDate:'2026-10-01'}
    ),
    /invalid legacy\/v2 outcome/
  );
  assert.throws(
    ()=>assertRegistry([{
      date:'2026-10-01',
      href:'01.10.26.html',
      title:'Broken',
      outcomes:[{competencyId:'bad id',evidenceAnchor:'ok',relation:'practiced'}]
    }]),
    /invalid legacy\/v2 outcome/
  );
});

test('canonical relation vocabulary is strict',()=>{
  assert.throws(
    ()=>presentLessonOutcome({
      competencyId:'func_17',
      evidenceAnchor:'graph-model',
      relation:'mastered'
    }),
    /invalid legacy\/v2 outcome/
  );
});
