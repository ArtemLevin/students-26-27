import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const dir='students/sofya_luzianina/site/';
const html=fs.readFileSync(dir+'ktp.html','utf8');
const js=fs.readFileSync(dir+'ktp.js','utf8');
const css=fs.readFileSync(dir+'ktp.css','utf8');
test('KTP page references separate behavior and styles, declares unique accessible ids',()=>{
 assert.match(html,/<script type="module" src="ktp\.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="ktp\.css">/);
 assert.doesNotMatch(html,/<script type="module">/);
 assert.doesNotMatch(html,/<style>/);
 assert.match(html,/id="loadError"[^>]+role="alert"/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate ID');
 for(const name of ['viewOverview','viewCalendar','viewToday','query','stageSelect','statusSelect','clearFilters','months','lessonDialog','closeDialog','metricTotal','metricDone','metricActive','metricPending','loadError'])assert.ok(ids.includes(name),name+' missing');
});
test('KTP controller parses as module and references only declared DOM ids',()=>{
 assert.match(js,/from '\.\/ktp-model\.mjs'/);
 assert.doesNotThrow(()=>new vm.Script(js.replace(/^import \{[^}]*\} from '[^']+';\n/,'')));
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
 for(const m of js.matchAll(/\$\("([^"]+)"\)/g))assert.ok(ids.has(m[1]),'undeclared DOM id '+m[1]);
 assert.equal((css.match(/@media print/g)||[]).length,1);
 assert.doesNotMatch(css,/\.view\[hidden\]\{display:block!important\}/);
});
test('KTP and competency atlas use synchronized theme storage',()=>{
 const atlas=fs.readFileSync(dir+'heatmap.js','utf8');
 assert.ok(js.includes('sofya-luzianina-atlas-theme'));
 assert.ok(atlas.includes('sofya-luzianina-atlas-theme'));
 assert.doesNotMatch(atlas,/const docLink/);
 assert.match(atlas,/claim\.basis/);
 assert.doesNotMatch(atlas,/authority\.evidence/);
});
