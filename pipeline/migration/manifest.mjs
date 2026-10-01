import fs from 'node:fs';
import path from 'node:path';
import {
  assertRepoRelativePath,
  isCalendarDate
} from '../student/contract.mjs';
import {inspectStudent} from './inventory-students.mjs';
import {inspectLegacyLearningState} from './legacy/inspect-learning-state.mjs';
import {discoverHistoricalLessons} from './legacy/discover-lessons.mjs';

export const STUDENT_MIGRATION_MANIFEST_VERSION=1;

const STUDENT_ID_RE=/^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const KTP_ID_RE=/^ktp-(\d{3,})$/;
const TOKEN_ID_RE=/^[A-Za-z0-9_.:-]+$/;
const ANCHOR_RE=/^[A-Za-z][A-Za-z0-9_-]*$/;
const CONFIDENCE=new Set(['exact','probable','ambiguous']);
const COVERAGE=new Set(['complete','partial','deferred']);
const RELATION=new Set(['touched','practiced','assessed']);
const ARCHITECTURES=new Set(['modern-shared','legacy-ktp','legacy-structured','legacy-bespoke']);
const MASTERY_SOURCE_KINDS=new Set([
  'teacher-seed',
  'teacher-mastery',
  'baseline-levels',
  'mastery-authority',
  'stage04-mastery',
  'dashboard-data'
]);
const AMBIGUITY_KINDS=new Set(['planning','ktp','lesson','competency','mastery','source']);
const PRIVATE_KEYS=new Set([
  'teacherPrivateNote','teacherNote','parentContact','parentNote','privateComment',
  'health','healthNote','diagnosis','personalObservation','behaviourNote','behaviorNote'
]);

function fail(label,message){throw new Error(label+': '+message);}
function record(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(label,'must be an object');
  return value;
}
function exactKeys(value,required,optional,label){
  record(value,label);
  const allowed=new Set([...(required||[]),...(optional||[])]);
  for(const key of required||[])if(!(key in value))fail(label,'missing required field '+key);
  for(const key of Object.keys(value))if(!allowed.has(key))fail(label,'unknown field '+key);
}
function string(value,label,{min=1,max=Infinity,pattern=null}={}){
  if(typeof value!=='string'||value.length<min||value.length>max)fail(label,'must be a string of valid length');
  if(pattern&&!pattern.test(value))fail(label,'has invalid format');
  return value;
}
function integer(value,label,min,max){
  if(!Number.isInteger(value)||value<min||value>max)fail(label,'must be an integer in range '+min+'..'+max);
  return value;
}
function array(value,label){if(!Array.isArray(value))fail(label,'must be an array');return value;}
function unique(values,label){if(new Set(values).size!==values.length)fail(label,'must contain unique values');}
function date(value,label){if(!isCalendarDate(value))fail(label,'must be a valid YYYY-MM-DD calendar date');return value;}
function scanPrivateKeys(value,label='student-migration-manifest'){
  if(Array.isArray(value)){value.forEach((item,index)=>scanPrivateKeys(item,label+'['+index+']'));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(PRIVATE_KEYS.has(key))fail(label,'public migration manifest forbids private field '+key);
    scanPrivateKeys(item,label+'.'+key);
  }
}
function confidence(value,label){if(!CONFIDENCE.has(value))fail(label,'invalid confidence');}
function resolveStudentPath(root,studentId,relative,label){
  assertRepoRelativePath(relative,label);
  const base=path.resolve(root,'students',studentId);
  const target=path.resolve(base,...relative.split('/'));
  if(target!==base&&!target.startsWith(base+path.sep))fail(label,'resolves outside the student directory');
  return target;
}
function assertAnchor(html,anchor,label){
  const escaped=String(anchor).replace(/[.*+?^$()|[\]\\]/g,'\\$&');
  if(!new RegExp('\\bid=["\\\']'+escaped+'["\\\']').test(html)){
    fail(label,'evidence anchor #'+anchor+' is missing from the lesson HTML');
  }
}
function hasAmbiguity(manifest,{kind,reference}){
  return manifest.ambiguities.some(item=>
    item.kind===kind&&item.reference===reference
  );
}
function assertKnownLegacyCompetency({legacyIds,suppliedIds,competencyId,label}){
  if(legacyIds&&!legacyIds.has(competencyId)){
    fail(label,'unknown competencyId '+competencyId+' in extracted legacy catalog');
  }
  if(suppliedIds&&!suppliedIds.has(competencyId)){
    fail(label,'unknown competencyId '+competencyId);
  }
}
function summarizeLegacyLearningState(state){
  return {
    automaticEligible:state.automaticEligible,
    catalogCount:state.catalog?.count??0,
    resolvedMastery:state.mastery.resolved.length,
    masteryConflicts:state.mastery.conflicts.length,
    orphanClaims:state.diagnostics.orphanClaims.length,
    aliases:state.diagnostics.aliases.length,
    indirectSources:state.diagnostics.indirectSources.length,
    warnings:state.diagnostics.warnings.length
  };
}

export function validateStudentMigrationManifestData(value,{studentId=null}={}){
  const label='student-migration-manifest';
  scanPrivateKeys(value,label);
  exactKeys(
    value,
    ['version','studentId','sourceArchitecture','planning','lessonMappings','competencyMappings','preserveMastery','ambiguities','blockers','warnings'],
    ['identity'],
    label
  );
  if(value.version!==STUDENT_MIGRATION_MANIFEST_VERSION)fail(label,'version must be '+STUDENT_MIGRATION_MANIFEST_VERSION);
  string(value.studentId,label+'.studentId',{pattern:STUDENT_ID_RE});
  if(studentId&&value.studentId!==studentId)fail(label,'studentId mismatch');
  if(!ARCHITECTURES.has(value.sourceArchitecture))fail(label+'.sourceArchitecture','invalid source architecture');
  if(value.identity!==undefined){
    exactKeys(value.identity,['studentName','program'],[],label+'.identity');
    string(value.identity.studentName,label+'.identity.studentName',{max:160});
    string(value.identity.program,label+'.identity.program',{max:240});
  }

  exactKeys(value.planning,['mode','ktpExtraction'],[],label+'.planning');
  if(!['fixed','rolling'].includes(value.planning.mode))fail(label+'.planning.mode','must be fixed or rolling');
  if(value.planning.ktpExtraction!==null){
    const item=label+'.planning.ktpExtraction';
    exactKeys(value.planning.ktpExtraction,['source','preserveOrder','confidence','reason'],[],item);
    assertRepoRelativePath(value.planning.ktpExtraction.source,item+'.source');
    if(value.planning.ktpExtraction.preserveOrder!==true)fail(item+'.preserveOrder','must be true');
    confidence(value.planning.ktpExtraction.confidence,item+'.confidence');
    string(value.planning.ktpExtraction.reason,item+'.reason',{max:2000});
  }

  array(value.lessonMappings,label+'.lessonMappings');
  const lessonDates=[];
  value.lessonMappings.forEach((mapping,index)=>{
    const item=label+'.lessonMappings['+index+']';
    exactKeys(mapping,['lessonDate','ktpMatches'],[],item);
    date(mapping.lessonDate,item+'.lessonDate');
    array(mapping.ktpMatches,item+'.ktpMatches');
    const ktpIds=[];
    mapping.ktpMatches.forEach((match,matchIndex)=>{
      const matchLabel=item+'.ktpMatches['+matchIndex+']';
      exactKeys(match,['ktpId','coverage','confidence','reason'],[],matchLabel);
      string(match.ktpId,matchLabel+'.ktpId',{pattern:KTP_ID_RE});
      if(!COVERAGE.has(match.coverage))fail(matchLabel+'.coverage','invalid coverage');
      confidence(match.confidence,matchLabel+'.confidence');
      string(match.reason,matchLabel+'.reason',{max:2000});
      ktpIds.push(match.ktpId);
    });
    unique(ktpIds,item+'.ktpMatches ktpId');
    lessonDates.push(mapping.lessonDate);
  });
  unique(lessonDates,label+'.lessonMappings lessonDate');

  array(value.competencyMappings,label+'.competencyMappings');
  const competencyKeys=[];
  value.competencyMappings.forEach((mapping,index)=>{
    const item=label+'.competencyMappings['+index+']';
    exactKeys(mapping,['lessonDate','competencyId','evidenceAnchor','relation','masteryClaim','confidence','basis'],[],item);
    date(mapping.lessonDate,item+'.lessonDate');
    string(mapping.competencyId,item+'.competencyId',{pattern:TOKEN_ID_RE});
    string(mapping.evidenceAnchor,item+'.evidenceAnchor',{pattern:ANCHOR_RE});
    if(!RELATION.has(mapping.relation))fail(item+'.relation','invalid relation');
    confidence(mapping.confidence,item+'.confidence');
    string(mapping.basis,item+'.basis',{max:2000});
    if(mapping.masteryClaim!==null){
      const claim=item+'.masteryClaim';
      exactKeys(mapping.masteryClaim,['level','confidence','basis'],[],claim);
      integer(mapping.masteryClaim.level,claim+'.level',0,4);
      if(mapping.masteryClaim.confidence!=='exact')fail(claim+'.confidence','must be exact');
      string(mapping.masteryClaim.basis,claim+'.basis',{max:1000});
      if(mapping.relation!=='assessed')fail(item,'masteryClaim requires relation assessed');
      if(mapping.confidence!=='exact')fail(item,'masteryClaim requires exact mapping confidence');
    }
    competencyKeys.push(mapping.lessonDate+'#'+mapping.competencyId+'#'+mapping.evidenceAnchor+'#'+mapping.relation);
  });
  unique(competencyKeys,label+'.competencyMappings mapping key');

  array(value.preserveMastery,label+'.preserveMastery');
  const masteryIds=[];
  value.preserveMastery.forEach((entry,index)=>{
    const item=label+'.preserveMastery['+index+']';
    exactKeys(entry,['competencyId','level','sourcePath','sourceKind','confidence','basis'],[],item);
    string(entry.competencyId,item+'.competencyId',{pattern:TOKEN_ID_RE});
    integer(entry.level,item+'.level',0,4);
    assertRepoRelativePath(entry.sourcePath,item+'.sourcePath');
    if(!MASTERY_SOURCE_KINDS.has(entry.sourceKind))fail(item+'.sourceKind','invalid mastery source kind');
    if(entry.confidence!=='exact')fail(item+'.confidence','preserved mastery requires exact confidence');
    string(entry.basis,item+'.basis',{max:1000});
    masteryIds.push(entry.competencyId);
  });
  unique(masteryIds,label+'.preserveMastery competencyId');

  array(value.ambiguities,label+'.ambiguities');
  value.ambiguities.forEach((entry,index)=>{
    const item=label+'.ambiguities['+index+']';
    exactKeys(entry,['kind','reason'],['lessonDate','reference'],item);
    if(!AMBIGUITY_KINDS.has(entry.kind))fail(item+'.kind','invalid ambiguity kind');
    string(entry.reason,item+'.reason',{max:2000});
    if('lessonDate' in entry&&entry.lessonDate!==null)date(entry.lessonDate,item+'.lessonDate');
    if('reference' in entry&&entry.reference!==null)string(entry.reference,item+'.reference',{max:500});
  });

  for(const key of ['blockers','warnings']){
    array(value[key],label+'.'+key);
    value[key].forEach((entry,index)=>string(entry,label+'.'+key+'['+index+']',{max:2000}));
    unique(value[key],label+'.'+key);
  }
  return value;
}

export function validateStudentMigrationManifest({
  root=process.cwd(),
  manifest,
  competencyIds=null
}={}){
  const value=validateStudentMigrationManifestData(manifest);
  const studentId=value.studentId;
  const snapshot=inspectStudent(root,studentId);
  if(snapshot.architecture==='v2')fail('student-migration-manifest','student is already v2');
  if(snapshot.architecture!==value.sourceArchitecture){
    fail('student-migration-manifest.sourceArchitecture','declared '+value.sourceArchitecture+' but repository inventory is '+snapshot.architecture);
  }
  if(!snapshot.features.index)fail('student-migration-manifest','site/index.html is missing');
  if(!snapshot.features.design)fail('student-migration-manifest','site/design.json is missing');

  const reviewItems=[];
  if(value.identity===undefined){
    reviewItems.push({
      type:'identity-missing',
      reference:studentId
    });
  }
  if(value.planning.mode==='fixed'){
    if(!snapshot.features.ktp)fail('student-migration-manifest.planning','fixed migration requires an existing KTP source');
    if(value.planning.ktpExtraction===null)fail('student-migration-manifest.planning','fixed migration requires ktpExtraction');
    const extraction=value.planning.ktpExtraction;
    const source=resolveStudentPath(root,studentId,extraction.source,'student-migration-manifest.planning.ktpExtraction.source');
    if(!fs.existsSync(source)||!fs.statSync(source).isFile())fail('student-migration-manifest.planning.ktpExtraction.source','referenced KTP source does not exist');
    if(extraction.confidence!=='exact')reviewItems.push({
      type:'ktp-extraction',
      reference:extraction.source,
      confidence:extraction.confidence
    });
  }else{
    if(snapshot.features.ktp)fail('student-migration-manifest.planning','existing KTP source must be preserved with fixed planning');
    if(value.planning.ktpExtraction!==null)fail('student-migration-manifest.planning','rolling migration must not declare ktpExtraction');
    for(const mapping of value.lessonMappings){
      if(mapping.ktpMatches.length)fail('student-migration-manifest.lessonMappings','rolling migration historical lessons must have empty ktpMatches');
    }
  }

  const historicalLessons=discoverHistoricalLessons({root,studentId});
  const actualDates=new Set(historicalLessons.lessons.map(item=>item.date));
  const declaredDates=new Set(value.lessonMappings.map(item=>item.lessonDate));
  const missing=[...actualDates].filter(dateValue=>!declaredDates.has(dateValue)).sort();
  const extra=[...declaredDates].filter(dateValue=>!actualDates.has(dateValue)).sort();
  if(missing.length)fail('student-migration-manifest.lessonMappings','missing historical lesson classification for '+missing.join(', '));
  if(extra.length)fail('student-migration-manifest.lessonMappings','references lesson dates without HTML: '+extra.join(', '));

  for(const mapping of value.lessonMappings){
    for(const match of mapping.ktpMatches){
      if(match.confidence!=='exact')reviewItems.push({
        type:'ktp-mapping',
        lessonDate:mapping.lessonDate,
        reference:match.ktpId,
        confidence:match.confidence
      });
    }
  }

  const legacyState=inspectLegacyLearningState({root,studentId});
  const legacyCompetencies=legacyState.catalog?new Set(legacyState.catalog.ids):null;
  const suppliedCompetencies=competencyIds===null?null:new Set(competencyIds);

  if(!legacyState.catalog){
    reviewItems.push({
      type:'legacy-catalog-unresolved',
      reference:studentId
    });
  }

  for(const conflict of legacyState.mastery.conflicts){
    if(!hasAmbiguity(value,{kind:'mastery',reference:conflict.competencyId})){
      fail(
        'student-migration-manifest.ambiguities',
        'legacy mastery conflict for '+conflict.competencyId+' must be declared as a mastery ambiguity'
      );
    }
    reviewItems.push({
      type:'legacy-mastery-conflict',
      reference:conflict.competencyId
    });
  }

  for(const orphan of legacyState.diagnostics.orphanClaims){
    const declared=
      hasAmbiguity(value,{kind:'mastery',reference:orphan.competencyId})||
      hasAmbiguity(value,{kind:'source',reference:orphan.competencyId});
    if(!declared){
      fail(
        'student-migration-manifest.ambiguities',
        'orphan legacy mastery claim '+orphan.competencyId+' must be declared as an ambiguity'
      );
    }
    reviewItems.push({
      type:'legacy-mastery-orphan',
      reference:orphan.competencyId
    });
  }

  for(const warning of legacyState.diagnostics.warnings){
    reviewItems.push({
      type:'legacy-source-review',
      reference:warning.sourcePath||studentId,
      warning:warning.type
    });
  }

  for(const mapping of value.competencyMappings){
    if(!actualDates.has(mapping.lessonDate))fail('student-migration-manifest.competencyMappings','references lesson without HTML: '+mapping.lessonDate);
    assertKnownLegacyCompetency({
      legacyIds:legacyCompetencies,
      suppliedIds:suppliedCompetencies,
      competencyId:mapping.competencyId,
      label:'student-migration-manifest.competencyMappings'
    });
    const historicalLesson=historicalLessons.byDate.get(mapping.lessonDate);
    if(!historicalLesson)fail('student-migration-manifest.competencyMappings','lesson HTML is missing for '+mapping.lessonDate);
    assertAnchor(
      fs.readFileSync(historicalLesson.absolutePath,'utf8'),
      mapping.evidenceAnchor,
      'student-migration-manifest.competencyMappings '+mapping.lessonDate+' '+mapping.competencyId
    );
    if(mapping.confidence!=='exact')reviewItems.push({
      type:'competency-mapping',
      lessonDate:mapping.lessonDate,
      reference:mapping.competencyId+'#'+mapping.evidenceAnchor,
      confidence:mapping.confidence
    });
  }

  const extractedClaims=legacyState.mastery.claims;
  const resolvedMastery=new Map(
    legacyState.mastery.resolved.map(item=>[item.competencyId,item])
  );
  const conflictedMastery=new Set(
    legacyState.mastery.conflicts.map(item=>item.competencyId)
  );
  const manifestMastery=new Map(
    value.preserveMastery.map(item=>[item.competencyId,item])
  );

  for(const entry of value.preserveMastery){
    assertKnownLegacyCompetency({
      legacyIds:legacyCompetencies,
      suppliedIds:suppliedCompetencies,
      competencyId:entry.competencyId,
      label:'student-migration-manifest.preserveMastery'
    });
    const source=resolveStudentPath(root,studentId,entry.sourcePath,'student-migration-manifest.preserveMastery.sourcePath');
    if(!fs.existsSync(source)||!fs.statSync(source).isFile()){
      fail('student-migration-manifest.preserveMastery.sourcePath','referenced mastery source does not exist: '+entry.sourcePath);
    }
    if(conflictedMastery.has(entry.competencyId)){
      fail(
        'student-migration-manifest.preserveMastery',
        'cannot preserve unresolved legacy mastery conflict for '+entry.competencyId
      );
    }
    const exactClaim=extractedClaims.find(claim=>
      claim.competencyId===entry.competencyId&&
      claim.level===entry.level&&
      claim.sourcePath===entry.sourcePath&&
      claim.sourceKind===entry.sourceKind
    );
    if(!exactClaim){
      fail(
        'student-migration-manifest.preserveMastery',
        'entry for '+entry.competencyId+' does not match an extracted repository mastery claim'
      );
    }
    const resolved=resolvedMastery.get(entry.competencyId);
    if(!resolved){
      fail(
        'student-migration-manifest.preserveMastery',
        'entry for '+entry.competencyId+' has no resolved repository mastery value'
      );
    }
    if(resolved.level!==entry.level){
      fail(
        'student-migration-manifest.preserveMastery',
        'level mismatch for '+entry.competencyId+': repository='+resolved.level+', manifest='+entry.level
      );
    }
  }

  for(const [competencyId,resolved] of resolvedMastery){
    if(!manifestMastery.has(competencyId)){
      fail(
        'student-migration-manifest.preserveMastery',
        'missing preserved mastery for '+competencyId+' at level '+resolved.level
      );
    }
  }

  for(const ambiguity of value.ambiguities){
    if(ambiguity.lessonDate!==undefined&&ambiguity.lessonDate!==null&&!actualDates.has(ambiguity.lessonDate)){
      fail('student-migration-manifest.ambiguities','references lesson without HTML: '+ambiguity.lessonDate);
    }
  }

  const automaticEligible=
    value.blockers.length===0&&
    value.ambiguities.length===0&&
    reviewItems.length===0&&
    legacyState.automaticEligible;

  return {
    studentId,
    sourceArchitecture:value.sourceArchitecture,
    planningMode:value.planning.mode,
    identity:value.identity??null,
    automaticEligible,
    reviewItems,
    blockers:[...value.blockers],
    warnings:[...value.warnings],
    legacyLearningState:summarizeLegacyLearningState(legacyState),
    stats:{
      historicalLessons:actualDates.size,
      lessonMappings:value.lessonMappings.length,
      ktpMatches:value.lessonMappings.reduce((sum,item)=>sum+item.ktpMatches.length,0),
      competencyMappings:value.competencyMappings.length,
      preservedMastery:value.preserveMastery.length,
      ambiguities:value.ambiguities.length
    },
    snapshot
  };
}
