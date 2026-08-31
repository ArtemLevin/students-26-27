import test from 'node:test';
import assert from 'node:assert/strict';
import {addCalendarDays,calendarDayDifference,chooseDifficulty,localToday,scheduleRating} from '../practice-scheduler.js';

const now=()=> '2026-08-31T23:59:59.000Z';
test('calendar arithmetic is date-only and stable around midnight',()=>{
  assert.equal(addCalendarDays('2026-08-31',1),'2026-09-01');assert.equal(calendarDayDifference('2026-08-31','2026-09-03'),3);
  assert.equal(localToday(new Date(2026,7,31,23,59)),'2026-08-31');
});
test('new mastery levels receive transparent starting intervals',()=>{
  const low=scheduleRating({}, {rating:'good',outcome:'correct',masteryLevel:1,today:'2026-08-31',now});
  const high=scheduleRating({}, {rating:'good',outcome:'correct',masteryLevel:4,today:'2026-08-31',now});
  assert.equal(low.dueAt,'2026-09-01');assert.equal(high.dueAt,'2026-09-07');assert.ok(high.intervalDays>low.intervalDays);
});
test('again, hard, good and easy transitions update counters deterministically',()=>{
  const base={status:'active',dueAt:'2026-08-31',intervalStep:1,intervalDays:3,attempts:2,correct:2,streak:2,lapses:0,hintsUsedTotal:0};
  const again=scheduleRating(base,{rating:'again',outcome:'incorrect',today:'2026-08-31',now});assert.equal(again.streak,0);assert.equal(again.lapses,1);assert.equal(again.dueAt,'2026-09-01');
  const twice=scheduleRating(again,{rating:'again',outcome:'incorrect',today:'2026-09-01',now});assert.equal(twice.repeatedLapse,true);
  const hard=scheduleRating(base,{rating:'hard',outcome:'correct',today:'2026-08-31',now});assert.equal(hard.intervalDays,5);
  const good=scheduleRating(base,{rating:'good',outcome:'correct',today:'2026-08-31',now});assert.equal(good.intervalDays,7);
  const easy=scheduleRating(base,{rating:'easy',outcome:'correct',today:'2026-08-31',now});assert.equal(easy.intervalDays,14);
});
test('difficulty respects mastery, allowed range and remediation',()=>{
  assert.equal(chooseDifficulty({masteryLevel:1,allowed:[1,2],seedValue:2}),1);
  assert.ok([2,3].includes(chooseDifficulty({masteryLevel:4,allowed:[2,3],seedValue:3})));
  assert.equal(chooseDifficulty({masteryLevel:4,allowed:[1,2,3],seedValue:1,repeatedLapse:true}),2);
});
