import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateSlug} from './create-student.mjs';
import {replaceLessonRegistrySource} from '../pipeline/lessons/lesson-registry.mjs';
import {buildV2PublicationPlan} from '../pipeline/student/publish/plan.mjs';
import {executeV2Publication} from '../pipeline/student/publish/transaction.mjs';
import {verifyPublishedPlan} from '../pipeline/student/publish/verify.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DATE_HTML=/^(?:\d{2}\.\d{2}\.\d{2}|\d{2}-\d{2}-\d{2})\.html$/;

function validDate(y,m,d){const x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;}
export function normalizeLessonDate(value){
  let y,m,d,match=String(value||'').match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if(match){d=+match[1];m=+match[2];y=2000+(+match[3]);}
  else{match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)throw new Error('Lesson date must use DD.MM.YY or YYYY-MM-DD.');y=+match[1];m=+match[2];d=+match[3];}
  if(!validDate(y,m,d))throw new Error(`Invalid lesson date: ${value}`);
  const mm=String(m).padStart(2,'0'),dd=String(d).padStart(2,'0'),yy=String(y).slice(-2);
  return {iso:`${y}-${mm}-${dd}`,base:`${dd}.${mm}.${yy}`,cacheVersion:`${y}${mm}${dd}`};
}
function escapeRegExp(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function strip(value){return String(value||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function pageMeta(source){
  const title=strip(source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  const tag=[...source.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]).find(x=>/\bname=["']description["']/i.test(x));
  return {title,summary:tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim()||''};
}
function scaffoldHint(slug){return `node scripts/create-student.mjs ${slug} --name "..." --grade "..." --program "..."`;}
function requireScaffold(root,student){
  validateSlug(student);
  const site=path.join(root,'students',student,'site'),index=path.join(site,'index.html'),design=path.join(site,'design.json'),roster=path.join(root,'design-system','STUDENT_ROSTER.md');
  const missing=[index,design,roster].filter(x=>!fs.existsSync(x));
  if(missing.length)throw new Error(`${student}: incomplete student scaffold (${missing.map(x=>path.relative(root,x)).join(', ')}). New students must be created with ${scaffoldHint(student)}`);
  if(!new RegExp(`^\\|\\s*${escapeRegExp(student)}(?:\\s+—[^|]*)?\\s*\\|`,'m').test(fs.readFileSync(roster,'utf8')))throw new Error(`${student}: STUDENT_ROSTER.md has no scaffold entry.`);
  return {site,index};
}
function discoverArtifact(root,student,date){
  const {iso,base,cacheVersion}=normalizeLessonDate(date),studentRoot=path.join(root,'students',student),site=path.join(studentRoot,'site'),html=path.join(site,`${base}.html`);
  if(!fs.existsSync(html))throw new Error(`${student}: missing lesson HTML ${path.relative(root,html)}`);
  const meta=pageMeta(fs.readFileSync(html,'utf8'));
  const exists=(dir,ext)=>fs.existsSync(path.join(studentRoot,dir,`${base}.${ext}`));
  const lab=fs.existsSync(path.join(site,`${base}-lab.html`));
  return {iso,base,cacheVersion,href:`${base}.html`,title:meta.title||`Занятие ${base}`,summary:meta.summary,materials:{...(exists('pdf_docs','pdf')?{pdf:`../pdf_docs/${base}.pdf`}:{}),...(exists('tex_docs','tex')?{tex:`../tex_docs/${base}.tex`}:{}),...(lab?{lab:`${base}-lab.html`}:{})}};
}
function lessonRecord(existing,a){
  const title=existing?.title||a.title,summary=existing?.summary||a.summary||'';
  return {...(existing||{}),date:a.iso,href:a.href,title,navTitle:existing?.navTitle||title,navSubtitle:existing?.navSubtitle||(summary||'Материалы занятия'),summary,topics:existing?.topics||[],outcomes:existing?.outcomes||[],materials:{...(existing?.materials||{}),...a.materials}};
}
export function replaceRegistryImportVersion(source,version){
  const re=/(from\s+["']\.\/lesson-registry\.js)(?:\?v=[^"']*)?(["'])/;
  if(!re.test(source))throw new Error('dashboard.js does not import ./lesson-registry.js');
  return source.replace(re,`$1?v=${version}$2`);
}
function writeAtomic(file,content){const temp=`${file}.publish-${process.pid}-${Date.now()}`;fs.writeFileSync(temp,content,'utf8');fs.renameSync(temp,file);}
async function loadLessons(file){const url=pathToFileURL(file);url.search=`?publish=${Date.now()}-${Math.random()}`;const x=await import(url.href);if(!Array.isArray(x.LESSONS))throw new Error(`${file}: invalid LESSONS export`);return x.LESSONS;}
export async function verifyRegistryParity(site,registry){
  const lessons=await loadLessons(registry);
  assert.ok(lessons.length,'lesson-registry.js must contain at least one lesson');
  for(let i=1;i<lessons.length;i+=1)assert.ok(lessons[i-1].date>=lessons[i].date,'lesson-registry.js must be newest-first');
  assert.equal(new Set(lessons.map(x=>x.date)).size,lessons.length,'lesson dates must be unique');
  assert.equal(new Set(lessons.map(x=>x.href)).size,lessons.length,'lesson hrefs must be unique');
  const files=fs.readdirSync(site,{withFileTypes:true}).filter(x=>x.isFile()&&DATE_HTML.test(x.name)).map(x=>x.name).sort();
  const refs=lessons.map(x=>String(x.href||'').split(/[?#]/,1)[0]).filter(x=>DATE_HTML.test(x)).sort();
  assert.deepEqual(refs,files,'lesson registry must match lesson HTML files');
}
function runNode(root,args){const x=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(x.status!==0)throw new Error(`Verification failed: node ${args.join(' ')}\n${String(x.stderr||x.stdout||'').trim()}`);return `node ${args.join(' ')}`;}
async function verify(root,student,{registry=null,dashboard=null}={}){
  const checks=[];
  if(registry){checks.push(runNode(root,['--check',path.relative(root,registry)]));await verifyRegistryParity(path.dirname(registry),registry);}
  if(dashboard)checks.push(runNode(root,['--check',path.relative(root,dashboard)]));
  checks.push(runNode(root,['design-system/test-contract.mjs']),runNode(root,['shared/student-dashboard/test-index-inventory.mjs']));
  const regression=path.join(root,'students',student,'site','tests','dashboard-regression.mjs');if(fs.existsSync(regression))checks.push(runNode(root,[path.relative(root,regression)]));
  return checks;
}
function verifyV2Production(root,student,plan){
  const packageVerification=verifyPublishedPlan({root,plan});
  const checks=[
    runNode(root,['design-system/test-contract.mjs']),
    runNode(root,['shared/student-dashboard/test-index-inventory.mjs'])
  ];
  const testDir=path.join(root,'students',student,'site','tests');
  for(const name of ['student-platform-v2.test.mjs','dashboard-regression.mjs']){
    const file=path.join(testDir,name);
    if(fs.existsSync(file))checks.push(runNode(root,[path.relative(root,file)]));
  }
  return {...packageVerification,checks};
}
function loadPublicationIntent(root,intentPath){
  if(!intentPath)throw new Error('Student Platform v2 publication requires --intent <file>.');
  const file=path.isAbsolute(intentPath)?intentPath:path.resolve(root,intentPath);
  if(!fs.existsSync(file))throw new Error('Publication intent file does not exist: '+intentPath);
  let value;
  try{value=JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(error){throw new Error('Cannot parse publication intent '+intentPath+': '+error.message);}
  return {file,value};
}

export async function publishLegacyLesson({
  root=ROOT,
  student,
  date,
  dryRun=false,
  verifyChanges=true
}={}){
  const scaffold=requireScaffold(root,student),a=discoverArtifact(root,student,date),registry=path.join(scaffold.site,'lesson-registry.js'),dashboard=path.join(scaffold.site,'dashboard.js');
  const hasRegistry=fs.existsSync(registry),hasDashboard=fs.existsSync(dashboard),planned=new Map();let lesson=null,mode='bespoke-index-verified';
  if(hasRegistry){
    mode='registry-upsert';const lessons=await loadLessons(registry),existing=lessons.find(x=>x.date===a.iso)||null;lesson=lessonRecord(existing,a);
    const before=fs.readFileSync(registry,'utf8'),after=replaceLessonRegistrySource(before,lesson);if(after!==before)planned.set(registry,after);
    if(hasDashboard){const beforeDash=fs.readFileSync(dashboard,'utf8'),afterDash=replaceRegistryImportVersion(beforeDash,a.cacheVersion);if(afterDash!==beforeDash)planned.set(dashboard,afterDash);}
  }else{
    const index=fs.readFileSync(scaffold.index,'utf8'),re=new RegExp(`href=["'][^"']*${escapeRegExp(a.base)}\\.html(?:[?#][^"']*)?["']`,'i');
    if(!re.test(index))throw new Error(`${student}: bespoke dashboard index.html must link to ${a.href} before publication.`);
  }
  const changedFiles=[...planned.keys()].map(x=>path.relative(root,x));
  if(dryRun)return {student,date:a.iso,base:a.base,architecture:'legacy',mode,dryRun:true,changedFiles,lesson,materials:a.materials};
  const backups=new Map([...planned.keys()].map(x=>[x,fs.readFileSync(x,'utf8')]));
  try{
    for(const [file,content] of planned)writeAtomic(file,content);
    const verification=verifyChanges?await verify(root,student,{registry:hasRegistry?registry:null,dashboard:hasDashboard?dashboard:null}):[];
    return {student,date:a.iso,base:a.base,architecture:'legacy',mode,dryRun:false,changedFiles,lesson,materials:a.materials,verification};
  }catch(error){for(const [file,content] of backups)writeAtomic(file,content);throw new Error(`${error.message}\nPublication changes were rolled back.`);}
}

export async function publishV2Lesson({
  root=ROOT,
  student,
  date,
  intentPath=null,
  intent=null,
  dryRun=false,
  verifyChanges=true
}={}){
  if(verifyChanges===false)throw new Error('Student Platform v2 publication verification cannot be disabled.');
  const normalized=normalizeLessonDate(date);
  const loaded=intent?{file:null,value:intent}:loadPublicationIntent(root,intentPath);
  if(loaded.value?.lessonDate!==normalized.iso){
    throw new Error(
      'Publication intent lessonDate '+String(loaded.value?.lessonDate||'')+
      ' does not match requested lesson date '+normalized.iso+'.'
    );
  }
  const plan=buildV2PublicationPlan({
    root,
    studentId:student,
    intent:loaded.value
  });
  const summary={
    student,
    date:normalized.iso,
    base:normalized.base,
    architecture:'v2',
    mode:'transactional-v2',
    dryRun,
    executable:plan.executable,
    changedFiles:plan.writes.map(item=>item.path),
    reviewItems:plan.reviewItems,
    conflicts:plan.conflicts,
    warnings:plan.warnings,
    ktpChanges:plan.changes.ktp,
    intentFile:loaded.file?path.relative(root,loaded.file).replaceAll('\\','/'):null
  };
  if(dryRun)return summary;
  const transaction=executeV2Publication({
    root,
    plan,
    postflight:({root:transactionRoot,plan:transactionPlan})=>
      verifyV2Production(transactionRoot,student,transactionPlan)
  });
  return {
    ...summary,
    changedFiles:transaction.changedFiles,
    verification:transaction.verification,
    rolledBack:transaction.rolledBack
  };
}

export async function publishLesson({
  root=ROOT,
  student,
  date,
  intentPath=null,
  intent=null,
  dryRun=false,
  verifyChanges=true
}={}){
  if(!student||!date)throw new Error('Student and lesson date are required.');
  requireScaffold(root,student);
  const contractPath=path.join(root,'students',student,'student-contract.json');
  if(fs.existsSync(contractPath)){
    return publishV2Lesson({root,student,date,intentPath,intent,dryRun,verifyChanges});
  }
  return publishLegacyLesson({root,student,date,dryRun,verifyChanges});
}
export function parseArgs(argv){
  const out={student:null,date:null,intentPath:null,dryRun:false,verifyChanges:true,help:false};
  for(let index=0;index<argv.length;index+=1){
    const token=argv[index];
    if(token==='--dry-run')out.dryRun=true;
    else if(token==='--help'||token==='-h')out.help=true;
    else if(token==='--intent'){
      const value=argv[index+1];
      if(!value||value.startsWith('--'))throw new Error('--intent requires a file path');
      out.intentPath=value;index+=1;
    }else if(token.startsWith('--'))throw new Error(`Unknown option: ${token}`);
    else if(!out.student)out.student=token;
    else if(!out.date)out.date=token;
    else throw new Error(`Unexpected argument: ${token}`);
  }
  if(!out.help){
    if(!out.student||!out.date)throw new Error('Usage: node scripts/publish-lesson.mjs <student> <DD.MM.YY|YYYY-MM-DD> [--intent <file>] [--dry-run]');
    validateSlug(out.student);normalizeLessonDate(out.date);
  }
  return out;
}
export function helpText(){return 'Usage: node scripts/publish-lesson.mjs <student> <DD.MM.YY|YYYY-MM-DD> [--intent <file>] [--dry-run]\nStudent Platform v2 students require --intent <file>. Legacy students keep the existing publication workflow. Production verification cannot be disabled from the CLI.\n';}
const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){try{const options=parseArgs(process.argv.slice(2));if(options.help)process.stdout.write(helpText());else process.stdout.write(`${JSON.stringify(await publishLesson(options),null,2)}\n`);}catch(error){process.stderr.write(`publish-lesson: ${error.message}\n`);process.exitCode=1;}}
