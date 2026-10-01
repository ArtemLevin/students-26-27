export function buildLessonMetadata({studentId,artifact,intent}={}){
  if(!studentId)throw new Error('lesson metadata builder: studentId is required');
  if(!artifact)throw new Error('lesson metadata builder: artifact is required');
  if(!intent)throw new Error('lesson metadata builder: intent is required');
  if(intent.studentId!==studentId)throw new Error('lesson metadata builder: intent studentId mismatch');
  if(intent.lessonDate!==artifact.date)throw new Error('lesson metadata builder: intent date does not match artifact date');

  const appliedMatches=intent.ktpMatches.filter(item=>item.decision==='apply');
  const appliedOutcomes=intent.outcomes.filter(item=>item.decision==='apply');

  return {
    version:1,
    studentId,
    date:artifact.date,
    title:artifact.title,
    summary:artifact.summary||intent.actualSummary||'',
    topics:[...intent.topics],
    ktpRefs:appliedMatches.map(item=>item.ktpId),
    ktpCoverage:appliedMatches.map(item=>({
      ktpId:item.ktpId,
      coverage:item.coverage
    })),
    outcomes:appliedOutcomes.map(item=>({
      competencyId:item.competencyId,
      evidenceAnchor:item.evidenceAnchor,
      relation:item.relation,
      masteryClaim:item.masteryClaim===null?null:structuredClone(item.masteryClaim)
    })),
    materials:structuredClone(artifact.materials)
  };
}

export function publicationContribution(metadata){
  return {
    ktpCoverage:structuredClone(metadata.ktpCoverage||[]),
    outcomes:structuredClone(metadata.outcomes||[])
  };
}

function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  }
  return value;
}
export function samePublicationContribution(left,right){
  return JSON.stringify(stable(publicationContribution(left)))===
    JSON.stringify(stable(publicationContribution(right)));
}
