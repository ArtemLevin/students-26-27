import {
  validateMasteryStateData,
  validateStudentContractData
} from '../../student/contract.mjs';

function groupKey(item){
  return String(item.groupId??'')+'\u0000'+String(item.groupName??'');
}

export function buildCanonicalCompetencyCatalog({
  studentId,
  identity,
  legacyState
}={}){
  if(!legacyState?.catalog)throw new Error('migration catalog: legacy catalog is unresolved');
  const groups=[],byKey=new Map();

  for(const item of Object.values(legacyState.catalog.itemsById)){
    const key=groupKey(item);
    let group=byKey.get(key);
    if(!group){
      const fallback='legacy-group-'+String(groups.length+1).padStart(2,'0');
      group={
        id:typeof item.groupId==='string'&&item.groupId.trim()?item.groupId.trim():fallback,
        name:typeof item.groupName==='string'&&item.groupName.trim()?item.groupName.trim():fallback,
        items:[]
      };
      groups.push(group);
      byKey.set(key,group);
    }
    group.items.push({
      id:item.id,
      title:typeof item.title==='string'?item.title:''
    });
  }

  return {
    version:1,
    studentId,
    studentName:identity.studentName,
    program:identity.program,
    groups
  };
}

export function buildCanonicalMasteryState({
  studentId,
  migrationDate,
  preserveMastery,
  catalogIds
}={}){
  const levels={};
  for(const item of [...preserveMastery].sort((a,b)=>
    a.competencyId.localeCompare(b.competencyId,'en')
  )){
    levels[item.competencyId]={
      level:item.level,
      sourcePath:item.sourcePath,
      sourceKind:item.sourceKind,
      basis:item.basis
    };
  }
  const state={
    version:1,
    studentId,
    updated:migrationDate,
    levels
  };
  validateMasteryStateData(state,{studentId,catalogIds});
  return state;
}

export function buildMigratedStudentContract({
  studentId,
  identity,
  planningMode,
  hasPracticeConfig=false
}={}){
  const contract={
    version:2,
    studentId,
    studentName:identity.studentName,
    program:identity.program,
    planning:{
      mode:planningMode,
      plan:'site/data/ktp-plan.json',
      state:'site/data/ktp-state.json'
    },
    lessons:{
      registry:'site/lesson-registry.js',
      metadataDir:'site/data/lessons'
    },
    competencies:{
      catalog:'site/data/competency-catalog.json',
      mastery:'site/data/mastery-state.json'
    },
    practice:{
      config:hasPracticeConfig?'site/practice-config.js':null
    }
  };
  validateStudentContractData(contract,{studentId});
  return contract;
}

export function renderMigratedStudentTest({studentId}={}){
  return [
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';",
    '',
    "test('"+studentId+" satisfies Student Platform v2 contract',()=>{",
    "  const result=validateStudentPackage({root:process.cwd(),studentId:'"+studentId+"'});",
    "  assert.equal(result.contractVersion,2);",
    "});",
    ''
  ].join('\n');
}
