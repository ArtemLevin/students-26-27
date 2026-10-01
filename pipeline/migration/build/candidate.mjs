import fs from 'node:fs';
import path from 'node:path';
import {
  validateMasteryStateData
} from '../../student/contract.mjs';
import {validateStudentMigrationManifest} from '../manifest.mjs';
import {inspectLegacyLearningState} from '../legacy/inspect-learning-state.mjs';
import {extractLegacyKtp} from '../legacy/ktp-extractor.mjs';
import {
  buildCanonicalCompetencyCatalog,
  buildCanonicalMasteryState,
  buildMigratedStudentContract,
  renderMigratedStudentTest
} from './canonical-state.mjs';
import {
  buildInitialKtpState,
  buildRollingKtpPlan
} from './ktp-state.mjs';
import {
  buildHistoricalLessonMetadata,
  renderCanonicalLessonRegistry
} from './lessons.mjs';

function json(value){return JSON.stringify(value,null,2)+'\n';}
function repoPath(...parts){return parts.join('/').replaceAll('\\','/');}
function currentKind(root,relative){
  return fs.existsSync(path.join(root,...relative.split('/')))?'update':'create';
}
function candidateWrite(root,relative,content){
  return {
    kind:currentKind(root,relative),
    path:relative,
    content
  };
}
function relativeStudentSource(root,studentId,relative){
  const base=path.resolve(root,'students',studentId);
  const target=path.resolve(base,...relative.split('/'));
  if(target!==base&&!target.startsWith(base+path.sep)){
    throw new Error('migration candidate: source escapes student directory: '+relative);
  }
  return target;
}
function verifyCatalogProjection(catalog,legacyState){
  const candidateIds=new Set(
    catalog.groups.flatMap(group=>group.items.map(item=>item.id))
  );
  const sourceIds=new Set(legacyState.catalog.ids);
  const missing=[...sourceIds].filter(id=>!candidateIds.has(id)).sort();
  const extra=[...candidateIds].filter(id=>!sourceIds.has(id)).sort();
  if(missing.length||extra.length){
    throw new Error(
      'migration candidate: competency catalog projection mismatch; missing='+
      missing.join(',')+'; extra='+extra.join(',')
    );
  }
  return candidateIds;
}
function verifyCrossLinks({metadataByDate,state}){
  for(const metadata of metadataByDate.values()){
    for(const ktpId of metadata.ktpRefs){
      const record=state.records[ktpId];
      if(!record){
        throw new Error('migration candidate: metadata '+metadata.date+' references unknown '+ktpId);
      }
      if(!(record.lessonRefs||[]).includes(metadata.date)){
        throw new Error(
          'migration candidate: KTP state '+ktpId+' does not link back to '+metadata.date
        );
      }
    }
  }
  for(const [ktpId,record] of Object.entries(state.records)){
    for(const lessonDate of record.lessonRefs||[]){
      const metadata=metadataByDate.get(lessonDate);
      if(!metadata||!metadata.ktpRefs.includes(ktpId)){
        throw new Error(
          'migration candidate: KTP state '+ktpId+' has unmatched lesson ref '+lessonDate
        );
      }
    }
  }
}
function serializeMetadataWrites({root,studentId,metadataByDate}){
  const writes=[];
  for(const [lessonDate,metadata] of metadataByDate){
    const relative=repoPath(
      'students',studentId,'site','data','lessons',lessonDate+'.lesson.json'
    );
    writes.push(candidateWrite(root,relative,json(metadata)));
  }
  if(!metadataByDate.size){
    const relative=repoPath('students',studentId,'site','data','lessons','.gitkeep');
    writes.push(candidateWrite(root,relative,''));
  }
  return writes;
}

export function buildMigrationCandidate({
  root=process.cwd(),
  manifest,
  migrationDate
}={}){
  const report=validateStudentMigrationManifest({root,manifest});
  const studentId=manifest.studentId;

  if(!migrationDate||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(migrationDate)){
    throw new Error('migration candidate: migrationDate must be YYYY-MM-DD');
  }

  if(!report.automaticEligible){
    return {
      version:1,
      operation:'student-migration',
      studentId,
      sourceArchitecture:manifest.sourceArchitecture,
      migrationDate,
      executable:false,
      reviewItems:[...report.reviewItems],
      conflicts:[],
      blockers:[...report.blockers],
      warnings:[...report.warnings],
      writes:[],
      candidates:null
    };
  }

  const identity=manifest.identity;
  if(!identity){
    throw new Error('migration candidate: executable manifest is missing identity');
  }

  const legacyState=inspectLegacyLearningState({root,studentId});
  const studentRoot=path.join(root,'students',studentId);
  const site=path.join(studentRoot,'site');

  let ktpExtraction=null,plan;
  if(manifest.planning.mode==='fixed'){
    const relative=manifest.planning.ktpExtraction.source;
    const sourcePath=relativeStudentSource(root,studentId,relative);
    const source=fs.readFileSync(sourcePath,'utf8');
    ktpExtraction=extractLegacyKtp({
      studentId,
      source,
      sourcePath:relative
    });
    plan=ktpExtraction.plan;
  }else{
    plan=buildRollingKtpPlan({studentId});
  }

  const state=buildInitialKtpState({
    studentId,
    plan,
    manifest,
    migrationDate
  });

  const lessonBuild=buildHistoricalLessonMetadata({
    root,
    studentId,
    manifest,
    plan
  });
  verifyCrossLinks({
    metadataByDate:lessonBuild.metadataByDate,
    state
  });

  const registrySource=renderCanonicalLessonRegistry({
    metadataByDate:lessonBuild.metadataByDate,
    presentationByDate:lessonBuild.presentationByDate
  });

  const catalog=buildCanonicalCompetencyCatalog({
    studentId,
    identity,
    legacyState
  });
  const catalogIds=verifyCatalogProjection(catalog,legacyState);

  for(const metadata of lessonBuild.metadataByDate.values()){
    for(const outcome of metadata.outcomes){
      if(!catalogIds.has(outcome.competencyId)){
        throw new Error(
          'migration candidate: lesson '+metadata.date+
          ' outcome competency '+outcome.competencyId+' is absent from the candidate catalog'
        );
      }
    }
  }

  const mastery=buildCanonicalMasteryState({
    studentId,
    migrationDate,
    preserveMastery:manifest.preserveMastery,
    catalogIds
  });
  validateMasteryStateData(mastery,{studentId,catalogIds});

  const contract=buildMigratedStudentContract({
    studentId,
    identity,
    planningMode:manifest.planning.mode,
    hasPracticeConfig:fs.existsSync(path.join(site,'practice-config.js'))
  });
  const studentTest=renderMigratedStudentTest({studentId});

  const writes=[
    candidateWrite(
      root,
      repoPath('students',studentId,'student-contract.json'),
      json(contract)
    ),
    candidateWrite(
      root,
      repoPath('students',studentId,'site','data','ktp-plan.json'),
      json(plan)
    ),
    candidateWrite(
      root,
      repoPath('students',studentId,'site','data','ktp-state.json'),
      json(state)
    ),
    candidateWrite(
      root,
      repoPath('students',studentId,'site','data','competency-catalog.json'),
      json(catalog)
    ),
    candidateWrite(
      root,
      repoPath('students',studentId,'site','data','mastery-state.json'),
      json(mastery)
    ),
    ...serializeMetadataWrites({
      root,
      studentId,
      metadataByDate:lessonBuild.metadataByDate
    }),
    candidateWrite(
      root,
      repoPath('students',studentId,'site','lesson-registry.js'),
      registrySource
    ),
    candidateWrite(
      root,
      repoPath('students',studentId,'site','tests','student-platform-v2.test.mjs'),
      studentTest
    )
  ].sort((a,b)=>a.path.localeCompare(b.path,'en'));

  const warnings=[
    ...report.warnings,
    ...lessonBuild.warnings,
    ...(ktpExtraction?.warnings||[])
  ];

  return {
    version:1,
    operation:'student-migration',
    studentId,
    sourceArchitecture:manifest.sourceArchitecture,
    migrationDate,
    executable:true,
    reviewItems:[],
    conflicts:[],
    blockers:[],
    warnings,
    writes,
    candidates:{
      contract,
      plan,
      state,
      catalog,
      mastery,
      metadataByDate:lessonBuild.metadataByDate,
      registrySource,
      studentTest
    },
    diagnostics:{
      ktp:ktpExtraction?{
        sourcePath:ktpExtraction.sourcePath,
        sourceRows:ktpExtraction.sourceRows,
        programVersion:ktpExtraction.programVersion,
        fieldAliases:ktpExtraction.fieldAliases
      }:{
        sourcePath:null,
        sourceRows:0,
        programVersion:plan.programVersion,
        fieldAliases:[]
      },
      historicalLessons:lessonBuild.metadataByDate.size,
      competencyIds:catalogIds.size,
      masteryLevels:Object.keys(mastery.levels).length
    }
  };
}
