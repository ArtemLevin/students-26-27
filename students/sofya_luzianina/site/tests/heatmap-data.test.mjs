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
test('mastery remains unassessed and contract points to canonical files',()=>{
 const c=load('student-contract.json');const m=load(c.competencies.mastery);
 assert.deepEqual(m.levels,{});assert.equal(m.studentId,c.studentId);
 assert.equal(c.competencies.catalog,'site/data/competency-catalog.json');
});
test('no invented lessons or KTP completion',()=>{
 const p=load('site/data/ktp-plan.json');const s=load('site/data/ktp-state.json');
 assert.deepEqual(p.lessons,[]);assert.deepEqual(s.records,{});
});
