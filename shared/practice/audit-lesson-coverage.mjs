import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GeneratorRegistry} from './generator-registry.js';
import {ALL_GENERATORS} from './generators/index.js';
import {ALL_CURATED_BANKS} from './curated-banks/index.js';
import {validateCuratedBank} from './curated-bank.js';
import {
  COVERAGE_STATUSES,
  EXPLICIT_COVERAGE_DISPOSITIONS,
  GAP_STATUSES,
  hasMachineReadableGapWaiver,
  isExplicitCoverageDisposition,
  isGapDisposition,
  isPracticeDisposition,
  outcomeCoverageKey,
  validatePracticeGap
} from './coverage-policy.js';
import {PRACTICE_STUDENT_SPECS,ROOT,loadPracticeStudentContracts} from './validate-configs.mjs';

const BASELINE_PATH=path.join(ROOT,'shared/practice/coverage-baseline-v1.json');
const COVERED_STATUSES=new Set(['covered-generator','covered-curated','manual-assessment']);
const GAP_STATUS_SET=new Set(GAP_STATUSES);

function countByStatus(outcomes){
  const counts=Object.fromEntries(COVERAGE_STATUSES.map(status=>[status,0]));
  for(const outcome of outcomes)counts[outcome.status]=(counts[outcome.status]||0)+1;
  return counts;
}

export function loadCoverageBaseline(file=BASELINE_PATH){
  const baseline=JSON.parse(fs.readFileSync(file,'utf8'));
  if(baseline?.schemaVersion!==1||!baseline.students||typeof baseline.students!=='object')throw new Error('Invalid practice coverage baseline v1');
  for(const [student,value] of Object.entries(baseline.students)){
    if(!Array.isArray(value?.legacyImplicitOutcomes))throw new Error(`${student}: baseline legacyImplicitOutcomes must be an array`);
    if(new Set(value.legacyImplicitOutcomes).size!==value.legacyImplicitOutcomes.length)throw new Error(`${student}: duplicate baseline outcome key`);
  }
  return baseline;
}

function curatedRegistry(banks=ALL_CURATED_BANKS){
  const result=new Map();
  for(const bank of banks){validateCuratedBank(bank);if(result.has(bank.bankKey))throw new Error(`Duplicate curated bank ${bank.bankKey}`);result.set(bank.bankKey,bank);}
  return result;
}

export function classifyCoverageOutcome({outcome,config,competencyIds,generatorRegistry,curatedBanks}){
  const disposition=outcome?.practiceDisposition;
  const id=outcome?.competencyId;
  if(disposition!==undefined&&!isPracticeDisposition(disposition))return {status:'ambiguous',detail:`invalid practiceDisposition ${String(disposition)}`};
  if(disposition==='none')return {status:'excluded-explicitly',detail:'practice explicitly excluded'};
  if(disposition==='manual')return {status:'manual-assessment',detail:'manual assessment'};
  if(disposition==='ambiguous')return {status:'ambiguous',detail:'mapping requires review'};
  if(disposition==='competency-gap')return {status:'missing-competency',detail:'competency gap declared'};

  if(disposition==='curated'){
    if(!id||!competencyIds.has(id))return {status:'missing-competency',detail:id?`unknown competency ${id}`:'competencyId is missing'};
    const bankKey=outcome.curatedBankKey||outcome.bankKey;
    if(!bankKey||!curatedBanks.has(bankKey))return {status:'missing-generator',detail:bankKey?`unknown curated bank ${bankKey}`:'curated bank key is missing'};
    const bank=curatedBanks.get(bankKey);
    if(!bank.competencyIds.includes(id))return {status:'generator-does-not-declare-competency',detail:`curated bank ${bankKey} does not declare ${id}`};
    return {status:'covered-curated',detail:bankKey};
  }

  if(!id||!competencyIds.has(id))return {status:'missing-competency',detail:id?`unknown competency ${id}`:'competencyId is missing'};
  const mapping=config?.competencies?.[id];
  if(!mapping)return {status:'missing-practice-mapping',detail:`no practice mapping for ${id}`};
  if(!mapping.generator||!generatorRegistry.has(mapping.generator))return {status:'missing-generator',detail:mapping.generator?`unknown generator ${mapping.generator}`:`mapping ${id} has no generator`};
  if(!generatorRegistry.get(mapping.generator).competencyIds.includes(id))return {status:'generator-does-not-declare-competency',detail:`generator ${mapping.generator} does not declare ${id}`};
  if(disposition==='coverage-gap')return {status:'missing-generator',detail:'coverage-gap declared despite an available generator mapping'};
  return {status:'covered-generator',detail:mapping.generator};
}

export function auditStudentCoverage({student,lessons,config,competencyIds,generatorRegistry,curatedBanks=new Map(),baseline={legacyImplicitOutcomes:[]}}){
  const baselineSet=new Set(baseline.legacyImplicitOutcomes||[]),seenImplicit=new Set(),outcomes=[],violations=[];
  for(const lesson of lessons){
    for(const outcome of lesson.outcomes||[]){
      const key=outcomeCoverageKey(lesson.date,outcome.label),classification=classifyCoverageOutcome({outcome,config,competencyIds,generatorRegistry,curatedBanks});
      const disposition=outcome.practiceDisposition,implicit=disposition===undefined,grandfathered=implicit&&baselineSet.has(key);
      const waiver=isGapDisposition(disposition)?validatePracticeGap(outcome.practiceGap):{valid:false,errors:[]};
      const machineWaived=hasMachineReadableGapWaiver(outcome);
      if(implicit)seenImplicit.add(key);
      if(implicit&&!grandfathered)violations.push({type:'new-outcome-missing-disposition',key,status:classification.status,message:`${key}: new outcome must declare generator|curated|manual|none or a machine-readable gap waiver`});
      if(disposition!==undefined&&!isPracticeDisposition(disposition))violations.push({type:'invalid-disposition',key,status:'ambiguous',message:`${key}: invalid practiceDisposition ${String(disposition)}`});
      if(isGapDisposition(disposition)&&!machineWaived)violations.push({type:'gap-without-waiver',key,status:classification.status,message:`${key}: ${disposition} requires practiceGap.reason and practiceGap.issue`});
      if(disposition==='ambiguous')violations.push({type:'ambiguous',key,status:'ambiguous',message:`${key}: ambiguous practice mapping requires review`});
      if(GAP_STATUS_SET.has(classification.status)&&!grandfathered&&!machineWaived&&!isGapDisposition(disposition))violations.push({type:'uncovered-explicit-outcome',key,status:classification.status,message:`${key}: ${classification.detail}`});
      if(isExplicitCoverageDisposition(disposition)&&GAP_STATUS_SET.has(classification.status))violations.push({type:'broken-explicit-coverage',key,status:classification.status,message:`${key}: explicit ${disposition} is not actually covered (${classification.detail})`});
      outcomes.push({key,lessonDate:lesson.date,label:outcome.label,competencyId:outcome.competencyId||null,practiceDisposition:disposition??null,status:classification.status,detail:classification.detail,grandfathered,machineWaived,practiceGap:machineWaived?outcome.practiceGap:null});
    }
  }
  for(const key of baselineSet)if(!seenImplicit.has(key))violations.push({type:'stale-baseline',key,status:null,message:`${key}: remove resolved/deleted outcome from coverage baseline`});
  const counts=countByStatus(outcomes),practiceEligible=outcomes.filter(item=>item.status!=='excluded-explicitly').length,covered=outcomes.filter(item=>COVERED_STATUSES.has(item.status)).length;
  const gaps=outcomes.filter(item=>GAP_STATUS_SET.has(item.status));
  return {
    student,lessons:lessons.length,totalOutcomes:outcomes.length,practiceEligible,covered,gaps:gaps.length,
    coverage:practiceEligible?Number((covered/practiceEligible*100).toFixed(1)):100,
    counts,outcomes,violations,ok:violations.length===0,baselineImplicit:baselineSet.size
  };
}

export async function auditRepositoryCoverage({student=null,root=ROOT,baseline=loadCoverageBaseline(),generatorRegistry=new GeneratorRegistry(ALL_GENERATORS),curatedBanks=curatedRegistry()}={}){
  const students=student?[student]:Object.keys(PRACTICE_STUDENT_SPECS),reports=[];
  for(const studentId of students){
    try{
      const contracts=await loadPracticeStudentContracts(studentId,{root,registry:generatorRegistry,validate:false});
      const studentBaseline=baseline.students?.[studentId]||{legacyImplicitOutcomes:[]};
      reports.push(auditStudentCoverage({student:studentId,lessons:contracts.LESSONS,config:contracts.PRACTICE_CONFIG,competencyIds:contracts.competencyIds,generatorRegistry,curatedBanks,baseline:studentBaseline}));
    }catch(error){
      reports.push({student:studentId,lessons:0,totalOutcomes:0,practiceEligible:0,covered:0,gaps:0,coverage:0,counts:{},outcomes:[],violations:[{type:'structural-error',key:null,status:null,message:error.message}],ok:false,baselineImplicit:0});
    }
  }
  return {schemaVersion:1,generatedAt:new Date().toISOString(),ok:reports.every(report=>report.ok),students:reports};
}

function gapLines(report){
  return report.outcomes.filter(item=>GAP_STATUS_SET.has(item.status)).map(item=>`- ${item.key}: ${item.status}${item.machineWaived?' (waived)':''} — ${item.detail}`);
}

export function formatCoverageMarkdown(result){
  const lines=['# Practice coverage audit','','| Student | Lessons | Eligible outcomes | Generator | Curated | Manual | Gaps | Coverage |','|---|---:|---:|---:|---:|---:|---:|---:|'];
  for(const report of result.students)lines.push(`| ${report.student} | ${report.lessons} | ${report.practiceEligible} | ${report.counts['covered-generator']||0} | ${report.counts['covered-curated']||0} | ${report.counts['manual-assessment']||0} | ${report.gaps} | ${report.coverage.toFixed(1)}% |`);
  const violations=result.students.flatMap(report=>report.violations.map(item=>({student:report.student,...item})));
  lines.push('','## Merge gate',result.ok?'✅ Coverage ratchet passed.':'❌ Coverage ratchet failed.');
  if(violations.length){for(const item of violations)lines.push(`- **${item.student}** — ${item.message}`);}
  for(const report of result.students){const gaps=gapLines(report);if(!gaps.length)continue;lines.push('',`## ${report.student}: gaps`,...gaps);}
  return `${lines.join('\n')}\n`;
}

export function formatCoverageText(result){
  const lines=[];
  for(const report of result.students){
    lines.push(`${report.student}: lessons=${report.lessons}, eligible=${report.practiceEligible}, generator=${report.counts['covered-generator']||0}, curated=${report.counts['covered-curated']||0}, manual=${report.counts['manual-assessment']||0}, gaps=${report.gaps}, coverage=${report.coverage.toFixed(1)}%`);
    for(const violation of report.violations)lines.push(`  ERROR ${violation.message}`);
  }
  lines.push(result.ok?'✓ coverage ratchet passed':'✗ coverage ratchet failed');
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv){
  const args={format:'text'};
  for(let index=0;index<argv.length;index+=1){const token=argv[index];if(token.startsWith('--'))args[token.slice(2)]=argv[++index];}
  return args;
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  if(!['text','json','markdown'].includes(args.format))throw new Error(`Unsupported format: ${args.format}`);
  const result=await auditRepositoryCoverage({student:args.student||null});
  if(args['json-output'])fs.writeFileSync(path.resolve(args['json-output']),`${JSON.stringify(result,null,2)}\n`);
  const output=args.format==='json'?`${JSON.stringify(result,null,2)}\n`:args.format==='markdown'?formatCoverageMarkdown(result):formatCoverageText(result);
  process.stdout.write(output);process.exitCode=result.ok?0:1;
}

if(import.meta.url===pathToFileURL(path.resolve(process.argv[1]||'')).href){
  try{await main();}catch(error){process.stderr.write(`coverage audit error: ${error.message}\n`);process.exitCode=2;}
}
