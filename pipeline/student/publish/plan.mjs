import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  loadJson,
  resolveStudentContractPath,
  validateKtpPlanData,
  validateKtpStateData,
  validateLessonMetadataData,
  validateMasteryStateData,
  validateStudentContractData
} from '../contract.mjs';
import {
  assertEvidenceAnchors,
  loadCompetencyCatalog,
  parseLessonRegistrySource,
  validateRegistryMetadataParity
} from '../publication-contract.mjs';
import {preflightLessonPublication} from './preflight.mjs';
import {discoverLessonArtifact} from './artifact.mjs';
import {
  buildLessonMetadata,
  samePublicationContribution
} from './metadata.mjs';
import {applyKtpPublication} from './ktp-state.mjs';
import {applyMasteryPublication} from './mastery-state.mjs';
import {deriveRegistrySource} from './registry.mjs';

function json(value){return JSON.stringify(value,null,2)+'\n';}
function relative(root,file){return path.relative(root,file).replaceAll('\\','/');}
function fileSnapshot(file,{encoding='utf8'}={}){
  const exists=fs.existsSync(file);
  return {
    exists,
    source:exists?fs.readFileSync(file,encoding):null
  };
}
function snapshotFsView(snapshot){
  return {
    readFileSync(){
      if(!snapshot.exists)throw new Error('snapshot file does not exist');
      return snapshot.source;
    }
  };
}
function sha256Buffer(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function filePrecondition(root,file,snapshot=null){
  const captured=snapshot||fileSnapshot(file,{encoding:null});
  return {
    path:relative(root,file),
    exists:captured.exists,
    sha256:captured.exists?sha256Buffer(captured.source):null
  };
}
function metadataMapFromDir(metadataDir){
  const map=new Map();
  if(!fs.existsSync(metadataDir))return map;
  for(const name of fs.readdirSync(metadataDir).filter(name=>name.endsWith('.lesson.json')).sort()){
    const full=path.join(metadataDir,name);
    const value=JSON.parse(fs.readFileSync(full,'utf8'));
    map.set(value.date,value);
  }
  return map;
}
function validateCandidateMaterials({root,studentId,metadata}){
  const studentRoot=path.join(root,'students',studentId);
  const siteRoot=path.join(studentRoot,'site');
  for(const [kind,reference] of Object.entries(metadata.materials)){
    const clean=String(reference).split(/[?#]/,1)[0];
    const target=path.resolve(siteRoot,clean);
    if(target!==studentRoot&&!target.startsWith(studentRoot+path.sep)){
      throw new Error('publication plan: material '+kind+' escapes the student directory');
    }
    if(!fs.existsSync(target)){
      throw new Error('publication plan: material '+kind+' does not exist: '+relative(root,target));
    }
  }
}
function diffKind(before,after){
  if(before===after)return null;
  return before===null?'create':'update';
}
function stableObject(value){
  if(Array.isArray(value))return value.map(stableObject);
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableObject(value[key])]));
  }
  return value;
}
function sameObject(left,right){
  return JSON.stringify(stableObject(left))===JSON.stringify(stableObject(right));
}

export function buildV2PublicationPlan({
  root=process.cwd(),
  studentId,
  intent
}={}){
  const preflight=preflightLessonPublication({root,studentId,intent});
  const studentRoot=path.join(root,'students',studentId);
  const contractPath=path.join(studentRoot,'student-contract.json');
  const contractSnapshot=fileSnapshot(contractPath);
  const contract=validateStudentContractData(
    loadJson(contractPath,path.basename(contractPath),snapshotFsView(contractSnapshot)),
    {studentId}
  );
  const planPath=resolveStudentContractPath(root,studentId,contract.planning.plan);
  const statePath=resolveStudentContractPath(root,studentId,contract.planning.state);
  const registryPath=resolveStudentContractPath(root,studentId,contract.lessons.registry);
  const metadataDir=resolveStudentContractPath(root,studentId,contract.lessons.metadataDir);
  const catalogPath=resolveStudentContractPath(root,studentId,contract.competencies.catalog);
  const masteryPath=resolveStudentContractPath(root,studentId,contract.competencies.mastery);

  const planSnapshot=fileSnapshot(planPath);
  const plan=validateKtpPlanData(
    loadJson(planPath,path.basename(planPath),snapshotFsView(planSnapshot)),
    {studentId}
  );
  const stateSnapshot=fileSnapshot(statePath);
  const currentState=loadJson(
    statePath,
    path.basename(statePath),
    snapshotFsView(stateSnapshot)
  );
  validateKtpStateData(currentState,{studentId,plan});
  const catalogSnapshot=fileSnapshot(catalogPath);
  const catalog=loadCompetencyCatalog(
    catalogPath,
    {fsView:snapshotFsView(catalogSnapshot)}
  );
  const artifact=discoverLessonArtifact({
    root,
    studentId,
    lessonDate:intent.lessonDate
  });
  assertEvidenceAnchors(artifact.htmlSource,intent.outcomes,{
    label:'lesson '+intent.lessonDate
  });
  const metadata=buildLessonMetadata({studentId,artifact,intent});
  validateLessonMetadataData(metadata,{studentId,plan});
  for(const outcome of metadata.outcomes){
    if(!catalog.ids.has(outcome.competencyId)){
      throw new Error('publication plan: competency '+outcome.competencyId+' is absent from the catalog');
    }
  }
  validateCandidateMaterials({root,studentId,metadata});

  const metadataPath=path.join(metadataDir,intent.lessonDate+'.lesson.json');
  const metadataSnapshot=fileSnapshot(metadataPath);
  const beforeMetadataSource=metadataSnapshot.exists?metadataSnapshot.source:null;
  const existingMetadata=beforeMetadataSource===null?null:JSON.parse(beforeMetadataSource);
  const conflicts=[];
  if(existingMetadata&&!samePublicationContribution(existingMetadata,metadata)){
    conflicts.push({
      type:'existing-publication-contribution',
      lessonDate:intent.lessonDate,
      message:'Existing lesson publication contribution differs from the requested intent.'
    });
  }

  const masteryIsJson=path.extname(masteryPath).toLowerCase()==='.json';
  const masterySnapshot=masteryIsJson?fileSnapshot(masteryPath):null;
  let masteryResult=null;
  if(masteryIsJson){
    const currentMastery=loadJson(
      masteryPath,
      path.basename(masteryPath),
      snapshotFsView(masterySnapshot)
    );
    validateMasteryStateData(currentMastery,{studentId,catalogIds:catalog.ids});
    masteryResult=applyMasteryPublication({
      state:currentMastery,
      lessonDate:intent.lessonDate,
      sourcePath:path.relative(studentRoot,metadataPath).replaceAll('\\','/'),
      outcomes:metadata.outcomes
    });
    validateMasteryStateData(masteryResult.state,{studentId,catalogIds:catalog.ids});
  }

  const appliedMatches=intent.ktpMatches.filter(item=>item.decision==='apply');
  const stateResult=applyKtpPublication({
    state:currentState,
    plan,
    lessonDate:intent.lessonDate,
    actualSummary:intent.actualSummary,
    matches:appliedMatches
  });
  validateKtpStateData(stateResult.state,{studentId,plan});

  const registrySnapshot=fileSnapshot(registryPath);
  const beforeRegistrySource=registrySnapshot.source;
  const registryResult=deriveRegistrySource({
    source:beforeRegistrySource,
    metadata
  });

  const candidateMetadataMap=metadataMapFromDir(metadataDir);
  candidateMetadataMap.set(metadata.date,metadata);
  validateRegistryMetadataParity(
    parseLessonRegistrySource(registryResult.source),
    candidateMetadataMap
  );

  const metadataSource=json(metadata);
  const stateSource=json(stateResult.state);
  const beforeStateSource=stateSnapshot.source;
  const masterySource=masteryResult?json(masteryResult.state):null;
  const beforeMasterySource=masterySnapshot?.source??null;

  const candidates=[
    {
      path:metadataPath,
      before:beforeMetadataSource,
      after:metadataSource
    },
    {
      path:statePath,
      before:beforeStateSource,
      after:stateSource
    },
    ...(masteryResult?[{
      path:masteryPath,
      before:beforeMasterySource,
      after:masterySource
    }]:[]),
    {
      path:registryPath,
      before:beforeRegistrySource,
      after:registryResult.source
    }
  ];
  const writes=candidates
    .map(item=>({
      kind:diffKind(item.before,item.after),
      path:relative(root,item.path),
      content:item.after
    }))
    .filter(item=>item.kind!==null);

  const reviewItems=[...preflight.reviewItems];
  const warnings=[...preflight.warnings];
  const hasMasteryClaims=metadata.outcomes.some(item=>item.masteryClaim!==null);
  if(hasMasteryClaims&&!masteryIsJson){
    warnings.push(
      'Mastery claims were recorded in lesson metadata but not applied because the configured mastery authority is not JSON.'
    );
  }
  if(masteryResult?.preservedDowngrades.length){
    warnings.push(
      'Automatic mastery publication preserved higher existing levels for '+
      masteryResult.preservedDowngrades.map(item=>item.competencyId).join(', ')+'.'
    );
  }
  const executable=reviewItems.length===0&&conflicts.length===0;

  const changedKtp={};
  for(const [ktpId,change] of Object.entries(stateResult.changes)){
    if(!sameObject(change.before,change.after))changedKtp[ktpId]=change;
  }

  const preconditionEntries=[
    {file:contractPath,snapshot:contractSnapshot},
    {file:planPath,snapshot:planSnapshot},
    {file:statePath,snapshot:stateSnapshot},
    {file:registryPath,snapshot:registrySnapshot},
    {file:metadataPath,snapshot:metadataSnapshot},
    {file:catalogPath,snapshot:catalogSnapshot},
    ...(masterySnapshot?[{file:masteryPath,snapshot:masterySnapshot}]:[]),
    {
      file:artifact.htmlPath,
      snapshot:{exists:true,source:artifact.htmlSource}
    },
    ...Object.values(metadata.materials)
      .filter(reference=>reference!==metadata.materials.html)
      .map(reference=>({
        file:path.resolve(
          path.dirname(registryPath),
          String(reference).split(/[?#]/,1)[0]
        ),
        snapshot:null
      }))
  ];
  const preconditions=[];
  const seenPreconditions=new Set();
  for(const entry of preconditionEntries){
    const resolved=path.resolve(entry.file);
    if(seenPreconditions.has(resolved))continue;
    seenPreconditions.add(resolved);
    preconditions.push(filePrecondition(root,resolved,entry.snapshot));
  }

  return {
    version:1,
    studentId,
    lessonDate:intent.lessonDate,
    executable,
    architectureVersion:preflight.architectureVersion,
    planningMode:preflight.planningMode,
    reviewItems,
    conflicts,
    warnings,
    changes:{
      ktp:changedKtp,
      mastery:masteryResult?.changes||{}
    },
    preconditions,
    writes,
    candidates:{
      metadata,
      state:stateResult.state,
      mastery:masteryResult?.state||null,
      registrySource:registryResult.source
    }
  };
}
