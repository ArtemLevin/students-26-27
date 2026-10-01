import fs from 'node:fs';
import path from 'node:path';
import {
  loadJson,
  resolveStudentContractPath,
  validateKtpPlanData,
  validateKtpStateData,
  validateLessonMetadataData,
  validateStudentContractData
} from '../contract.mjs';
import {
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
import {deriveRegistrySource} from './registry.mjs';

function json(value){return JSON.stringify(value,null,2)+'\n';}
function relative(root,file){return path.relative(root,file).replaceAll('\\','/');}
function readIfExists(file){return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;}
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
  const contract=validateStudentContractData(loadJson(contractPath),{studentId});
  const planPath=resolveStudentContractPath(root,studentId,contract.planning.plan);
  const statePath=resolveStudentContractPath(root,studentId,contract.planning.state);
  const registryPath=resolveStudentContractPath(root,studentId,contract.lessons.registry);
  const metadataDir=resolveStudentContractPath(root,studentId,contract.lessons.metadataDir);
  const catalogPath=resolveStudentContractPath(root,studentId,contract.competencies.catalog);

  const plan=validateKtpPlanData(loadJson(planPath),{studentId});
  const currentState=loadJson(statePath);
  validateKtpStateData(currentState,{studentId,plan});
  const catalog=loadCompetencyCatalog(catalogPath);
  const artifact=discoverLessonArtifact({
    root,
    studentId,
    lessonDate:intent.lessonDate
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
  const beforeMetadataSource=readIfExists(metadataPath);
  const existingMetadata=beforeMetadataSource===null?null:JSON.parse(beforeMetadataSource);
  const conflicts=[];
  if(existingMetadata&&!samePublicationContribution(existingMetadata,metadata)){
    conflicts.push({
      type:'existing-publication-contribution',
      lessonDate:intent.lessonDate,
      message:'Existing lesson publication contribution differs from the requested intent.'
    });
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

  const beforeRegistrySource=fs.readFileSync(registryPath,'utf8');
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
  const beforeStateSource=fs.readFileSync(statePath,'utf8');

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
  const executable=reviewItems.length===0&&conflicts.length===0;

  const changedKtp={};
  for(const [ktpId,change] of Object.entries(stateResult.changes)){
    if(!sameObject(change.before,change.after))changedKtp[ktpId]=change;
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
    warnings:[...preflight.warnings],
    changes:{ktp:changedKtp},
    writes,
    candidates:{
      metadata,
      state:stateResult.state,
      registrySource:registryResult.source
    }
  };
}
