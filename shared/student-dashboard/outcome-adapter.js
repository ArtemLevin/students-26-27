const LEGACY_TONES=new Set(['good','process','alert']);
const CANONICAL_RELATIONS=new Set(['touched','practiced','assessed']);
const COMPETENCY_ID=/^[A-Za-z0-9_.:-]+$/;
const ANCHOR_ID=/^[A-Za-z][A-Za-z0-9_-]*$/;

function fail(message){throw new Error('lesson outcome: '+message);}
function isFiniteLevel(value){return Number.isFinite(Number(value));}
function cleanLabel(value){return typeof value==='string'&&value.trim()?value.trim():null;}

export function outcomeSchema(outcome){
  if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return null;
  if(cleanLabel(outcome.label)&&isFiniteLevel(outcome.level))return 'legacy';
  if(
    typeof outcome.competencyId==='string'&&COMPETENCY_ID.test(outcome.competencyId)&&
    typeof outcome.evidenceAnchor==='string'&&ANCHOR_ID.test(outcome.evidenceAnchor)&&
    CANONICAL_RELATIONS.has(outcome.relation)
  )return 'v2';
  return null;
}

export function assertCompatibleOutcome(outcome,{lessonDate='unknown'}={}){
  const schema=outcomeSchema(outcome);
  if(!schema)fail('invalid legacy/v2 outcome in lesson '+lessonDate);
  if(schema==='legacy'&&outcome.competencyId!==undefined){
    if(typeof outcome.competencyId!=='string'||!COMPETENCY_ID.test(outcome.competencyId)){
      fail('invalid competencyId in lesson '+lessonDate);
    }
  }
  return schema;
}

function legacyPresentation(outcome){
  const tone=LEGACY_TONES.has(outcome.tone)?outcome.tone:'process';
  return {
    schema:'legacy',
    competencyId:typeof outcome.competencyId==='string'?outcome.competencyId:null,
    label:cleanLabel(outcome.label),
    tone,
    mark:tone==='good'?'✓':tone==='alert'?'!':'◐',
    detail:String(outcome.level)+'/4'
  };
}

const RELATION_PRESENTATION=Object.freeze({
  touched:Object.freeze({detail:'затронуто',mark:'•'}),
  practiced:Object.freeze({detail:'практика',mark:'↻'}),
  assessed:Object.freeze({detail:'проверено',mark:'◇'})
});

export function presentLessonOutcome(outcome,{resolveCompetencyLabel=null,lessonDate='unknown'}={}){
  const schema=assertCompatibleOutcome(outcome,{lessonDate});
  if(schema==='legacy')return legacyPresentation(outcome);

  let resolved=null;
  if(typeof resolveCompetencyLabel==='function'){
    const candidate=resolveCompetencyLabel(outcome.competencyId);
    resolved=cleanLabel(candidate);
  }
  const relation=RELATION_PRESENTATION[outcome.relation];
  return {
    schema:'v2',
    competencyId:outcome.competencyId,
    label:resolved||outcome.competencyId,
    tone:'process',
    mark:relation.mark,
    detail:relation.detail
  };
}
