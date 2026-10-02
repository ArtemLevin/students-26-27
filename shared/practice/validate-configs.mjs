import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizeGroups,validateCatalog} from '../student-dashboard/legacy-competence-map.js';
import {resolveActivationPolicy,validateLessonDates} from './activation-policy.js';
import {GeneratorRegistry,validatePracticeConfig} from './generator-registry.js';
import {ALL_GENERATORS} from './generators/index.js';
import {
  loadJson,
  resolveStudentContractPath,
  validateStudentContractData
} from '../../pipeline/student/contract.mjs';
import {loadCompetencyCatalog} from '../../pipeline/student/publication-contract.mjs';

export const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');

function loadContract(student,{root=ROOT}={}){
  const file=path.join(root,'students',student,'student-contract.json');
  if(!fs.existsSync(file))throw new Error(`${student}: missing student-contract.json`);
  return validateStudentContractData(loadJson(file,'student-contract.json'),{studentId:student});
}

export function discoverPracticeStudentSpecs(root=ROOT){
  const studentsDir=path.join(root,'students');
  if(!fs.existsSync(studentsDir))return {};
  const specs={};
  for(const entry of fs.readdirSync(studentsDir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    if(!entry.isDirectory())continue;
    const file=path.join(studentsDir,entry.name,'student-contract.json');
    if(!fs.existsSync(file))continue;
    const contract=validateStudentContractData(loadJson(file,'student-contract.json'),{studentId:entry.name});
    if(contract.practice.config===null)continue;
    specs[entry.name]={
      contract:'students/'+entry.name+'/student-contract.json',
      catalog:contract.competencies.catalog,
      mastery:contract.competencies.mastery,
      registry:contract.lessons.registry,
      practice:contract.practice.config
    };
  }
  return specs;
}

export const PRACTICE_STUDENT_SPECS=Object.freeze(discoverPracticeStudentSpecs(ROOT));

async function importFresh(filePath,label){
  const url=pathToFileURL(filePath);
  url.search='?'+label+'='+Date.now()+'-'+Math.random();
  return import(url.href);
}

export async function loadPracticeStudentContracts(student,{root=ROOT,registry=new GeneratorRegistry(ALL_GENERATORS),validate=true}={}){
  const contract=loadContract(student,{root});
  if(contract.practice.config===null)throw new Error(`${student}: practice is not enabled in student-contract.json`);

  const catalogPath=resolveStudentContractPath(root,student,contract.competencies.catalog);
  const configPath=resolveStudentContractPath(root,student,contract.practice.config);
  const registryPath=resolveStudentContractPath(root,student,contract.lessons.registry);
  for(const [file,label] of [[catalogPath,'competency catalog'],[configPath,'practice config'],[registryPath,'lesson registry']]){
    if(!fs.existsSync(file))throw new Error(`${student}: missing ${label} ${path.relative(root,file)}`);
  }

  const catalog=loadCompetencyCatalog(catalogPath);
  const groups=normalizeGroups(catalog.data.groups||[]);
  validateCatalog(groups);
  const competencyIds=new Set(catalog.ids);
  const [{PRACTICE_CONFIG},{LESSONS}]=await Promise.all([
    importFresh(configPath,'practice'),
    importFresh(registryPath,'lessons')
  ]);
  validateLessonDates(LESSONS);
  const policies={lesson:0,always:0,manual:0,disabled:0};
  for(const [id,mapping] of Object.entries(PRACTICE_CONFIG.competencies||{})){
    if(validate&&mapping.activation===undefined)throw new Error(`${student}: ${id} must declare explicit activation after Track B migration`);
    if(validate&&Object.prototype.hasOwnProperty.call(mapping,'active'))throw new Error(`${student}: ${id} still uses deprecated active boolean`);
    try{policies[resolveActivationPolicy(mapping)]+=1;}catch(error){if(validate)throw error;}
  }
  if(validate){
    validatePracticeConfig(PRACTICE_CONFIG,registry,{competencyIds});
    for(const lesson of LESSONS){
      for(const outcome of lesson.outcomes||[]){
        if(outcome.competencyId&&!competencyIds.has(outcome.competencyId)){
          throw new Error(`${student}: unknown lesson competencyId ${outcome.competencyId}`);
        }
      }
    }
  }
  return {
    student,
    contract,
    groups,
    competencyIds,
    PRACTICE_CONFIG,
    LESSONS,
    registry,
    policies,
    paths:{catalogPath,configPath,registryPath}
  };
}

export async function validateAllPracticeConfigs({root=ROOT}={}){
  const registry=new GeneratorRegistry(ALL_GENERATORS),storageKeys=new Set(),report=[];
  for(const student of Object.keys(discoverPracticeStudentSpecs(root))){
    const contracts=await loadPracticeStudentContracts(student,{root,registry,validate:true});
    if(storageKeys.has(contracts.PRACTICE_CONFIG.storageKey))throw new Error(`Duplicate practice storageKey: ${contracts.PRACTICE_CONFIG.storageKey}`);
    storageKeys.add(contracts.PRACTICE_CONFIG.storageKey);
    report.push({student,competencies:Object.keys(contracts.PRACTICE_CONFIG.competencies).length,lessons:contracts.LESSONS.length,policies:contracts.policies});
  }
  return report;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const report=await validateAllPracticeConfigs();
  for(const item of report)console.log(`✓ ${item.student}: ${item.competencies} practice mappings, ${item.lessons} lessons, activation ${JSON.stringify(item.policies)}`);
}
