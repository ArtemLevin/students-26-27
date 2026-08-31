import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRACTICE_CONFIG} from '../practice-config.js';

assert.equal(PRACTICE_CONFIG.studentId,'nikol_sarkisyants');
assert.equal(PRACTICE_CONFIG.masteryStateKey,'nikol-competence-state-v2');
assert.ok(Object.keys(PRACTICE_CONFIG.competencies).length>=10);

const html=fs.readFileSync('students/nikol_sarkisyants/site/index.html','utf8');
for(const token of ['id="practiceSection"','id="practiceRoot"','shared/practice/practice.css','dashboard.js?v=20260831-practice-4','competence-map.js?v=20260831-practice-4'])assert.ok(html.includes(token),`index: ${token}`);

const dashboard=fs.readFileSync('students/nikol_sarkisyants/site/dashboard.js','utf8');
assert.ok(dashboard.includes('practice-ui.js?v=20260831-practice-4'));
const map=fs.readFileSync('students/nikol_sarkisyants/site/competence-map.js','utf8');
for(const token of ['student:competence-state','student:competency-open','__studentCompetenceState'])assert.ok(map.includes(token),`adapter: ${token}`);

console.log('✓ nikol_sarkisyants: practice adapter, config and entry point');
