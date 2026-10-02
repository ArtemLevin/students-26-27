import fs from 'node:fs';
import path from 'node:path';
import {inspectStudent} from '../inventory-students.mjs';
import {createLegacySandbox,executeLegacyFile,executeLegacySource} from './sandbox.mjs';
import {discoverLegacyLearningSources} from './discover-sources.mjs';
import {transformEgeProfile2027Catalog} from '../../../shared/student-dashboard/ege-profile-2027.js';

const LEVEL_MIN=0,LEVEL_MAX=4;
const SOURCE_PRIORITY={
  'stage04-mastery':60,
  'teacher-mastery':50,
  'mastery-authority':40,
  'linked-progress-overlay':35,
  'dashboard-data':30,
  'teacher-seed':20,
  'baseline-levels':10
};

function plainObject(value){
  return !!value&&typeof value==='object'&&!Array.isArray(value);
}
function levelEntries(value){
  if(!plainObject(value))return [];
  const entries=[];
  for(const [competencyId,raw] of Object.entries(value)){
    const level=Number(raw);
    if(!Number.isInteger(level)||level<LEVEL_MIN||level>LEVEL_MAX)continue;
    entries.push([competencyId,level]);
  }
  return entries;
}
function catalogFromValue(value){
  const groups=Array.isArray(value)?value:plainObject(value)&&Array.isArray(value.groups)?value.groups:null;
  if(!groups)return null;
  const items=[];
  for(const group of groups){
    if(Array.isArray(group)){
      const code=typeof group[1]==='string'?group[1]:null;
      const groupName=typeof group[2]==='string'?group[2]:null;
      const titles=typeof group[5]==='string'
        ?group[5].split('|').map(item=>item.trim()).filter(Boolean)
        :[];
      if(code&&titles.length){
        titles.forEach((title,index)=>{
          items.push({
            id:code+'_'+String(index+1),
            title,
            groupId:code,
            groupName
          });
        });
      }
      continue;
    }
    if(!group||!Array.isArray(group.items))continue;
    for(const item of group.items){
      if(item&&typeof item.id==='string'&&item.id){
        items.push({
          id:item.id,
          title:typeof item.title==='string'?item.title:'',
          groupId:typeof group.id==='string'?group.id:null,
          groupName:typeof group.name==='string'
            ?group.name
            :typeof group.title==='string'
              ?group.title
              :null
        });
      }
    }
  }
  if(!items.length)return null;
  return items;
}
function catalogLevelsFromValue(value){
  const groups=Array.isArray(value)?value:plainObject(value)&&Array.isArray(value.groups)?value.groups:null;
  if(!groups)return null;
  const levels={};
  for(const group of groups){
    if(!group||!Array.isArray(group.items))continue;
    for(const item of group.items){
      if(!item||typeof item.id!=='string'||!item.id)continue;
      const level=Number(item.level);
      if(!Number.isInteger(level)||level<LEVEL_MIN||level>LEVEL_MAX)continue;
      levels[item.id]=level;
    }
  }
  return Object.keys(levels).length?levels:null;
}
function addCatalogCandidate(target,{sourcePath,symbol,value}){
  const items=catalogFromValue(value);
  if(!items)return;
  if(target.some(existing=>existing.sourcePath===sourcePath&&existing.symbol===symbol))return;
  target.push({sourcePath,symbol,items,value});
}
function discoverWindowCatalogCandidates(target,window,sourcePath){
  for(const [symbol,value] of Object.entries(window)){
    addCatalogCandidate(target,{sourcePath,symbol,value});
  }
}
function documentWriteScriptSources(html){
  const sources=[];
  const pattern=/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while((match=pattern.exec(String(html))))sources.push(match[1]);
  return sources;
}
function executeDocumentWriteDependencies({
  sandbox,
  studentRoot,
  parentFile,
  parentSourcePath,
  warnings,
  dependencies,
  depth=0,
  stack=[]
}){
  const writes=sandbox.documentWrites.splice(0);
  if(!writes.length)return;
  if(depth>=16){
    warnings.push({
      type:'document-write-script-depth-exceeded',
      sourcePath:parentSourcePath
    });
    return;
  }

  for(const html of writes){
    for(const rawSrc of documentWriteScriptSources(html)){
      const src=String(rawSrc).trim();
      if(!src||src.startsWith('/')||src.startsWith('//')||/^[a-z][a-z\d+.-]*:/i.test(src)){
        warnings.push({
          type:'document-write-script-unsupported',
          sourcePath:parentSourcePath,
          src
        });
        continue;
      }
      const clean=src.split(/[?#]/,1)[0];
      const file=path.resolve(path.dirname(parentFile),clean);
      if(file!==studentRoot&&!file.startsWith(studentRoot+path.sep)){
        warnings.push({
          type:'document-write-script-outside-student',
          sourcePath:parentSourcePath,
          src
        });
        continue;
      }
      const relativePath=path.relative(studentRoot,file).replaceAll('\\','/');
      if(stack.includes(file)){
        warnings.push({
          type:'document-write-script-cycle',
          sourcePath:relativePath,
          parentSourcePath
        });
        continue;
      }
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
        warnings.push({
          type:'document-write-script-missing',
          sourcePath:relativePath,
          parentSourcePath
        });
        continue;
      }
      const canonicalStudentRoot=fs.realpathSync(studentRoot);
      const canonicalFile=fs.realpathSync(file);
      if(canonicalFile!==canonicalStudentRoot&&!canonicalFile.startsWith(canonicalStudentRoot+path.sep)){
        warnings.push({
          type:'document-write-script-outside-student',
          sourcePath:relativePath,
          parentSourcePath,
          src
        });
        continue;
      }
      dependencies.push({
        sourcePath:relativePath,
        parentSourcePath
      });
      try{
        sandbox.documentWrites.splice(0);
        executeLegacyFile({
          sandbox,
          filePath:file,
          relativePath
        });
      }catch(error){
        sandbox.documentWrites.splice(0);
        warnings.push({
          type:'document-write-script-execution-failed',
          sourcePath:relativePath,
          parentSourcePath,
          message:error.message
        });
        continue;
      }
      executeDocumentWriteDependencies({
        sandbox,
        studentRoot,
        parentFile:file,
        parentSourcePath:relativePath,
        warnings,
        dependencies,
        depth:depth+1,
        stack:[...stack,file]
      });
    }
  }
}
function idsKey(items){
  return [...new Set(items.map(item=>item.id))].sort().join('\u0000');
}
function resolveCatalog(candidates){
  const byIds=new Map();
  for(const candidate of candidates){
    const key=idsKey(candidate.items);
    if(!byIds.has(key))byIds.set(key,[]);
    byIds.get(key).push(candidate);
  }
  if(!byIds.size)return {catalog:null,conflicts:[]};
  if(byIds.size>1){
    return {
      catalog:null,
      conflicts:[{
        type:'catalog-conflict',
        candidates:[...byIds.values()].map(group=>group.map(item=>({
          sourcePath:item.sourcePath,
          symbol:item.symbol,
          count:item.items.length
        })))
      }]
    };
  }
  const group=[...byIds.values()][0];
  const primary=group[0];
  const itemsById={};
  for(const item of primary.items)itemsById[item.id]=item;
  return {
    catalog:{
      sourcePath:primary.sourcePath,
      symbol:primary.symbol,
      count:Object.keys(itemsById).length,
      ids:Object.keys(itemsById).sort(),
      itemsById,
      aliases:group.slice(1).map(item=>({
        sourcePath:item.sourcePath,
        symbol:item.symbol
      }))
    },
    conflicts:[]
  };
}
function claim({competencyId,level,sourcePath,sourceKind,sourceSymbol,resolution='direct'}){
  return {competencyId,level,sourcePath,sourceKind,sourceSymbol,resolution};
}
function sameObject(a,b){return !!a&&!!b&&a===b;}
function addClaimsFromMap(target,value,{sourcePath,sourceKind,sourceSymbol,resolution='direct',skipIds=null}){
  for(const [competencyId,level] of levelEntries(value)){
    if(skipIds?.has(competencyId))continue;
    target.push(claim({competencyId,level,sourcePath,sourceKind,sourceSymbol,resolution}));
  }
}
function findAlias(previousObjects,value,kinds=null){
  if(!value)return null;
  return previousObjects.find(item=>
    sameObject(item.value,value)&&(!kinds||kinds.includes(item.kind))
  )||null;
}
function claimsFromExecution({source,result,previousObjects,sandbox,beforeLinkedProgressLevels=null}){
  const claims=[],aliases=[],indirectSources=[];
  const c=result.captures;
  const explicitMasteryIds=new Set(levelEntries(c.teacherMastery).map(([id])=>id));

  if(source.name==='competence-config.js'){
    addClaimsFromMap(claims,c.teacherMastery,{
      sourcePath:source.relativePath,
      sourceKind:'teacher-mastery',
      sourceSymbol:'teacherMastery',
      resolution:'explicit-override'
    });

    const config=sandbox.window.STUDENT_COMPETENCE_CONFIG;
    const seed=c.teacherSeed||(plainObject(config)?config.teacherSeed:null);
    const baselineAlias=findAlias(previousObjects,seed,['baseline-levels']);
    if(baselineAlias){
      aliases.push({
        sourcePath:source.relativePath,
        sourceSymbol:c.teacherSeed?'teacherSeed':'STUDENT_COMPETENCE_CONFIG.teacherSeed',
        targetSourcePath:baselineAlias.sourcePath,
        targetKind:baselineAlias.kind
      });
    }else{
      addClaimsFromMap(claims,seed,{
        sourcePath:source.relativePath,
        sourceKind:'teacher-seed',
        sourceSymbol:c.teacherSeed?'teacherSeed':'STUDENT_COMPETENCE_CONFIG.teacherSeed',
        skipIds:explicitMasteryIds
      });
    }
  }

  if(source.name==='competency-map-data.js'||source.name==='competency-map-baseline.js'){
    const baseline=c.baselineLevels;
    addClaimsFromMap(claims,baseline,{
      sourcePath:source.relativePath,
      sourceKind:'baseline-levels',
      sourceSymbol:'baselineLevels'
    });

    for(const [symbol,value] of Object.entries(sandbox.window)){
      if(!plainObject(value)||!plainObject(value.baselineLevels))continue;
      if(sameObject(value.baselineLevels,baseline))continue;
      addClaimsFromMap(claims,value.baselineLevels,{
        sourcePath:source.relativePath,
        sourceKind:'baseline-levels',
        sourceSymbol:symbol+'.baselineLevels'
      });
    }
  }

  if(source.name==='dashboard-data.js'){
    addClaimsFromMap(claims,c.levels,{
      sourcePath:source.relativePath,
      sourceKind:'dashboard-data',
      sourceSymbol:'levels'
    });
  }

  if(source.name==='mastery-authority.js'){
    const explicitAuthority=sandbox.window.STUDENT_MASTERY_AUTHORITY;
    const authorityLevels=plainObject(explicitAuthority)
      ?(explicitAuthority.levels||explicitAuthority.mastery||null)
      :null;
    if(authorityLevels){
      addClaimsFromMap(claims,authorityLevels,{
        sourcePath:source.relativePath,
        sourceKind:'mastery-authority',
        sourceSymbol:'STUDENT_MASTERY_AUTHORITY'
      });
    }else{
      const alias=findAlias(previousObjects,c.teacherLevels);
      if(alias){
        indirectSources.push({
          sourcePath:source.relativePath,
          sourceKind:'mastery-authority',
          sourceSymbol:'teacherLevels',
          targetSourcePath:alias.sourcePath,
          targetKind:alias.kind
        });
      }else{
        addClaimsFromMap(claims,c.teacherLevels,{
          sourcePath:source.relativePath,
          sourceKind:'mastery-authority',
          sourceSymbol:'teacherLevels'
        });
      }
    }
  }

  if(source.name==='stage04-mastery.js'){
    addClaimsFromMap(claims,c.stage04Mastery,{
      sourcePath:source.relativePath,
      sourceKind:'stage04-mastery',
      sourceSymbol:'stage04Mastery'
    });
  }

  if(source.name==='linked-progress-overlay'&&beforeLinkedProgressLevels){
    const afterLevels=catalogLevelsFromValue(sandbox.window.COMPETENCY_MAP_DATA);
    if(afterLevels){
      for(const [competencyId,level] of Object.entries(afterLevels)){
        if(!Object.prototype.hasOwnProperty.call(beforeLinkedProgressLevels,competencyId))continue;
        if(beforeLinkedProgressLevels[competencyId]===level)continue;
        claims.push(claim({
          competencyId,
          level,
          sourcePath:source.relativePath,
          sourceKind:'linked-progress-overlay',
          sourceSymbol:'COMPETENCY_MAP_DATA.groups[*].items[*].level',
          resolution:'runtime-delta'
        }));
      }
    }
  }

  return {claims,aliases,indirectSources};
}
function resolveClaims(claims,catalog){
  const byId=new Map();
  for(const item of claims){
    if(!byId.has(item.competencyId))byId.set(item.competencyId,[]);
    byId.get(item.competencyId).push(item);
  }
  const resolved=[],conflicts=[],orphanClaims=[];
  const catalogIds=catalog?new Set(catalog.ids):null;

  for(const [competencyId,items] of [...byId.entries()].sort(([a],[b])=>a.localeCompare(b))){
    if(catalogIds&&!catalogIds.has(competencyId)){
      orphanClaims.push({competencyId,claims:items});
      continue;
    }
    const levels=[...new Set(items.map(item=>item.level))];
    if(levels.length>1){
      conflicts.push({type:'mastery-conflict',competencyId,claims:items});
      continue;
    }
    const sorted=[...items].sort((a,b)=>
      (SOURCE_PRIORITY[b.sourceKind]??0)-(SOURCE_PRIORITY[a.sourceKind]??0)||
      a.sourcePath.localeCompare(b.sourcePath)||
      a.sourceSymbol.localeCompare(b.sourceSymbol)
    );
    const primary=sorted[0];
    resolved.push({
      competencyId,
      level:primary.level,
      sourcePath:primary.sourcePath,
      sourceKind:primary.sourceKind,
      sourceSymbol:primary.sourceSymbol,
      basis:'Repository-authored '+primary.sourceKind+' mastery value.',
      alsoDeclaredBy:sorted.slice(1).map(item=>({
        sourcePath:item.sourcePath,
        sourceKind:item.sourceKind,
        sourceSymbol:item.sourceSymbol
      }))
    });
  }
  return {resolved,conflicts,orphanClaims};
}
function localLegacyUrl(value){
  if(typeof value!=='string'||!value.trim())return null;
  if(/^(?:blob:|data:|https?:|\/\/)/i.test(value))return null;
  return value.split(/[?#]/,1)[0]||null;
}
function allInlineScripts(html){
  const scripts=[];
  const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match,index=0;
  while((match=re.exec(html))){
    index+=1;
    const attrs=match[1]||'';
    const source=match[2]||'';
    if(/\bsrc\s*=/i.test(attrs))continue;
    scripts.push({index,source});
  }
  return scripts;
}
function inlineScripts(html){
  return allInlineScripts(html).filter(({source})=>
    /(?:\b(?:const|let|var)\s+(?:groups|GROUPS)\s*=|COMPETENCY|competenc)/.test(source)
  );
}
function detectInlineMasteryMutations({root,studentId,warnings}){
  const file=path.join(root,'students',studentId,'site','index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return;
  const html=fs.readFileSync(file,'utf8');
  const mutation=/\.(?:level|teacherSeed|teacherMastery|baselineLevels|studentLevels)\s*=|\[['"](?:level|teacherSeed|teacherMastery|baselineLevels|studentLevels)['"]\]\s*=/;
  const scripts=allInlineScripts(html)
    .filter(item=>mutation.test(item.source))
    .map(item=>item.index);
  if(!scripts.length)return;
  warnings.push({
    type:'inline-mastery-mutation-unresolved',
    sourcePath:'site/index.html',
    scripts,
    count:scripts.length
  });
}
function scanHtmlCatalogFile({
  file,relativePath,sandbox,catalogCandidates
}){
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return false;
  const html=fs.readFileSync(file,'utf8');
  for(const script of inlineScripts(html)){
    const result=executeLegacySource({
      sandbox,
      source:script.source,
      label:relativePath+'#inline-script-'+script.index,
      allowPartial:true
    });
    if(result.captures.groups){
      addCatalogCandidate(catalogCandidates,{
        sourcePath:relativePath,
        symbol:'groups',
        value:result.captures.groups
      });
    }
    if(result.captures.GROUPS){
      addCatalogCandidate(catalogCandidates,{
        sourcePath:relativePath,
        symbol:'GROUPS',
        value:result.captures.GROUPS
      });
    }
    discoverWindowCatalogCandidates(catalogCandidates,sandbox.window,relativePath);
    if(catalogCandidates.length)return true;
  }
  return false;
}

function loadIndexCatalogFallback({
  root,studentId,sandbox,catalogCandidates,warnings
}){
  if(catalogCandidates.length)return;
  const studentRoot=path.join(root,'students',studentId);
  const siteRoot=path.join(studentRoot,'site');

  if(scanHtmlCatalogFile({
    file:path.join(siteRoot,'index.html'),
    relativePath:'site/index.html',
    sandbox,
    catalogCandidates
  }))return;

  const mapModule=path.join(siteRoot,'competence-map.js');
  if(fs.existsSync(mapModule)&&fs.statSync(mapModule).isFile()){
    const source=fs.readFileSync(mapModule,'utf8');
    const match=source.match(/\bCATALOG_URL\s*=\s*['"]([^'"]+)['"]/);
    const local=localLegacyUrl(match?.[1]||null);
    if(local){
      const file=path.resolve(siteRoot,local);
      if(file.startsWith(studentRoot+path.sep)&&scanHtmlCatalogFile({
        file,
        relativePath:path.relative(studentRoot,file).replaceAll('\\','/'),
        sandbox,
        catalogCandidates
      }))return;
    }
  }

  const original=path.join(siteRoot,'index-original.html');
  if(scanHtmlCatalogFile({
    file:original,
    relativePath:'site/index-original.html',
    sandbox,
    catalogCandidates
  }))return;

  warnings.push({
    type:'index-catalog-not-found',
    sourcePath:'site/index.html'
  });
}

function detectEge2027RuntimeTransform({root,studentId}){
  const studentRoot=path.join(root,'students',studentId);
  const candidates=[
    {
      file:path.join(studentRoot,'site','dashboard.js'),
      sourcePath:'site/dashboard.js',
      matches:source=>
        /ege-profile-2027\.js/.test(source)&&
        /installEgeProfile2027ControllerHook\s*\(/.test(source)
    },
    {
      file:path.join(studentRoot,'competency-map.js'),
      sourcePath:'competency-map.js',
      matches:source=>
        /ege-profile-2027\.js/.test(source)&&
        /transformEgeProfile2027Catalog\s*\(/.test(source),
      adaptInput(source,value){
        if(!/normalizeOrderedLegacyGroups\s*\(/.test(source))return value;
        const groups=Array.isArray(value)
          ?value
          :plainObject(value)&&Array.isArray(value.groups)
            ?value.groups
            :null;
        if(!groups)throw new TypeError('EGE runtime adapter expected catalog groups');
        return groups.map((group,index)=>({...group,id:'task_'+String(index+1)}));
      }
    }
  ];
  for(const candidate of candidates){
    if(!fs.existsSync(candidate.file)||!fs.statSync(candidate.file).isFile())continue;
    const source=fs.readFileSync(candidate.file,'utf8');
    if(candidate.matches(source))return {...candidate,source};
  }
  return null;
}

function applyKnownRuntimeCatalogTransforms({
  root,studentId,catalogCandidates,warnings
}){
  const runtime=detectEge2027RuntimeTransform({root,studentId});
  if(!runtime)return [];

  const transformed=[];
  for(const candidate of catalogCandidates){
    try{
      const input=typeof runtime.adaptInput==='function'
        ?runtime.adaptInput(runtime.source,candidate.value)
        :candidate.value;
      candidate.value=transformEgeProfile2027Catalog(input);
      candidate.items=catalogFromValue(candidate.value);
      transformed.push({
        sourcePath:candidate.sourcePath,
        symbol:candidate.symbol,
        transform:'ege-profile-2027',
        runtimeSourcePath:runtime.sourcePath
      });
    }catch(error){
      warnings.push({
        type:'catalog-transform-failed',
        sourcePath:runtime.sourcePath,
        transform:'ege-profile-2027',
        message:error.message
      });
    }
  }
  return transformed;
}

function loadEmbeddedCatalog({
  root,studentId,configSourcePath,sandbox,catalogCandidates,warnings
}){
  const config=sandbox.window.STUDENT_COMPETENCE_CONFIG;
  const legacyUrl=localLegacyUrl(config?.legacyUrl);
  if(!legacyUrl)return;
  const studentRoot=path.join(root,'students',studentId);
  const configDir=path.dirname(path.join(studentRoot,configSourcePath));
  const file=path.resolve(configDir,legacyUrl);
  if(file!==studentRoot&&!file.startsWith(studentRoot+path.sep)){
    warnings.push({
      type:'legacy-catalog-outside-student',
      sourcePath:configSourcePath,
      legacyUrl
    });
    return;
  }
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
    warnings.push({
      type:'legacy-catalog-missing',
      sourcePath:path.relative(studentRoot,file).replaceAll('\\','/')
    });
    return;
  }

  const relativePath=path.relative(studentRoot,file).replaceAll('\\','/');
  const html=fs.readFileSync(file,'utf8');
  let found=false;
  for(const script of inlineScripts(html)){
    try{
      const result=executeLegacySource({
        sandbox,
        source:script.source,
        label:relativePath+'#inline-script-'+script.index,
        allowPartial:true
      });
      if(result.captures.groups){
        addCatalogCandidate(catalogCandidates,{
          sourcePath:relativePath,
          symbol:'groups',
          value:result.captures.groups
        });
        found=true;
      }
      if(result.captures.GROUPS){
        addCatalogCandidate(catalogCandidates,{
          sourcePath:relativePath,
          symbol:'GROUPS',
          value:result.captures.GROUPS
        });
        found=true;
      }
      const before=catalogCandidates.length;
      discoverWindowCatalogCandidates(catalogCandidates,sandbox.window,relativePath);
      if(catalogCandidates.length>before)found=true;
      if(result.error&&!found){
        warnings.push({
          type:'legacy-html-script-failed',
          sourcePath:relativePath,
          script:script.index,
          message:result.error.message
        });
      }
    }catch(error){
      warnings.push({
        type:'legacy-html-script-failed',
        sourcePath:relativePath,
        script:script.index,
        message:error.message
      });
    }
  }
  if(!found){
    warnings.push({
      type:'legacy-catalog-not-found',
      sourcePath:relativePath
    });
  }
}

export function inspectLegacyLearningState({root=process.cwd(),studentId}={}){
  if(!studentId)throw new Error('legacy learning state: studentId is required');
  const snapshot=inspectStudent(root,studentId);
  if(snapshot.architecture==='v2')throw new Error('legacy learning state: student is already v2: '+studentId);

  const {studentRoot,sources}=discoverLegacyLearningSources({root,studentId});
  const sandbox=createLegacySandbox();
  const catalogCandidates=[];
  const claims=[],aliases=[],indirectSources=[],warnings=[],scriptDependencies=[];
  const previousObjects=[];

  for(const source of sources){
    let result;
    const beforeLinkedProgressLevels=source.name==='linked-progress-overlay'
      ?catalogLevelsFromValue(sandbox.window.COMPETENCY_MAP_DATA)
      :null;
    if(source.name==='linked-progress-overlay'&&!beforeLinkedProgressLevels){
      warnings.push({
        type:'linked-progress-catalog-missing',
        sourcePath:source.relativePath
      });
    }
    sandbox.documentWrites.splice(0);
    try{
      result=executeLegacyFile({
        sandbox,
        filePath:source.file,
        relativePath:source.relativePath,
        module:source.module
      });
    }catch(error){
      sandbox.documentWrites.splice(0);
      warnings.push({
        type:'source-execution-failed',
        sourcePath:source.relativePath,
        message:error.message
      });
      continue;
    }

    executeDocumentWriteDependencies({
      sandbox,
      studentRoot,
      parentFile:source.file,
      parentSourcePath:source.relativePath,
      warnings,
      dependencies:scriptDependencies,
      stack:[source.file]
    });

    if(result.captures.groups){
      addCatalogCandidate(catalogCandidates,{
        sourcePath:source.relativePath,
        symbol:'groups',
        value:result.captures.groups
      });
    }
    if(result.captures.GROUPS){
      addCatalogCandidate(catalogCandidates,{
        sourcePath:source.relativePath,
        symbol:'GROUPS',
        value:result.captures.GROUPS
      });
    }
    discoverWindowCatalogCandidates(catalogCandidates,sandbox.window,source.relativePath);

    const extracted=claimsFromExecution({
      source,
      result,
      previousObjects,
      sandbox,
      beforeLinkedProgressLevels
    });
    claims.push(...extracted.claims);
    aliases.push(...extracted.aliases);
    indirectSources.push(...extracted.indirectSources);

    const c=result.captures;
    if(c.baselineLevels)previousObjects.push({
      kind:'baseline-levels',
      sourcePath:source.relativePath,
      value:c.baselineLevels
    });
    if(source.name==='competency-map-data.js'||source.name==='competency-map-baseline.js'){
      for(const [symbol,value] of Object.entries(sandbox.window)){
        if(!plainObject(value)||!plainObject(value.baselineLevels))continue;
        if(previousObjects.some(item=>item.kind==='baseline-levels'&&sameObject(item.value,value.baselineLevels)))continue;
        previousObjects.push({
          kind:'baseline-levels',
          sourcePath:source.relativePath,
          sourceSymbol:symbol+'.baselineLevels',
          value:value.baselineLevels
        });
      }
    }
    if(c.levels)previousObjects.push({
      kind:'dashboard-data',
      sourcePath:source.relativePath,
      value:c.levels
    });
    if(c.teacherMastery)previousObjects.push({
      kind:'teacher-mastery',
      sourcePath:source.relativePath,
      value:c.teacherMastery
    });
    const config=sandbox.window.STUDENT_COMPETENCE_CONFIG;
    const seed=c.teacherSeed||(source.name==='competence-config.js'&&plainObject(config)?config.teacherSeed:null);
    if(seed)previousObjects.push({
      kind:'teacher-seed',
      sourcePath:source.relativePath,
      value:seed
    });
    if(c.stage04Mastery)previousObjects.push({
      kind:'stage04-mastery',
      sourcePath:source.relativePath,
      value:c.stage04Mastery
    });

    if(source.name==='competence-config.js'){
      loadEmbeddedCatalog({
        root,
        studentId,
        configSourcePath:source.relativePath,
        sandbox,
        catalogCandidates,
        warnings
      });
    }
  }

  loadIndexCatalogFallback({
    root,
    studentId,
    sandbox,
    catalogCandidates,
    warnings
  });

  detectInlineMasteryMutations({
    root,
    studentId,
    warnings
  });

  const catalogTransforms=applyKnownRuntimeCatalogTransforms({
    root,
    studentId,
    catalogCandidates,
    warnings
  });

  const catalogResult=resolveCatalog(catalogCandidates);
  const masteryResult=resolveClaims(claims,catalogResult.catalog);
  const conflicts=[...catalogResult.conflicts,...masteryResult.conflicts];
  const hardWarnings=warnings.filter(item=>
    [
      'source-execution-failed',
      'legacy-catalog-outside-student',
      'legacy-catalog-missing',
      'legacy-catalog-not-found',
      'catalog-transform-failed',
      'inline-mastery-mutation-unresolved',
      'linked-progress-catalog-missing',
      'document-write-script-depth-exceeded',
      'document-write-script-unsupported',
      'document-write-script-outside-student',
      'document-write-script-cycle',
      'document-write-script-missing',
      'document-write-script-execution-failed'
    ].includes(item.type)
  );
  const automaticEligible=
    !!catalogResult.catalog&&
    conflicts.length===0&&
    masteryResult.orphanClaims.length===0&&
    hardWarnings.length===0;

  return {
    version:1,
    studentId,
    architecture:snapshot.architecture,
    catalog:catalogResult.catalog,
    mastery:{
      claims,
      resolved:masteryResult.resolved,
      conflicts:masteryResult.conflicts
    },
    diagnostics:{
      aliases,
      indirectSources,
      scriptDependencies,
      catalogTransforms,
      orphanClaims:masteryResult.orphanClaims,
      warnings
    },
    automaticEligible,
    sources:sources.map(source=>({
      path:source.relativePath,
      kind:source.name
    }))
  };
}
