import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const contract=JSON.parse(fs.readFileSync(path.join(student,'student-contract.json'),'utf8'));
const catalogPath=path.join(student,contract.competencies.catalog);
const masteryPath=path.join(student,contract.competencies.mastery);
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');

test('Daniil contract resolves to canonical Student Platform v2 sources',()=>{
  assert.equal(contract.version,2);
  assert.equal(contract.studentId,'daniil_khriastov');
  assert.equal(contract.practice.config,null);
  for(const source of [contract.competencies.catalog,contract.competencies.mastery,contract.planning.plan,contract.planning.state,contract.lessons.registry])
    assert.ok(fs.existsSync(path.join(student,source)),source);
});

test('radial catalog is complete, stable and has no implicit levels',()=>{
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(catalogPath,'utf8'),context,{timeout:5000});
  const data=context.window.COMPETENCY_MAP_DATA;
  assert.equal(data.meta.student,contract.studentId);
  assert.ok(data.groups.length>=10);
  const items=data.groups.flatMap(group=>group.items);
  assert.ok(items.length>=250);
  const ids=items.map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(items.every(item=>typeof item.title==='string'&&item.title.trim()));
  assert.ok(!('baselineLevels' in data),'No local mastery fallback allowed');
});

test('mastery starts unassessed; assessment is never implied',async()=>{
  const state=await import('file://'+masteryPath);
  assert.deepEqual(state.mastery,{});
});

test('navigator preserves accessible map/list symmetry and existing resources',()=>{
  for(const id of ['radialMap','catalogList','detailTitle','detailEvidence','filters','latestLesson','routeStatus'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/data-atlas-composition="cosmos"/);
  assert.match(html,/data-atlas-accent="forest"/);
  assert.match(html,/aria-labelledby="radialTitle radialDesc"/);
  for(const p of ['pdf_docs/23.10.26.pdf','tex_docs/23.10.26.tex','images/23.10.26.png']){
    assert.ok(fs.existsSync(path.join(student,p)),p);
  }
  assert.doesNotMatch(html,/<script[^>]*>[^<]*mastery\s*=/i);
});
