import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const LESSON_PUBLICATION_INTENT_VERSION=1;

const STUDENT_ID_RE=/^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const KTP_ID_RE=/^ktp-(\d{3,})$/;
const TOKEN_ID_RE=/^[A-Za-z0-9_.:-]+$/;
const ANCHOR_RE=/^[A-Za-z][A-Za-z0-9_-]*$/;
const PRIVATE_PUBLICATION_KEYS=new Set([
  'teacherPrivateNote',
  'teacherNote',
  'parentContact',
  'parentNote',
  'privateComment',
  'health',
  'healthNote',
  'personalObservation',
  'behaviourNote',
  'behaviorNote'
]);

function fail(label,message){throw new Error(label+': '+message);}
function record(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(label,'must be an object');
  return value;
}
function exactKeys(value,required,optional,label){
  record(value,label);
  const allowed=new Set(required.concat(optional||[]));
  for(const key of required)if(!(key in value))fail(label,'missing required field '+key);
  for(const key of Object.keys(value))if(!allowed.has(key))fail(label,'unknown field '+key);
}
function string(value,label,options={}){
  const min=options.min??1,max=options.max??Infinity,pattern=options.pattern||null;
  if(typeof value!=='string'||value.length<min||value.length>max)fail(label,'must be a string of valid length');
  if(pattern&&!pattern.test(value))fail(label,'has invalid format');
  return value;
}
function integer(value,label,min,max){
  if(!Number.isInteger(value)||value<min||value>max)fail(label,'must be an integer in range '+min+'..'+max);
  return value;
}
function array(value,label){if(!Array.isArray(value))fail(label,'must be an array');return value;}
function unique(values,label){if(new Set(values).size!==values.length)fail(label,'must contain unique values');}
function isCalendarDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}
function date(value,label){
  if(!isCalendarDate(value))fail(label,'must be a valid YYYY-MM-DD calendar date');
  return value;
}
function scanForbiddenKeys(value,label){
  if(Array.isArray(value)){value.forEach((item,index)=>scanForbiddenKeys(item,label+'['+index+']'));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(PRIVATE_PUBLICATION_KEYS.has(key))fail(label,'public lesson publication intent forbids private field '+key);
    scanForbiddenKeys(item,label+'.'+key);
  }
}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  }
  return value;
}
function sameValue(left,right){
  return JSON.stringify(stable(left))===JSON.stringify(stable(right));
}
function escapeRegExp(value){
  return String(value).replace(/[.*+?^$()|[\]\\]/g,'\\$&');
}

export function validateLessonPublicationIntentData(value,{studentId=null,plan=null,competencyIds=null}={}){
  const label='lesson-publication-intent';
  scanForbiddenKeys(value,label);
  exactKeys(
    value,
    ['version','studentId','lessonDate','topics','actualSummary','ktpMatches','outcomes','warnings'],
    [],
    label
  );
  if(value.version!==LESSON_PUBLICATION_INTENT_VERSION)fail(label,'version must be '+LESSON_PUBLICATION_INTENT_VERSION);
  string(value.studentId,label+'.studentId',{pattern:STUDENT_ID_RE});
  if(studentId&&value.studentId!==studentId)fail(label,'studentId mismatch');
  date(value.lessonDate,label+'.lessonDate');

  array(value.topics,label+'.topics');
  value.topics.forEach((topic,index)=>string(topic,label+'.topics['+index+']',{max:160}));
  unique(value.topics,label+'.topics');
  string(value.actualSummary,label+'.actualSummary',{min:0,max:2000});

  const planIds=new Set(plan?.lessons?.map(item=>item.id)||[]);
  array(value.ktpMatches,label+'.ktpMatches');
  const ktpIds=[];
  value.ktpMatches.forEach((match,index)=>{
    const item=label+'.ktpMatches['+index+']';
    exactKeys(match,['ktpId','confidence','decision','coverage','reason'],[],item);
    string(match.ktpId,item+'.ktpId',{pattern:KTP_ID_RE});
    if(plan&&!planIds.has(match.ktpId))fail(item+'.ktpId','references an item absent from the KTP plan');
    if(!['exact','probable','ambiguous'].includes(match.confidence))fail(item+'.confidence','invalid confidence');
    if(!['apply','review','ignore'].includes(match.decision))fail(item+'.decision','invalid decision');
    if(match.decision==='apply'&&match.confidence!=='exact')fail(item,'apply requires exact confidence');
    if(!['complete','partial','deferred'].includes(match.coverage))fail(item+'.coverage','invalid coverage');
    string(match.reason,item+'.reason',{max:2000});
    ktpIds.push(match.ktpId);
  });
  unique(ktpIds,label+'.ktpMatches ktpId');

  array(value.outcomes,label+'.outcomes');
  const outcomeKeys=[];
  value.outcomes.forEach((outcome,index)=>{
    const item=label+'.outcomes['+index+']';
    exactKeys(
      outcome,
      ['competencyId','evidenceAnchor','relation','confidence','decision','masteryClaim','basis'],
      [],
      item
    );
    string(outcome.competencyId,item+'.competencyId',{pattern:TOKEN_ID_RE});
    if(competencyIds&&!competencyIds.has(outcome.competencyId)){
      fail(item+'.competencyId','references an ID absent from the competency catalog');
    }
    string(outcome.evidenceAnchor,item+'.evidenceAnchor',{pattern:ANCHOR_RE});
    if(!['touched','practiced','assessed'].includes(outcome.relation))fail(item+'.relation','invalid relation');
    if(!['exact','probable','ambiguous'].includes(outcome.confidence))fail(item+'.confidence','invalid confidence');
    if(!['apply','review','ignore'].includes(outcome.decision))fail(item+'.decision','invalid decision');
    if(outcome.decision==='apply'&&outcome.confidence!=='exact')fail(item,'apply requires exact confidence');
    string(outcome.basis,item+'.basis',{max:2000});

    if(outcome.masteryClaim!==null){
      exactKeys(outcome.masteryClaim,['level','confidence','basis'],[],item+'.masteryClaim');
      integer(outcome.masteryClaim.level,item+'.masteryClaim.level',0,4);
      if(outcome.masteryClaim.confidence!=='exact')fail(item+'.masteryClaim.confidence','must be exact');
      string(outcome.masteryClaim.basis,item+'.masteryClaim.basis',{max:1000});
      if(outcome.relation!=='assessed')fail(item,'masteryClaim requires relation assessed');
      if(outcome.confidence!=='exact'||outcome.decision!=='apply'){
        fail(item,'masteryClaim requires exact/apply outcome');
      }
    }
    outcomeKeys.push(outcome.competencyId+'#'+outcome.evidenceAnchor+'#'+outcome.relation);
  });
  unique(outcomeKeys,label+'.outcomes competency/anchor/relation');

  array(value.warnings,label+'.warnings');
  value.warnings.forEach((warning,index)=>string(warning,label+'.warnings['+index+']',{max:1000}));
  return value;
}

export function loadCompetencyCatalog(filePath,{fsView=fs}={}){
  const label='competency catalog';
  let data;
  if(path.extname(filePath).toLowerCase()==='.json'){
    try{data=JSON.parse(fsView.readFileSync(filePath,'utf8'));}
    catch(error){fail(label,'cannot parse JSON: '+error.message);}
  }else{
    const source=fsView.readFileSync(filePath,'utf8');
    const sandbox={window:Object.create(null)};
    vm.createContext(sandbox,{codeGeneration:{strings:false,wasm:false}});
    try{
      new vm.Script(source,{filename:filePath}).runInContext(sandbox,{timeout:1000});
      data=sandbox.window.COMPETENCY_MAP_DATA;
    }catch(error){
      fail(label,'cannot evaluate catalog safely: '+error.message);
    }
  }
  record(data,label);
  const groups=data.groups??[];
  array(groups,label+'.groups');
  const ids=[];
  groups.forEach((group,groupIndex)=>{
    const groupLabel=label+'.groups['+groupIndex+']';
    record(group,groupLabel);
    const items=group.items??[];
    array(items,groupLabel+'.items');
    items.forEach((item,itemIndex)=>{
      const itemLabel=groupLabel+'.items['+itemIndex+']';
      record(item,itemLabel);
      string(item.id,itemLabel+'.id',{pattern:TOKEN_ID_RE});
      ids.push(item.id);
    });
  });
  unique(ids,label+' ids');
  return {data,ids:new Set(ids)};
}

function extractLessonsArray(source,label){
  const match=/export\s+const\s+LESSONS\s*=\s*/.exec(source);
  if(!match)fail(label,'must export const LESSONS');
  const expressionStart=match.index+match[0].length;
  const freezePrefix='Object.freeze(';
  const frozen=source.startsWith(freezePrefix,expressionStart);
  const start=frozen?expressionStart+freezePrefix.length:expressionStart;
  if(source[start]!=='[')fail(label,'LESSONS must be an array literal or Object.freeze(array literal)');

  let depth=0,quote=null,escaped=false;
  for(let i=start;i<source.length;i+=1){
    const char=source[i];
    if(quote){
      if(escaped){escaped=false;continue;}
      if(char==='\\'){escaped=true;continue;}
      if(char===quote){quote=null;continue;}
      continue;
    }
    if(char==='"'||char==="'"){quote=char;continue;}
    if(char==='[')depth+=1;
    else if(char===']'){
      depth-=1;
      if(depth===0){
        if(frozen){
          let closing=i+1;
          while(/\s/.test(source[closing]||''))closing+=1;
          if(source[closing]!==')')fail(label,'Object.freeze LESSONS wrapper must contain exactly one array literal');
          let after=closing+1;
          while(/\s/.test(source[after]||''))after+=1;
          if(source[after]!==';'&&source[after]!==undefined){
            fail(label,'Object.freeze LESSONS wrapper must be the complete assignment expression');
          }
        }
        const literal=source.slice(start,i+1);
        try{
          const sandbox=Object.create(null);
          vm.createContext(sandbox,{codeGeneration:{strings:false,wasm:false}});
          const lessons=new vm.Script('('+literal+')',{filename:label}).runInContext(sandbox,{timeout:1000});
          if(!Array.isArray(lessons))fail(label,'LESSONS must evaluate to an array');
          return lessons;
        }catch(error){
          fail(label,'cannot evaluate LESSONS safely: '+error.message);
        }
      }
    }
  }
  fail(label,'unterminated LESSONS array');
}

export function parseLessonRegistrySource(source,{label='lesson registry'}={}){
  return extractLessonsArray(source,label);
}

export function loadLessonRegistry(filePath,{fsView=fs}={}){
  return parseLessonRegistrySource(fsView.readFileSync(filePath,'utf8'),{label:'lesson registry'});
}

function legacyOutcomeRegistryProjection(outcome){
  const projected={
    label:outcome.label,
    level:outcome.level
  };
  if(outcome.competencyId!==undefined)projected.competencyId=outcome.competencyId;
  if(outcome.tone!==undefined)projected.tone=outcome.tone;
  if(outcome.practiceDisposition!==undefined)projected.practiceDisposition=outcome.practiceDisposition;
  return projected;
}

function metadataRegistryProjection(metadata){
  if(!metadata.materials.html){
    fail('lesson metadata '+metadata.date,'materials.html is required for registry parity');
  }
  return {
    date:metadata.date,
    href:metadata.materials.html,
    title:metadata.title,
    summary:metadata.summary,
    topics:metadata.topics,
    ktpRefs:metadata.ktpRefs,
    outcomes:[
      ...metadata.outcomes.map(({competencyId,evidenceAnchor,relation})=>({
        competencyId,evidenceAnchor,relation
      })),
      ...(metadata.legacyOutcomes||[]).map(legacyOutcomeRegistryProjection)
    ],
    materials:metadata.materials
  };
}

function registryProjection(lesson,index){
  const label='lesson registry['+index+']';
  record(lesson,label);
  exactKeys(
    lesson,
    ['date','href','title','summary','topics','ktpRefs','outcomes','materials'],
    ['navTitle','navSubtitle'],
    label
  );
  return {
    date:lesson.date,
    href:lesson.href,
    title:lesson.title,
    summary:lesson.summary,
    topics:lesson.topics,
    ktpRefs:lesson.ktpRefs,
    outcomes:lesson.outcomes,
    materials:lesson.materials
  };
}

export function validateRegistryMetadataParity(registryLessons,metadataByDate){
  array(registryLessons,'lesson registry');
  if(!(metadataByDate instanceof Map))fail('lesson metadata','must be a Map keyed by date');

  const registryByDate=new Map();
  registryLessons.forEach((lesson,index)=>{
    const projected=registryProjection(lesson,index);
    if(registryByDate.has(projected.date))fail('lesson registry','duplicate date '+projected.date);
    registryByDate.set(projected.date,projected);
  });

  if(registryByDate.size!==metadataByDate.size){
    fail('lesson registry','must contain exactly one record for every lesson metadata file');
  }
  for(const [lessonDate,metadata] of metadataByDate){
    const registry=registryByDate.get(lessonDate);
    if(!registry)fail('lesson registry','missing record for metadata date '+lessonDate);
    const expected=metadataRegistryProjection(metadata);
    if(!sameValue(registry,expected)){
      fail('lesson registry '+lessonDate,'does not match canonical lesson metadata projection');
    }
  }
  return true;
}

export function assertEvidenceAnchors(html,outcomes,{label='lesson HTML'}={}){
  string(html,label,{min:0});
  array(outcomes,'outcomes');
  for(const outcome of outcomes){
    const anchor=escapeRegExp(outcome.evidenceAnchor);
    if(!new RegExp('\\bid=["\\\']'+anchor+'["\\\']').test(html)){
      fail(label,'evidence anchor #'+outcome.evidenceAnchor+' is missing');
    }
  }
  return true;
}
