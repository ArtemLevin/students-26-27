import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isCalendarDate} from './discover-student-contracts.mjs';

export const DISPOSITIONS=new Set(['generator','curated','manual','none','coverage-gap','competency-gap','ambiguous']);
export const CONFIDENCE=new Set(['exact','high','medium','low','unknown']);
const SCHEMA_PATH=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../schemas/spaced-practice-stage-v1.schema.json');

export class Stage04ValidationError extends Error{
  constructor(message,{exitCode=3,details=[]}={}){super(message);this.name='Stage04ValidationError';this.exitCode=exitCode;this.details=details;}
}

export function loadStageSchema(schemaPath=SCHEMA_PATH){
  const schema=JSON.parse(fs.readFileSync(schemaPath,'utf8'));
  if(schema?.properties?.schemaVersion?.const!==1)throw new Error('Stage 04 schemaVersion contract is invalid');
  const enumValues=schema?.properties?.outcomes?.items?.properties?.practiceDisposition?.enum||[];
  for(const value of DISPOSITIONS)if(!enumValues.includes(value))throw new Error(`Stage 04 schema misses disposition ${value}`);
  return schema;
}

function strings(value){return Array.isArray(value)&&value.every(item=>typeof item==='string');}
function validDifficulty(value){return Array.isArray(value)&&value.length>0&&new Set(value).size===value.length&&value.every(item=>Number.isInteger(item)&&item>=1&&item<=3);}
function own(object,key){return Object.prototype.hasOwnProperty.call(object,key);}

export function validateStageResult(input,contracts,{expectedStudentId=contracts?.studentId,expectedLessonDate=contracts?.lessonDate}={}){
  loadStageSchema();
  const errors=[],blocks=[],normalized=structuredClone(input||{});
  if(!normalized||typeof normalized!=='object'||Array.isArray(normalized))errors.push('result must be an object');
  if(normalized.schemaVersion!==1)errors.push('schemaVersion must equal 1');
  if(!/^[a-z0-9_]+$/.test(normalized.studentId||''))errors.push('studentId is invalid');
  if(expectedStudentId&&normalized.studentId!==expectedStudentId)errors.push(`studentId mismatch: expected ${expectedStudentId}`);
  if(!isCalendarDate(normalized.lessonDate))errors.push('lessonDate must be a valid calendar date YYYY-MM-DD');
  if(expectedLessonDate&&normalized.lessonDate!==expectedLessonDate)errors.push(`lessonDate mismatch: expected ${expectedLessonDate}`);
  if(typeof normalized.lessonHref!=='string'||!normalized.lessonHref.trim())errors.push('lessonHref is required');
  if(!Array.isArray(normalized.outcomes)||!normalized.outcomes.length)errors.push('outcomes must be a non-empty array');
  if(!strings(normalized.gaps))errors.push('gaps must be an array of strings');
  if(!strings(normalized.warnings))errors.push('warnings must be an array of strings');
  if(normalized.lesson!==undefined&&(!normalized.lesson||typeof normalized.lesson!=='object'||Array.isArray(normalized.lesson)))errors.push('lesson must be an object when present');

  const existingLesson=contracts?.LESSONS?.find(lesson=>lesson.date===normalized.lessonDate)||null;
  const seenLabels=new Set();
  for(const [index,outcome] of (normalized.outcomes||[]).entries()){
    const prefix=`outcomes[${index}]`;
    if(!outcome||typeof outcome!=='object'||Array.isArray(outcome)){errors.push(`${prefix} must be an object`);continue;}
    if(typeof outcome.label!=='string'||!outcome.label.trim())errors.push(`${prefix}.label is required`);
    else if(seenLabels.has(outcome.label.trim()))errors.push(`${prefix}.label duplicates ${outcome.label.trim()}`);
    else seenLabels.add(outcome.label.trim());
    if(!DISPOSITIONS.has(outcome.practiceDisposition))errors.push(`${prefix}.practiceDisposition is invalid`);
    if(!CONFIDENCE.has(outcome.confidence))errors.push(`${prefix}.confidence is invalid`);
    if(!strings(outcome.evidence))errors.push(`${prefix}.evidence must be an array of strings`);
    if(typeof outcome.reason!=='string')errors.push(`${prefix}.reason must be a string`);
    if(outcome.level!==undefined&&(!Number.isInteger(outcome.level)||outcome.level<0||outcome.level>4))errors.push(`${prefix}.level is invalid`);

    const id=outcome.competencyId;
    if(id&&contracts&&!contracts.competencyIds.has(id))errors.push(`${prefix}: unknown competencyId ${id}`);
    if(['generator','curated'].includes(outcome.practiceDisposition)&&!id)errors.push(`${prefix}: competencyId is required for ${outcome.practiceDisposition}`);
    if(outcome.practiceDisposition==='competency-gap'&&id)errors.push(`${prefix}: competency-gap must not invent competencyId`);

    if(outcome.practiceDisposition==='generator'){
      if(typeof outcome.generatorKey!=='string'||!outcome.generatorKey)errors.push(`${prefix}: generatorKey is required`);
      else if(contracts&&!contracts.generatorRegistry.has(outcome.generatorKey))errors.push(`${prefix}: unknown generator ${outcome.generatorKey}`);
      else if(contracts&&id&&!contracts.generatorRegistry.get(outcome.generatorKey).competencyIds.includes(id))errors.push(`${prefix}: generator ${outcome.generatorKey} does not declare ${id}`);
      const existing=id?contracts?.PRACTICE_CONFIG?.competencies?.[id]:null;
      const difficulty=outcome.difficulty??existing?.difficulty??[1,2];
      if(!validDifficulty(difficulty))errors.push(`${prefix}: difficulty must contain unique integers 1..3`);else outcome.difficulty=[...difficulty];
      if(existing&&outcome.generatorKey&&existing.generator!==outcome.generatorKey)blocks.push(`${id}: existing generator ${existing.generator} cannot be replaced by ${outcome.generatorKey}`);
      if(outcome.confidence!=='exact')blocks.push(`${outcome.label}: generator mapping confidence is ${outcome.confidence}, exact is required for auto-apply`);
    }

    if(outcome.practiceDisposition==='curated'){
      if(typeof outcome.bankKey!=='string'||!outcome.bankKey)errors.push(`${prefix}: bankKey is required for curated disposition`);
      else if(contracts&&!contracts.curatedBanks.has(outcome.bankKey))errors.push(`${prefix}: unknown curated bank ${outcome.bankKey}`);
      else if(contracts&&id&&!contracts.curatedBanks.get(outcome.bankKey).competencyIds.includes(id))errors.push(`${prefix}: curated bank ${outcome.bankKey} does not declare ${id}`);
      if(outcome.confidence!=='exact')blocks.push(`${outcome.label}: curated mapping confidence is ${outcome.confidence}, exact is required for auto-apply`);
    }

    if(outcome.practiceDisposition==='ambiguous')blocks.push(`${outcome.label}: mapping is ambiguous`);
    if(['coverage-gap','competency-gap'].includes(outcome.practiceDisposition)&&!normalized.gaps.includes(outcome.label))normalized.gaps.push(outcome.label);

    if(existingLesson){
      const match=(existingLesson.outcomes||[]).find(item=>item.label===outcome.label);
      if(!match)blocks.push(`${outcome.label}: outcome is absent from existing lesson metadata`);
      else if(match.competencyId&&id&&match.competencyId!==id)blocks.push(`${outcome.label}: existing competencyId ${match.competencyId} cannot be replaced by ${id}`);
    }
  }

  if(errors.length)throw new Stage04ValidationError('Stage 04 structural validation failed',{exitCode:3,details:errors});
  return {result:normalized,existingLesson,blocks:[...new Set(blocks)],hasGaps:normalized.gaps.length>0};
}

export function stageExitCode(validation){
  if(validation.blocks.some(item=>item.includes('ambiguous'))||validation.result.outcomes.some(item=>item.practiceDisposition==='ambiguous'))return 4;
  if(validation.blocks.length)return 4;
  if(validation.hasGaps)return 2;
  return 0;
}
