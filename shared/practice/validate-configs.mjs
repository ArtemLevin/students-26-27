import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {extractArrayExpression,evaluateCatalogExpression,flattenGroups,normalizeGroups,validateCatalog} from '../student-dashboard/legacy-competence-map.js';
import {GeneratorRegistry,validatePracticeConfig} from './generator-registry.js';
import {ALL_GENERATORS} from './generators/index.js';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
const SPECS={
  kirill_zinoviev:{kind:'window',path:'students/kirill_zinoviev/site/competency-map-data.js',global:'KIRILL_GRADE7_GROUPS'},
  sofya_kalney:{kind:'html',path:'students/sofya_kalney/site/index-19.08.26-base.html'},
  timofey:{kind:'html',path:'students/timofey/site/index-legacy.html'},
  volodia_khachaturian:{kind:'window',path:'students/volodia_khachaturian/competency-map-data.js',global:'COMPETENCY_MAP_DATA'},
  xenia_klykova:{kind:'html',path:'students/xenia_klykova/site/index-base-2026-07-29.html'}
};

function loadGroups(spec){
  const source=fs.readFileSync(path.join(ROOT,spec.path),'utf8');
  if(spec.kind==='html')return normalizeGroups(evaluateCatalogExpression(extractArrayExpression(source)));
  const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(source,sandbox,{timeout:1500});const value=sandbox.window[spec.global];return normalizeGroups(value.groups||value);
}

export async function validateAllPracticeConfigs(){
  const registry=new GeneratorRegistry(ALL_GENERATORS),storageKeys=new Set(),report=[];
  for(const [student,spec] of Object.entries(SPECS)){
    const groups=loadGroups(spec);validateCatalog(groups);const ids=new Set(flattenGroups(groups).map(item=>item.id));
    const configUrl=pathToFileURL(path.join(ROOT,'students',student,'site','practice-config.js')).href,lessonUrl=pathToFileURL(path.join(ROOT,'students',student,'site','lesson-registry.js')).href;
    const {PRACTICE_CONFIG}=await import(configUrl),{LESSONS}=await import(lessonUrl);validatePracticeConfig(PRACTICE_CONFIG,registry,{competencyIds:ids});
    if(storageKeys.has(PRACTICE_CONFIG.storageKey))throw new Error(`Duplicate practice storageKey: ${PRACTICE_CONFIG.storageKey}`);storageKeys.add(PRACTICE_CONFIG.storageKey);
    for(const lesson of LESSONS)for(const outcome of lesson.outcomes||[])if(outcome.competencyId&&!ids.has(outcome.competencyId))throw new Error(`${student}: unknown lesson competencyId ${outcome.competencyId}`);
    report.push({student,competencies:Object.keys(PRACTICE_CONFIG.competencies).length,lessons:LESSONS.length});
  }
  return report;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){const report=await validateAllPracticeConfigs();for(const item of report)console.log(`✓ ${item.student}: ${item.competencies} practice mappings, ${item.lessons} lessons`);}
