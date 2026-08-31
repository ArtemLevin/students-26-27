function autoOutcomeMetadata(outcome){
  const metadata={practiceDisposition:outcome.practiceDisposition};
  if(outcome.confidence==='exact'&&outcome.competencyId)metadata.competencyId=outcome.competencyId;
  if(outcome.confidence==='exact'&&outcome.practiceDisposition==='curated'&&outcome.bankKey)metadata.curatedBankKey=outcome.bankKey;
  return metadata;
}

function buildNewLesson(result,artifact){
  const lesson=result.lesson||{},topics=lesson.topics?.length?lesson.topics:result.outcomes.map(item=>item.label);
  return {
    date:result.lessonDate,
    href:result.lessonHref||artifact.href,
    title:lesson.title||artifact.title,
    navTitle:lesson.navTitle||lesson.title||artifact.title,
    navSubtitle:lesson.navSubtitle||lesson.summary||artifact.summary||'Материалы занятия',
    summary:lesson.summary||artifact.summary||'',
    topics,
    outcomes:result.outcomes.map(outcome=>({
      label:outcome.label,
      ...(outcome.level!==undefined?{level:outcome.level}:{}),
      ...(outcome.tone?{tone:outcome.tone}:{}),
      ...autoOutcomeMetadata(outcome)
    })),
    materials:{...artifact.materials,...(lesson.materials||{})}
  };
}

function updateExistingLesson(existing,result){
  const analysisByLabel=new Map(result.outcomes.map(item=>[item.label,item]));
  const outcomes=(existing.outcomes||[]).map(outcome=>{
    const analysis=analysisByLabel.get(outcome.label);
    return analysis?{...outcome,...autoOutcomeMetadata(analysis)}:outcome;
  });
  return {...existing,outcomes};
}

function sameMapping(existing,next){
  return existing?.generator===next.generator&&JSON.stringify(existing?.difficulty||[])===JSON.stringify(next.difficulty||[]);
}

export function buildPracticePatch(validation,contracts){
  const {result,existingLesson,blocks,hasGaps}=validation;
  if(blocks.length)return {status:'blocked',changed:false,blocks,gaps:result.gaps,warnings:result.warnings,operations:[]};

  const lesson=existingLesson?updateExistingLesson(existingLesson,result):buildNewLesson(result,contracts.artifact);
  const lessonChanged=JSON.stringify(existingLesson||null)!==JSON.stringify(lesson);
  const mappings=[];
  for(const outcome of result.outcomes){
    if(outcome.practiceDisposition!=='generator'||outcome.confidence!=='exact'||!outcome.competencyId)continue;
    const existing=contracts.PRACTICE_CONFIG.competencies?.[outcome.competencyId];
    const mapping={
      generator:outcome.generatorKey,
      difficulty:[...outcome.difficulty],
      activation:'lesson',
      group:`${outcome.generatorKey.split('.').slice(0,2).join('-')}`
    };
    if(!existing)mappings.push({competencyId:outcome.competencyId,mapping});
    else if(!sameMapping(existing,mapping))throw new Error(`${outcome.competencyId}: incompatible existing mapping escaped validation`);
  }

  const operations=[];
  if(lessonChanged)operations.push({type:'upsert-lesson',lesson});
  if(mappings.length)operations.push({type:'add-practice-mappings',mappings});
  const changed=operations.length>0;
  return {
    status:hasGaps?'gaps':changed?'ready':'noop',
    changed,blocks:[],gaps:result.gaps,warnings:result.warnings,lesson,mappings,operations
  };
}
