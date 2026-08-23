import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const dataScript=readFileSync(join(siteDir,'dashboard-data.js'),'utf8');
const indexHtml=readFileSync(join(siteDir,'index.html'),'utf8');

const STATE_KEY='nikol-competence-map-v1';
const BASELINE_KEY='nikol-competence-teacher-baseline-v1';

class MemoryStorage {
  constructor(initial={}){this.values=new Map(Object.entries(initial));}
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
}

function evaluateData(initial={}){
  const localStorage=new MemoryStorage(initial);
  const window={};
  vm.runInNewContext(dataScript,{window,localStorage});
  return {window,localStorage};
}

test('existing learner competency levels survive dashboard initialization',()=>{
  const existing={t1_areas:4,t1_right:1,custom_future_skill:3};
  const {localStorage}=evaluateData({[STATE_KEY]:JSON.stringify(existing)});
  const state=JSON.parse(localStorage.getItem(STATE_KEY));
  assert.equal(state.t1_areas,4);
  assert.equal(state.t1_right,1);
  assert.equal(state.custom_future_skill,3);
  assert.equal(state.t2_coordinates,3);
});

test('teacher baseline is stored separately from learner state',()=>{
  const {localStorage}=evaluateData({[STATE_KEY]:JSON.stringify({t1_areas:4})});
  const state=JSON.parse(localStorage.getItem(STATE_KEY));
  const baseline=JSON.parse(localStorage.getItem(BASELINE_KEY));
  assert.equal(state.t1_areas,4);
  assert.equal(baseline.t1_areas,2);
});

test('sync is idempotent after a learner changes a level',()=>{
  const {window,localStorage}=evaluateData();
  const state=JSON.parse(localStorage.getItem(STATE_KEY));
  state.t1_areas=4;
  localStorage.setItem(STATE_KEY,JSON.stringify(state));
  window.__nikolSync(localStorage);
  const afterFirstSync=localStorage.getItem(STATE_KEY);
  window.__nikolSync(localStorage);
  const afterSecondSync=localStorage.getItem(STATE_KEY);
  assert.equal(JSON.parse(afterFirstSync).t1_areas,4);
  assert.equal(afterSecondSync,afterFirstSync);
});

test('corrupted learner state is repaired with the teacher seed',()=>{
  const {localStorage}=evaluateData({[STATE_KEY]:'{broken-json'});
  const state=JSON.parse(localStorage.getItem(STATE_KEY));
  assert.equal(state.t1_areas,2);
  assert.equal(state.t6_exponential,3);
});

test('P0 map entry point remains available as the native-map fallback',()=>{
  assert.match(indexHtml,/href="index-original\.html#competencies"/);
  assert.doesNotMatch(indexHtml,/index-original\.html#heatmap/);
});
