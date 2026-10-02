import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeGroups,validateCatalog} from '../../shared/student-dashboard/legacy-competence-map.js';
import {GeneratorRegistry} from '../../shared/practice/generator-registry.js';
import {ALL_GENERATORS} from '../../shared/practice/generators/index.js';
import {ALL_CURATED_BANKS} from '../../shared/practice/curated-banks/index.js';
import {validateCuratedBank} from '../../shared/practice/curated-bank.js';
import {discoverPracticeStudentSpecs,loadPracticeStudentContracts} from '../../shared/practice/validate-configs.mjs';
import {
  loadJson,
  resolveStudentContractPath,
  validateStudentContractData,
  validateStudentPackage
} from '../student/contract.mjs';
import {loadCompetencyCatalog} from '../student/publication-contract.mjs';
import {readMasteryLevels} from './mastery-source.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

function canonicalSpecMaps(root=ROOT){
  const practice=discoverPracticeStudentSpecs(root);
  const catalogs={},mastery={};
  for(const [studentId,spec] of Object.entries(practice)){
    catalogs[studentId]={
      kind:'contract',
      path:'students/'+studentId+'/'+spec.catalog
    };
    mastery[studentId]={
      path:'students/'+studentId+'/'+spec.mastery,
      locator:spec.mastery.endsWith('.json')
        ?{kind:'state-json',name:'levels'}
        :{kind:'symbol',name:'stage04Mastery'}
    };
  }
  return {catalogs,mastery};
}

const canonicalSpecs=canonicalSpecMaps(ROOT);
export const CATALOG_SPECS=Object.freeze(canonicalSpecs.catalogs);
export const MASTERY_SPECS=Object.freeze(canonicalSpecs.mastery);

function readContract(studentId,{root=ROOT}={}){
  const file=path.join(root,'students',studentId,'student-contract.json');
  if(!fs.existsSync(file))throw new Error(`${studentId}: missing student-contract.json`);
  return validateStudentContractData(loadJson(file,'student-contract.json'),{studentId});
}

export function loadCompetencyGroups(studentId,{root=ROOT}={}){
  const contract=readContract(studentId,{root});
  const file=resolveStudentContractPath(root,studentId,contract.competencies.catalog);
  const catalog=loadCompetencyCatalog(file);
  const groups=normalizeGroups(catalog.data.groups||[]);
  validateCatalog(groups);
  return groups;
}

export function isCalendarDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

export function lessonBasename(lessonDate){
  if(!isCalendarDate(lessonDate))throw new Error(`Invalid lesson date: ${lessonDate}`);
  const [year,month,day]=lessonDate.split('-');
  return `${day}.${month}.${year.slice(-2)}`;
}

function htmlMetadata(source){
  const title=(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s+/g,' ').trim();
  const summary=(source.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]||'').trim();
  const heading=(source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return {title:heading||title,summary};
}

export function discoverLessonArtifact(studentId,lessonDate,{root=ROOT}={}){
  const base=lessonBasename(lessonDate),studentRoot=path.join(root,'students',studentId);
  const sitePath=path.join(studentRoot,'site',`${base}.html`);
  const texPath=path.join(studentRoot,'tex_docs',`${base}.tex`);
  const pdfPath=path.join(studentRoot,'pdf_docs',`${base}.pdf`);
  const files={
    html:fs.existsSync(sitePath)?sitePath:null,
    tex:fs.existsSync(texPath)?texPath:null,
    pdf:fs.existsSync(pdfPath)?pdfPath:null
  };
  if(!files.html&&!files.tex&&!files.pdf)throw new Error(`${studentId} ${lessonDate}: no final lesson artifact found`);
  const meta=files.html?htmlMetadata(fs.readFileSync(files.html,'utf8')):{title:'',summary:''};
  return {
    studentId,lessonDate,base,
    href:files.html?`${base}.html`:null,
    title:meta.title||`Занятие ${base}`,
    summary:meta.summary,
    files,
    materials:{
      ...(files.pdf?{pdf:`../pdf_docs/${base}.pdf`}:{}),
      ...(files.tex?{tex:`../tex_docs/${base}.tex`}:{})
    }
  };
}

function curatedRegistry(){
  const result=new Map();
  for(const bank of ALL_CURATED_BANKS){
    validateCuratedBank(bank);
    if(result.has(bank.bankKey))throw new Error(`Duplicate curated bank: ${bank.bankKey}`);
    result.set(bank.bankKey,bank);
  }
  return result;
}

export async function discoverStudentContracts(studentId,lessonDate,{root=ROOT}={}){
  if(!isCalendarDate(lessonDate))throw new Error(`Invalid lesson date: ${lessonDate}`);
  const contract=readContract(studentId,{root});
  if(contract.practice.config===null){
    throw new Error(`${studentId}: Stage 04 is disabled because student-contract.json has practice.config=null`);
  }

  validateStudentPackage({root,studentId});

  const practice=await loadPracticeStudentContracts(
    studentId,
    {root,registry:new GeneratorRegistry(ALL_GENERATORS),validate:true}
  );
  const lesson=practice.LESSONS.find(item=>item.date===lessonDate)||null;
  if(!lesson){
    throw new Error(
      `${studentId} ${lessonDate}: lesson must be published through scripts/publish-lesson.mjs before Stage 04`
    );
  }

  const metadataDir=resolveStudentContractPath(root,studentId,contract.lessons.metadataDir);
  const metadataPath=path.join(metadataDir,lessonDate+'.lesson.json');
  if(!fs.existsSync(metadataPath)){
    throw new Error(
      `${studentId} ${lessonDate}: canonical lesson metadata is missing; publish the lesson before Stage 04`
    );
  }
  const lessonMetadata=loadJson(metadataPath,path.basename(metadataPath));

  const masteryPath=resolveStudentContractPath(root,studentId,contract.competencies.mastery);
  if(path.extname(masteryPath).toLowerCase()!=='.json'){
    throw new Error(
      `${studentId}: steady-state Stage 04 requires canonical JSON mastery state, got ${contract.competencies.mastery}`
    );
  }
  const masterySource=fs.readFileSync(masteryPath,'utf8');
  const masteryLocator={kind:'state-json',name:'levels'};
  const mastery={
    path:masteryPath,
    source:masterySource,
    locator:masteryLocator,
    levels:readMasteryLevels(masterySource,masteryLocator)
  };

  return {
    root,
    studentId,
    lessonDate,
    contract,
    groups:practice.groups,
    competencies:practice.groups.flatMap(group=>group.items||[]),
    competencyIds:practice.competencyIds,
    LESSONS:practice.LESSONS,
    PRACTICE_CONFIG:practice.PRACTICE_CONFIG,
    generatorRegistry:practice.registry,
    curatedBanks:curatedRegistry(),
    mastery,
    lesson,
    lessonMetadata,
    artifact:discoverLessonArtifact(studentId,lessonDate,{root}),
    paths:{
      lessonRegistryPath:practice.paths.registryPath,
      practiceConfigPath:practice.paths.configPath,
      masteryPath,
      metadataPath
    },
    sources:{
      lessonRegistry:fs.readFileSync(practice.paths.registryPath,'utf8'),
      practiceConfig:fs.readFileSync(practice.paths.configPath,'utf8'),
      mastery:masterySource,
      lessonMetadata:fs.readFileSync(metadataPath,'utf8')
    }
  };
}
