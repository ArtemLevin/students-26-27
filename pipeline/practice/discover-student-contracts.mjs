import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {extractArrayExpression,evaluateCatalogExpression,flattenGroups,normalizeGroups,validateCatalog} from '../../shared/student-dashboard/legacy-competence-map.js';
import {transformEgeProfile2027Catalog} from '../../shared/student-dashboard/ege-profile-2027.js';
import {GeneratorRegistry} from '../../shared/practice/generator-registry.js';
import {ALL_GENERATORS} from '../../shared/practice/generators/index.js';
import {ALL_CURATED_BANKS} from '../../shared/practice/curated-banks/index.js';
import {validateCuratedBank} from '../../shared/practice/curated-bank.js';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

export const CATALOG_SPECS={
  kirill_zinoviev:{kind:'window',path:'students/kirill_zinoviev/site/competency-map-data.js',global:'KIRILL_GRADE7_GROUPS'},
  sofya_kalney:{kind:'html',path:'students/sofya_kalney/site/index-19.08.26-base.html'},
  timofey:{kind:'html',path:'students/timofey/site/index-legacy.html',catalogProfile:'ege-profile-2027'},
  volodia_khachaturian:{kind:'window',path:'students/volodia_khachaturian/competency-map-data.js',global:'COMPETENCY_MAP_DATA'},
  xenia_klykova:{kind:'html',path:'students/xenia_klykova/site/index-base-2026-07-29.html',catalogProfile:'ege-profile-2027'},
  nastya_pavlova:{kind:'window',path:'students/nastya_pavlova/competency-map-data.js',global:'COMPETENCY_MAP_DATA'},
  nikol_sarkisyants:{kind:'html',path:'students/nikol_sarkisyants/site/index-original.html',catalogProfile:'ege-profile-2027'}
};

function read(root,relative){return fs.readFileSync(path.join(root,relative),'utf8');}

export function loadCompetencyGroups(studentId,{root=ROOT}={}){
  const spec=CATALOG_SPECS[studentId];
  if(!spec)throw new Error(`Unsupported student contract: ${studentId}`);
  const source=read(root,spec.path);
  let groups;
  if(spec.kind==='html')groups=normalizeGroups(evaluateCatalogExpression(extractArrayExpression(source)));
  else{
    const sandbox={window:{}};
    vm.createContext(sandbox);
    vm.runInContext(source,sandbox,{timeout:1500,filename:spec.path});
    const value=sandbox.window[spec.global];
    if(!value)throw new Error(`${studentId}: competency global ${spec.global} is missing`);
    groups=normalizeGroups(value.groups||value);
  }
  if(spec.catalogProfile==='ege-profile-2027')groups=transformEgeProfile2027Catalog(groups);
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
  const sitePath=path.join(studentRoot,'site',`${base}.html`),texPath=path.join(studentRoot,'tex_docs',`${base}.tex`),pdfPath=path.join(studentRoot,'pdf_docs',`${base}.pdf`);
  const files={html:fs.existsSync(sitePath)?sitePath:null,tex:fs.existsSync(texPath)?texPath:null,pdf:fs.existsSync(pdfPath)?pdfPath:null};
  if(!files.html&&!files.tex&&!files.pdf)throw new Error(`${studentId} ${lessonDate}: no final lesson artifact found`);
  const meta=files.html?htmlMetadata(fs.readFileSync(files.html,'utf8')):{title:'',summary:''};
  return {
    studentId,lessonDate,base,
    href:files.html?`${base}.html`:null,
    title:meta.title||`Занятие ${base}`,
    summary:meta.summary,
    files,
    materials:{...(files.pdf?{pdf:`../pdf_docs/${base}.pdf`}:{}),...(files.tex?{tex:`../tex_docs/${base}.tex`}:{})}
  };
}

async function importModule(filePath){
  return import(`${pathToFileURL(filePath).href}?stage04=${Date.now()}-${Math.random()}`);
}

export async function discoverStudentContracts(studentId,lessonDate,{root=ROOT}={}){
  if(!isCalendarDate(lessonDate))throw new Error(`Invalid lesson date: ${lessonDate}`);
  const siteDir=path.join(root,'students',studentId,'site');
  const lessonRegistryPath=path.join(siteDir,'lesson-registry.js'),practiceConfigPath=path.join(siteDir,'practice-config.js');
  for(const filePath of [lessonRegistryPath,practiceConfigPath])if(!fs.existsSync(filePath))throw new Error(`${studentId}: missing ${path.relative(root,filePath)}`);
  const groups=loadCompetencyGroups(studentId,{root}),competencies=flattenGroups(groups),competencyIds=new Set(competencies.map(item=>item.id));
  const [{LESSONS},{PRACTICE_CONFIG}]=await Promise.all([importModule(lessonRegistryPath),importModule(practiceConfigPath)]);
  if(!Array.isArray(LESSONS))throw new Error(`${studentId}: LESSONS export is invalid`);
  if(!PRACTICE_CONFIG||PRACTICE_CONFIG.studentId!==studentId)throw new Error(`${studentId}: PRACTICE_CONFIG.studentId mismatch`);
  const generatorRegistry=new GeneratorRegistry(ALL_GENERATORS);
  const curatedBanks=new Map();
  for(const bank of ALL_CURATED_BANKS){validateCuratedBank(bank);if(curatedBanks.has(bank.bankKey))throw new Error(`Duplicate curated bank: ${bank.bankKey}`);curatedBanks.set(bank.bankKey,bank);}
  return {
    root,studentId,lessonDate,groups,competencies,competencyIds,LESSONS,PRACTICE_CONFIG,generatorRegistry,curatedBanks,
    artifact:discoverLessonArtifact(studentId,lessonDate,{root}),
    paths:{lessonRegistryPath,practiceConfigPath},
    sources:{lessonRegistry:fs.readFileSync(lessonRegistryPath,'utf8'),practiceConfig:fs.readFileSync(practiceConfigPath,'utf8')}
  };
}
