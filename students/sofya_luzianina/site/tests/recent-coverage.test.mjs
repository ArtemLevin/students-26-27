import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync(new URL('../heatmap.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('../lesson-registry.js',import.meta.url),'utf8');
const fn=js.slice(js.indexOf('export function recentCoverage'),js.indexOf('function startMap')).replace('export function','function');
const coverage=vm.runInNewContext(fn+'\nrecentCoverage;');
const records=JSON.parse(registry.slice(registry.indexOf('['),registry.indexOf('];')+1));
test('three recent lessons: deduplicate without promoting mastery',()=>{
 const snapshot=records.filter(x=>x.date<='2026-11-27');
 const result=coverage(snapshot);
 assert.deepEqual(Array.from(result.recent,x=>x.date),['2026-11-27','2026-11-25','2026-11-20']);
 assert.equal(result.byId.size,20);
 assert.equal([...result.byId.values()].filter(x=>x.relation==='practiced').length,16);
 assert.equal([...result.byId.values()].filter(x=>x.relation==='touched').length,4);
 assert.equal(result.byId.get('dynamics_12').entries.length,2);
 assert.equal(result.byId.get('dynamics_06').entries.length,2);
 for(const entry of [...result.byId.values()].flatMap(x=>x.entries)){
  const source=fs.readFileSync(new URL('../'+entry.href,import.meta.url),'utf8');
  assert.match(source,new RegExp('id=["\\\']'+entry.anchor+'["\\\']'));
 }
});
test('coverage handles ordering, duplicates, assessed evidence and empty history',()=>{
 const out=(relation,competencyId='x')=>({relation,competencyId,evidenceAnchor:'anchor'});
 const record=(date,outcomes)=>({date,title:date,href:'27.11.26.html',outcomes});
 const data=[record('2026-11-01',[out('practiced','old')]),record('2026-11-23',[out('assessed')]),record('2026-11-24',[out('practiced'),out('practiced')]),record('2026-11-25',[out('touched'),out('touched','y')])];
 const result=coverage(data);
 assert.equal(result.byId.get('x').relation,'assessed');
 assert.equal(result.byId.get('x').entries.length,3);
 assert.equal(result.byId.has('old'),false);
 assert.equal(coverage([]).byId.size,0);
 assert.equal(data[0].date,'2026-11-01');
});
test('coverage and mastery UI remain separate',()=>{
 for(const filter of ['recent','recent-practiced','recent-touched'])assert.ok(html.includes('data-filter="'+filter+'"'));
 assert.ok(html.includes('id="coverageSummary"'));
 assert.ok(js.includes("authority.levels[id]"));
 assert.ok(js.includes("node.setAttribute('data-coverage'"));
 assert.ok(js.includes("levelOf(item.id)===null?'unassessed'"));
});
