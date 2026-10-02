import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildStage04TransactionPlan,
  executeStage04Transaction
} from '../transaction.mjs';

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage04-tx-'));
  const site=path.join(root,'students','demo','site');
  const data=path.join(site,'data');
  fs.mkdirSync(data,{recursive:true});
  const registryPath=path.join(site,'lesson-registry.js');
  const practicePath=path.join(site,'practice-config.js');
  const masteryPath=path.join(data,'mastery-state.json');

  const registrySource=[
    'export const LESSONS=[',
    JSON.stringify({
      date:'2026-10-02',
      href:'02.10.26.html',
      title:'Урок',
      summary:'Урок',
      topics:['тема'],
      ktpRefs:[],
      outcomes:[{
        competencyId:'skill',
        evidenceAnchor:'skill-anchor',
        relation:'assessed'
      }],
      materials:{html:'02.10.26.html'}
    }),
    '];',
    ''
  ].join('\n');
  const practiceSource=[
    "export const PRACTICE_CONFIG={studentId:'demo',storageKey:'demo-practice',enabled:true,competencies:{",
    '}};',
    ''
  ].join('\n');
  const masterySource=JSON.stringify({
    version:1,
    studentId:'demo',
    updated:'2026-10-01',
    levels:{
      skill:{
        level:1,
        sourcePath:'site/data/lessons/2026-10-01.lesson.json',
        sourceKind:'stage04-mastery',
        basis:'Earlier exact observation.'
      }
    }
  },null,2)+'\n';

  fs.writeFileSync(registryPath,registrySource);
  fs.writeFileSync(practicePath,practiceSource);
  fs.writeFileSync(masteryPath,masterySource);

  const contracts={
    root,
    studentId:'demo',
    lessonDate:'2026-10-02',
    paths:{
      lessonRegistryPath:registryPath,
      practiceConfigPath:practicePath,
      masteryPath
    },
    sources:{
      lessonRegistry:registrySource,
      practiceConfig:practiceSource,
      mastery:masterySource
    },
    mastery:{
      path:masteryPath,
      source:masterySource,
      locator:{kind:'state-json',name:'levels'},
      levels:{skill:1}
    }
  };
  const practicePatch={
    status:'ready',
    blocks:[],
    operations:[
      {
        type:'upsert-lesson',
        lesson:{
          date:'2026-10-02',
          href:'02.10.26.html',
          title:'Урок',
          summary:'Урок',
          topics:['тема'],
          ktpRefs:[],
          outcomes:[{
            competencyId:'skill',
            evidenceAnchor:'skill-anchor',
            relation:'assessed',
            label:'Навык',
            practiceDisposition:'manual',
            level:3
          }],
          materials:{html:'02.10.26.html'}
        }
      },
      {
        type:'add-practice-mappings',
        mappings:[{
          competencyId:'skill',
          mapping:{
            generator:'demo.generator',
            difficulty:[1],
            activation:'lesson',
            group:'demo'
          }
        }]
      }
    ]
  };
  const masteryPatch={
    status:'ready',
    blocks:[],
    operations:[{
      type:'set-mastery-levels',
      levels:{skill:3},
      basisById:{skill:'Assessed exactly during lesson.'}
    }]
  };
  return {
    root,
    contracts,
    practicePatch,
    masteryPatch,
    files:[registryPath,practicePath,masteryPath]
  };
}

function snapshot(files){
  return new Map(files.map(file=>[file,fs.readFileSync(file)]));
}
function assertSnapshot(before){
  for(const [file,bytes] of before){
    assert.deepEqual(fs.readFileSync(file),bytes,file+' must be restored byte-for-byte');
  }
}

test('Stage 04 transaction plan combines registry, practice and mastery writes',()=>{
  const x=fixture();
  const plan=buildStage04TransactionPlan({
    contracts:x.contracts,
    practicePatch:x.practicePatch,
    masteryPatch:x.masteryPatch
  });
  assert.equal(plan.executable,true);
  assert.deepEqual(
    plan.writes.map(item=>item.path).sort(),
    [
      'students/demo/site/data/mastery-state.json',
      'students/demo/site/lesson-registry.js',
      'students/demo/site/practice-config.js'
    ].sort()
  );
  assert.equal(plan.preconditions.length,3);
});

test('Stage 04 transaction commits all managed files together',()=>{
  const x=fixture();
  const result=executeStage04Transaction({
    contracts:x.contracts,
    practicePatch:x.practicePatch,
    masteryPatch:x.masteryPatch,
    postflight:()=>({ok:true})
  });
  assert.equal(result.rolledBack,false);
  assert.equal(result.changedFiles.length,3);

  const mastery=JSON.parse(fs.readFileSync(x.files[2],'utf8'));
  assert.equal(mastery.updated,'2026-10-02');
  assert.deepEqual(mastery.levels.skill,{
    level:3,
    sourcePath:'site/data/lessons/2026-10-02.lesson.json',
    sourceKind:'stage04-mastery',
    basis:'Assessed exactly during lesson.'
  });
  assert.match(fs.readFileSync(x.files[0],'utf8'),/"practiceDisposition"\s*:\s*"manual"/);
  assert.match(fs.readFileSync(x.files[1],'utf8'),/demo\.generator/);
});

test('Stage 04 partial write failure rolls every managed file back byte-for-byte',()=>{
  const x=fixture();
  const before=snapshot(x.files);
  assert.throws(
    ()=>executeStage04Transaction({
      contracts:x.contracts,
      practicePatch:x.practicePatch,
      masteryPatch:x.masteryPatch,
      faultInjector:event=>{
        if(event.phase==='after-write'&&event.index===0){
          throw new Error('forced Stage 04 partial failure');
        }
      },
      postflight:()=>({ok:true})
    }),
    /forced Stage 04 partial failure[\s\S]*rolled back/
  );
  assertSnapshot(before);
});

test('Stage 04 dry-run reports the combined write set without touching files',()=>{
  const x=fixture();
  const before=snapshot(x.files);
  const result=executeStage04Transaction({
    contracts:x.contracts,
    practicePatch:x.practicePatch,
    masteryPatch:x.masteryPatch,
    dryRun:true
  });
  assert.equal(result.changedFiles.length,3);
  assertSnapshot(before);
});
