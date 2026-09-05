import fs from 'node:fs';
import path from 'node:path';
import {replaceMasteryLevels} from './mastery-source.mjs';

function writeAtomic(filePath,content){
  const temp=`${filePath}.stage04-mastery-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function applyMasteryPatch(patch,contracts,{dryRun=false}={}){
  if(patch.status==='blocked')throw new Error(`Stage 04 mastery patch is blocked: ${patch.blocks.join('; ')}`);
  if(!contracts?.mastery)throw new Error(`${contracts?.studentId||'student'}: mastery contract is missing`);
  let source=contracts.mastery.source;
  for(const operation of patch.operations){
    if(operation.type==='set-mastery-levels')source=replaceMasteryLevels(source,operation.levels,contracts.mastery.locator);
    else throw new Error(`Unknown Stage 04 mastery operation: ${operation.type}`);
  }
  const changed=source!==contracts.mastery.source;
  const changedFiles=changed?[path.relative(contracts.root,contracts.mastery.path)]:[];
  if(changed&&!dryRun)writeAtomic(contracts.mastery.path,source);
  return {changedFiles,sources:{mastery:source}};
}
