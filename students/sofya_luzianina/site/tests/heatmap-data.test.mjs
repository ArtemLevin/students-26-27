import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='students/sofya_luzianina/';
const load=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
test('map consists of 194 unique competencies in 18 groups',()=>{
 const cat=load('site/data/competency-catalog.json');const ids=cat.groups.flatMap(g=>g.items.map(i=>i.id));
 assert.equal(cat.groups.length,18);assert.equal(ids.length,194);assert.equal(new Set(ids).size,194);
 assert.deepEqual(cat.diagnosticFocus.map(x=>x.competencyId),['heat_07','optics_08','photons_02']);
 for(const x of cat.diagnosticFocus)assert.ok(ids.includes(x.competencyId));
});
test('mastery references canonical competencies and carries explicit provenance',()=>{
 const contract=load('student-contract.json');
 const catalog=load(contract.competencies.catalog),mastery=load(contract.competencies.mastery);
 const ids=new Set(catalog.groups.flatMap(g=>g.items.map(i=>i.id)));
 assert.equal(mastery.studentId,contract.studentId);
 assert.equal(contract.competencies.catalog,'site/data/competency-catalog.json');
 for(const [id,r] of Object.entries(mastery.levels)){
  assert.ok(ids.has(id));
  assert.ok(Number.isInteger(r.level)&&r.level>=0&&r.level<=4);
  assert.ok(r.sourcePath&&r.sourceKind&&r.basis);
 }
});
test('KTP exists and its fact state matches approved plan version',()=>{
 const plan=load('site/data/ktp-plan.json'),state=load('site/data/ktp-state.json');
 assert.equal(plan.studentId,state.studentId);
 assert.equal(plan.programVersion,state.programVersion);
 for(const id of Object.keys(state.records))assert.ok(plan.lessons.some(x=>x.id===id),'orphan record: '+id);
});
