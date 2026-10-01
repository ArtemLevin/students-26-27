import {replaceLessonRegistrySource} from '../../lessons/lesson-registry.mjs';
import {parseLessonRegistrySource} from '../publication-contract.mjs';

export function registryRecordFromMetadata(metadata,{existing=null}={}){
  if(!metadata?.materials?.html)throw new Error('registry builder: metadata.materials.html is required');
  const title=metadata.title;
  const summary=metadata.summary||'';
  return {
    date:metadata.date,
    ktpRefs:[...metadata.ktpRefs],
    href:metadata.materials.html,
    title,
    navTitle:existing?.navTitle||title,
    navSubtitle:existing?.navSubtitle||(summary||'Материалы занятия'),
    summary,
    topics:[...metadata.topics],
    outcomes:metadata.outcomes.map(({competencyId,evidenceAnchor,relation})=>({
      competencyId,evidenceAnchor,relation
    })),
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
