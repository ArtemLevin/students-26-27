import fs from 'node:fs';
import path from 'node:path';
import {inventoryStudents} from './pipeline/migration/inventory-students.mjs';
import {loadCompetencyCatalog,loadLessonRegistry,validateRegistryMetadataParity,assertEvidenceAnchors} from './pipeline/student/publication-contract.mjs';
import {cumulativeCoverage} from './shared/student-dashboard/learning-coverage.js';
const root=process.cwd();
const text=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|shy|#160);/g,' ').replace(/\s+/g,' ').trim();
const decode=s=>text(s).slice(0,200);
const dateRe=/^\d{2}[.-]\d{2}[.-]\d{2}\.html$/;
const dt=s=>{const [d,m,y]=s.slice(0,-5).split(/[.-]/);return '20'+y+'-'+m+'-'+d;};
const all=[];let totalHtml=0;
for(const {studentId:id,architecture} of inventoryStudents(root).students){
 if(architecture!=='v2')continue;
 const dir=path.join(root,'students',id),read=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8'));
 const c=read('student-contract.json'),cat=loadCompetencyCatalog(path.join(dir,c.competencies.catalog));
 const catalog=new Map(cat.data.groups.flatMap(g=>g.items.map(i=>[i.id,i.title])));
 const lessons=loadLessonRegistry(path.join(dir,c.lessons.registry));
 const cov=cumulativeCoverage(lessons,{knownIds:cat.ids,includeLegacy:id!=='sofya_luzianina'});
 let mastered=[],masteryFormat='json';
 if(c.competencies.mastery.endsWith('.json')){
  const mastery=read(c.competencies.mastery);
  mastered=Object.entries(mastery.levels||{}).filter(([,v])=>Number(typeof v==='number'?v:v.level)>0);
 }else{
  masteryFormat='js: not counted';
 }
 const mdDir=path.join(dir,c.lessons.metadataDir),metadata=new Map(fs.readdirSync(mdDir).filter(x=>x.endsWith('.lesson.json')).map(x=>{const l=JSON.parse(fs.readFileSync(path.join(mdDir,x),'utf8'));return [l.date,l];}));
 let parity='ok';try{validateRegistryMetadataParity(lessons,metadata);}catch(e){parity=e.message;}
 const missing=[],badAnchors=[],unknown=[],empty=[],unlinked=[],examples=[],noHtmlDates=[],candidate=[];
 const dateSet=new Set(lessons.map(l=>l.date));
 const site=path.join(dir,'site');
 const htmlNames=fs.readdirSync(site).filter(x=>dateRe.test(x));
 const orphans=htmlNames.filter(x=>!dateSet.has(dt(x)));
 for(const l of lessons){
  const valid=cumulativeCoverage([l],{knownIds:cat.ids,includeLegacy:id!=='sofya_luzianina'});
  const invalid=(l.outcomes||[]).filter(o=>!cumulativeCoverage([{...l,outcomes:[o]}],{knownIds:cat.ids,includeLegacy:id!=='sofya_luzianina'}).byId.size);
  for(const o of invalid){if(o.competencyId&&!cat.ids.has(o.competencyId))unknown.push([l.date,o.competencyId]);else unlinked.push([l.date,o.label||o.competencyId||'?']);}
  const link=l.materials?.html||l.href;
  let html='',headings=[];
  const file=link?path.resolve(site,link.split('#')[0]):null;
  if(!file||!file.startsWith(dir+path.sep)||!fs.existsSync(file)){missing.push([l.date,link]);}
  else{
   html=fs.readFileSync(file,'utf8');totalHtml++;
   headings=[...html.matchAll(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/gi)].map(m=>decode(m[1])).filter(Boolean).slice(0,14);
   const canonical=(l.outcomes||[]).filter(o=>o.evidenceAnchor&&o.relation);
   for(const o of canonical){
    try{assertEvidenceAnchors(html,[o],{label:id+' '+l.date});}
    catch(e){badAnchors.push([l.date,o.competencyId,o.evidenceAnchor]);}
   }
   if(l.date===lessons.reduce((m,x)=>x.date>m?x.date:m,'')){
    examples.push({date:l.date,title:l.title,headings:headings.slice(0,8),skills:[...valid.byId.keys()].map(x=>[x,catalog.get(x)])});
   }
  }
  if(!valid.byId.size)empty.push({date:l.date,title:l.title,headings:headings.slice(0,5)});
 }
 const coveredMastery=mastered.filter(([id])=>!cov.byId.has(id));
 const row={id,name:c.studentName,program:c.program,lessons:lessons.length,metadata:metadata.size,catalog:cat.ids.size,covered:cov.byId.size,counts:cov.counts,empty:empty.length,unlinked:unlinked.length,unknown:unknown.length,anchors:badAnchors.length,missingHtml:missing.length,orphanHtml:orphans.length,masteryFormat,masteryPositive:masteryFormat==='json'?mastered.length:null,masteryOutsideCoverage:masteryFormat==='json'?coveredMastery.length:null,parity};
 all.push(row);
 console.log('AUDIT_ROW '+JSON.stringify(row));
 console.log('AUDIT_DETAILS '+JSON.stringify({id,empty,unlinked,unknown,badAnchors,missing,orphans,masteryOutsideCoverage:coveredMastery.map(([id,v])=>[id,catalog.get(id),typeof v==='number'?v:v.level]),latest:examples}));
}
console.log('AUDIT_TOTAL '+JSON.stringify({students:all.length,totalHtml,lessons:all.reduce((a,x)=>a+x.lessons,0),empty:all.reduce((a,x)=>a+x.empty,0),unlinked:all.reduce((a,x)=>a+x.unlinked,0),unknown:all.reduce((a,x)=>a+x.unknown,0),anchors:all.reduce((a,x)=>a+x.anchors,0),missingHtml:all.reduce((a,x)=>a+x.missingHtml,0),orphanHtml:all.reduce((a,x)=>a+x.orphanHtml,0),masteryOutsideCoverage:all.reduce((a,x)=>a+x.masteryOutsideCoverage,0)}));
