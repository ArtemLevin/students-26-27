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

test('v1 state migrates to v2, preserves learner levels and seeds all catalog competencies',()=>{
  const storage=new MemoryStorage({
    [component.LEGACY_STORAGE_KEY]:JSON.stringify({t1_areas:4,t1_right:1,custom_future_skill:3})
  });
  const state=component.mergeCompetencyState(groups,storage,{t1_areas:2,t2_coordinates:3},()=> '2026-08-24T10:00:00.000Z');
  assert.equal(state.schemaVersion,component.STATE_SCHEMA_VERSION);
  assert.equal(state.studentLevels.t1_areas,4);
  assert.equal(state.studentLevels.t1_right,1);
  assert.equal(state.studentLevels.custom_future_skill,3);
  assert.equal(state.studentLevels.t2_coordinates,3);
  assert.deepEqual(state.reviewQueue,{});
  assert.equal(state.updatedAt,'2026-08-24T10:00:00.000Z');
  for(const item of items)assert.ok(Object.prototype.hasOwnProperty.call(state.studentLevels,item.id),`missing ${item.id}`);
  assert.deepEqual(JSON.parse(storage.getItem(component.STORAGE_KEY)),state);
});

test('existing v2 review queue and learner state survive repeated initialization',()=>{
  const stored={
    schemaVersion:2,
    studentLevels:{t1_areas:4,custom_future_skill:3},
    reviewQueue:{t1_areas:{addedAt:'2026-08-23T12:00:00.000Z'}},
    updatedAt:'2026-08-23T12:00:00.000Z'
  };
  const storage=new MemoryStorage({[component.STORAGE_KEY]:JSON.stringify(stored)});
  const first=component.mergeCompetencyState(groups,storage,{t1_areas:2,t2_coordinates:3});
  const second=component.mergeCompetencyState(groups,storage,{t1_areas:2,t2_coordinates:3});
  assert.equal(first.studentLevels.t1_areas,4);
  assert.equal(first.studentLevels.t2_coordinates,3);
  assert.deepEqual(first.reviewQueue,stored.reviewQueue);
  assert.deepEqual(second,first);
});

test('review queue changes do not change learner mastery levels',()=>{
  const levels={t1_areas:4};
  const added=component.updateReviewQueue({},'t1_areas',true,'2026-08-24T10:00:00.000Z');
  assert.equal(levels.t1_areas,4);
  assert.equal(component.isInReviewQueue(added,'t1_areas'),true);
  assert.deepEqual(added.t1_areas,{addedAt:'2026-08-24T10:00:00.000Z'});
  const removed=component.updateReviewQueue(added,'t1_areas',false);
  assert.equal(levels.t1_areas,4);
  assert.equal(component.isInReviewQueue(removed,'t1_areas'),false);
});

test('repeat filter is independent from low mastery levels',()=>{
  const reviewQueue={t1_areas:{addedAt:'2026-08-24T10:00:00.000Z'}};
  assert.equal(component.matchesCompetencyFilter('repeat','t1_areas',4,reviewQueue),true);
  assert.equal(component.matchesCompetencyFilter('repeat','t1_right',1,reviewQueue),false);
  assert.equal(component.matchesCompetencyFilter('unseen','t1_right',0,reviewQueue),true);
  assert.equal(component.matchesCompetencyFilter('unseen','t1_areas',4,reviewQueue),false);
});

test('summary counts only explicitly queued competencies as repeat items',()=>{
  const levels=Object.fromEntries(items.map(item=>[item.id,0]));
  levels[items[0].id]=2;
  levels[items[1].id]=3;
  levels[items[2].id]=4;
  const reviewQueue={
    [items[1].id]:{addedAt:'2026-08-24T10:00:00.000Z'},
    [items[10].id]:{addedAt:'2026-08-24T10:00:00.000Z'}
  };
  const summary=component.computeSummary(groups,levels,reviewQueue);
  assert.deepEqual(summary,{
    total:284,
    evaluated:3,
    confident:2,
    process:1,
    repeat:2,
    mastered:1,
    average:1
  });
});

test('active UI exposes independent repeat and unseen filters',()=>{
  assert.match(indexHtml,/data-filter="repeat"/);
  assert.match(indexHtml,/data-filter="unseen"/);
  assert.match(indexHtml,/data-filter="repeat"[^>]*>В повторении</);
  assert.match(indexHtml,/id="markRepeat"[^>]*aria-pressed="false"/);
  assert.match(componentSource,/toggleReviewQueue/);
  assert.doesNotMatch(componentSource,/markRepeat[^\n]*setActiveLevel\(1\)/);
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
