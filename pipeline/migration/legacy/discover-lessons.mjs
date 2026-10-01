import fs from 'node:fs';
import path from 'node:path';
import {isCalendarDate} from '../../student/contract.mjs';
import {parseLessonRegistrySource} from '../../student/publication-contract.mjs';

const DATE_HTML=/^(\d{2})[.-](\d{2})[.-](\d{2})\.html$/;

function fail(message){throw new Error('historical lesson discovery: '+message);}
function lessonIsoFromFilename(name){
  const match=String(name).match(DATE_HTML);
  if(!match)return null;
  const day=Number(match[1]),month=Number(match[2]),year=2000+Number(match[3]);
  const iso=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  return isCalendarDate(iso)?iso:null;
}
function inside(base,target){
  const resolvedBase=path.resolve(base),resolvedTarget=path.resolve(target);
  return resolvedTarget===resolvedBase||resolvedTarget.startsWith(resolvedBase+path.sep);
}
function normalizeRegistryHref(site,href,{studentId,date}={}){
  if(typeof href!=='string'||!href.trim())fail(studentId+' '+date+': registry href is missing');
  const clean=href.split(/[?#]/,1)[0];
  if(
    !clean||
    /^[a-z][a-z0-9+.-]*:/i.test(clean)||
    clean.startsWith('//')||
    clean.startsWith('/')||
    clean.includes('\\')
  ){
    fail(studentId+' '+date+': registry href must be a local site-relative path: '+href);
  }
  const segments=clean.split('/');
  if(segments.some(segment=>!segment||segment==='.'||segment==='..')){
    fail(studentId+' '+date+': registry href contains unsafe path segments: '+href);
  }
  const normalized=path.posix.normalize(clean);
  if(normalized!==clean)fail(studentId+' '+date+': registry href is not canonical: '+href);
  const target=path.resolve(site,...clean.split('/'));
  if(!inside(site,target))fail(studentId+' '+date+': registry href escapes site root: '+href);
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){
    fail(studentId+' '+date+': registry href target is missing: '+href);
  }
  const siteReal=fs.realpathSync(site),targetReal=fs.realpathSync(target);
  if(!inside(siteReal,targetReal)){
    fail(studentId+' '+date+': registry href resolves outside site root: '+href);
  }
  return {href:clean,absolutePath:target};
}
function walkDatedHtml(site,directory,out){
  const stat=fs.lstatSync(directory);
  if(stat.isSymbolicLink())fail('symlink is not supported under site: '+path.relative(site,directory).replaceAll('\\','/'));
  if(!stat.isDirectory())fail('expected directory under site: '+path.relative(site,directory).replaceAll('\\','/'));
  for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const target=path.join(directory,entry.name);
    const item=fs.lstatSync(target);
    const relative=path.relative(site,target).replaceAll('\\','/');
    if(item.isSymbolicLink())fail('symlink is not supported under site: '+relative);
    if(item.isDirectory()){
      walkDatedHtml(site,target,out);
      continue;
    }
    if(!item.isFile())continue;
    if(/-lab\.html$/i.test(entry.name))continue;
    const date=lessonIsoFromFilename(entry.name);
    if(!date)continue;
    out.push({date,href:relative,absolutePath:target,registryRecord:null,sources:['filesystem']});
  }
}
function loadRegistry(site,studentId){
  const file=path.join(site,'lesson-registry.js');
  if(!fs.existsSync(file))return [];
  if(!fs.statSync(file).isFile())fail(studentId+': lesson-registry.js is not a file');
  try{
    return parseLessonRegistrySource(fs.readFileSync(file,'utf8'),{
      label:'legacy lesson registry'
    });
  }catch(error){
    fail(studentId+': lesson registry is unreadable: '+error.message);
  }
}
function addByDate(byDate,lesson){
  const existing=byDate.get(lesson.date);
  if(existing&&existing.href!==lesson.href){
    fail(
      lesson.date+': multiple historical lesson HTML files: '+
      existing.href+' and '+lesson.href
    );
  }
  if(!existing){
    byDate.set(lesson.date,lesson);
    return;
  }
  existing.registryRecord=lesson.registryRecord||existing.registryRecord;
  existing.sources=[...new Set([...existing.sources,...lesson.sources])].sort();
}

export function discoverHistoricalLessons({
  root=process.cwd(),
  studentId
}={}){
  if(!studentId)fail('studentId is required');
  const studentRoot=path.join(root,'students',studentId);
  const site=path.join(studentRoot,'site');
  if(!fs.existsSync(site)||!fs.statSync(site).isDirectory()){
    fail(studentId+': site directory does not exist');
  }

  const byDate=new Map();
  const filesystemLessons=[];
  walkDatedHtml(site,site,filesystemLessons);
  for(const lesson of filesystemLessons)addByDate(byDate,lesson);

  for(const record of loadRegistry(site,studentId)){
    if(!record||typeof record.date!=='string'||!isCalendarDate(record.date)){
      fail(studentId+': registry contains invalid lesson date');
    }
    const resolved=normalizeRegistryHref(site,record.href,{
      studentId,
      date:record.date
    });
    const filenameDate=lessonIsoFromFilename(path.basename(resolved.href));
    if(filenameDate&&filenameDate!==record.date){
      fail(
        studentId+' '+record.date+': registry href date mismatch: '+
        resolved.href+' resolves to '+filenameDate
      );
    }
    addByDate(byDate,{
      date:record.date,
      href:resolved.href,
      absolutePath:resolved.absolutePath,
      registryRecord:record,
      sources:['registry']
    });
  }

  const lessons=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const diagnostics=lessons
    .filter(item=>!item.registryRecord)
    .map(item=>({
      type:'unregistered-lesson',
      date:item.date,
      href:item.href
    }));

  return {
    studentId,
    lessons,
    byDate:new Map(lessons.map(item=>[item.date,item])),
    diagnostics
  };
}
