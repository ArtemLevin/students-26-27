import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDailyCompetencies} from '../practice-selector.js';

const base={studentId:'s',dailyTarget:5,dailyMax:7,maxPerGroup:2,competencies:{
  manual:{generator:'x',difficulty:[1],active:true,group:'a'},overdue:{generator:'x',difficulty:[1],active:true,group:'a'},due:{generator:'x',difficulty:[1],active:true,group:'b'},future:{generator:'x',difficulty:[1],active:true,group:'b'},zero:{generator:'x',difficulty:[1],active:true,group:'c'},extra:{generator:'x',difficulty:[1],active:true,group:'a'}
}};
const state={competencies:{manual:{status:'active',dueAt:'2026-09-10',activatedAt:'x'},overdue:{status:'active',dueAt:'2026-08-20',activatedAt:'x'},due:{status:'active',dueAt:'2026-08-31',activatedAt:'x'},future:{status:'active',dueAt:'2026-09-01',activatedAt:'x'},zero:{status:'active',dueAt:'2026-08-31',activatedAt:null},extra:{status:'active',dueAt:'2026-08-30',activatedAt:'x'}}};
const levels={manual:3,overdue:3,due:1,future:1,zero:0,extra:2};
test('manual override wins while future and unseen inactive skills stay out',()=>{
  const result=selectDailyCompetencies({config:base,state,studentLevels:levels,reviewQueue:{manual:{addedAt:'x'}},today:'2026-08-31'});
  assert.equal(result[0].competencyId,'manual');assert.ok(!result.some(item=>item.competencyId==='future'));assert.ok(!result.some(item=>item.competencyId==='zero'));
});
test('selector enforces interleaving, uniqueness and deterministic order',()=>{
  const one=selectDailyCompetencies({config:base,state,studentLevels:levels,reviewQueue:{},today:'2026-08-31'}),two=selectDailyCompetencies({config:base,state,studentLevels:levels,reviewQueue:{},today:'2026-08-31'});
  assert.deepEqual(one.map(item=>item.competencyId),two.map(item=>item.competencyId));assert.equal(new Set(one.map(item=>item.competencyId)).size,one.length);assert.ok(one.filter(item=>item.group==='a').length<=2);
});
