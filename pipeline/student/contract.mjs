
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCompetencyCatalog,
  loadLessonRegistry,
  validateRegistryMetadataParity
} from './publication-contract.mjs';
export {validateLessonPublicationIntentData} from './publication-contract.mjs';

export const STUDENT_CONTRACT_VERSION=2;
export const KTP_PLAN_VERSION=1;
export const KTP_STATE_VERSION=1;
export const LESSON_METADATA_VERSION=1;

const STUDENT_ID_RE=/^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const KTP_ID_RE=/^ktp-(\d{3,})$/;
const TOKEN_ID_RE=/^[A-Za-z0-9_.:-]+$/;
const STAGE_ID_RE=/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const ANCHOR_RE=/^[A-Za-z][A-Za-z0-9_-]*$/;
const PRIVATE_STATE_KEYS=new Set(['teacherPrivateNote','parentContact','healthNote','personalObservation']);

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

export function isCalendarDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parts=value.split('-').map(Number),year=parts[0],month=parts[1],day=parts[2];
  const dateValue=new Date(Date.UTC(year,month-1,day));
  return dateValue.getUTCFullYear()===year&&dateValue.getUTCMonth()===month-1&&dateValue.getUTCDate()===day;
}
function date(value,label){
  if(!isCalendarDate(value))fail(label,'must be a valid YYYY-MM-DD calendar date');
  return value;
}
export function assertRepoRelativePath(value,label='path'){
  string(value,label);
  if(value.includes('\\'))fail(label,'must use forward slashes');
  if(path.posix.isAbsolute(value)||value.startsWith('./'))fail(label,'must be relative to the student directory');
  const normalized=path.posix.normalize(value);
  if(normalized!==value||normalized==='.'||normalized.split('/').includes('..'))fail(label,'must not traverse or normalize outside its declared path');
  return value;
}
function scanPrivateStateKeys(value,label='ktp-state'){
  if(Array.isArray(value)){value.forEach((item,index)=>scanPrivateStateKeys(item,label+'['+index+']'));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(PRIVATE_STATE_KEYS.has(key))fail(label,'public KTP state forbids private field '+key);
    scanPrivateStateKeys(item,label+'.'+key);
  }
}

export function validateStudentContractData(value,{studentId=null}={}){
  const label='student-contract';
  exactKeys(value,['version','studentId','studentName','program','planning','lessons','competencies','practice'],[],label);
  if(value.version!==STUDENT_CONTRACT_VERSION)fail(label,'version must be '+STUDENT_CONTRACT_VERSION);
  string(value.studentId,label+'.studentId',{pattern:STUDENT_ID_RE});
  if(studentId&&value.studentId!==studentId)fail(label,'studentId '+value.studentId+' does not match directory '+studentId);
  string(value.studentName,label+'.studentName',{max:160});
  string(value.program,label+'.program',{max:240});

  exactKeys(value.planning,['mode','plan','state'],[],label+'.planning');
  if(!['fixed','rolling'].includes(value.planning.mode))fail(label+'.planning.mode','must be fixed or rolling');
  assertRepoRelativePath(value.planning.plan,label+'.planning.plan');
  assertRepoRelativePath(value.planning.state,label+'.planning.state');

  exactKeys(value.lessons,['registry','metadataDir'],[],label+'.lessons');
  assertRepoRelativePath(value.lessons.registry,label+'.lessons.registry');
  assertRepoRelativePath(value.lessons.metadataDir,label+'.lessons.metadataDir');

  exactKeys(value.competencies,['catalog','mastery'],[],label+'.competencies');
  assertRepoRelativePath(value.competencies.catalog,label+'.competencies.catalog');
  assertRepoRelativePath(value.competencies.mastery,label+'.competencies.mastery');

  exactKeys(value.practice,['config'],[],label+'.practice');
  if(value.practice.config!==null)assertRepoRelativePath(value.practice.config,label+'.practice.config');
  return value;
}

export function validateKtpPlanData(value,{studentId=null}={}){
  const label='ktp-plan';
  exactKeys(value,['version','studentId','programVersion','lessons'],[],label);
  if(value.version!==KTP_PLAN_VERSION)fail(label,'version must be '+KTP_PLAN_VERSION);
  string(value.studentId,label+'.studentId',{pattern:STUDENT_ID_RE});
  if(studentId&&value.studentId!==studentId)fail(label,'studentId mismatch');
  string(value.programVersion,label+'.programVersion',{max:120});
  array(value.lessons,label+'.lessons');

  const ids=[],orders=[];
  value.lessons.forEach((lesson,index)=>{
    const item=label+'.lessons['+index+']';
    exactKeys(lesson,['id','order','plannedDate','stageId','stage','block','topic','content','result','check','homework','targetCompetencies'],[],item);
    const match=String(lesson.id||'').match(KTP_ID_RE);
    if(!match)fail(item+'.id','must match ktp-NNN');
    integer(lesson.order,item+'.order',1,Number.MAX_SAFE_INTEGER);
    if(Number(match[1])!==lesson.order)fail(item,'id numeric suffix must equal order');
    if(lesson.plannedDate!==null)date(lesson.plannedDate,item+'.plannedDate');
    string(lesson.stageId,item+'.stageId',{max:120,pattern:STAGE_ID_RE});
    string(lesson.stage,item+'.stage',{max:200});
    string(lesson.block,item+'.block',{max:240});
    string(lesson.topic,item+'.topic',{max:300});
    string(lesson.content,item+'.content',{max:5000});
    string(lesson.result,item+'.result',{max:3000});
    string(lesson.check,item+'.check',{max:3000});
    string(lesson.homework,item+'.homework',{max:3000});
    array(lesson.targetCompetencies,item+'.targetCompetencies');
    lesson.targetCompetencies.forEach((id,i)=>string(id,item+'.targetCompetencies['+i+']',{pattern:TOKEN_ID_RE}));
    unique(lesson.targetCompetencies,item+'.targetCompetencies');
    ids.push(lesson.id);orders.push(lesson.order);
  });
  unique(ids,label+'.lessons ids');unique(orders,label+'.lessons order');
  for(let i=1;i<orders.length;i+=1)if(orders[i]<=orders[i-1])fail(label,'lessons must be sorted by ascending order');
  return value;
}

export function validateKtpStateData(value,{studentId=null,plan=null}={}){
  const label='ktp-state';
  scanPrivateStateKeys(value,label);
  exactKeys(value,['version','studentId','programVersion','updated','records'],[],label);
  if(value.version!==KTP_STATE_VERSION)fail(label,'version must be '+KTP_STATE_VERSION);
  string(value.studentId,label+'.studentId',{pattern:STUDENT_ID_RE});
  if(studentId&&value.studentId!==studentId)fail(label,'studentId mismatch');
  string(value.programVersion,label+'.programVersion',{max:120});
  date(value.updated,label+'.updated');
  record(value.records,label+'.records');

  const planIds=new Set(plan?.lessons?.map(item=>item.id)||[]);
  if(plan&&value.programVersion!==plan.programVersion)fail(label,'programVersion does not match KTP plan');

  for(const [id,state] of Object.entries(value.records)){
    if(!KTP_ID_RE.test(id))fail(label+'.records','record keys must match ktp-NNN');
    if(plan&&!planIds.has(id))fail(label+'.records.'+id,'references a KTP item absent from the plan');
    const item=label+'.records.'+id;
    exactKeys(state,['status'],['scheduledDate','actualDate','coverage','actualSummary','lessonRefs'],item);
    if(!['planned','in_progress','done','moved','skipped'].includes(state.status))fail(item+'.status','invalid status');
    for(const key of ['scheduledDate','actualDate'])if(key in state&&state[key]!==null)date(state[key],item+'.'+key);
    if('coverage' in state&&!['complete','partial','deferred'].includes(state.coverage))fail(item+'.coverage','invalid coverage');
    if('actualSummary' in state)string(state.actualSummary,item+'.actualSummary',{min:0,max:2000});
    if('lessonRefs' in state){
      array(state.lessonRefs,item+'.lessonRefs');
      state.lessonRefs.forEach((ref,i)=>date(ref,item+'.lessonRefs['+i+']'));
      unique(state.lessonRefs,item+'.lessonRefs');
    }
    if(state.status==='done'){
      if(!state.actualDate)fail(item,'done requires actualDate');
      if(state.coverage!=='complete')fail(item,'done requires coverage complete');
    }
    if(state.status==='in_progress'){
      if(state.actualDate)fail(item,'in_progress must not contain actualDate');
      if(!['partial','deferred'].includes(state.coverage))fail(item,'in_progress requires partial or deferred coverage');
    }
    if(state.status==='moved'&&!state.scheduledDate)fail(item,'moved requires scheduledDate');
    if(['planned','moved','skipped'].includes(state.status)&&state.actualDate)fail(item,state.status+' must not contain actualDate');
    if(state.coverage&&!['in_progress','done'].includes(state.status))fail(item,'coverage is only valid for in_progress or done');
  }
  return value;
}

export function validateLessonMetadataData(value,{studentId=null,plan=null}={}){
  const label='lesson-metadata';
  exactKeys(value,['version','studentId','date','title','summary','topics','ktpRefs','outcomes','materials'],['ktpCoverage'],label);
  if(value.version!==LESSON_METADATA_VERSION)fail(label,'version must be '+LESSON_METADATA_VERSION);
  string(value.studentId,label+'.studentId',{pattern:STUDENT_ID_RE});
  if(studentId&&value.studentId!==studentId)fail(label,'studentId mismatch');
  date(value.date,label+'.date');
  string(value.title,label+'.title',{max:300});
  string(value.summary,label+'.summary',{min:0,max:3000});
  array(value.topics,label+'.topics');
  value.topics.forEach((topic,i)=>string(topic,label+'.topics['+i+']',{max:160}));
  unique(value.topics,label+'.topics');
  array(value.ktpRefs,label+'.ktpRefs');unique(value.ktpRefs,label+'.ktpRefs');
  const planIds=new Set(plan?.lessons?.map(item=>item.id)||[]);
  value.ktpRefs.forEach((ref,i)=>{
    if(!KTP_ID_RE.test(ref))fail(label+'.ktpRefs['+i+']','must match ktp-NNN');
    if(plan&&!planIds.has(ref))fail(label+'.ktpRefs['+i+']','references an item absent from the KTP plan');
  });
  if('ktpCoverage' in value){
    array(value.ktpCoverage,label+'.ktpCoverage');
    const coverageIds=[];
    value.ktpCoverage.forEach((entry,index)=>{
      const item=label+'.ktpCoverage['+index+']';
      exactKeys(entry,['ktpId','coverage'],[],item);
      string(entry.ktpId,item+'.ktpId',{pattern:KTP_ID_RE});
      if(plan&&!planIds.has(entry.ktpId))fail(item+'.ktpId','references an item absent from the KTP plan');
      if(!['complete','partial','deferred'].includes(entry.coverage))fail(item+'.coverage','invalid coverage');
      coverageIds.push(entry.ktpId);
    });
    unique(coverageIds,label+'.ktpCoverage ktpId');
    const refs=[...value.ktpRefs].sort();
    const coverage=[...coverageIds].sort();
    if(JSON.stringify(refs)!==JSON.stringify(coverage))fail(label+'.ktpCoverage','must cover exactly the same KTP IDs as ktpRefs');
  }
  array(value.outcomes,label+'.outcomes');
  value.outcomes.forEach((outcome,index)=>{
    const item=label+'.outcomes['+index+']';
    exactKeys(outcome,['competencyId','evidenceAnchor','relation','masteryClaim'],[],item);
    string(outcome.competencyId,item+'.competencyId',{pattern:TOKEN_ID_RE});
    string(outcome.evidenceAnchor,item+'.evidenceAnchor',{pattern:ANCHOR_RE});
    if(!['touched','practiced','assessed'].includes(outcome.relation))fail(item+'.relation','invalid relation');
    if(outcome.masteryClaim!==null){
      exactKeys(outcome.masteryClaim,['level','confidence','basis'],[],item+'.masteryClaim');
      integer(outcome.masteryClaim.level,item+'.masteryClaim.level',0,4);
      if(outcome.masteryClaim.confidence!=='exact')fail(item+'.masteryClaim.confidence','must be exact');
      string(outcome.masteryClaim.basis,item+'.masteryClaim.basis',{max:1000});
      if(outcome.relation!=='assessed')fail(item,'masteryClaim requires relation assessed');
    }
  });
  exactKeys(value.materials,[],['html','pdf','tex','lab'],label+'.materials');
  for(const [key,ref] of Object.entries(value.materials))string(ref,label+'.materials.'+key);
  return value;
}

export function loadJson(filePath,label=path.basename(filePath)){
  let value;
  try{value=JSON.parse(fs.readFileSync(filePath,'utf8'));}
  catch(error){fail(label,'cannot parse JSON: '+error.message);}
  return value;
}

function studentRoot(root,studentId){return path.resolve(root,'students',studentId);}
export function resolveStudentContractPath(root,studentId,relative){
  assertRepoRelativePath(relative,'student contract path');
  const base=studentRoot(root,studentId),target=path.resolve(base,...relative.split('/'));
  if(target!==base&&!target.startsWith(base+path.sep))fail(relative,'resolved outside the student directory');
  return target;
}
function mustExist(filePath,label,options={}){
  if(!fs.existsSync(filePath))fail(label,'referenced path does not exist');
  const stat=fs.statSync(filePath),directory=options.directory===true;
  if(directory?!stat.isDirectory():!stat.isFile())fail(label,directory?'must be a directory':'must be a file');
}
function localMaterialPath(siteRoot,studentBase,reference,label){
  const clean=reference.split(/[?#]/,1)[0];
  if(!clean||/^[a-z][a-z0-9+.-]*:/i.test(clean)||clean.startsWith('/')||clean.includes('\\'))fail(label,'must be a local relative material path');
  const target=path.resolve(siteRoot,clean);
  if(target!==studentBase&&!target.startsWith(studentBase+path.sep))fail(label,'escapes the student directory');
  return target;
}
function escapeRegExp(value){return String(value).replace(/[.*+?^$()|[\]\\]/g,'\\$&');}

export function discoverV2Students(root=process.cwd()){
  const studentsDir=path.join(root,'students');
  if(!fs.existsSync(studentsDir))return [];
  return fs.readdirSync(studentsDir,{withFileTypes:true})
    .filter(entry=>entry.isDirectory()&&fs.existsSync(path.join(studentsDir,entry.name,'student-contract.json')))
    .map(entry=>entry.name)
    .sort();
}

export function validateStudentPackage({root=process.cwd(),studentId}={}){
  string(studentId,'studentId',{pattern:STUDENT_ID_RE});
  const base=studentRoot(root,studentId),contractPath=path.join(base,'student-contract.json');
  mustExist(contractPath,'student-contract.json');
  const contract=validateStudentContractData(loadJson(contractPath),{studentId});

  const planPath=resolveStudentContractPath(root,studentId,contract.planning.plan);
  const statePath=resolveStudentContractPath(root,studentId,contract.planning.state);
  const registryPath=resolveStudentContractPath(root,studentId,contract.lessons.registry);
  const metadataDir=resolveStudentContractPath(root,studentId,contract.lessons.metadataDir);
  const catalogPath=resolveStudentContractPath(root,studentId,contract.competencies.catalog);
  const masteryPath=resolveStudentContractPath(root,studentId,contract.competencies.mastery);
  for(const pair of [[planPath,'KTP plan'],[statePath,'KTP state'],[registryPath,'lesson registry'],[catalogPath,'competency catalog'],[masteryPath,'mastery authority']])mustExist(pair[0],pair[1]);
  mustExist(metadataDir,'lesson metadata directory',{directory:true});
  if(contract.practice.config!==null)mustExist(resolveStudentContractPath(root,studentId,contract.practice.config),'practice config');

  const plan=validateKtpPlanData(loadJson(planPath),{studentId});
  const state=validateKtpStateData(loadJson(statePath),{studentId,plan});
  const competencyCatalog=loadCompetencyCatalog(catalogPath);
  for(const lesson of plan.lessons){
    for(const competencyId of lesson.targetCompetencies){
      if(!competencyCatalog.ids.has(competencyId)){
        fail('ktp-plan '+lesson.id,'target competency '+competencyId+' is absent from the competency catalog');
      }
    }
  }
  const metadataFiles=fs.readdirSync(metadataDir).filter(name=>name.endsWith('.lesson.json')).sort();
  const metadataByDate=new Map(),siteRoot=path.join(base,'site');

  for(const name of metadataFiles){
    const file=path.join(metadataDir,name);
    const metadata=validateLessonMetadataData(loadJson(file),{studentId,plan});
    if(metadataByDate.has(metadata.date))fail(file,'duplicate metadata date '+metadata.date);
    metadataByDate.set(metadata.date,metadata);
    for(const outcome of metadata.outcomes){
      if(!competencyCatalog.ids.has(outcome.competencyId)){
        fail(name+'.outcomes','competency '+outcome.competencyId+' is absent from the competency catalog');
      }
    }
    for(const [kind,reference] of Object.entries(metadata.materials)){
      const target=localMaterialPath(siteRoot,base,reference,name+'.materials.'+kind);
      mustExist(target,name+'.materials.'+kind);
    }
    if(metadata.materials.html){
      const htmlPath=localMaterialPath(siteRoot,base,metadata.materials.html,name+'.materials.html');
      const html=fs.readFileSync(htmlPath,'utf8');
      for(const outcome of metadata.outcomes){
        const anchor=escapeRegExp(outcome.evidenceAnchor);
        if(!new RegExp('\\bid=["\\\']'+anchor+'["\\\']').test(html))fail(name,'evidence anchor #'+outcome.evidenceAnchor+' is missing from '+metadata.materials.html);
      }
    }
  }

  validateRegistryMetadataParity(loadLessonRegistry(registryPath),metadataByDate);

  for(const [ktpId,recordState] of Object.entries(state.records)){
    for(const lessonDate of recordState.lessonRefs||[]){
      const metadata=metadataByDate.get(lessonDate);
      if(!metadata)fail('ktp-state.records.'+ktpId+'.lessonRefs','missing lesson metadata for '+lessonDate);
      if(!metadata.ktpRefs.includes(ktpId))fail('lesson metadata '+lessonDate,'does not link back to '+ktpId);
    }
  }
  for(const metadata of metadataByDate.values()){
    for(const ktpId of metadata.ktpRefs){
      const recordState=state.records[ktpId];
      if(!recordState)fail('lesson metadata '+metadata.date,'KTP state has no record for '+ktpId);
      if(!(recordState.lessonRefs||[]).includes(metadata.date))fail('ktp-state.records.'+ktpId,'does not link back to lesson metadata '+metadata.date);
    }
  }

  return {
    studentId,
    contractVersion:contract.version,
    planningMode:contract.planning.mode,
    ktpLessons:plan.lessons.length,
    ktpRecords:Object.keys(state.records).length,
    lessonMetadata:metadataFiles.length
  };
}
