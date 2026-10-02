#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryStudents} from '../migration/inventory-students.mjs';
import {validateStudentPackage} from './contract.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const DEFAULT_BASELINE=path.join(ROOT,'pipeline','migration','baseline.json');

const TEMPORARY_WORKFLOW_RE=/(?:migration|reconciliation|preflight|migration-apply)/i;

function readJson(file,label){
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(error){throw new Error('steady-state audit: cannot parse '+label+': '+error.message);}
}

function temporaryWorkflows(root){
  const directory=path.join(root,'.github','workflows');
  if(!fs.existsSync(directory))return [];
  return fs.readdirSync(directory,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&/\.ya?ml$/i.test(entry.name)&&TEMPORARY_WORKFLOW_RE.test(entry.name))
    .map(entry=>'.github/workflows/'+entry.name)
    .sort((a,b)=>a.localeCompare(b,'en'));
}

export function auditStudentPlatformSteadyState({
  root=ROOT,
  baselinePath=path.join(root,'pipeline','migration','baseline.json'),
  packageValidator=validateStudentPackage
}={}){
  const inventory=inventoryStudents(root);
  const baseline=readJson(baselinePath,'architecture baseline');
  const violations=[];
  const total=inventory.summary.total;
  const v2=inventory.summary.byArchitecture.v2||0;
  const nonV2=total-v2;
  const otherArchitectures=Object.fromEntries(
    Object.entries(inventory.summary.byArchitecture)
      .filter(([name,count])=>name!=='v2'&&count>0)
      .sort(([a],[b])=>a.localeCompare(b,'en'))
  );

  if(total===0)violations.push('student inventory is empty');
  if(nonV2!==0){
    violations.push(
      'steady state requires every student to be v2; non-v2='+nonV2+
      ' '+JSON.stringify(otherArchitectures)
    );
  }

  if(baseline?.version!==1)violations.push('architecture baseline version must be 1');
  if(baseline?.total!==total)violations.push('architecture baseline total '+String(baseline?.total)+' != inventory '+total);
  if(baseline?.minV2!==v2)violations.push('architecture baseline minV2 '+String(baseline?.minV2)+' != inventory v2 '+v2);
  if(baseline?.maxNonV2!==0)violations.push('architecture baseline maxNonV2 must stay 0 after migration completion');
  if((baseline?.byArchitecture?.v2||0)!==v2)violations.push('architecture baseline byArchitecture.v2 does not match inventory');
  for(const [name,count] of Object.entries(baseline?.byArchitecture||{})){
    if(name!=='v2'&&count)violations.push('architecture baseline retains non-v2 bucket '+name+'='+count);
  }

  const workflows=temporaryWorkflows(root);
  if(workflows.length){
    violations.push('temporary migration workflows remain on main: '+workflows.join(', '));
  }

  const packageFailures=[];
  for(const student of inventory.students){
    if(student.architecture!=='v2')continue;
    try{packageValidator({root,studentId:student.studentId});}
    catch(error){packageFailures.push({studentId:student.studentId,message:error.message});}
  }
  for(const failure of packageFailures){
    violations.push(failure.studentId+': v2 package validation failed: '+failure.message);
  }

  return {
    version:1,
    mode:'steady-state',
    ok:violations.length===0,
    total,
    v2,
    nonV2,
    byArchitecture:inventory.summary.byArchitecture,
    baseline,
    temporaryMigrationWorkflows:workflows,
    packageFailures,
    violations
  };
}

export function formatSteadyStateMarkdown(report){
  const lines=[
    '# Student Platform steady-state audit',
    '',
    '- students: **'+report.total+'**',
    '- v2: **'+report.v2+'**',
    '- non-v2: **'+report.nonV2+'**',
    '- temporary migration workflows: **'+report.temporaryMigrationWorkflows.length+'**',
    '- package failures: **'+report.packageFailures.length+'**',
    '',
    report.ok?'✅ Steady-state invariant passed.':'❌ Steady-state invariant failed.'
  ];
  for(const violation of report.violations)lines.push('- '+violation);
  return lines.join('\n')+'\n';
}

export function run(argv=process.argv.slice(2)){
  let root=ROOT,json=false,markdown=false;
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--root'){root=path.resolve(args.shift()||'');continue;}
    if(token==='--json'){json=true;continue;}
    if(token==='--markdown'){markdown=true;continue;}
    if(token==='--help'||token==='-h'){
      process.stdout.write('Usage: node pipeline/student/audit-steady-state.mjs [--json|--markdown] [--root ROOT]\n');
      return null;
    }
    throw new Error('Unknown option: '+token);
  }
  const report=auditStudentPlatformSteadyState({root});
  process.stdout.write(json?JSON.stringify(report,null,2)+'\n':formatSteadyStateMarkdown(report));
  if(!report.ok)throw new Error(report.violations.join('; '));
  return report;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){process.stderr.write('steady-state-audit: '+error.message+'\n');process.exitCode=1;}
}
