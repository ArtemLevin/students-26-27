import {replaceLessonRegistrySource} from '../../lessons/lesson-registry.mjs';
import {parseLessonRegistrySource} from '../publication-contract.mjs';

const PRACTICE_ENRICHMENT_FIELDS=[
  'label',
  'level',
  'tone',
  'practiceDisposition',
  'practiceGap',
  'curatedBankKey',
  'bankKey'
];

function coreOutcomeKey(outcome){
  if(
    !outcome||
    typeof outcome.competencyId!=='string'||
    typeof outcome.evidenceAnchor!=='string'||
    typeof outcome.relation!=='string'
  )return null;
  return outcome.competencyId+'#'+outcome.evidenceAnchor+'#'+outcome.relation;
}

function practiceEnrichment(outcome){
  const result={};
  for(const key of PRACTICE_ENRICHMENT_FIELDS){
    if(outcome&&Object.prototype.hasOwnProperty.call(outcome,key)){
      result[key]=structuredClone(outcome[key]);
    }
  }
  return result;
}

export function registryRecordFromMetadata(metadata,{existing=null}={}){
  if(!metadata?.materials?.html)throw new Error('registry builder: metadata.materials.html is required');
  const title=metadata.title;
  const summary=metadata.summary||'';
  const existingByCoreKey=new Map();
  for(const outcome of existing?.outcomes||[]){
    const key=coreOutcomeKey(outcome);
    if(key)existingByCoreKey.set(key,outcome);
  }

  const canonicalOutcomes=metadata.outcomes.map(outcome=>{
    const previous=existingByCoreKey.get(coreOutcomeKey(outcome))||null;
    return {
      ...structuredClone(outcome),
      ...practiceEnrichment(previous)
    };
  });
  const legacyOutcomes=(metadata.legacyOutcomes||[]).map(item=>structuredClone(item));

  return {
    date:metadata.date,
    ktpRefs:[...metadata.ktpRefs],
    href:metadata.materials.html,
    title,
    navTitle:existing?.navTitle||title,
    navSubtitle:existing?.navSubtitle||(summary||'Материалы занятия'),
    summary,
    topics:[...metadata.topics],
    outcomes:[...canonicalOutcomes,...legacyOutcomes],
    materials:structuredClone(metadata.materials)
  };
}

export function deriveRegistrySource({source,metadata}={}){
  if(typeof source!=='string')throw new Error('registry builder: source is required');
  if(!metadata)throw new Error('registry builder: metadata is required');
  const lessons=parseLessonRegistrySource(source);
  const existing=lessons.find(item=>item.date===metadata.date)||null;
  const record=registryRecordFromMetadata(metadata,{existing});
  const nextSource=replaceLessonRegistrySource(source,record);
  return {
    source:nextSource,
    record,
    changed:nextSource!==source
  };
}
