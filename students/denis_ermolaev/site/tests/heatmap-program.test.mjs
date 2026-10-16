import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const read=relative=>fs.readFileSync(path.join(student,relative),'utf8');

test('Denis is enrolled in grade 11 EGE profile mathematics',()=>{
  const contract=JSON.parse(read('student-contract.json'));
  const plan=JSON.parse(read('site/data/ktp-plan.json'));
  const state=JSON.parse(read('site/data/ktp-state.json'));
  assert.equal(contract.studentId,'denis_ermolaev');
  assert.equal(contract.program,'ЕГЭ, профильная математика');
  assert.equal(contract.planning.mode,'fixed');
  assert.equal(plan.programVersion,'ege-profile-math-pending-v1');
  assert.equal(state.programVersion,plan.programVersion);
  assert.deepEqual(plan.lessons,[]);
  assert.deepEqual(state.records,{});
  const html=read('site/index.html');
  assert.match(html,/11 класс/);
  assert.match(html,/ЕГЭ/);
});

test('Radial heatmap uses complete canonical EGE competency catalog, with no fabricated grades',()=>{
  const sandbox={window:Object.create(null)};
  vm.runInNewContext(read('site/competency-map-data.js'),sandbox,{timeout:1000});
  const data=sandbox.window.COMPETENCY_MAP_DATA;
  assert.equal(data.meta.student,'denis_ermolaev');
  assert.equal(data.meta.examYear,2027);
  assert.equal(data.groups.length,17);
  const ids=data.groups.flatMap(group=>group.items.map(item=>item.id));
  assert.equal(ids.length,354);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.every(id=>/^[A-Za-z0-9_.:-]+$/.test(id)));
  assert.ok(data.groups.every(group=>group.items.every(item=>item.title&&item.description)));
  const authority=read('site/mastery-authority.js');
  assert.match(authority,/export const mastery=\{\}/);
  assert.doesNotMatch(read('site/heatmap.js'),/localStorage\.setItem\([^)]*(?:mastery|level)/i);
});
