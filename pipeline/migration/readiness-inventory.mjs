#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,inventoryStudents} from './inventory-students.mjs';
import {buildMigrationPlan} from './migrate-student.mjs';
import {inspectLegacyLearningState} from './legacy/inspect-learning-state.mjs';

function warningSummary(warnings){
  return (warnings||[]).map(item=>({
    type:String(item?.type||'unknown'),
    sourcePath:item?.sourcePath??null
  }));
}
function readinessForStudent(root,student){
  const plan=buildMigrationPlan({root,studentId:student.studentId});
  if(plan.status==='noop')return null;

  const scaffoldBlockers=[...(plan.blockers||[])];
  try{
    const legacy=inspectLegacyLearningState({root,studentId:student.studentId});
    const warnings=warningSummary(legacy.diagnostics.warnings);
    const conflicts=legacy.mastery.conflicts.length;
    const orphans=legacy.diagnostics.orphanClaims.length;
    const reasons=[];

    for(const blocker of scaffoldBlockers)reasons.push('scaffold: '+blocker);
    if(!legacy.catalog)reasons.push('catalog: unresolved');
    if(conflicts)reasons.push('mastery conflicts: '+conflicts);
    if(orphans)reasons.push('orphan mastery claims: '+orphans);
    for(const warning of warnings)reasons.push(
      'source warning: '+warning.type+(warning.sourcePath?' @ '+warning.sourcePath:'')
    );
    if(!legacy.automaticEligible&&!conflicts&&!orphans&&!warnings.length){
      reasons.push('legacy learning state is not automatically eligible');
    }

    let status='ready';
    if(
      scaffoldBlockers.length||
      !legacy.catalog||
      conflicts||
      orphans||
      !legacy.automaticEligible
    )status='blocked';
    else if(warnings.length)status='review';

    return {
      studentId:student.studentId,
      architecture:student.architecture,
      status,
      planningMode:plan.recommendedPlanningMode??null,
      lessons:student.counts.lessonHtml,
      competencies:legacy.catalog?.count??0,
      mastery:legacy.mastery.resolved.length,
      masteryConflicts:conflicts,
      orphanClaims:orphans,
      warnings,
      scaffoldBlockers,
      reasons
    };
  }catch(error){
    return {
      studentId:student.studentId,
      architecture:student.architecture,
      status:'blocked',
      planningMode:plan.recommendedPlanningMode??null,
      lessons:student.counts.lessonHtml,
      competencies:0,
      mastery:0,
      masteryConflicts:0,
      orphanClaims:0,
      warnings:[],
      scaffoldBlockers,
      reasons:[...scaffoldBlockers,'inspection error: '+error.message]
    };
  }
}

export function buildMigrationReadinessInventory({root=ROOT}={}){
  const inventory=inventoryStudents(root);
  const students=inventory.students
    .filter(student=>student.architecture!=='v2')
    .map(student=>readinessForStudent(root,student))
    .filter(Boolean)
    .sort((a,b)=>a.studentId.localeCompare(b.studentId,'en'));

  const byStatus={ready:0,review:0,blocked:0};
  const byArchitecture={};
  for(const student of students){
    byStatus[student.status]=(byStatus[student.status]||0)+1;
    byArchitecture[student.architecture]=(byArchitecture[student.architecture]||0)+1;
  }
  return {
    version:1,
    total:students.length,
    byStatus,
    byArchitecture:Object.fromEntries(
      Object.entries(byArchitecture).sort(([a],[b])=>a.localeCompare(b,'en'))
    ),
    students
  };
}

function issueText(student){
  return student.reasons.length?student.reasons.join('; '):'—';
}
export function migrationReadinessMarkdown(report){
  const lines=[
    '# Student migration readiness',
    '',
    `Non-v2 total: **${report.total}**`,
    `Ready: **${report.byStatus.ready||0}** · Review: **${report.byStatus.review||0}** · Blocked: **${report.byStatus.blocked||0}**`,
    '',
    '| Student | Architecture | Status | Planning | Lessons | Competencies | Mastery | Issues |',
    '|---|---|---|---|---:|---:|---:|---|'
  ];
  for(const student of report.students){
    lines.push(
      `| ${student.studentId} | ${student.architecture} | ${student.status} | ${student.planningMode||'—'} | ${student.lessons} | ${student.competencies} | ${student.mastery} | ${issueText(student).replaceAll('|','\\|')} |`
    );
  }
  return lines.join('\n')+'\n';
}

export function parseArgs(argv){
  const out={root:ROOT,json:false,jsonOutput:null,markdownOutput:null,help:false};
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--json'){out.json=true;continue;}
    if(token==='--root'){out.root=path.resolve(args.shift()||'');continue;}
    if(token==='--json-output'){out.jsonOutput=args.shift()||null;continue;}
    if(token==='--markdown-output'){out.markdownOutput=args.shift()||null;continue;}
    throw new Error('Unknown option: '+token);
  }
  return out;
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){
    process.stdout.write(
      'Usage: node pipeline/migration/readiness-inventory.mjs [--json] [--json-output FILE] [--markdown-output FILE]\n'
    );
    return null;
  }
  const report=buildMigrationReadinessInventory({root:options.root});
  const markdown=migrationReadinessMarkdown(report);
  if(options.jsonOutput)fs.writeFileSync(options.jsonOutput,JSON.stringify(report,null,2)+'\n');
  if(options.markdownOutput)fs.writeFileSync(options.markdownOutput,markdown);
  process.stdout.write(options.json?JSON.stringify(report,null,2)+'\n':markdown);
  return report;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){
    process.stderr.write('migration-readiness: '+error.message+'\n');
    process.exitCode=1;
  }
}
