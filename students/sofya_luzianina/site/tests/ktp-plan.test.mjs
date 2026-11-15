import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='students/sofya_luzianina/';
const json=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
test('57 KTP meetings on Mondays and Fridays from Nov 16 to May 31',()=>{
 const p=json('site/data/ktp-plan.json');
 assert.equal(p.version,1);assert.equal(p.studentId,'sofya_luzianina');assert.equal(p.lessons.length,57);
 assert.equal(p.lessons[0].plannedDate,'2026-11-16');assert.equal(p.lessons.at(-1).plannedDate,'2027-05-31');
 for(const [i,x] of p.lessons.entries()){
  assert.equal(x.id,'ktp-'+String(i+1).padStart(3,'0'));assert.equal(x.order,i+1);
  assert.ok([1,5].includes(new Date(x.plannedDate+'T12:00:00Z').getUTCDay()));
  for(const k of ['stage','stageId','block','topic','content','result','check','homework'])assert.ok(x[k]?.length>=3,x.id+': '+k);
  assert.ok(x.targetCompetencies.length>=2,x.id+': empty competency mapping');
 }
 assert.equal(new Set(p.lessons.map(x=>x.plannedDate)).size,57);
});
test('all target competencies reference the canonical map',()=>{
 const p=json('site/data/ktp-plan.json');const c=json('site/data/competency-catalog.json');
 const ids=new Set(c.groups.flatMap(g=>g.items.map(x=>x.id)));
 for(const x of p.lessons)for(const id of x.targetCompetencies)assert.ok(ids.has(id),x.id+' '+id);
 const stages=[...new Set(p.lessons.map(x=>x.stageId))];assert.equal(stages.length,6);
});
test('diagnostic topics receive planned follow-up',()=>{
 const p=json('site/data/ktp-plan.json').lessons;
 const at=n=>p[n-1];
 assert.equal(at(19).plannedDate,'2027-01-18');assert.ok(at(19).targetCompetencies.includes('heat_07'));
 assert.equal(at(36).plannedDate,'2027-03-19');assert.ok(at(36).targetCompetencies.includes('optics_08'));
 assert.equal(at(40).plannedDate,'2027-04-02');assert.ok(at(40).targetCompetencies.includes('photons_02'));
 assert.ok(p.filter(x=>/Пробный вариант №/.test(x.topic)).length===3);
});
test('canonical state holds no invented lesson completions',()=>{
 const p=json('site/data/ktp-plan.json');const s=json('site/data/ktp-state.json');
 assert.equal(s.programVersion,p.programVersion);assert.equal(Object.keys(s.records).length,57);
 for(const l of p.lessons)assert.deepEqual(s.records[l.id],{status:'planned'});
});
test('KTP page loads canonical plan and state, no browser-local source of truth',()=>{
 const html=fs.readFileSync(base+'site/ktp.html','utf8');
 assert.ok(html.includes('c.planning.plan')&&html.includes('c.planning.state'));
 assert.ok(html.includes('id="lessonDialog"'));
 assert.ok(html.includes('id="viewToday"'));
 assert.ok(html.includes('id="stageSelect"'));
});
