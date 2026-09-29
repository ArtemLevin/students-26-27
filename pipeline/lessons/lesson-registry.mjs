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
    if(char==='}'){
      depth-=1;
      if(depth===0&&entryStart>=0){
        const text=source.slice(entryStart,index+1);
        const date=text.match(/(?:\bdate\b|"date")\s*:\s*["'](\d{4}-\d{2}-\d{2})["']/)?.[1]||null;
        entries.push({start:entryStart,end:index+1,date,text});
        entryStart=-1;
      }
    }
  }
  return entries;
}

function serializeLesson(lesson){return JSON.stringify(lesson,null,2);}

export function replaceLessonRegistrySource(source,lesson){
  if(!lesson||typeof lesson!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(lesson.date||''))throw new Error('Lesson registry upsert requires an ISO lesson.date');
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
