import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {extractArrayExpression,evaluateCatalogExpression,flattenGroups,normalizeGroups,validateCatalog} from '../student-dashboard/legacy-competence-map.js';
import {transformEgeProfile2027Catalog} from '../student-dashboard/ege-profile-2027.js';
import {resolveActivationPolicy,validateLessonDates} from './activation-policy.js';
import {GeneratorRegistry,validatePracticeConfig} from './generator-registry.js';
import {ALL_GENERATORS} from './generators/index.js';

export const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
export const PRACTICE_STUDENT_SPECS={
  kirill_zinoviev:{kind:'window',path:'students/kirill_zinoviev/site/competency-map-data.js',global:'KIRILL_GRADE7_GROUPS'},
  sofya_kalney:{kind:'html',path:'students/sofya_kalney/site/index-19.08.26-base.html'},
  timofey:{kind:'html',path:'students/timofey/site/index-legacy.html',catalogProfile:'ege-profile-2027'},
  volodia_khachaturian:{kind:'window',path:'students/volodia_khachaturian/competency-map-data.js',global:'COMPETENCY_MAP_DATA'},
  xenia_klykova:{kind:'html',path:'students/xenia_klykova/site/index-base-2026-07-29.html',catalogProfile:'ege-profile-2027'},
  nastya_pavlova:{kind:'window',path:'students/nastya_pavlova/competency-map-data.js',global:'COMPETENCY_MAP_DATA'},
  nikol_sarkisyants:{kind:'html',path:'students/nikol_sarkisyants/site/index-original.html',catalogProfile:'ege-profile-2027'}
};

export function loadCompetencyGroups(spec,root=ROOT){
  const source=fs.readFileSync(path.join(root,spec.path),'utf8');
  let groups;
  if(spec.kind==='html')groups=normalizeGroups(evaluateCatalogExpression(extractArrayExpression(source)));
  else{
    const sandbox={window:{}};
    vm.createContext(sandbox);
    vm.runInContext(source,sandbox,{timeout:1500});
    const value=sandbox.window[spec.global];
    groups=normalizeGroups(value.groups||value);
  }
  return spec.catalogProfile==='ege-profile-2027'?transformEgeProfile2027Catalog(groups):groups;
}

export async function loadPracticeStudentContracts(student,{root=ROOT,registry=new GeneratorRegistry(ALL_GENERATORS),validate=true}={}){
  const spec=PRACTICE_STUDENT_SPECS[student];
  if(!spec)throw new Error(`Unknown practice student: ${student}`);
  const groups=loadCompetencyGroups(spec,root);validateCatalog(groups);const competencyIds=new Set(flattenGroups(groups).map(item=>item.id));
  const configUrl=pathToFileURL(path.join(root,'students',student,'site','practice-config.js')).href;
  const lessonUrl=pathToFileURL(path.join(root,'students',student,'site','lesson-registry.js')).href;
  const {PRACTICE_CONFIG}=await import(configUrl),{LESSONS}=await import(lessonUrl);
  validateLessonDates(LESSONS);
  const policies={lesson:0,always:0,manual:0,disabled:0};
  for(const [id,mapping] of Object.entries(PRACTICE_CONFIG.competencies||{})){
    if(validate&&mapping.activation===undefined)throw new Error(`${student}: ${id} must declare explicit activation after Track B migration`);
    if(validate&&Object.prototype.hasOwnProperty.call(mapping,'active'))throw new Error(`${student}: ${id} still uses deprecated active boolean`);
    try{policies[resolveActivationPolicy(mapping)]+=1;}catch(error){if(validate)throw error;}
  }
  if(validate){
    validatePracticeConfig(PRACTICE_CONFIG,registry,{competencyIds});
    for(const lesson of LESSONS)for(const outcome of lesson.outcomes||[])if(outcome.competencyId&&!competencyIds.has(outcome.competencyId))throw new Error(`${student}: unknown lesson competencyId ${outcome.competencyId}`);
  }
  return {student,groups,competencyIds,PRACTICE_CONFIG,LESSONS,registry,policies};
}

export async function validateAllPracticeConfigs(){
  const registry=new GeneratorRegistry(ALL_GENERATORS),storageKeys=new Set(),report=[];
  for(const student of Object.keys(PRACTICE_STUDENT_SPECS)){
    const contracts=await loadPracticeStudentContracts(student,{registry,validate:true});
    if(storageKeys.has(contracts.PRACTICE_CONFIG.storageKey))throw new Error(`Duplicate practice storageKey: ${contracts.PRACTICE_CONFIG.storageKey}`);storageKeys.add(contracts.PRACTICE_CONFIG.storageKey);
    report.push({student,competencies:Object.keys(contracts.PRACTICE_CONFIG.competencies).length,lessons:contracts.LESSONS.length,policies:contracts.policies});
  }
  return report;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){const report=await validateAllPracticeConfigs();for(const item of report)console.log(`✓ ${item.student}: ${item.competencies} practice mappings, ${item.lessons} lessons, activation ${JSON.stringify(item.policies)}`);}
