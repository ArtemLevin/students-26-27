import {clamp,flattenGroups} from '../student-dashboard/legacy-competence-map.js';

export const PRACTICE_ANALYTICS_METADATA_VERSION=1;

const latestSource=(lessons,id)=>[...(lessons||[])]
  .filter(lesson=>(lesson.outcomes||[]).some(outcome=>outcome?.competencyId===id))
  .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]||null;

function outcomeFor(lesson,id){return lesson?.outcomes?.find(outcome=>outcome?.competencyId===id)||null;}

function providerFor(mapping={}){
  return mapping.generator||mapping.curatedBank||mapping.bank||mapping.provider||null;
}

function coverageFor(mapping,sourceOutcome){
  const disposition=sourceOutcome?.practiceDisposition;
  if(disposition==='manual')return 'manual-assessment';
  if(disposition==='none')return 'excluded-explicitly';
  if(disposition==='ambiguous')return 'ambiguous';
  if(disposition==='competency-gap')return 'missing-competency';
  if(disposition==='coverage-gap')return 'missing-generator';
  if(mapping?.generator)return 'covered-generator';
  if(mapping?.curatedBank||mapping?.bank)return 'covered-curated';
  if(sourceOutcome?.competencyId)return 'missing-practice-mapping';
  return null;
}

export function buildPracticeAnalyticsMetadata({
  studentId,
  groups=[],
  studentLevels={},
  lessons=[],
  config={},
  sourceRevision='',
  generatedAt=()=>new Date().toISOString()
}={}){
  if(typeof studentId!=='string'||!studentId.trim())throw new TypeError('studentId is required');
  const competencies=flattenGroups(groups).map(item=>{
    const source=latestSource(lessons,item.id),outcome=outcomeFor(source,item.id),mapping=config.competencies?.[item.id]||null;
    return {
      competencyId:item.id,
      title:String(item.title||item.id),
      groupTitle:String(item.groupTitle||item.catalog||''),
      masteryLevel:clamp(studentLevels?.[item.id]??item.level??0),
      sourceLessonDate:source?.date||null,
      sourceLessonHref:source?.href||null,
      provider:providerFor(mapping||{}),
      coverageStatus:coverageFor(mapping,outcome)
    };
  });
  return {
    schemaVersion:PRACTICE_ANALYTICS_METADATA_VERSION,
    sourceStudentKey:studentId,
    sourceRevision:String(sourceRevision||''),
    generatedAt:generatedAt(),
    competencies
  };
}
