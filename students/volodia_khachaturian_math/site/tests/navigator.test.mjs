import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const SITE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ROOT=path.resolve(SITE,'..');
const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'student-contract.json'),'utf8'));
const read=(file)=>fs.readFileSync(path.join(SITE,file),'utf8');

test('mathematics OGE cabinet uses the official v2 contract',()=>{
  assert.equal(contract.version,2);
  assert.equal(contract.studentId,'volodia_khachaturian_math');
  assert.equal(contract.program,'ОГЭ · математика');
  assert.equal(contract.planning.mode,'fixed');
  assert.equal(contract.practice.config,null);
});
test('competency program covers all 25 OGE tasks with unique stable IDs',()=>{
  const sandbox={window:Object.create(null)};
  vm.runInNewContext(read('competency-map-data.js'),sandbox,{timeout:1000});
  const data=sandbox.window.COMPETENCY_MAP_DATA;
  assert.equal(data.student,'volodia_khachaturian_math');
  assert.equal(data.groups.length,25);
  const items=data.groups.flatMap(group=>group.items);
  assert.equal(items.length,324);
  assert.equal(new Set(items.map(item=>item.id)).size,items.length);
  assert.ok(items.every(item=>typeof item.title==='string'&&item.title.length>4));
  assert.ok(!Object.hasOwn(data,'baselineLevels'));
});
test('navigator uses canonical read-only data, accessible map and list',()=>{
  const html=read('index.html'),js=read('navigator.js'),css=read('navigator.css');
  assert.match(html,/id="radialMap"/);
  assert.match(html,/id="topicCatalog"/);
  assert.match(html,/id="competencySearch"/);
  assert.match(html,/id="inspectorEvidence"/);
  assert.match(html,/data-atlas-composition="cartographer"/);
  for(const name of ['tokens.css','foundations.css','archetypes.css','student-sites.css'])assert.ok(html.includes('design-system/'+name));
  assert.match(js,/contract\.competencies\.catalog/);
  assert.match(js,/contract\.competencies\.mastery/);
  assert.match(js,/contract\.lessons\.registry/);
  assert.match(js,/setAttribute\('aria-pressed'/);
  assert.doesNotMatch(js,/localStorage\.setItem\([^)]*mastery/i);
  assert.match(css,/prefers-reduced-motion/);
  new vm.Script(js,{filename:'navigator.js'});
});
