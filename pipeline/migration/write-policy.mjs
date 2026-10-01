import path from 'node:path';
import {isCalendarDate} from '../student/contract.mjs';

const STUDENT_ID_RE=/^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const LESSON_METADATA_RE=/^students\/([^/]+)\/site\/data\/lessons\/(\d{4}-\d{2}-\d{2})\.lesson\.json$/;

function fail(message){throw new Error('migration write policy: '+message);}
function assertCanonicalPath(value){
  if(typeof value!=='string'||!value)fail('write path must be a non-empty string');
  if(value.includes('\\'))fail('backslashes are forbidden: '+value);
  if(path.posix.isAbsolute(value))fail('absolute paths are forbidden: '+value);
  if(path.posix.normalize(value)!==value)fail('non-canonical path is forbidden: '+value);
  if(value.split('/').some(part=>!part||part==='.'||part==='..')){
    fail('unsafe path segments are forbidden: '+value);
  }
}
function allowedPath(studentId,value){
  const student='students/'+studentId;
  if(value===student+'/student-contract.json')return true;
  if(value===student+'/site/lesson-registry.js')return true;
  if(value===student+'/site/tests/student-platform-v2.test.mjs')return true;
  if([
    student+'/site/data/ktp-plan.json',
    student+'/site/data/ktp-state.json',
    student+'/site/data/competency-catalog.json',
    student+'/site/data/mastery-state.json',
    student+'/site/data/lessons/.gitkeep'
  ].includes(value))return true;
  if(value==='pipeline/migration/baseline.json')return true;
  if(value==='pipeline/migration/reports/'+studentId+'.json')return true;
  const metadata=value.match(LESSON_METADATA_RE);
  return !!metadata&&metadata[1]===studentId&&isCalendarDate(metadata[2]);
}

export function assertMigrationWriteSet({
  studentId,
  writes
}={}){
  if(typeof studentId!=='string'||!STUDENT_ID_RE.test(studentId)){
    fail('studentId is invalid');
  }
  if(!Array.isArray(writes))fail('writes must be an array');
  const seen=new Set();
  for(const [index,entry] of writes.entries()){
    if(!entry||typeof entry!=='object'||Array.isArray(entry)){
      fail('write['+index+'] must be an object');
    }
    if(!['create','update'].includes(entry.kind)){
      fail('write['+index+'] has unsupported kind '+String(entry.kind));
    }
    assertCanonicalPath(entry.path);
    if(seen.has(entry.path))fail('duplicate write path: '+entry.path);
    seen.add(entry.path);
    if(!allowedPath(studentId,entry.path)){
      fail('write target is outside the migration allowlist: '+entry.path);
    }
  }
  return {
    studentId,
    count:writes.length,
    paths:[...seen].sort((a,b)=>a.localeCompare(b,'en'))
  };
}
