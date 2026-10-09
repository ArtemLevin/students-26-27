import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRACTICE_CONFIG} from '../practice-config.js';
import {LESSONS} from '../lesson-registry.js';
import {isPracticeDisposition,hasMachineReadableGapWaiver} from '../../../../shared/practice/coverage-policy.js';

assert.equal(PRACTICE_CONFIG.studentId,'nastya_pavlova');
assert.equal(PRACTICE_CONFIG.storageKey,'nastya-practice-state-v1');
assert.ok(Object.keys(PRACTICE_CONFIG.competencies).length>=5);
// A new lesson may legitimately use manual work or contain a touched-only skill.
for(const outcome of LESSONS[0].outcomes){
  assert.ok(typeof outcome.label==='string'&&outcome.label.trim(), 'missing outcome label');
  assert.ok(isPracticeDisposition(outcome.practiceDisposition), 'invalid practiceDisposition');
  if(outcome.practiceDisposition==='generator'){
    assert.ok(PRACTICE_CONFIG.competencies[outcome.competencyId],
      'generator disposition requires a configured practice mapping');
  }
  if(['coverage-gap','competency-gap'].includes(outcome.practiceDisposition)){
    assert.ok(hasMachineReadableGapWaiver(outcome),'gap requires a valid waiver');
  }
  assert.notEqual(outcome.practiceDisposition,'ambiguous','newest lesson still needs review');
}

const migration=fs.readFileSync('students/nastya_pavlova/competency-map.js','utf8');
const renderer=fs.readFileSync('students/nastya_pavlova/competency-map-legacy.js','utf8');
const adapter=`${migration}\n${renderer}`;
for(const token of ['student:competence-state','student:competency-open','__studentCompetenceState'])assert.ok(adapter.includes(token),`adapter: ${token}`);
for(const token of ['transformEgeProfile2027Catalog','competency-map-legacy.js','ege2027_'])assert.ok(migration.includes(token),`EGE-2027 migration: ${token}`);

for(const file of ['students/nastya_pavlova/index.html','students/nastya_pavlova/site/index.html']){
  const html=fs.readFileSync(file,'utf8');
  for(const token of ['id="practiceSection"','id="practiceRoot"','data-practice-dialog','practice-bootstrap.js?v=20260831-practice-4'])assert.ok(html.includes(token),`${file}: ${token}`);
}

console.log('✓ nastya_pavlova: EGE-2027 migration, practice adapter, config and entry points');
