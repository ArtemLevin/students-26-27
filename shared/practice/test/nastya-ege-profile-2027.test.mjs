import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {flattenGroups} from '../../student-dashboard/legacy-competence-map.js';
import {loadPracticeStudentContracts,PRACTICE_STUDENT_SPECS} from '../validate-configs.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');

test('Nastya canonical v2 catalog preserves the 20-line EGE-2027 runtime profile',async()=>{
  const spec=PRACTICE_STUDENT_SPECS.nastya_pavlova;
  assert.equal(spec.catalog,'site/data/competency-catalog.json');
  assert.equal(spec.mastery,'site/data/mastery-state.json');

  const {groups}=await loadPracticeStudentContracts('nastya_pavlova',{root:ROOT,validate:false});
  assert.equal(groups.length,20);
  assert.deepEqual(groups.map(group=>group.short),Array.from({length:20},(_,index)=>`№${index+1}`));

  const items=flattenGroups(groups);
  const ids=new Set(items.map(item=>item.id));
  assert.ok(ids.has('calc_03'),'existing Nastya competency IDs must survive migration');
  assert.ok(ids.has('ege2027_t6_expectation'));
  assert.ok(ids.has('ege2027_t17_optimization'));

  const mastery=JSON.parse(
    fs.readFileSync(path.join(ROOT,'students','nastya_pavlova',spec.mastery),'utf8')
  );
  assert.equal(Object.hasOwn(mastery.levels,'ege2027_t6_expectation'),false);
  assert.equal(Object.hasOwn(mastery.levels,'ege2027_t17_optimization'),false);

  const task13=groups[12];
  assert.equal(task13.short,'№13');
  assert.match(task13.title,/Прикладная и финансовая задача/);
  assert.ok(task13.items.length>0);
});
