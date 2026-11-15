// Deterministic KTP view model. No DOM, storage or network dependencies.
export function normalizeSearch(value){
 return String(value??'').normalize('NFKC').toLocaleLowerCase('ru')
  .replaceAll('ё','е').replace(/№\s*(\d+)/g,'№$1')
  .replace(/\s+/g,' ').trim();
}
export function lessonStatus(lesson,records={}){
 return records?.[lesson.id]?.status||'planned';
}
export function scheduledDate(lesson,records={}){
 return records?.[lesson.id]?.scheduledDate||lesson.plannedDate;
}
export function completionDate(lesson,records={}){
 return records?.[lesson.id]?.actualDate||scheduledDate(lesson,records);
}
export function matchesLesson(lesson,records,filters={}){
 const {query='',stageId='all',status='all'}=filters;
 if(stageId!=='all'&&lesson.stageId!==stageId)return false;
 if(status!=='all'&&lessonStatus(lesson,records)!==status)return false;
 const needle=normalizeSearch(query);
 if(!needle)return true;
 return normalizeSearch([
  lesson.topic,lesson.block,lesson.stage,lesson.content,lesson.result,
  lesson.check,lesson.homework,lesson.id,...(lesson.targetCompetencies||[])
 ].join(' ')).includes(needle);
}
export function selectTimeline(lessons,records={},today){
 const byScheduled=(a,b)=>scheduledDate(a,records).localeCompare(scheduledDate(b,records));
 const todayLesson=lessons.find(l=>scheduledDate(l,records)===today&&lessonStatus(l,records)!=='skipped')||null;
 const next=lessons.filter(l=>scheduledDate(l,records)>today&&!['done','skipped'].includes(lessonStatus(l,records)))
  .sort(byScheduled)[0]||null;
 const lastDone=lessons.filter(l=>lessonStatus(l,records)==='done')
  .sort((a,b)=>completionDate(b,records).localeCompare(completionDate(a,records)))[0]||null;
 return {todayLesson,next,lastDone};
}
