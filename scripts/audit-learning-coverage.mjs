#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryStudents,ROOT} from '../pipeline/migration/inventory-students.mjs';
import {
  loadCompetencyCatalog,loadLessonRegistry,validateRegistryMetadataParity,assertEvidenceAnchors
} from '../pipeline/student/publication-contract.mjs';
import {cumulativeCoverage} from '../shared/student-dashboard/learning-coverage.js';

// Historical recovery scope approved 2026-11-27. Platform-wide QA remains unchanged.
export const EXCLUDED_IDS=Object.freeze([
  'danil_kichuk','darya_savenkova','grisha_antipov','grisha_arkhipov',
  'ivan_petrachenkov','kiril_zinoviev_physics','kristina','marina'
]);
const excluded=new Set(EXCLUDED_IDS);
const datedHtml=/^(\d{2})[.-](\d{2})[.-](\d{2})\.html$/;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const headings=html=>[...html.matchAll(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/gi)]
  .map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,200))
  .filter(Boolean);
function confined(base,relative){
  const target=path.resolve(base,relative);
  if(!target.startsWith(base+path.sep))throw Error('Path outside cabinet: '+relative);
  return target;
}

// Do not execute arbitrary mastery JavaScript. The three in-scope authorities
// at the initial baseline export an empty object. Any other JS shape is a blocker.
export function readMastery(file){
  if(path.extname(file)==='.json'){
    const state=readJson(file);
    if(!state.levels||typeof state.levels!=='object'||Array.isArray(state.levels))
      throw Error('Unsupported JSON mastery shape: '+file);
    return {format:'json',levels:state.levels};
  }
  const source=fs.readFileSync(file,'utf8');
  if(/^\s*export\s+const\s+mastery\s*=\s*\{\s*\}\s*;\s*export\s+default\s+mastery\s*;\s*$/.test(source))
    return {format:'js-empty-literal',levels:{}};
  return {format:'js-review-required',levels:null};
}

export function audit(root=ROOT){
  const inventory=inventoryStudents(root).students.filter(s=>s.architecture==='v2');
  const students=[];
  for(const {studentId:id} of inventory){
    if(excluded.has(id))continue;
    const base=path.join(root,'students',id);
    const contract=readJson(path.join(base,'student-contract.json'));
    const cat=loadCompetencyCatalog(confined(base,contract.competencies.catalog));
    const catalog=new Map(cat.data.groups.flatMap(g=>g.items.map(i=>[i.id,i.title])));
    const registry=loadLessonRegistry(confined(base,contract.lessons.registry));
    const opts={knownIds:cat.ids,includeLegacy:id!=='sofya_luzianina'};
    const coverage=cumulativeCoverage(registry,opts);
    const mdDir=confined(base,contract.lessons.metadataDir);
    const metadata=new Map();
    for(const name of fs.readdirSync(mdDir).filter(x=>x.endsWith('.lesson.json')).sort()){
      const item=readJson(path.join(mdDir,name));
      if(metadata.has(item.date))throw Error(id+': duplicate metadata date '+item.date);
      metadata.set(item.date,item);
    }
    let parity='ok';
    try{validateRegistryMetadataParity(registry,metadata);}catch(e){parity=e.message;}
    const site=path.join(base,'site');
    const dates=new Set(registry.map(l=>l.date));
    const orphans=fs.readdirSync(site).filter(name=>{
      const m=datedHtml.exec(name);
      return m&&!dates.has('20'+m[3]+'-'+m[2]+'-'+m[1]);
    }).sort();
    const lessons=registry.map(lesson=>{
      const canonical=metadata.get(lesson.date);
      const lessonCoverage=cumulativeCoverage([lesson],opts);
      const unknownIds=[];
      const unlinked=[];
      const badAnchors=[];
      const link=lesson.materials?.html||lesson.href;
      let html=null,htmlPath=null;
      try{
        const file=confined(base,path.join('site',link.split('#')[0]));
        if(fs.existsSync(file)){
          html=fs.readFileSync(file,'utf8');
          htmlPath=path.relative(root,file).split(path.sep).join('/');
        }
      }catch(e){/* Report missing/invalid HTML path below. */}
      for(const outcome of lesson.outcomes||[]){
        if(outcome.competencyId&&!cat.ids.has(outcome.competencyId))
          unknownIds.push(outcome.competencyId);
        if(!cumulativeCoverage([{...lesson,outcomes:[outcome]}],opts).byId.size)
          unlinked.push(outcome);
        if(html!==null&&outcome.evidenceAnchor&&outcome.relation){
          try{assertEvidenceAnchors(html,[outcome],{label:id+' '+lesson.date});}
          catch(e){badAnchors.push({competencyId:outcome.competencyId,anchor:outcome.evidenceAnchor});}
        }
      }
      return {
        date:lesson.date,title:lesson.title,href:link,htmlPath,missingHtml:html===null,
        headings:html===null?[]:headings(html),
        outcomes:canonical?.outcomes??null,legacyOutcomes:canonical?.legacyOutcomes??[],
        registryOutcomes:lesson.outcomes||[],
        coveredIds:[...lessonCoverage.byId.keys()].sort(),unlinked,unknownIds,badAnchors,
        review:'pending-content-review'
      };
    });
    let mastery;
    try{mastery=readMastery(confined(base,contract.competencies.mastery));}
    catch(e){mastery={format:'review-required',levels:null,error:e.message};}
    const positive=mastery.levels===null?null:Object.entries(mastery.levels)
      .map(([skill,v])=>({id:skill,level:typeof v==='number'?v:v?.level}))
      .filter(v=>Number(v.level)>0);
    const outside=positive?.filter(v=>!coverage.byId.has(v.id))
      .map(v=>({...v,title:catalog.get(v.id)??null}))??null;
    students.push({
      id,program:contract.program,catalogSize:cat.ids.size,covered:coverage.byId.size,
      counts:coverage.counts,parity,orphans,masteryFormat:mastery.format,
      masteryError:mastery.error??null,masteryPositive:positive?.length??null,
      masteryOutsideCoverage:outside,lessons
    });
  }
  const lessons=students.flatMap(s=>s.lessons);
  const sum=key=>lessons.reduce((n,l)=>n+l[key].length,0);
  return {
    scope:{excludedIds:EXCLUDED_IDS,canonicalCabinets:inventory.length,activeCabinets:students.length},
    totals:{
      lessons:lessons.length,empty:lessons.filter(l=>!l.coveredIds.length).length,
      unlinked:sum('unlinked'),unknownIds:sum('unknownIds'),badAnchors:sum('badAnchors'),
      missingHtml:lessons.filter(l=>l.missingHtml).length,
      orphanHtml:students.reduce((n,s)=>n+s.orphans.length,0),
      masteryOutsideCoverage:students.reduce((n,s)=>n+(s.masteryOutsideCoverage?.length??0),0),
      masteryUnresolved:students.filter(s=>s.masteryOutsideCoverage===null).map(s=>s.id),
      parityFailures:students.filter(s=>s.parity!=='ok').map(s=>s.id)
    },students
  };
}

export function markdown(report){
  const {scope,totals,students}=report;
  const lines=['# Historical learning coverage audit','',
    'Read-only structural inventory; pedagogical review remains pending.',
    'Excluded: '+scope.excludedIds.join(', '),'',
    'Active cabinets: '+scope.activeCabinets+' / '+scope.canonicalCabinets,
    'Registered lessons: '+totals.lessons+'; without coverage: '+totals.empty,'',
    '| Cabinet | Lessons | Empty | Coverage | Unlinked | Mastery outside | Parity |',
    '|---|---:|---:|---:|---:|---:|---|'];
  for(const s of students)lines.push([
    '',s.id,s.lessons.length,s.lessons.filter(l=>!l.coveredIds.length).length,
    s.covered+'/'+s.catalogSize,s.lessons.reduce((n,l)=>n+l.unlinked.length,0),
    s.masteryOutsideCoverage?.length??'review',s.parity==='ok'?'ok':'FAIL',''
  ].join(' | '));
  lines.push('','Full lesson-level records and unresolved cases are available in JSON output.');
  return lines.join('\n')+'\n';
}

export function run(argv=process.argv.slice(2)){
  if(argv.includes('--help')){
    process.stdout.write('Usage: node scripts/audit-learning-coverage.mjs [--json|--markdown]\n');
    return;
  }
  if(argv.length>1||argv.some(x=>!['--json','--markdown'].includes(x)))
    throw Error('Unknown or conflicting output option');
  const report=audit();
  process.stdout.write(argv.includes('--markdown')?markdown(report):JSON.stringify(report,null,2)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{run();}catch(e){console.error('learning-coverage-audit: '+e.message);process.exitCode=1;}
}
