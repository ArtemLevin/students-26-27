#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,inventoryStudents} from './inventory-students.mjs';

export const DEFAULT_BASELINE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'baseline.json');

export function evaluateArchitectureRatchet(report,baseline){
  if(!baseline||baseline.version!==1)throw new Error('Unsupported migration baseline');
  const v2=report.summary.byArchitecture.v2||0;
  const nonV2=report.summary.total-v2;
  const violations=[];

  if(v2<baseline.minV2)violations.push('v2 count regressed: '+v2+' < baseline '+baseline.minV2);
  if(nonV2>baseline.maxNonV2)violations.push('non-v2 count increased: '+nonV2+' > baseline '+baseline.maxNonV2);

  const improved=v2>baseline.minV2||nonV2<baseline.maxNonV2;
  if(improved&&(baseline.minV2!==v2||baseline.maxNonV2!==nonV2)){
    violations.push(
      'architecture improved but baseline was not ratcheted in the same change: '+
      'set minV2='+v2+' and maxNonV2='+nonV2
    );
  }

  return {ok:violations.length===0,v2,nonV2,total:report.summary.total,violations};
}

export function auditArchitectureRatchet({root=ROOT,baselinePath=DEFAULT_BASELINE}={}){
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  const report=inventoryStudents(root);
  return {...evaluateArchitectureRatchet(report,baseline),baseline,summary:report.summary};
}

export function run(argv=process.argv.slice(2)){
  let root=ROOT,baselinePath=DEFAULT_BASELINE,json=false;
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--json'){json=true;continue;}
    if(token==='--root'){root=path.resolve(args.shift()||'');continue;}
    if(token==='--baseline'){baselinePath=path.resolve(args.shift()||'');continue;}
    if(token==='--help'||token==='-h'){
      process.stdout.write('Usage: node pipeline/migration/audit-ratchet.mjs [--json] [--baseline FILE]\n');
      return null;
    }
    throw new Error('Unknown option: '+token);
  }
  const result=auditArchitectureRatchet({root,baselinePath});
  if(json)process.stdout.write(JSON.stringify(result,null,2)+'\n');
  else process.stdout.write(
    (result.ok?'✓':'✗')+' architecture ratchet: v2='+result.v2+
    ', non-v2='+result.nonV2+', total='+result.total+'\n'
  );
  if(!result.ok)throw new Error(result.violations.join('; '));
  return result;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){try{run();}catch(error){process.stderr.write('architecture-ratchet: '+error.message+'\n');process.exitCode=1;}}
