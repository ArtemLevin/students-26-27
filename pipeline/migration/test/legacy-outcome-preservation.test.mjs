import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validateLessonMetadataData
} from '../../student/contract.mjs';
import {
  loadLessonRegistry,
  validateRegistryMetadataParity
} from '../../student/publication-contract.mjs';
import {buildRollingKtpPlan} from '../build/ktp-state.mjs';
import {
  buildHistoricalLessonMetadata,
  renderCanonicalLessonRegistry
} from '../build/lessons.mjs';

function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'legacy-outcome-preservation-'));
  const studentId='demo_student';
  const base=path.join(root,'students',studentId);
  const site=path.join(base,'site');
  write(
    path.join(site,'lesson-registry.js'),
    `export const LESSONS=[{
      date:'2026-09-30',
      href:'30.09.26.html',
      title:'Demo lesson',
      summary:'Demo summary',
      topics:['demo'],
      outcomes:[
        {competencyId:'skill_a',label:'Canonical skill',level:2,tone:'process',practiceDisposition:'manual'},
        {label:'Legacy-only observation',level:3,tone:'good'}
      ],
      materials:{pdf:'../pdf_docs/30.09.26.pdf'}
    }];\n`
  );
  write(
    path.join(site,'30.09.26.html'),
    '<!doctype html><h1>Demo lesson</h1><section id="practice"></section>'
  );
  write(path.join(base,'pdf_docs','30.09.26.pdf'),'pdf');
  return {root,studentId,base,site};
}

test('migration replaces mapped legacy outcome with canonical evidence and preserves label-only presentation',()=>{
  const x=fixture();
  const manifest={
    lessonMappings:[{lessonDate:'2026-09-30',ktpMatches:[]}],
    competencyMappings:[{
      lessonDate:'2026-09-30',
      competencyId:'skill_a',
      evidenceAnchor:'practice',
      relation:'practiced',
      masteryClaim:null,
      confidence:'exact',
      basis:'Direct practice evidence.'
    }]
  };
  const plan=buildRollingKtpPlan({studentId:x.studentId});
  const built=buildHistoricalLessonMetadata({
    root:x.root,
    studentId:x.studentId,
    manifest,
    plan
  });
  const metadata=built.metadataByDate.get('2026-09-30');

  assert.deepEqual(metadata.outcomes,[{
    competencyId:'skill_a',
    evidenceAnchor:'practice',
    relation:'practiced',
    masteryClaim:null
  }]);
  assert.deepEqual(metadata.legacyOutcomes,[{
    label:'Legacy-only observation',
    level:3,
    tone:'good'
  }]);
  assert.ok(
    built.warnings.some(item=>
      item.type==='legacy-outcomes-preserved'&&
      item.lessonDate==='2026-09-30'&&
      item.count===1
    )
  );

  const source=renderCanonicalLessonRegistry({
    metadataByDate:built.metadataByDate,
    presentationByDate:built.presentationByDate
  });
  write(path.join(x.site,'candidate-registry.js'),source);
  const registry=loadLessonRegistry(path.join(x.site,'candidate-registry.js'));
  assert.deepEqual(
    JSON.parse(JSON.stringify(registry[0].outcomes)),
    [
      {competencyId:'skill_a',evidenceAnchor:'practice',relation:'practiced'},
      {label:'Legacy-only observation',level:3,tone:'good'}
    ]
  );
  assert.equal(
    validateRegistryMetadataParity(registry,built.metadataByDate),
    true
  );
});

test('unmapped legacy outcome with competencyId is retained with provenance fields intact',()=>{
  const x=fixture();
  const manifest={
    lessonMappings:[{lessonDate:'2026-09-30',ktpMatches:[]}],
    competencyMappings:[]
  };
  const plan=buildRollingKtpPlan({studentId:x.studentId});
  const built=buildHistoricalLessonMetadata({
    root:x.root,
    studentId:x.studentId,
    manifest,
    plan
  });
  const metadata=built.metadataByDate.get('2026-09-30');

  assert.deepEqual(metadata.legacyOutcomes,[
    {
      label:'Canonical skill',
      level:2,
      competencyId:'skill_a',
      tone:'process',
      practiceDisposition:'manual'
    },
    {
      label:'Legacy-only observation',
      level:3,
      tone:'good'
    }
  ]);
  assert.deepEqual(metadata.outcomes,[]);
});

test('presentation-only legacy outcomes cannot smuggle mastery semantics into metadata',()=>{
  const value={
    version:1,
    studentId:'demo_student',
    date:'2026-09-30',
    title:'Demo',
    summary:'',
    topics:[],
    ktpRefs:[],
    outcomes:[],
    legacyOutcomes:[{
      label:'Legacy',
      level:2,
      masteryClaim:{level:4}
    }],
    materials:{html:'30.09.26.html'}
  };

  assert.throws(
    ()=>validateLessonMetadataData(value,{studentId:'demo_student',plan:{lessons:[]}}),
    /unknown field masteryClaim/
  );
});
