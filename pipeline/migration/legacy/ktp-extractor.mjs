import crypto from 'node:crypto';
import {isCalendarDate,validateKtpPlanData} from '../../student/contract.mjs';

const STAGE_ID=/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

function fail(message){
  throw new Error('legacy KTP: '+message);
}
function text(value,label){
  if(typeof value!=='string'||!value.trim())fail(label+' is missing');
  return value.trim();
}
function extractLessonsLiteral(source){
  const match=/\bconst\s+LESSONS\s*=\s*/.exec(source);
  if(!match)fail('const LESSONS array was not found');
  const start=match.index+match[0].length;
  if(source[start]!=='[')fail('LESSONS must start with an array literal');

  let depth=0,quote=null,escaped=false;
  for(let index=start;index<source.length;index+=1){
    const char=source[index];
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
      if(depth===0)return source.slice(start,index+1);
    }
  }
  fail('LESSONS array is unterminated');
}
function parseLessons(source){
  const literal=extractLessonsLiteral(source);
  let lessons;
  try{lessons=JSON.parse(literal);}
  catch(error){fail('LESSONS is not strict JSON: '+error.message);}
  if(!Array.isArray(lessons)||!lessons.length)fail('LESSONS must be a non-empty array');
  return lessons;
}
function programVersion(source){
  const hash=crypto.createHash('sha256').update(source).digest('hex').slice(0,12);
  return 'legacy-fixed-'+hash;
}
function stageIdFor(row,stageName,stageIds){
  if(typeof row.stageId==='string'&&STAGE_ID.test(row.stageId))return row.stageId;
  if(!stageIds.has(stageName)){
    stageIds.set(stageName,'legacy-stage-'+String(stageIds.size+1).padStart(2,'0'));
  }
  return stageIds.get(stageName);
}

export function extractLegacyKtp({
  studentId,
  source,
  sourcePath='site/ktp.html'
}={}){
  if(!studentId)fail('studentId is required');
  if(typeof source!=='string')fail('source is required');

  const rows=parseLessons(source);
  const aliases=[],warnings=[];
  const stageIds=new Map();
  const lessons=rows.map((row,index)=>{
    if(!row||typeof row!=='object'||Array.isArray(row)){
      fail('row '+(index+1)+' must be an object');
    }
    const order=index+1;
    const id='ktp-'+String(order).padStart(3,'0');
    const plannedDate=text(row.date,'row '+order+' date');
    if(!isCalendarDate(plannedDate))fail('row '+order+' date is not a valid YYYY-MM-DD date');

    const stage=text(row.stage,'row '+order+' stage');
    const block=text(row.block,'row '+order+' block');
    const topic=text(row.topic,'row '+order+' topic');
    const content=text(row.content,'row '+order+' content');
    const homework=text(row.homework,'row '+order+' homework');

    let resultSource='result',result=row.result;
    if(typeof result!=='string'||!result.trim()){
      if(typeof row.outcome==='string'&&row.outcome.trim()){
        result=row.outcome;resultSource='outcome';
      }else if(typeof row.check==='string'&&row.check.trim()){
        result=row.check;resultSource='check';
      }else{
        fail('row '+order+' has no result/outcome/check text');
      }
    }

    let checkSource='check',check=row.check;
    if(typeof check!=='string'||!check.trim()){
      if(typeof row.outcome==='string'&&row.outcome.trim()){
        check=row.outcome;checkSource='outcome';
      }else if(typeof row.result==='string'&&row.result.trim()){
        check=row.result;checkSource='result';
      }else{
        fail('row '+order+' has no check/outcome/result text');
      }
    }

    if(resultSource!=='result'){
      aliases.push({ktpId:id,source:resultSource,target:'result'});
    }
    if(checkSource!=='check'){
      aliases.push({ktpId:id,source:checkSource,target:'check'});
    }
    if(Number.isInteger(row.n)&&row.n!==order){
      warnings.push({
        type:'source-order-number-mismatch',
        ktpId:id,
        sourceNumber:row.n,
        preservedOrder:order
      });
    }

    return {
      id,
      order,
      plannedDate,
      stageId:stageIdFor(row,stage,stageIds),
      stage,
      block,
      topic,
      content,
      result:text(result,'row '+order+' result'),
      check:text(check,'row '+order+' check'),
      homework,
      targetCompetencies:[]
    };
  });

  const plan={
    version:1,
    studentId,
    programVersion:programVersion(source),
    lessons
  };
  validateKtpPlanData(plan,{studentId});

  return {
    sourcePath,
    sourceRows:rows.length,
    programVersion:plan.programVersion,
    plan,
    fieldAliases:aliases,
    warnings
  };
}
