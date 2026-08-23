import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const legacyHtml=readFileSync(join(siteDir,'index-original.html'),'utf8');
const indexHtml=readFileSync(join(siteDir,'index.html'),'utf8');
const dashboardScript=readFileSync(join(siteDir,'dashboard.js'),'utf8');
const componentSource=readFileSync(join(siteDir,'competence-map.js'),'utf8');
const component=await import(pathToFileURL(join(siteDir,'competence-map.js')).href);

class MemoryStorage{
  constructor(initial={}){this.values=new Map(Object.entries(initial));}
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
}

const groups=component.extractGroupsFromLegacy(legacyHtml);
const items=component.flattenGroups(groups);

test('canonical legacy catalog extracts 19 groups and 284 unique competencies',()=>{
  assert.equal(groups.length,19);
  assert.equal(items.length,284);
  assert.equal(new Set(items.map(item=>item.id)).size,284);
});

test('native map state preserves learner edits and seeds all catalog competencies',()=>{
  const storage=new MemoryStorage({
    [component.STORAGE_KEY]:JSON.stringify({t1_areas:4,custom_future_skill:3})
  });
  const state=component.mergeCompetencyState(groups,storage,{t1_areas:2,t2_coordinates:3});
  assert.equal(state.t1_areas,4);
  assert.equal(state.custom_future_skill,3);
  assert.equal(state.t2_coordinates,3);
  for(const item of items)assert.ok(Object.prototype.hasOwnProperty.call(state,item.id),`missing ${item.id}`);
});

test('summary is calculated from current 284-value state',()=>{
  const state=Object.fromEntries(items.map(item=>[item.id,0]));
  state[items[0].id]=2;
  state[items[1].id]=3;
  state[items[2].id]=4;
  const summary=component.computeSummary(groups,state);
  assert.deepEqual(summary,{
    total:284,
    evaluated:3,
    confident:2,
    process:1,
    repeat:281,
    mastered:1,
    average:1
  });
});

test('generic legacy lesson anchors are suppressed while concrete lessons survive',()=>{
  assert.equal(component.normalizeMaterialLink('index.html#lessons'),null);
  assert.equal(component.normalizeMaterialLink('#lessons'),null);
  assert.equal(component.normalizeMaterialLink('23.08.26.html'),'23.08.26.html');
  assert.equal(component.normalizeMaterialLink('index.html#lesson'),'#lesson');
});

test('active dashboard contains a native map and no iframe bridge',()=>{
  assert.match(indexHtml,/id="competenceMap"/);
  assert.match(indexHtml,/id="radialMap"/);
  assert.match(indexHtml,/type="module" src="competence-map\.js"/);
  assert.doesNotMatch(indexHtml,/<iframe\b/i);
  assert.doesNotMatch(indexHtml,/id="base"/);
  assert.doesNotMatch(dashboardScript,/contentDocument|contentWindow|__nikolSync/);
});

test('live summary event replaces static 99-skill counters',()=>{
  assert.match(componentSource,/nikol:competence-summary/);
  assert.match(dashboardScript,/nikol:competence-summary/);
  assert.match(indexHtml,/id="totalCount">—/);
  assert.match(indexHtml,/id="evaluatedCount">—/);
  assert.doesNotMatch(indexHtml,/>99<\/b>/);
});

test('native map inherits dashboard theme and has no legacy theme storage',()=>{
  assert.doesNotMatch(componentSource,/nikol-site-theme/);
  assert.doesNotMatch(componentSource,/dataset\.theme\s*=/);
  assert.match(indexHtml,/href="competence-map\.css"/);
});

test('active map code does not expose stale #lessons navigation',()=>{
  assert.doesNotMatch(indexHtml,/href="(?:index\.html)?#lessons"/);
  assert.doesNotMatch(dashboardScript,/#lessons/);
});
