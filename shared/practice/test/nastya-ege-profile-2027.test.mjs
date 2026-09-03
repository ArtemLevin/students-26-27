import test from 'node:test';
import assert from 'node:assert/strict';
import {flattenGroups} from '../../student-dashboard/legacy-competence-map.js';
import {loadCompetencyGroups,PRACTICE_STUDENT_SPECS} from '../validate-configs.mjs';

test('Nastya profile heatmap resolves to the 20-line EGE-2027 catalog',()=>{
  const spec=PRACTICE_STUDENT_SPECS.nastya_pavlova;
  assert.equal(spec.catalogProfile,'ege-profile-2027-ordered');
  const groups=loadCompetencyGroups(spec);
  assert.equal(groups.length,20);
  assert.deepEqual(groups.map(group=>group.short),Array.from({length:20},(_,index)=>`№${index+1}`));

  const items=flattenGroups(groups);
  const ids=new Set(items.map(item=>item.id));
  assert.ok(ids.has('calc_03'),'existing Nastya competency IDs must survive migration');
  assert.ok(ids.has('ege2027_t6_expectation'));
  assert.ok(ids.has('ege2027_t17_optimization'));
  assert.equal(items.find(item=>item.id==='ege2027_t6_expectation')?.level,0);
  assert.equal(items.find(item=>item.id==='ege2027_t17_optimization')?.level,0);

  const task13=groups[12];
  assert.equal(task13.short,'№13');
  assert.match(task13.title,/Прикладная и финансовая задача/);
  assert.ok(task13.items.length>0);
});
