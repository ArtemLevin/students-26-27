export function buildMasteryPatch(validation,contracts){
  const {result,blocks:validationBlocks}=validation;
  if(validationBlocks.length)return {status:'blocked',changed:false,blocks:[...validationBlocks],warnings:[],operations:[],levels:{}};
  if(!contracts?.mastery)throw new Error(`${contracts?.studentId||'student'}: mastery contract is missing`);

  const levels={},warnings=[],blocks=[];
  for(const outcome of result.outcomes){
    if(outcome.level===undefined)continue;
    if(!outcome.competencyId){
      warnings.push(`${outcome.label}: mastery level skipped because competencyId is missing`);
      continue;
    }
    if(outcome.confidence!=='exact'){
      warnings.push(`${outcome.label}: mastery level skipped because confidence is ${outcome.confidence}`);
      continue;
    }
    const previous=levels[outcome.competencyId];
    if(previous!==undefined&&previous!==outcome.level){
      blocks.push(`${outcome.competencyId}: conflicting mastery levels ${previous} and ${outcome.level} in one Stage 04 result`);
      continue;
    }
    levels[outcome.competencyId]=outcome.level;
  }

  if(blocks.length)return {status:'blocked',changed:false,blocks,warnings,operations:[],levels:{}};
  const changedLevels=Object.fromEntries(Object.entries(levels).filter(([id,level])=>contracts.mastery.levels[id]!==level));
  const changed=Object.keys(changedLevels).length>0;
  return {
    status:changed?'ready':'noop',changed,blocks:[],warnings,levels:changedLevels,
    operations:changed?[{type:'set-mastery-levels',levels:changedLevels}]:[]
  };
}
