import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {
  STATE_SCHEMA_VERSION,
  LEVEL_LABELS,
  LEVEL_DESCRIPTIONS,
  mergeState,
  computeSummary,
  matchesCompetencyFilter,
  updateReviewQueue,
  getNextRovingIndex,
  extractArrayExpression,
  evaluateCatalogExpression,
  normalizeGroups,
  validateCatalog
} from './legacy-competence-map.js';

const DATE_HTML=/^(?:\d{2}\.\d{2}\.\d{2}|\d{2}-\d{2}-\d{2})\.html$/;

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function walk(dir,base=dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name),rel=path.relative(base,full).replaceAll('\\','/');
    return entry.isDirectory()?walk(full,base):[{full,rel,name:entry.name}];
  });
}

async function loadRegistry(site){
  const url=pathToFileURL(path.join(site,'lesson-registry.js'));
  url.search=`?t=${Date.now()}-${Math.random()}`;
  return import(url.href);
}

function assertCoreState(){
  const groups=[{id:'g',title:'G',items:[
    {id:'new',legacyIds:['old'],level:3},
    {id:'fresh',level:2},
    {id:'mastered',level:4}
  ]}];
  const config={stateKey:'student-state-v2',storageKey:'student-state-v1',baselineKey:'student-baseline',teacherSeed:{new:4,fresh:3},legacyStorageKeys:[],legacyRepeatKeys:['student-repeat-v1']};
  let storage=new MemoryStorage({
    'student-state-v1':JSON.stringify({new:0,old:4}),
    'student-repeat-v1':JSON.stringify(['fresh'])
  });
  const first=mergeState(groups,storage,config,()=> '2026-08-24T00:00:00.000Z');
  assert.equal(first.state.schemaVersion,STATE_SCHEMA_VERSION);
  assert.equal(first.state.studentLevels.new,0,'saved user value must win over baseline');
  assert.equal(first.state.studentLevels.fresh,3,'missing key must be seeded');
  assert.equal(first.state.studentLevels.mastered,4,'catalog default must seed missing key');
  assert.ok(first.state.reviewQueue.fresh,'legacy review queue must migrate independently');
  assert.equal(first.state.studentLevels.fresh,3,'queue migration must not lower mastery');
  const snapshot=storage.getItem('student-state-v2');
  const second=mergeState(groups,storage,config,()=> '2026-08-25T00:00:00.000Z');
  assert.equal(storage.getItem('student-state-v2'),snapshot,'v2 sync must be idempotent');
  assert.equal(second.state.updatedAt,'2026-08-24T00:00:00.000Z');
  storage=new MemoryStorage({'student-state-v2':'{broken'});
  const recovered=mergeState(groups,storage,config,()=> '2026-08-24T00:00:00.000Z');
  assert.equal(recovered.state.studentLevels.new,4,'corrupted JSON must recover from baseline');
  const migrated=new MemoryStorage({'student-state-v1':JSON.stringify({old:1})});
  assert.equal(mergeState(groups,migrated,config).state.studentLevels.new,1,'legacyIds must migrate');

  const queue=updateReviewQueue({},'new',true,'2026-08-24T00:00:00.000Z');
  assert.equal(matchesCompetencyFilter('repeat','new',4,queue),true);
  assert.equal(matchesCompetencyFilter('repeat','fresh',1,queue),false);
  assert.equal(matchesCompetencyFilter('unseen','new',0,queue),true);
  assert.equal(matchesCompetencyFilter('help','new',1,queue),true);
  assert.equal(matchesCompetencyFilter('progress','new',2,queue),true);
  assert.equal(matchesCompetencyFilter('confident','new',3,queue),true);
  assert.equal(matchesCompetencyFilter('mastered','new',4,queue),true);
  const summary=computeSummary(groups,{new:3,fresh:2,mastered:4},queue);
  assert.deepEqual({confident:summary.confident,mastered:summary.mastered,process:summary.process,repeat:summary.repeat},{confident:1,mastered:1,process:1,repeat:1});
  assert.equal(getNextRovingIndex(0,3,'ArrowLeft'),2);
  assert.equal(getNextRovingIndex(2,3,'ArrowRight'),0);
  assert.equal(getNextRovingIndex(1,3,'Home'),0);
  assert.equal(getNextRovingIndex(1,3,'End'),2);
  assert.deepEqual(LEVEL_LABELS,['Не изучено','Нужна помощь','В процессе','Уверенно','Освоено']);
  assert.equal(LEVEL_DESCRIPTIONS.length,5);
}

function loadCatalog(root,spec){
  if(spec.kind==='json-assignment'){
    const text=fs.readFileSync(path.join(root,spec.path),'utf8'),index=text.indexOf('=');
    return normalizeGroups(JSON.parse(text.slice(index+1).replace(/;\s*$/,'')));
  }
  if(spec.kind==='window-script'){
    const text=fs.readFileSync(path.join(root,spec.path),'utf8'),sandbox={window:{}};
    vm.createContext(sandbox);
    vm.runInContext(text,sandbox,{timeout:1000});
    return normalizeGroups(sandbox.window[spec.global].groups||sandbox.window[spec.global]);
  }
  const text=fs.readFileSync(path.join(root,spec.path),'utf8');
  return normalizeGroups(evaluateCatalogExpression(extractArrayExpression(text,spec.names||['groups','GROUPS'])));
}

export async function runDashboardTests({student,expectedLessons,catalog,stateKey,storageKey}){
  const root=process.cwd(),site=path.join(root,'students',student,'site');
  assert.ok(fs.existsSync(path.join(site,'index.html')),`${student}: index missing`);
  const registry=await loadRegistry(site),lessons=registry.LESSONS;
  assert.equal(lessons.length,expectedLessons,`${student}: lesson count`);
  for(let index=1;index<lessons.length;index+=1)assert.ok(lessons[index-1].date>=lessons[index].date,`${student}: registry newest-first`);
  assert.equal(new Set(lessons.map(item=>item.date)).size,lessons.length,`${student}: unique dates`);
  assert.equal(new Set(lessons.map(item=>item.href)).size,lessons.length,`${student}: unique hrefs`);
  assert.equal(registry.RECENT_LIMIT,3);
  assert.equal(registry.ARCHIVE_PAGE_SIZE,10);
  const files=walk(site).filter(item=>DATE_HTML.test(item.name)).map(item=>item.rel).sort(),refs=lessons.map(item=>item.href).sort();
  assert.deepEqual(refs,files,`${student}: filesystem parity`);
  for(const href of Object.values(lessons[0].materials||{}))assert.ok(fs.existsSync(path.resolve(site,href)),`${student}: missing latest material ${href}`);

  const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
  for(const forbidden of ['<iframe','contentDocument','contentWindow','.map-frame','id="base"'])assert.ok(!html.includes(forbidden),`${student}: forbidden legacy architecture ${forbidden}`);
  for(const required of [
    'id="menuButton"','aria-controls="sidebar"','id="sidebar"','id="recentLessons"','id="archivePage"','aria-live="polite"','id="latestLessonCta"','id="competenceMap"',
    'id="masteredCount"','id="masteredCountMain"','data-filter="unseen"','data-filter="help"','data-filter="confident"','aria-labelledby="radialTitle radialDescription"','id="levelExplanation"','aria-labelledby="dialogTitle"'
  ])assert.ok(html.includes(required),`${student}: missing ${required}`);
  for(let level=0;level<=4;level+=1)assert.ok(html.includes(`dot l${level}`),`${student}: legend level ${level}`);

  const dashboard=fs.readFileSync(path.join(site,'dashboard.js'),'utf8'),configText=fs.readFileSync(path.join(site,'competence-config.js'),'utf8');
  assert.ok(dashboard.includes('-dashboard-theme-v1'),`${student}: isolated theme namespace`);
  assert.ok(configText.includes(storageKey),`${student}: expected legacy storage key`);
  assert.ok(configText.includes(stateKey),`${student}: expected v2 state key`);
  const core=fs.readFileSync(path.join(root,'shared/student-dashboard/dashboard-core.js'),'utf8');
  for(const token of ['inert','aria-hidden','Escape','Tab','shiftKey','matchMedia','sidebar-open','opener','masteredCount'])assert.ok(core.includes(token),`${student}: shell invariant ${token}`);
  const mapCode=fs.readFileSync(path.join(root,'shared/student-dashboard/legacy-competence-map.js'),'utf8');
  for(const token of ['schemaVersion','studentLevels','reviewQueue','ArrowLeft','Home','restoreDialogFocus','LEVEL_DESCRIPTIONS'])assert.ok(mapCode.includes(token),`${student}: map invariant ${token}`);

  const groups=loadCatalog(root,catalog),meta=validateCatalog(groups),items=groups.flatMap(group=>group.items);
  assert.ok(meta.groups>0&&meta.items>0,`${student}: catalog must be non-empty`);
  assert.equal(new Set(items.map(item=>item.id)).size,items.length,`${student}: competency ids unique`);
  const seeded=new MemoryStorage(),merged=mergeState(groups,seeded,{stateKey:'probe-v2',storageKey:'probe-v1',baselineKey:'probe-baseline',teacherSeed:{},legacyStorageKeys:[]});
  assert.equal(Object.keys(merged.state.studentLevels).filter(id=>items.some(item=>item.id===id)).length,items.length,`${student}: state covers catalog`);
  assertCoreState();
  console.log(`✓ ${student}: ${lessons.length} lessons, ${meta.groups} groups, ${meta.items} skills, state v2`);
}
