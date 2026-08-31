import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PracticeEngine} from '../practice-engine.js';
import {MemoryPracticeStorage} from '../practice-storage.js';
import {referenceAnswerForSpec} from '../answer-engine.js';
import {PRACTICE_CONFIG as XENIA} from '../../../students/xenia_klykova/site/practice-config.js';
import {LESSONS as XENIA_LESSONS} from '../../../students/xenia_klykova/site/lesson-registry.js';

const today=()=> '2026-08-31',now=()=> '2026-08-31T12:00:00.000Z',levels={t5_product:3,t5_sum:2,t5_complement:2,t5_bernoulli:2,t5_combinatorics:2};
test('session selection, persistence, checking and scheduling work end to end',()=>{
  const storage=new MemoryPracticeStorage(null,now),engine=new PracticeEngine({config:XENIA,lessons:XENIA_LESSONS,storage,todayProvider:today,now,competenceSnapshot:{studentLevels:levels,reviewQueue:{}}});
  const session=engine.startSession();assert.equal(session.items.length,5);const identity=session.items.map(item=>[item.competencyId,item.seed]);
  const reloaded=new PracticeEngine({config:XENIA,lessons:XENIA_LESSONS,storage,todayProvider:today,now,competenceSnapshot:{studentLevels:levels,reviewQueue:{}}});assert.deepEqual(reloaded.currentSession().items.map(item=>[item.competencyId,item.seed]),identity);
  reloaded.beginCurrent();const exercise=reloaded.exerciseFor(),answer=referenceAnswerForSpec(exercise.answerSpec),check=reloaded.submitAnswer(answer);assert.equal(check.status,'correct');
  const masterySnapshot=structuredClone(levels),rated=reloaded.rate('good');assert.ok(rated.scheduled.dueAt>'2026-08-31');assert.deepEqual(levels,masterySnapshot);assert.equal(reloaded.state.events.length,1);
});
test('manual review override enters selection and remediation is bounded',()=>{
  const config={...XENIA,dailyTarget:1,dailyMax:1,remediationMax:1,competencies:{...XENIA.competencies,t2_coordinates:{...XENIA.competencies.t2_coordinates,active:false}}};
  const engine=new PracticeEngine({config,storage:new MemoryPracticeStorage(null,now),todayProvider:today,now,competenceSnapshot:{studentLevels:{...levels,t2_coordinates:0},reviewQueue:{t2_coordinates:{addedAt:now()}}}});const session=engine.startSession();assert.equal(session.items[0].competencyId,'t2_coordinates');
  engine.beginCurrent();engine.revealSolution();engine.rate('again');assert.ok(engine.currentSession().items.length<=2);
});
test('all migrated indexes use shared practice UI without copied engine code',()=>{
  const dashboardCacheKeys={xenia_klykova:'dashboard.js?v=20260831-stereometry-1'};
  for(const student of ['kirill_zinoviev','sofya_kalney','timofey','volodia_khachaturian','xenia_klykova']){
    const html=fs.readFileSync(`students/${student}/site/index.html`,'utf8'),dashboard=fs.readFileSync(`students/${student}/site/dashboard.js`,'utf8');
    for(const marker of ['id="practiceSection"','id="practiceRoot"','shared/practice/practice.css'])assert.ok(html.includes(marker),`${student}: ${marker}`);
    assert.ok(html.includes(dashboardCacheKeys[student]||'dashboard.js?v=20260831-practice-3'),`${student}: dashboard cache key`);
    assert.ok(dashboard.includes('practice-ui.js?v=20260831-practice-2'));assert.ok(dashboard.includes('initStudentDashboard'));assert.ok(fs.existsSync(`students/${student}/site/practice-config.js`));
  }
  const nikolHtml=fs.readFileSync('students/nikol_sarkisyants/site/index.html','utf8'),nikolDashboard=fs.readFileSync('students/nikol_sarkisyants/site/dashboard.js','utf8');
  for(const marker of ['id="practiceSection"','id="practiceRoot"','shared/practice/practice.css'])assert.ok(nikolHtml.includes(marker),`nikol_sarkisyants: ${marker}`);
  assert.ok(nikolDashboard.includes('practice-ui.js?v=20260831-practice-4'));
  assert.ok(fs.existsSync('students/nikol_sarkisyants/site/practice-config.js'));

  for(const index of ['students/nastya_pavlova/index.html','students/nastya_pavlova/site/index.html']){
    const html=fs.readFileSync(index,'utf8');
    for(const marker of ['id="practiceSection"','id="practiceRoot"','shared/practice/practice.css','practice-bootstrap.js?v=20260831-practice-4'])assert.ok(html.includes(marker),`${index}: ${marker}`);
  }
  const bootstrap=fs.readFileSync('students/nastya_pavlova/practice-bootstrap.js','utf8');
  assert.ok(bootstrap.includes('practice-ui.js?v=20260831-practice-4'));
  assert.ok(fs.existsSync('students/nastya_pavlova/site/practice-config.js'));
});
test('published practice modules avoid Jekyll-private underscore paths',()=>{
  const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
  for(const file of walk('shared/practice').filter(file=>file.endsWith('.js'))){
    const relative=path.relative('shared/practice',file),segments=relative.split(path.sep);
    assert.ok(segments.every(segment=>!segment.startsWith('_')),`${relative} will be excluded by GitHub Pages`);
    assert.doesNotMatch(fs.readFileSync(file,'utf8'),/from\s+['"][^'"]*\/_/u,`${relative} imports a Jekyll-private path`);
  }
});
