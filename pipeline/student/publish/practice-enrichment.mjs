import {isPracticeDisposition,hasMachineReadableGapWaiver} from '../../../shared/practice/coverage-policy.js';

function fail(message){throw new Error('publication practice: '+message);}
function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
export function outcomeKey(outcome){
  return [outcome?.competencyId,outcome?.evidenceAnchor,outcome?.relation].join('#');
}

/**
 * Pre-publication human-reviewed practice decisions.
 * File: students/STUDENT/site/data/practice-publications/YYYY-MM-DD.json
 * No defaults are inferred: manual / none / generator must be chosen deliberately.
 */
export function parsePracticePublication(source,{studentId,lessonDate,outcomes}={}){
  if(source===null||source===undefined)return [];
  let data;
  try{data=JSON.parse(source);}catch(error){fail('invalid JSON: '+error.message);}
  if(!isRecord(data)||Object.keys(data).some(key=>!['version','studentId','lessonDate','outcomes'].includes(key))){
    fail('expected version, studentId, lessonDate and outcomes');
  }
  if(data.version!==1||data.studentId!==studentId||data.lessonDate!==lessonDate||!Array.isArray(data.outcomes)){
    fail('metadata mismatch or missing outcomes array');
  }
  const allowed=new Set((outcomes||[]).map(outcomeKey)),seen=new Set();
  for(const item of data.outcomes){
    if(!isRecord(item)||Object.keys(item).some(key=>![
      'competencyId','evidenceAnchor','relation','label','practiceDisposition',
      'practiceGap','curatedBankKey','bankKey'
    ].includes(key)))fail('invalid entry fields');
    const key=outcomeKey(item);
    if(!allowed.has(key))fail('outcome '+key+' is absent from canonical lesson evidence');
    if(seen.has(key))fail('duplicate outcome '+key);
    seen.add(key);
    if(typeof item.label!=='string'||!item.label.trim())fail('outcome '+key+' lacks label');
    if(!isPracticeDisposition(item.practiceDisposition)||item.practiceDisposition==='ambiguous'){
      fail('outcome '+key+' needs a reviewable practiceDisposition');
    }
    if(['coverage-gap','competency-gap'].includes(item.practiceDisposition)&&!hasMachineReadableGapWaiver(item)){
      fail('outcome '+key+' requires a machine-readable practiceGap waiver');
    }
    if(item.practiceDisposition==='curated'&&!(item.curatedBankKey||item.bankKey)){
      fail('outcome '+key+' requires curatedBankKey');
    }
  }
  return data.outcomes;
}

/** Fail before writing a new registry entry that the Practice Engine cannot audit. */
export function assertPracticePublicationReady(record,{outcomes}={}){
  const canonical=record?.outcomes?.slice(0,outcomes?.length||0)||[];
  for(const item of canonical){
    const key=outcomeKey(item);
    if(typeof item.label!=='string'||!item.label.trim()){
      fail('outcome '+key+' lacks label; provide reviewed practice-publications sidecar');
    }
    if(!isPracticeDisposition(item.practiceDisposition)||item.practiceDisposition==='ambiguous'){
      fail('outcome '+key+' lacks valid practiceDisposition; provide reviewed practice-publications sidecar');
    }
    if(['coverage-gap','competency-gap'].includes(item.practiceDisposition)&&!hasMachineReadableGapWaiver(item)){
      fail('outcome '+key+' lacks reviewed practiceGap waiver');
    }
    if(item.practiceDisposition==='curated'&&!(item.curatedBankKey||item.bankKey)){
      fail('outcome '+key+' lacks curatedBankKey');
    }
  }
}
