import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LESSONS} from '../lesson-registry.js';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),archive=read('archive.html'),css=read('editorial-cabinet.css'),arcCss=read('archive.css'),arcJs=read('archive.js'),script=read('editorial-cabinet.js');

test('new index retains every legacy interaction contract',()=>{
 const ids=['radialMap','topicCatalog','topicSearch','resetStatuses','themeToggle','topicDialog','practiceSection','practiceRoot','mapTooltip','lessonCovered','footerMeta','totalCount','coveredCount','coveragePercent','repeatCount','focusTitle','focusGroup','focusAdvice','focusLink','dialogTitle','dialogGroup','dialogHistory','dialogLevel','dialogMaterial','dialogDiagnostic','dialogDescription','repeatToggle'];
 const found=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(found.length,new Set(found).size,'duplicate DOM IDs');
 for(const id of ids)assert.ok(found.includes(id),'missing '+id);
 for(const link of ['../competency-map.js','../competency-map-data.js','../mastery-authority.js','../practice-bootstrap.js'])assert.ok(html.includes(link),'missing '+link);
 assert.match(html,/data-practice-dialog/);
});

test('composition and orientation match editorial archive fingerprint',()=>{
 const design=JSON.parse(read('design.json'));
 for(const [key,value] of Object.entries({composition:'archive',accent:'graphite',density:'airy',geometry:'orthogonal',typography:'editorial'}))assert.equal(design[key],value);
 const order=['id="pageTitle"','id="competenceLedger"','id="lesson"','class="atlas-archive-portal"','id="practiceSection"','id="competencyMap"'];
 let last=-1;for(const item of order){const found=html.indexOf(item);assert.ok(found>last,'out of order '+item);last=found;}
 assert.match(html,/Лёвин Артём Александрович эксклюзивно для Анастасии Павловой/);
 assert.match(html,/href="archive.html"/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/prefers-reduced-motion/);
});

test('archive derives lesson cards and recent lesson from Nastya canonical registry',()=>{
 assert.ok(LESSONS.length>1);
 assert.equal(LESSONS[0].date,'2026-10-19');
 assert.ok(LESSONS.every(x=>x.href.startsWith(x.date.split('-').reverse().map((x,i)=>i===2?x.slice(-2):x).join('.') )));
 assert.match(script,/import \{LESSONS\} from '\.\/lesson-registry\.js'/);
 assert.match(arcJs,/import \{LESSONS\} from '\.\/lesson-registry\.js'/);
 assert.doesNotMatch(arcJs,/xenia_klykova|LESSON_0710|composeLessons/);
 assert.match(arcJs,/groupLessonsByMonth/);
 assert.match(arcJs,/equalizeTiles/);
 assert.match(arcJs,/resize/);
 assert.match(arcJs,/archiveSearch/);
 assert.match(archive,/id="archiveRoot"/);
 assert.match(archive,/id="archiveMonths"/);
 assert.match(archive,/id="archiveSearch"/);
 assert.doesNotMatch(archive,/Ксения|Клыкова/);
 assert.doesNotMatch(arcCss,/-webkit-line-clamp|line-clamp|masonry/);
 assert.doesNotMatch(arcCss,/overflow:\s*hidden/);
 assert.match(arcCss,/repeat\(3|minmax\(0,1fr\)/);
 assert.match(arcCss,/@media/);
});
test('status values are read from canonical mastery without mutating storage',()=>{
 assert.match(script,/mastery-state\.json/);
 assert.match(script,/competency-catalog\.json/);
 assert.match(script,/ledgerEvaluated/);
 assert.match(script,/ledgerConfident/);
 assert.match(script,/ledgerMastered/);
 assert.doesNotMatch(script,/localStorage\.setItem\([^)]*mastery/);
 assert.doesNotMatch(html,/\bt19_divisibility\b|\bfunc_17\b/);
});
