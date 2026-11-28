#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {EXCLUDED_IDS} from './audit-learning-coverage.mjs';
import {ROOT} from '../pipeline/migration/inventory-students.mjs';
import {
  isCalendarDate,resolveStudentContractPath,validateStudentContractData,
  validateStudentPackage,validateLessonMetadataData
} from '../pipeline/student/contract.mjs';
import {
  assertEvidenceAnchors,loadCompetencyCatalog,parseLessonRegistrySource,
  validateLessonPublicationIntentData
} from '../pipeline/student/publication-contract.mjs';
import {replaceLessonRegistrySource} from '../pipeline/lessons/lesson-registry.mjs';
import {executeAtomicPlan,sha256,directoryEntriesSha256,verifyTransactionPreconditions}
  from '../pipeline/fs/atomic-transaction.mjs';
import {cumulativeCoverage} from '../shared/student-dashboard/learning-coverage.js';

const json=value=>JSON.stringify(value,null,2)+'\n';
const rel=(root,file)=>path.relative(root,file).split(path.sep).join('/');
const fail=message=>{throw Error('historical recovery: '+message);};
const nonblank=value=>typeof value==='string'&&value.trim().length>0;
const hashPattern=/^[a-f0-9]{40}$/;
const hashKeys=['contract','catalog','html','metadata','registry'];
const writeKeys=['metadata','registry'];
const outcomeKeys=['competencyId','evidenceAnchor','relation','confidence','decision','masteryClaim','basis','source','practiceBasis'];
const key=o=>[o.competencyId,o.evidenceAnchor,o.relation].join('#');
const practiceLabel=title=>title+' · исторический охват';

function exact(obj,required,optional=[]){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
    required.some(k=>!Object.hasOwn(obj,k))||
    Object.keys(obj).some(k=>!required.includes(k)&&!optional.includes(k)))fail('invalid manifest fields');
}
function hashes(obj,keys){
  exact(obj,keys);
  for(const k of keys)if(typeof obj[k]!=='string'||!hashPattern.test(obj[k]))fail('invalid Git blob hash: '+k);
}
// Git blob IDs bind reviewed files to GitHub. The atomic transaction uses SHA-256
// over exact bytes for its independent runtime preconditions.
export function gitBlobHash(bytes){
  const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes,'utf8');
  return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function validateManifest(m){
  exact(m,['version','studentId','lessonDate','reviewId','expectedBefore','outcomes'],['expectedAfter']);
  if(m.version!==1||!isCalendarDate(m.lessonDate)||!nonblank(m.reviewId)||
    typeof m.studentId!=='string'||!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(m.studentId))fail('invalid manifest identity');
  if(EXCLUDED_IDS.includes(m.studentId))fail('excluded cabinet: '+m.studentId);
  hashes(m.expectedBefore,hashKeys);
  if(m.expectedAfter!==undefined)hashes(m.expectedAfter,writeKeys);
  if(!Array.isArray(m.outcomes)||!m.outcomes.length)fail('outcomes required');
  for(const o of m.outcomes){
    exact(o,outcomeKeys);
    if(o.masteryClaim!==null)fail('historical recovery forbids mastery claims');
    if(!nonblank(o.basis)||!nonblank(o.source)||!nonblank(o.practiceBasis))fail('evidence, source and explicit practice decision basis required');
  }
  return m;
}

function readInputs(root,studentId,lessonDate){
  const base=path.join(root,'students',studentId);
  const contractFile=path.join(base,'student-contract.json');
  const contractBytes=fs.readFileSync(contractFile);
  const contract=validateStudentContractData(JSON.parse(contractBytes.toString('utf8')),{studentId});
  const resolve=p=>resolveStudentContractPath(root,studentId,p);
  const metadataDir=resolve(contract.lessons.metadataDir);
  const metadataFile=path.join(metadataDir,lessonDate+'.lesson.json');
  const metadataBytes=fs.readFileSync(metadataFile);
  const metadata=validateLessonMetadataData(JSON.parse(metadataBytes.toString('utf8')),{studentId});
  if(metadata.date!==lessonDate||!metadata.materials.html)fail('metadata date/HTML mismatch');
  const href=metadata.materials.html.split(/[?#]/,1)[0];
  const htmlFile=path.resolve(base,'site',href);
  if(!htmlFile.startsWith(base+path.sep))fail('HTML escapes cabinet');
  const files={
    contract:contractFile,catalog:resolve(contract.competencies.catalog),html:htmlFile,
    metadata:metadataFile,registry:resolve(contract.lessons.registry)
  };
  // Refuse symlinked inputs/writes, including symlinked parent directories.
  for(const file of Object.values(files)){
    if(!fs.lstatSync(file).isFile()||fs.realpathSync(file)!==file)fail('non-regular or redirected input: '+rel(root,file));
  }
  const bytes={contract:contractBytes,metadata:metadataBytes,catalog:fs.readFileSync(files.catalog),
    html:fs.readFileSync(files.html),registry:fs.readFileSync(files.registry)};
  const before=Object.fromEntries(hashKeys.map(k=>[k,gitBlobHash(bytes[k])]));
  return {base,contract,metadata,metadataDir,files,bytes,before,resolve};
}
function verifiedAnchor(html,anchor){
  assertEvidenceAnchors(html,[{evidenceAnchor:anchor}]);
  // Reject duplicate anchors and data-id / script / comment false positives.
  const source=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const matches=[...source.matchAll(/<[a-z][^>]*>/gi)].flatMap(m=>
    [...m[0].matchAll(/\s+id\s*=\s*(["'])(.*?)\1/gi)].map(a=>a[2]));
  if(matches.filter(id=>id===anchor).length!==1)fail('anchor must identify exactly one actual element: '+anchor);
}
function immutablePreconditions(root,input){
  const {contract,metadataDir,resolve,files,bytes}=input;
  const paths=[
    files.contract,files.catalog,files.html,resolve(contract.competencies.mastery),
    resolve(contract.planning.plan),resolve(contract.planning.state),
    ...(contract.practice.config===null?[]:[resolve(contract.practice.config)]),
    ...fs.readdirSync(metadataDir).filter(n=>n.endsWith('.lesson.json')).map(n=>path.join(metadataDir,n))
      .filter(f=>f!==files.metadata)
  ];
  const reviewed=new Map(['contract','catalog','html'].map(k=>[files[k],bytes[k]]));
  return [...new Set(paths)].map(f=>({path:rel(root,f),exists:true,sha256:sha256(reviewed.get(f)??fs.readFileSync(f))}))
    .concat({kind:'directory',path:rel(root,metadataDir),exists:true,entriesSha256:directoryEntriesSha256(metadataDir)});
}
function coverage(lessons,ids,studentId){
  const result=cumulativeCoverage(lessons,{knownIds:ids,includeLegacy:studentId!=='sofya_luzianina'});
  return {covered:result.byId.size,counts:result.counts,unlinked:result.unlinked};
}

export function buildRecoveryPlan({root=ROOT,manifest}={}){
  root=fs.realpathSync(root);
  const m=validateManifest(manifest),id=m.studentId;
  const input=readInputs(root,id,m.lessonDate);
  const {files,bytes,before,metadata}=input;
  for(const k of ['contract','catalog','html'])if(before[k]!==m.expectedBefore[k])fail('reviewed input hash changed: '+k);
  const replay=m.expectedAfter!==undefined&&writeKeys.every(k=>before[k]===m.expectedAfter[k]);
  if(!replay)for(const k of writeKeys)if(before[k]!==m.expectedBefore[k])fail('before hash conflict: '+k);
  const protectedInputs=immutablePreconditions(root,input);
  const preconditions=protectedInputs.concat(writeKeys.map(k=>({path:rel(root,files[k]),exists:true,sha256:sha256(bytes[k])})));
  verifyTransactionPreconditions({root,preconditions});
  validateStudentPackage({root,studentId:id});

  const catalog=loadCompetencyCatalog(files.catalog);
  const titles=new Map(catalog.data.groups.flatMap(g=>g.items.map(i=>[i.id,i.title])));
  const coreIntent=m.outcomes.map(({source,practiceBasis,...o})=>o);
  validateLessonPublicationIntentData({
    version:1,studentId:id,lessonDate:m.lessonDate,topics:[],actualSummary:'',
    ktpMatches:[],outcomes:coreIntent,warnings:[]
  },{studentId:id,competencyIds:catalog.ids});
  const reviewItems=m.outcomes.filter(o=>o.decision==='review');
  const selected=m.outcomes.filter(o=>o.decision==='apply');
  if(!selected.length)fail('no applicable reviewed evidence');
  if(new Set(selected.map(o=>o.competencyId)).size!==selected.length)fail('one new competency per lesson ID per manifest');
  const html=bytes.html.toString('utf8');
  const registrySource=bytes.registry.toString('utf8');
  const lessons=parseLessonRegistrySource(registrySource);
  const existing=lessons.find(l=>l.date===m.lessonDate);
  if(!existing)fail('lesson is not registered');
  const additions=[],labels=new Set();
  for(const o of selected){
    if(o.source!==rel(root,files.html)+'#'+o.evidenceAnchor)fail('source must name the reviewed HTML and anchor');
    verifiedAnchor(html,o.evidenceAnchor);
    const title=titles.get(o.competencyId);
    if(!nonblank(title))fail('catalog skill title missing');
    const canonical={competencyId:o.competencyId,evidenceAnchor:o.evidenceAnchor,relation:o.relation,masteryClaim:null};
    const registryOutcome={competencyId:o.competencyId,evidenceAnchor:o.evidenceAnchor,relation:o.relation,
      label:practiceLabel(title),practiceDisposition:'none'};
    if(replay){
      const recorded=metadata.outcomes.find(x=>key(x)===key(canonical));
      const projected=existing.outcomes.find(x=>key(x)===key(canonical));
      if(!recorded||recorded.masteryClaim!==null||!projected||projected.practiceDisposition!=='none'||
        projected.label!==registryOutcome.label)fail('after hash matches but reviewed outcome is missing or different');
      continue;
    }
    if(metadata.outcomes.some(x=>x.competencyId===o.competencyId)||
       (metadata.legacyOutcomes||[]).some(x=>x.competencyId===o.competencyId))
      fail('existing competency evidence requires explicit reconciliation: '+o.competencyId);
    if(labels.has(registryOutcome.label)||existing.outcomes.some(x=>x.label===registryOutcome.label))fail('practice label collision: '+registryOutcome.label);
    labels.add(registryOutcome.label);
    additions.push({canonical,registryOutcome});
  }

  let nextMetadata=metadata,nextRegistry=registrySource;
  if(!replay){
    nextMetadata={...metadata,outcomes:[...metadata.outcomes,...additions.map(x=>x.canonical)]};
    // Preserve all existing registry fields and legacy/practice enrichment. Insert
    // canonical outcomes before the legacy projection, as required by parity.
    const nextRecord={...existing,outcomes:[
      ...existing.outcomes.slice(0,metadata.outcomes.length),
      ...additions.map(x=>x.registryOutcome),
      ...existing.outcomes.slice(metadata.outcomes.length)
    ]};
    nextRegistry=replaceLessonRegistrySource(registrySource,nextRecord);
  }
  validateLessonMetadataData(nextMetadata,{studentId:id});
  const nextBytes={metadata:replay?bytes.metadata.toString('utf8'):json(nextMetadata),registry:nextRegistry};
  const after=Object.fromEntries(writeKeys.map(k=>[k,gitBlobHash(nextBytes[k])]));
  if(m.expectedAfter!==undefined&&writeKeys.some(k=>after[k]!==m.expectedAfter[k]))fail('reviewed after hash mismatch');
  const writes=replay?[]:writeKeys.map(k=>({kind:'update',path:rel(root,files[k]),content:nextBytes[k]}));
  const overlay=new Map(writeKeys.map(k=>[files[k],nextBytes[k]]));
  const fsView=Object.create(fs);
  fsView.readFileSync=(file,encoding)=>{
    const value=overlay.get(path.resolve(file));
    return value===undefined?fs.readFileSync(file,encoding):encoding?value:Buffer.from(value,'utf8');
  };
  // Validate the entire candidate package without modifying the checkout.
  validateStudentPackage({root,studentId:id,fsView});
  verifyTransactionPreconditions({root,preconditions});
  const report={studentId:id,lessonDate:m.lessonDate,reviewId:m.reviewId,
    expectedBefore:m.expectedBefore,expectedAfter:after,replay,
    sealed:m.expectedAfter!==undefined,applicable:selected.length,reviewItems,
    decisions:m.outcomes,changes:writes.map(w=>w.path),
    beforeCoverage:coverage(lessons,catalog.ids,id),
    afterCoverage:coverage(parseLessonRegistrySource(nextRegistry),catalog.ids,id)};
  return {version:1,executable:reviewItems.length===0&&report.sealed,reviewItems,conflicts:[],
    studentId:id,lessonDate:m.lessonDate,preconditions,protectedInputs,writes,report};
}

export function applyRecovery({root=ROOT,manifest,faultInjector=null}={}){
  root=fs.realpathSync(root);
  const plan=buildRecoveryPlan({root,manifest});
  if(!plan.executable)fail('apply requires reviewed expectedAfter hashes and no pending review items');
  const result=executeAtomicPlan({root,plan,faultInjector,planLabel:'historical recovery',
    postflight:()=>{
      for(const w of plan.writes)if(fs.readFileSync(path.join(root,w.path),'utf8')!==w.content)fail('written content mismatch');
      verifyTransactionPreconditions({root,preconditions:plan.protectedInputs});
      return validateStudentPackage({root,studentId:plan.studentId});
    }
  });
  return {...plan.report,transaction:result};
}

export function run(argv=process.argv.slice(2)){
  if(argv.length===1&&argv[0]==='--help'){
    console.log('Usage: node scripts/recover-learning-coverage.mjs <manifest.json> [--dry-run|--apply]');
    return;
  }
  if(!argv[0]||argv.length>2||argv[0].startsWith('-')||
    (argv[1]&&!['--dry-run','--apply'].includes(argv[1])))fail('expected manifest and optional --dry-run or --apply');
  const manifest=JSON.parse(fs.readFileSync(argv[0],'utf8'));
  const result=argv[1]==='--apply'?applyRecovery({manifest}):buildRecoveryPlan({manifest}).report;
  console.log(json(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{run();}catch(e){console.error(e.message);process.exitCode=1;}
}
