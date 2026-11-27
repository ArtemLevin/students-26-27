import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {cumulativeCoverage,normalizeCoverageCatalog} from './learning-coverage.js';
import {loadCompetencyCatalog,parseLessonRegistrySource} from '../../pipeline/student/publication-contract.mjs';
import {syncCoverage} from '../../scripts/sync-learning-coverage.mjs';
const make=(date,outcomes)=>({date,title:date,href:'27.11.26.html',outcomes});
const o=(competencyId,relation)=>({competencyId,relation,evidenceAnchor:'section'});
test('cumulative, idempotent and strongest evidence survives later repetition',()=>{
 const lessons=[make('2026-11-01',[o('a','practiced')]),make('2026-11-02',[o('a','touched'),o('b','touched')]),make('2026-11-03',[o('b','practiced')]),make('2026-11-04',[o('c','touched'),o('c','touched')])];
 const x=cumulativeCoverage(lessons);
 assert.equal(x.byId.size,3);assert.equal(x.byId.get('a').relation,'practiced');
 assert.equal(x.byId.get('c').entries.length,1);assert.deepEqual([...x.newIds],['c']);
 const next=cumulativeCoverage([...lessons,make('2026-11-05',[o('a','touched'),o('d','assessed')])]);
 assert.equal(next.byId.size,4);assert.deepEqual([...next.newIds],['d']);assert.equal(next.byId.get('a').relation,'practiced');
 assert.equal(cumulativeCoverage([]).byId.size,0);
});
test('legacy history counts only explicit known IDs and positive recorded levels; never infers mastery',()=>{
 const records=[make('2026-11-01',[{label:'old',level:2,competencyId:'known'},{label:'zero',level:0,competencyId:'zero'},{label:'unknown',level:4,competencyId:'other'},{label:'unlinked',level:4}])];
 const result=cumulativeCoverage(records,{knownIds:new Set(['known','zero']),includeLegacy:true});
 assert.equal(result.byId.size,1);assert.equal(result.byId.get('known').relation,'historical');assert.equal(result.unlinked,3);
 assert.equal(cumulativeCoverage(records).byId.size,0);
});
test('all v2 cabinets use valid canonical catalogs and cumulative coverage without altering mastery',()=>{
 const report=syncCoverage({apply:false});
 assert.ok(report.students>=30);
 assert.equal(report.missing.length,0);
 for(const entry of fs.readdirSync('students',{withFileTypes:true})){
   const root=path.join('students',entry.name),file=path.join(root,'student-contract.json');
   if(!entry.isDirectory()||!fs.existsSync(file))continue;
   const c=JSON.parse(fs.readFileSync(file,'utf8'));
   const raw=loadCompetencyCatalog(path.join(root,c.competencies.catalog)).data;
   const catalog=normalizeCoverageCatalog(raw);
   const lessons=parseLessonRegistrySource(fs.readFileSync(path.join(root,c.lessons.registry),'utf8'));
   const result=cumulativeCoverage(lessons,{knownIds:catalog.ids,includeLegacy:true});
   assert.ok(result.byId.size<=catalog.ids.size,entry.name);
   for(const id of result.byId.keys())assert.ok(catalog.ids.has(id),entry.name);
   if(entry.name==='sofya_luzianina'){
     const atDate=cumulativeCoverage(lessons.filter(l=>l.date<='2026-11-27'),{knownIds:catalog.ids,includeLegacy:true});
     assert.equal(atDate.byId.size,25);assert.equal(atDate.newIds.size,6);
   }
 }
});
