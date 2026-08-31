import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRACTICE_CONFIG} from '../practice-config.js';
import {LESSONS} from '../lesson-registry.js';

assert.equal(PRACTICE_CONFIG.studentId,'nastya_pavlova');
assert.equal(PRACTICE_CONFIG.storageKey,'nastya-practice-state-v1');
assert.ok(Object.keys(PRACTICE_CONFIG.competencies).length>=5);
assert.ok(LESSONS[0].outcomes.every(outcome=>PRACTICE_CONFIG.competencies[outcome.competencyId]));

const adapter=fs.readFileSync('students/nastya_pavlova/competency-map.js','utf8');
for(const token of ['student:competence-state','student:competency-open','__studentCompetenceState'])assert.ok(adapter.includes(token),`adapter: ${token}`);

for(const file of ['students/nastya_pavlova/index.html','students/nastya_pavlova/site/index.html']){
  const html=fs.readFileSync(file,'utf8');
  for(const token of ['id="practiceSection"','id="practiceRoot"','data-practice-dialog','practice-bootstrap.js?v=20260831-practice-4'])assert.ok(html.includes(token),`${file}: ${token}`);
}

console.log('✓ nastya_pavlova: practice adapter, config and entry points');
