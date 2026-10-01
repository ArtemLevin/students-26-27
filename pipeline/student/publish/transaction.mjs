import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {verifyPublishedPlan} from './verify.mjs';

function hashBuffer(buffer){
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
function resolveInsideRoot(root,relative,label='path'){
  const base=path.resolve(root);
  const target=path.resolve(base,...String(relative).split('/'));
  if(target!==base&&!target.startsWith(base+path.sep)){
    throw new Error('publication transaction: '+label+' escapes repository root: '+relative);
  }
  return target;
}
function tempPath(target,tag){
  return target+'.publish-'+tag+'-'+process.pid+'-'+crypto.randomBytes(6).toString('hex');
}
function writeTemp(target,content,tag){
  const temp=tempPath(target,tag);
  fs.writeFileSync(temp,content,'utf8');
  return temp;
}
function restoreBytes(target,buffer,mode){
  const temp=tempPath(target,'rollback');
  fs.writeFileSync(temp,buffer);
  if(mode!==null)fs.chmodSync(temp,mode);
  fs.renameSync(temp,target);
}
function cleanup(file){
  try{fs.rmSync(file,{force:true});}catch{}
}

export class StalePublicationPlanError extends Error{
  constructor(message){
    super(message);
    this.name='StalePublicationPlanError';
    this.code='STALE_PUBLICATION_PLAN';
  }
}

export function verifyPublicationPreconditions({
  root=process.cwd(),
  preconditions=[]
}={}){
  for(const item of preconditions){
    const file=resolveInsideRoot(root,item.path,'precondition');
    const exists=fs.existsSync(file);
    if(exists!==item.exists){
      throw new StalePublicationPlanError(
        item.path+' existence changed since the publication plan was built'
      );
    }
    if(exists){
      const currentHash=hashBuffer(fs.readFileSync(file));
      if(currentHash!==item.sha256){
        throw new StalePublicationPlanError(
          item.path+' content changed since the publication plan was built'
        );
      }
    }
  }
  return true;
}

export function executeV2Publication({
  root=process.cwd(),
  plan,
  postflight=verifyPublishedPlan,
  faultInjector=null
}={}){
  if(!plan||typeof plan!=='object')throw new Error('publication transaction: plan is required');
  if(plan.version!==1)throw new Error('publication transaction: unsupported plan version');
  if(!plan.executable){
    throw new Error('publication transaction: plan is not executable');
  }
  if((plan.reviewItems||[]).length){
    throw new Error('publication transaction: unresolved review items');
  }
  if((plan.conflicts||[]).length){
    throw new Error('publication transaction: unresolved conflicts');
  }

  verifyPublicationPreconditions({root,preconditions:plan.preconditions||[]});

  const writes=plan.writes||[];
  if(!writes.length){
    const verification=postflight({root,plan});
    return {
      studentId:plan.studentId,
      lessonDate:plan.lessonDate,
      changedFiles:[],
      verification,
      rolledBack:false
    };
  }

  const staged=[];
  const snapshots=new Map();
  const applied=[];
  try{
    for(const write of writes){
      if(!['create','update'].includes(write.kind)){
        throw new Error('publication transaction: unsupported write kind '+write.kind);
      }
      const target=resolveInsideRoot(root,write.path,'write');
      const parent=path.dirname(target);
      if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()){
        throw new Error('publication transaction: target directory is missing: '+path.relative(root,parent));
      }

      const exists=fs.existsSync(target);
      if(write.kind==='create'&&exists){
        throw new StalePublicationPlanError(write.path+' unexpectedly exists before create');
      }
      if(write.kind==='update'&&!exists){
        throw new StalePublicationPlanError(write.path+' disappeared before update');
      }

      snapshots.set(target,{
        exists,
        bytes:exists?fs.readFileSync(target):null,
        mode:exists?(fs.statSync(target).mode&0o777):null
      });
      const temp=writeTemp(target,write.content,'stage');
      const snapshot=snapshots.get(target);
      if(snapshot.mode!==null)fs.chmodSync(temp,snapshot.mode);
      staged.push({target,temp,write});
    }

    verifyPublicationPreconditions({root,preconditions:plan.preconditions||[]});

    for(let index=0;index<staged.length;index+=1){
      const item=staged[index];
      fs.renameSync(item.temp,item.target);
      item.temp=null;
      applied.push(item.target);
      if(faultInjector){
        faultInjector({
          phase:'after-write',
          index,
          path:item.write.path,
          applied:[...applied].map(file=>path.relative(root,file).replaceAll('\\','/'))
        });
      }
    }

    const verification=postflight({root,plan});
    return {
      studentId:plan.studentId,
      lessonDate:plan.lessonDate,
      changedFiles:writes.map(item=>item.path),
      verification,
      rolledBack:false
    };
  }catch(error){
    const rollbackErrors=[];
    for(const target of [...applied].reverse()){
      const snapshot=snapshots.get(target);
      try{
        if(snapshot?.exists){
          restoreBytes(target,snapshot.bytes,snapshot.mode);
        }else{
          fs.rmSync(target,{force:true});
        }
      }catch(rollbackError){
        rollbackErrors.push(path.relative(root,target)+': '+rollbackError.message);
      }
    }
    if(rollbackErrors.length){
      const combined=new Error(
        error.message+'\nRollback failed: '+rollbackErrors.join('; ')
      );
      combined.cause=error;
      throw combined;
    }
    const wrapped=new Error(error.message+'\nPublication changes were rolled back.');
    wrapped.cause=error;
    wrapped.code=error.code;
    throw wrapped;
  }finally{
    for(const item of staged){
      if(item.temp)cleanup(item.temp);
    }
  }
}
