import test from 'node:test';
import assert from 'node:assert/strict';
import {auditStudentCoverage,classifyCoverageOutcome} from '../audit-lesson-coverage.mjs';
import {PRACTICE_DISPOSITIONS,outcomeCoverageKey,validatePracticeGap} from '../coverage-policy.js';

const generator={key:'algebra.demo',competencyIds:['skill']};
const registry={has:key=>key===generator.key,get:key=>{if(key!==generator.key)throw new Error('unknown');return generator;}};
const ids=new Set(['skill','unmapped']);
const config={competencies:{skill:{generator:generator.key,difficulty:[1],activation:'lesson'}}};
const lesson=(outcomes,date='2026-08-31')=>[{date,outcomes}];
const audit=(outcomes,baseline=[])=>auditStudentCoverage({student:'student',lessons:lesson(outcomes),config,competencyIds:ids,generatorRegistry:registry,curatedBanks:new Map(),baseline:{legacyImplicitOutcomes:baseline}});

test('shared coverage policy exposes the Stage 04 disposition contract',()=>{
  assert.deepEqual(PRACTICE_DISPOSITIONS,['generator','curated','manual','none','coverage-gap','competency-gap','ambiguous']);
  assert.equal(outcomeCoverageKey('2026-08-31','Навык'),'2026-08-31::Навык');
  assert.equal(validatePracticeGap({reason:'generator-missing',issue:'planned:test'}).valid,true);
});

test('coverage classifier distinguishes missing competency and missing practice mapping',()=>{
  assert.equal(classifyCoverageOutcome({outcome:{label:'A'},config,competencyIds:ids,generatorRegistry:registry,curatedBanks:new Map()}).status,'missing-competency');
  assert.equal(classifyCoverageOutcome({outcome:{label:'B',competencyId:'unmapped'},config,competencyIds:ids,generatorRegistry:registry,curatedBanks:new Map()}).status,'missing-practice-mapping');
});

test('generator, manual and none dispositions produce intentional coverage states',()=>{
  const result=audit([
    {label:'Generator',competencyId:'skill',practiceDisposition:'generator'},
    {label:'Manual',practiceDisposition:'manual'},
    {label:'Info',practiceDisposition:'none'}
  ]);
  assert.equal(result.ok,true);assert.equal(result.counts['covered-generator'],1);assert.equal(result.counts['manual-assessment'],1);assert.equal(result.counts['excluded-explicitly'],1);assert.equal(result.gaps,0);
});

test('a new implicit outcome is a hard gate even when generator coverage can be inferred',()=>{
  const result=audit([{label:'New',competencyId:'skill'}]);
  assert.equal(result.counts['covered-generator'],1);assert.equal(result.ok,false);assert.ok(result.violations.some(item=>item.type==='new-outcome-missing-disposition'));
});

test('historical implicit outcome is grandfathered but the ratchet rejects a second unexplained gap',()=>{
  const oldKey='2026-08-31::Old gap';
  const old=audit([{label:'Old gap'}],[oldKey]);assert.equal(old.ok,true);assert.equal(old.gaps,1);
  const worse=audit([{label:'Old gap'},{label:'New gap'}],[oldKey]);assert.equal(worse.ok,false);assert.ok(worse.violations.some(item=>item.key==='2026-08-31::New gap'));
});

test('machine-readable gap waiver allows an intentional coverage gap without hiding it from metrics',()=>{
  const result=audit([{label:'Planned generator',competencyId:'unmapped',practiceDisposition:'coverage-gap',practiceGap:{reason:'generator-missing',issue:'planned:demo-generator'}}]);
  assert.equal(result.ok,true);assert.equal(result.gaps,1);assert.equal(result.coverage,0);assert.equal(result.outcomes[0].machineWaived,true);
});

test('gap disposition without waiver and ambiguous mapping both fail the merge gate',()=>{
  const gap=audit([{label:'Gap',practiceDisposition:'competency-gap'}]);assert.equal(gap.ok,false);assert.ok(gap.violations.some(item=>item.type==='gap-without-waiver'));
  const ambiguous=audit([{label:'Ambiguous',practiceDisposition:'ambiguous'}]);assert.equal(ambiguous.ok,false);assert.ok(ambiguous.violations.some(item=>item.type==='ambiguous'));
});

test('resolved historical baseline entries must be removed in the same change',()=>{
  const key='2026-08-31::Resolved';
  const result=audit([{label:'Resolved',practiceDisposition:'manual'}],[key]);
  assert.equal(result.ok,false);assert.ok(result.violations.some(item=>item.type==='stale-baseline'));
});

test('broken explicit generator mapping is reported as a concrete gap status',()=>{
  const result=audit([{label:'Broken',competencyId:'unmapped',practiceDisposition:'generator'}]);
  assert.equal(result.ok,false);assert.equal(result.outcomes[0].status,'missing-practice-mapping');assert.ok(result.violations.some(item=>item.type==='broken-explicit-coverage'));
});
