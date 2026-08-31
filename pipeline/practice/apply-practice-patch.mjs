import fs from 'node:fs';
import path from 'node:path';

function scanMatching(source,start,open,close){
  let depth=0,quote=null,escape=false;
  for(let index=start;index<source.length;index+=1){
    const char=source[index];
    if(quote){
      if(escape){escape=false;continue;}
      if(char==='\\'){escape=true;continue;}
      if(char===quote)quote=null;
      continue;
    }
    if(char==='"'||char==="'"||char==='`'){quote=char;continue;}
    if(char===open)depth+=1;
    else if(char===close){depth-=1;if(depth===0)return index;}
  }
  throw new Error(`Unbalanced ${open}${close} expression`);
}

function lessonArrayBounds(source){
  const marker=source.indexOf('export const LESSONS');
  if(marker<0)throw new Error('lesson-registry.js does not export LESSONS');
  const start=source.indexOf('[',marker);
  if(start<0)throw new Error('LESSONS array start not found');
  return {start,end:scanMatching(source,start,'[',']')};
}

function topLevelObjects(source,start,end){
  const entries=[];let depth=0,entryStart=-1,quote=null,escape=false;
  for(let index=start+1;index<end;index+=1){
    const char=source[index];
    if(quote){
      if(escape){escape=false;continue;}
      if(char==='\\'){escape=true;continue;}
      if(char===quote)quote=null;
      continue;
    }
    if(char==='"'||char==="'"||char==='`'){quote=char;continue;}
    if(char==='{'){if(depth===0)entryStart=index;depth+=1;continue;}
    if(char==='}'){depth-=1;if(depth===0&&entryStart>=0){const text=source.slice(entryStart,index+1),date=text.match(/(?:\bdate\b|"date")\s*:\s*["'](\d{4}-\d{2}-\d{2})["']/)?.[1]||null;entries.push({start:entryStart,end:index+1,date,text});entryStart=-1;}}
  }
  return entries;
}

function serializeLesson(lesson){return JSON.stringify(lesson,null,2);}

export function replaceLessonRegistrySource(source,lesson){
  const bounds=lessonArrayBounds(source),entries=topLevelObjects(source,bounds.start,bounds.end),serialized=serializeLesson(lesson);
  const existing=entries.find(entry=>entry.date===lesson.date);
  if(existing)return source.slice(0,existing.start)+serialized+source.slice(existing.end);
  const before=entries.find(entry=>entry.date&&entry.date<lesson.date);
  if(before)return source.slice(0,before.start)+serialized+',\n'+source.slice(before.start);
  let bodyEnd=bounds.end;
  while(bodyEnd>bounds.start+1&&/\s/.test(source[bodyEnd-1]))bodyEnd-=1;
  const body=source.slice(bounds.start+1,bodyEnd).trim();
  const insertion=body?`,\n${serialized}`:`\n${serialized}`;
  return source.slice(0,bodyEnd)+insertion+source.slice(bodyEnd);
}

export function replacePracticeConfigSource(source,mappings=[]){
  if(!mappings.length)return source;
  const match=/\bcompetencies\s*:\s*\{/.exec(source);
  if(!match)throw new Error('practice-config.js competencies object not found');
  const open=source.indexOf('{',match.index),close=scanMatching(source,open,'{','}');
  const body=source.slice(open+1,close);
  for(const {competencyId} of mappings){
    const escaped=competencyId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(new RegExp(`(?:^|[,\\n]\\s*)(?:${escaped}|["']${escaped}["'])\\s*:`,'m').test(body))throw new Error(`Refusing to duplicate practice mapping ${competencyId}`);
  }
  const lines=mappings.map(({competencyId,mapping})=>`    ${JSON.stringify(competencyId)}:${JSON.stringify(mapping)},`).join('\n');
  return source.slice(0,open+1)+`\n${lines}`+source.slice(open+1);
}

function writeAtomic(filePath,content){
  const temp=`${filePath}.stage04-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function applyPracticePatch(patch,contracts,{dryRun=false}={}){
  if(patch.status==='blocked')throw new Error(`Stage 04 patch is blocked: ${patch.blocks.join('; ')}`);
  let lessonSource=contracts.sources.lessonRegistry,practiceSource=contracts.sources.practiceConfig;
  for(const operation of patch.operations){
    if(operation.type==='upsert-lesson')lessonSource=replaceLessonRegistrySource(lessonSource,operation.lesson);
    else if(operation.type==='add-practice-mappings')practiceSource=replacePracticeConfigSource(practiceSource,operation.mappings);
    else throw new Error(`Unknown Stage 04 operation: ${operation.type}`);
  }
  const changedFiles=[];
  if(lessonSource!==contracts.sources.lessonRegistry)changedFiles.push(path.relative(contracts.root,contracts.paths.lessonRegistryPath));
  if(practiceSource!==contracts.sources.practiceConfig)changedFiles.push(path.relative(contracts.root,contracts.paths.practiceConfigPath));
  if(!dryRun){
    if(lessonSource!==contracts.sources.lessonRegistry)writeAtomic(contracts.paths.lessonRegistryPath,lessonSource);
    if(practiceSource!==contracts.sources.practiceConfig)writeAtomic(contracts.paths.practiceConfigPath,practiceSource);
  }
  return {changedFiles,sources:{lessonRegistry:lessonSource,practiceConfig:practiceSource}};
}
