import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildRecoveryPlan,applyRecovery,gitBlobHash} from './recover-learning-coverage.mjs';
import {parseLessonRegistrySource} from '../pipeline/student/publication-contract.mjs';

function fixture(t){
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'heatmap-recovery-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const id='sample',date='2026-07-21',base=path.join(root,'students',id);
  const write=(file,value)=>{
    const target=path.join(base,file);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
    return target;
  };
  const existing={competencyId:'old',evidenceAnchor:'old',relation:'practiced',masteryClaim:null};
  const legacy={label:'Historical note',level:2,tone:'process'};
  const metadata={version:1,studentId:id,date,title:'Lesson',summary:'Summary',topics:[],ktpRefs:[],
    outcomes:[existing],legacyOutcomes:[legacy],materials:{html:'lesson.html'}};
  const registry=[{date,href:'lesson.html',title:'Lesson',navTitle:'Keep this title',navSubtitle:'Keep this subtitle',
    summary:'Summary',topics:[],ktpRefs:[],outcomes:[{competencyId:'old',evidenceAnchor:'old',relation:'practiced',
      label:'Existing practice',practiceDisposition:'manual'},legacy],materials:metadata.materials}];
  const files={
    contract:write('student-contract.json',{version:2,studentId:id,studentName:'Sample',program:'Math',
      planning:{mode:'rolling',plan:'site/plan.json',state:'site/state.json'},
      lessons:{registry:'site/lesson-registry.js',metadataDir:'site/data/lessons'},
      competencies:{catalog:'site/catalog.json',mastery:'site/mastery.json'},practice:{config:'site/practice.js'}}),
    catalog:write('site/catalog.json',{groups:[{items:[{id:'old',title:'Old skill'},{id:'new',title:'New skill'}]}]}),
    html:write('site/lesson.html','<main><section id="old">Old</section><section id="new">New</section></main>'),
    metadata:write('site/data/lessons/'+date+'.lesson.json',metadata),
    registry:write('site/lesson-registry.js','export const LESSONS='+JSON.stringify(registry,null,2)+';\n')
  };
  const authority=[
    write('site/plan.json',{version:1,studentId:id,programVersion:'1',lessons:[]}),
    write('site/state.json',{version:1,studentId:id,programVersion:'1',updated:date,records:{}}),
    write('site/mastery.json',{version:1,studentId:id,updated:date,levels:{}}),
    write('site/practice.js','export const practice={};\n')
  ];
  const manifest={version:1,studentId:id,lessonDate:date,reviewId:'HM-test',
    expectedBefore:Object.fromEntries(Object.entries(files).map(([k,f])=>[k,gitBlobHash(fs.readFileSync(f))])),
    outcomes:[{competencyId:'new',evidenceAnchor:'new',relation:'touched',confidence:'exact',
      decision:'apply',masteryClaim:null,basis:'Reviewed explanation',
      source:'students/sample/site/lesson.html#new',practiceBasis:'Historical coverage only; no new practice assignment'}]};
  const snapshot=()=>Object.fromEntries([...Object.values(files),...authority].map(f=>[f,fs.readFileSync(f,'utf8')]));
  const seal=()=>({...manifest,expectedAfter:buildRecoveryPlan({root,manifest}).report.expectedAfter});
  return {root,files,authority,manifest,snapshot,seal,registry,metadata};
}
test('dry-run is read-only and apply requires exact reviewed after hashes',t=>{
  const f=fixture(t),before=f.snapshot();
  const p=buildRecoveryPlan(f);
  assert.equal(p.executable,false);
  assert.equal(p.report.beforeCoverage.covered,1);
  assert.equal(p.report.afterCoverage.covered,2);
  assert.deepEqual(f.snapshot(),before);
  assert.throws(()=>applyRecovery(f),/expectedAfter/);
  assert.deepEqual(f.snapshot(),before);
  const result=applyRecovery({...f,manifest:f.seal()});
  assert.equal(result.transaction.changedFiles.length,2);
  const actual=JSON.parse(fs.readFileSync(f.files.metadata,'utf8'));
  assert.deepEqual(actual.outcomes[0],f.metadata.outcomes[0]);
  assert.deepEqual(actual.legacyOutcomes,f.metadata.legacyOutcomes);
  assert.equal(actual.outcomes[1].masteryClaim,null);
  const [record]=parseLessonRegistrySource(fs.readFileSync(f.files.registry,'utf8'));
  assert.equal(record.navTitle,f.registry[0].navTitle);
  assert.deepEqual(record.outcomes[0],f.registry[0].outcomes[0]);
  assert.deepEqual(record.outcomes[2],f.registry[0].outcomes[1]);
  assert.equal(record.outcomes[1].practiceDisposition,'none');
  for(const file of [...f.authority,f.files.html,f.files.catalog,f.files.contract])
    assert.equal(fs.readFileSync(file,'utf8'),before[file]);
});
test('sealed rerun is idempotent',t=>{
  const f=fixture(t),manifest=f.seal();
  applyRecovery({...f,manifest});
  const after=f.snapshot();
  const second=applyRecovery({...f,manifest});
  assert.equal(second.replay,true);
  assert.deepEqual(second.transaction.changedFiles,[]);
  assert.deepEqual(f.snapshot(),after);
});
test('stale hashes, wrong after hash, unknown skill, fake anchor and excluded cabinets fail closed',t=>{
  const f=fixture(t),before=f.snapshot();
  const invalid=structuredClone(f.manifest);
  invalid.expectedBefore.registry='0'.repeat(40);
  assert.throws(()=>buildRecoveryPlan({...f,manifest:invalid}),/before hash conflict/);
  const wrongAfter={...f.seal(),expectedAfter:{registry:'0'.repeat(40),metadata:'0'.repeat(40)}};
  assert.throws(()=>applyRecovery({...f,manifest:wrongAfter}),/after hash mismatch/);
  const unknown=structuredClone(f.manifest);
  unknown.outcomes[0].competencyId='unknown';
  assert.throws(()=>buildRecoveryPlan({...f,manifest:unknown}),/absent from the competency catalog/);
  const anchor=structuredClone(f.manifest);
  anchor.outcomes[0].evidenceAnchor='missing';
  anchor.outcomes[0].source='students/sample/site/lesson.html#missing';
  assert.throws(()=>buildRecoveryPlan({...f,manifest:anchor}),/anchor/);
  assert.throws(()=>buildRecoveryPlan({...f,manifest:{...f.manifest,studentId:'marina'}}),/excluded cabinet/);
  const mastery=structuredClone(f.manifest);
  mastery.outcomes[0].masteryClaim={level:3};
  assert.throws(()=>buildRecoveryPlan({...f,manifest:mastery}),/forbids mastery claims/);
  assert.deepEqual(f.snapshot(),before);
});
test('atomic transaction rolls back both registry and metadata on injected failure',t=>{
  const f=fixture(t),before=f.snapshot(),manifest=f.seal();
  assert.throws(()=>applyRecovery({...f,manifest,faultInjector:()=>{throw Error('injected failure');}}),/rolled back/);
  assert.deepEqual(f.snapshot(),before);
});
test('source changes after review stop application',t=>{
  const f=fixture(t),manifest=f.seal();
  fs.appendFileSync(f.files.html,'<!-- changed -->');
  const before=f.snapshot();
  assert.throws(()=>applyRecovery({...f,manifest}),/reviewed input hash changed: html/);
  assert.deepEqual(f.snapshot(),before);
});
test('already recorded competency cannot be duplicated by a fresh manifest',t=>{
  const f=fixture(t),manifest=structuredClone(f.manifest);
  manifest.outcomes[0].competencyId='old';
  manifest.outcomes[0].evidenceAnchor='old';
  manifest.outcomes[0].source='students/sample/site/lesson.html#old';
  assert.throws(()=>buildRecoveryPlan({...f,manifest}),/explicit reconciliation/);
});
