import fs from 'node:fs';
import path from 'node:path';
import {validateStudentPackage} from '../contract.mjs';

function resolveInsideRoot(root,relative){
  const base=path.resolve(root);
  const target=path.resolve(base,...String(relative).split('/'));
  if(target!==base&&!target.startsWith(base+path.sep)){
    throw new Error('publication verify: path escapes repository root: '+relative);
  }
  return target;
}

export function verifyPublishedPlan({root=process.cwd(),plan}={}){
  if(!plan||typeof plan!=='object')throw new Error('publication verify: plan is required');
  for(const write of plan.writes||[]){
    const file=resolveInsideRoot(root,write.path);
    if(!fs.existsSync(file))throw new Error('publication verify: expected file is missing: '+write.path);
    const actual=fs.readFileSync(file,'utf8');
    if(actual!==write.content)throw new Error('publication verify: written content mismatch: '+write.path);
  }
  const packageResult=validateStudentPackage({root,studentId:plan.studentId});
  return {
    studentId:plan.studentId,
    lessonDate:plan.lessonDate,
    contractVersion:packageResult.contractVersion,
    validatedWrites:(plan.writes||[]).map(item=>item.path)
  };
}
