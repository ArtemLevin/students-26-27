import fs from 'node:fs';
import path from 'node:path';
import {
  validateLessonMetadataData
} from '../../student/contract.mjs';
import {
  parseLessonRegistrySource,
  validateRegistryMetadataParity
} from '../../student/publication-contract.mjs';

function decodeHtml(value){
  return String(value)
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&#x27;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}
function tagText(html,tag){
  const match=new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','i').exec(html);
  return match?decodeHtml(match[1]):null;
}
function metaDescription(html){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    if(!/\bname\s*=\s*["']description["']/i.test(tag))continue;
    const content=/\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
    if(content)return decodeHtml(content[1]);
  }
  return null;
}
function lessonFilename(studentSite,isoDate){
  const [year,month,day]=isoDate.split('-');
  const yy=year.slice(-2);
  for(const name of [day+'.'+month+'.'+yy+'.html',day+'-'+month+'-'+yy+'.html']){
    const file=path.join(studentSite,name);
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return name;
  }
  return null;
}
function insideStudent(studentRoot,target){
  const base=path.resolve(studentRoot),resolved=path.resolve(target);
  return resolved===base||resolved.startsWith(base+path.sep);
}
function existingMaterial({studentRoot,site,reference}){
  if(typeof reference!=='string'||!reference.trim())return null;
  const clean=reference.split(/[?#]/,1)[0];
  if(!clean||/^[a-z][a-z0-9+.-]*:/i.test(clean)||clean.startsWith('/')||clean.includes('\\'))return null;
  const target=path.resolve(site,clean);
  if(!insideStudent(studentRoot,target))return null;
  if(!fs.existsSync(target)||!fs.statSync(target).isFile())return null;
  return reference;
}
function datedCandidate({studentRoot,site,isoDate,kind,htmlName}){
  const [year,month,day]=isoDate.split('-'),yy=year.slice(-2);
  const dotted=day+'.'+month+'.'+yy,hyphen=day+'-'+month+'-'+yy;
  const htmlStem=htmlName.replace(/\.html$/i,'');

  const specs={
    lab:[
      {file:path.join(site,htmlStem+'-lab.html'),ref:htmlStem+'-lab.html'},
      {file:path.join(site,dotted+'-lab.html'),ref:dotted+'-lab.html'},
      {file:path.join(site,hyphen+'-lab.html'),ref:hyphen+'-lab.html'}
    ],
    pdf:[
      {file:path.join(studentRoot,'pdf_docs',htmlStem+'.pdf'),ref:'../pdf_docs/'+htmlStem+'.pdf'},
      {file:path.join(studentRoot,'pdf_docs',dotted+'.pdf'),ref:'../pdf_docs/'+dotted+'.pdf'},
      {file:path.join(studentRoot,'pdf_docs',hyphen+'.pdf'),ref:'../pdf_docs/'+hyphen+'.pdf'}
    ],
    tex:[
      {file:path.join(studentRoot,'tex_docs',htmlStem+'.tex'),ref:'../tex_docs/'+htmlStem+'.tex'},
      {file:path.join(studentRoot,'tex_docs',dotted+'.tex'),ref:'../tex_docs/'+dotted+'.tex'},
      {file:path.join(studentRoot,'tex_docs',hyphen+'.tex'),ref:'../tex_docs/'+hyphen+'.tex'}
    ]
  };

  for(const item of specs[kind]||[]){
    if(fs.existsSync(item.file)&&fs.statSync(item.file).isFile())return item.ref;
  }
  return null;
}
function loadPresentationRegistry(registryPath,warnings){
  if(!fs.existsSync(registryPath)||!fs.statSync(registryPath).isFile())return new Map();
  try{
    const lessons=parseLessonRegistrySource(fs.readFileSync(registryPath,'utf8'),{
      label:'legacy lesson registry'
    });
    return new Map(
      lessons
        .filter(item=>item&&typeof item.date==='string')
        .map(item=>[item.date,item])
    );
  }catch(error){
    warnings.push({
      type:'legacy-registry-unreadable',
      path:registryPath,
      message:error.message
    });
    return new Map();
  }
}
function normalizeLegacyOutcome(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  if(typeof value.label!=='string'||!value.label.trim())return null;
  const level=Number(value.level);
  if(!Number.isInteger(level)||level<0||level>4)return null;
  const outcome={label:value.label.trim(),level};
  if(typeof value.competencyId==='string'&&value.competencyId.trim()){
    outcome.competencyId=value.competencyId.trim();
  }
  if(typeof value.tone==='string'&&value.tone.trim())outcome.tone=value.tone.trim();
  if(typeof value.practiceDisposition==='string'&&value.practiceDisposition.trim()){
    outcome.practiceDisposition=value.practiceDisposition.trim();
  }
  return outcome;
}

function uniqueStrings(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(item=>typeof item==='string'&&item.trim()).map(item=>item.trim()))];
}
function materialsForLesson({
  studentRoot,site,isoDate,htmlName,legacyRecord
}){
  const materials={html:htmlName};
  for(const kind of ['pdf','tex','lab']){
    const fromRegistry=existingMaterial({
      studentRoot,
      site,
      reference:legacyRecord?.materials?.[kind]
    });
    const reference=fromRegistry||datedCandidate({
      studentRoot,site,isoDate,kind,htmlName
    });
    if(reference)materials[kind]=reference;
  }
  return materials;
}

export function buildHistoricalLessonMetadata({
  root,
  studentId,
  manifest,
  plan
}={}){
  const studentRoot=path.join(root,'students',studentId);
  const site=path.join(studentRoot,'site');
  const registryPath=path.join(site,'lesson-registry.js');
  const warnings=[];
  const legacyByDate=loadPresentationRegistry(registryPath,warnings);
  const mappingsByDate=new Map(
    manifest.lessonMappings.map(item=>[item.lessonDate,item])
  );
  const outcomesByDate=new Map();

  for(const mapping of manifest.competencyMappings){
    if(mapping.confidence!=='exact'){
      throw new Error(
        'migration lessons: non-exact competency mapping reached deterministic builder for '+
        mapping.lessonDate+' '+mapping.competencyId
      );
    }
    if(!outcomesByDate.has(mapping.lessonDate))outcomesByDate.set(mapping.lessonDate,[]);
    outcomesByDate.get(mapping.lessonDate).push({
      competencyId:mapping.competencyId,
      evidenceAnchor:mapping.evidenceAnchor,
      relation:mapping.relation,
      masteryClaim:mapping.masteryClaim
    });
  }

  const metadataByDate=new Map();
  const presentationByDate=new Map();

  for(const lessonDate of [...mappingsByDate.keys()].sort()){
    const htmlName=lessonFilename(site,lessonDate);
    if(!htmlName)throw new Error('migration lessons: HTML is missing for '+lessonDate);
    const html=fs.readFileSync(path.join(site,htmlName),'utf8');
    const legacy=legacyByDate.get(lessonDate)||null;
    const title=
      (typeof legacy?.title==='string'&&legacy.title.trim()?legacy.title.trim():null)||
      tagText(html,'h1')||
      tagText(html,'title');
    if(!title)throw new Error('migration lessons: title is unresolved for '+lessonDate);

    const summary=
      (typeof legacy?.summary==='string'?legacy.summary.trim():null)||
      metaDescription(html)||
      '';
    const topics=uniqueStrings(legacy?.topics);
    const lessonMapping=mappingsByDate.get(lessonDate);
    for(const match of lessonMapping.ktpMatches){
      if(match.confidence!=='exact'){
        throw new Error(
          'migration lessons: non-exact KTP mapping reached deterministic builder for '+
          lessonDate+' '+match.ktpId
        );
      }
    }
    const ktpRefs=lessonMapping.ktpMatches.map(item=>item.ktpId);
    const canonicalIds=new Set((outcomesByDate.get(lessonDate)||[]).map(item=>item.competencyId));
    const legacyOutcomes=[];
    for(const rawOutcome of legacy?.outcomes||[]){
      const normalized=normalizeLegacyOutcome(rawOutcome);
      if(!normalized){
        warnings.push({
          type:'legacy-outcome-unreadable',
          lessonDate,
          label:typeof rawOutcome?.label==='string'?rawOutcome.label:null
        });
        continue;
      }
      if(normalized.competencyId&&canonicalIds.has(normalized.competencyId))continue;
      legacyOutcomes.push(normalized);
    }
    if(legacyOutcomes.length){
      warnings.push({
        type:'legacy-outcomes-preserved',
        lessonDate,
        count:legacyOutcomes.length
      });
    }
    const metadata={
      version:1,
      studentId,
      date:lessonDate,
      title,
      summary,
      topics,
      ktpRefs,
      ...(ktpRefs.length?{
        ktpCoverage:lessonMapping.ktpMatches.map(item=>({
          ktpId:item.ktpId,
          coverage:item.coverage
        }))
      }:{}),
      outcomes:outcomesByDate.get(lessonDate)||[],
      ...(legacyOutcomes.length?{legacyOutcomes}:{}),
      materials:materialsForLesson({
        studentRoot,
        site,
        isoDate:lessonDate,
        htmlName,
        legacyRecord:legacy
      })
    };
    validateLessonMetadataData(metadata,{studentId,plan});
    metadataByDate.set(lessonDate,metadata);

    const presentation={};
    if(typeof legacy?.navTitle==='string'&&legacy.navTitle.trim()){
      presentation.navTitle=legacy.navTitle.trim();
    }
    if(typeof legacy?.navSubtitle==='string'&&legacy.navSubtitle.trim()){
      presentation.navSubtitle=legacy.navSubtitle.trim();
    }
    presentationByDate.set(lessonDate,presentation);
  }

  return {metadataByDate,presentationByDate,warnings};
}

export function renderCanonicalLessonRegistry({
  metadataByDate,
  presentationByDate=new Map()
}={}){
  const lessons=[...metadataByDate.values()]
    .sort((a,b)=>b.date.localeCompare(a.date))
    .map(metadata=>{
      const presentation=presentationByDate.get(metadata.date)||{};
      return {
        date:metadata.date,
        ktpRefs:metadata.ktpRefs,
        href:metadata.materials.html,
        title:metadata.title,
        ...presentation,
        summary:metadata.summary,
        topics:metadata.topics,
        outcomes:[
          ...metadata.outcomes.map(({competencyId,evidenceAnchor,relation})=>({
            competencyId,evidenceAnchor,relation
          })),
          ...(metadata.legacyOutcomes||[])
        ],
        materials:metadata.materials
      };
    });

  const source=[
    'export const LESSONS='+JSON.stringify(lessons,null,2)+';',
    '',
    'export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}',
    'export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}',
    'export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}',
    'export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}',
    ''
  ].join('\n');

  validateRegistryMetadataParity(
    parseLessonRegistrySource(source,{label:'candidate lesson registry'}),
    metadataByDate
  );
  return source;
}
