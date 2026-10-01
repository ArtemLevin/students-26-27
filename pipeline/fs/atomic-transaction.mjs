import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TX_PREFIX='.student-tx-';

export function sha256(value){
  return crypto.createHash('sha256').update(value).digest('hex');
}

function entryType(entry){
  if(entry.isDirectory())return 'directory';
  if(entry.isFile())return 'file';
  if(entry.isSymbolicLink())return 'symlink';
  return 'other';
}

export function directoryEntriesSha256(directory){
  const entries=fs.readdirSync(directory,{withFileTypes:true})
    .filter(entry=>!entry.name.startsWith(TX_PREFIX))
    .map(entry=>entry.name+'\0'+entryType(entry))
    .sort();
  return sha256(Buffer.from(entries.join('\n'),'utf8'));
}

export function resolveInsideRoot(root,relative,label='path'){
  const base=path.resolve(root);
  const target=path.resolve(base,...String(relative).split('/'));
  if(target!==base&&!target.startsWith(base+path.sep)){
    throw new Error('transaction: '+label+' escapes repository root: '+relative);
  }
  return target;
}

export class StaleTransactionPlanError extends Error{
  constructor(message){
    super(message);
    this.name='StaleTransactionPlanError';
    this.code='STALE_TRANSACTION_PLAN';
  }
}

function stale(StaleError,message){
  throw new StaleError(message);
}

export function verifyTransactionPreconditions({
  root=process.cwd(),
  preconditions=[],
  StaleError=StaleTransactionPlanError,
  planLabel='transaction'
}={}){
  for(const item of preconditions){
    if(!item||typeof item!=='object')throw new Error('transaction: invalid precondition');
    const kind=item.kind||'file';
    if(!['file','directory'].includes(kind)){
      throw new Error('transaction: unsupported precondition kind '+kind);
    }

    const target=resolveInsideRoot(root,item.path,'precondition');
    const exists=fs.existsSync(target);
    if(exists!==item.exists){
      stale(
        StaleError,
        item.path+' existence changed since the '+planLabel+' plan was built'
      );
    }
    if(!exists)continue;

    const stat=fs.statSync(target);
    if(kind==='file'){
      if(!stat.isFile()){
        stale(StaleError,item.path+' type changed since the '+planLabel+' plan was built');
      }
      const currentHash=sha256(fs.readFileSync(target));
      if(currentHash!==item.sha256){
        stale(
          StaleError,
          item.path+' content changed since the '+planLabel+' plan was built'
        );
      }
      continue;
    }

    if(!stat.isDirectory()){
      stale(StaleError,item.path+' type changed since the '+planLabel+' plan was built');
    }
    const currentHash=directoryEntriesSha256(target);
    if(currentHash!==item.entriesSha256){
      stale(
        StaleError,
        item.path+' entries changed since the '+planLabel+' plan was built'
      );
    }
  }
  return true;
}

function restoreBytes(target,buffer,mode,stagingRoot,index){
  const temp=path.join(stagingRoot,'rollback-'+String(index).padStart(4,'0'));
  fs.writeFileSync(temp,buffer);
  if(mode!==null)fs.chmodSync(temp,mode);
  fs.renameSync(temp,target);
}

function ensureParentDirectories({root,target,createdDirs}){
  const base=path.resolve(root);
  const missing=[];
  let current=path.dirname(target);

  while(current!==base&&!fs.existsSync(current)){
    missing.push(current);
    current=path.dirname(current);
  }

  if(!fs.existsSync(current)||!fs.statSync(current).isDirectory()){
    throw new Error(
      'transaction: target parent is not a directory: '+
      path.relative(base,current).replaceAll('\\','/')
    );
  }

  for(const directory of missing.reverse()){
    fs.mkdirSync(directory);
    createdDirs.push(directory);
  }
}

function rollbackCreatedDirectories(createdDirs,root,errors){
  for(const directory of [...createdDirs].reverse()){
    try{
      if(fs.existsSync(directory))fs.rmdirSync(directory);
    }catch(error){
      errors.push(
        path.relative(root,directory).replaceAll('\\','/')+': '+error.message
      );
    }
  }
}

export function executeAtomicPlan({
  root=process.cwd(),
  plan,
  postflight=()=>null,
  faultInjector=null,
  StaleError=StaleTransactionPlanError,
  planLabel='transaction',
  rollbackMessage='Transaction changes were rolled back.'
}={}){
  if(!plan||typeof plan!=='object')throw new Error('transaction: plan is required');
  if(plan.version!==1)throw new Error('transaction: unsupported plan version');
  if(!plan.executable)throw new Error('transaction: plan is not executable');
  if((plan.reviewItems||[]).length)throw new Error('transaction: unresolved review items');
  if((plan.conflicts||[]).length)throw new Error('transaction: unresolved conflicts');

  verifyTransactionPreconditions({
    root,
    preconditions:plan.preconditions||[],
    StaleError,
    planLabel
  });

  const writes=plan.writes||[];
  if(!writes.length){
    const verification=postflight({root,plan});
    return {
      changedFiles:[],
      verification,
      rolledBack:false
    };
  }

  const base=path.resolve(root);
  const stagingRoot=fs.mkdtempSync(path.join(base,TX_PREFIX));
  const staged=[];
  const snapshots=new Map();
  const applied=[];
  const createdDirs=[];

  try{
    for(let index=0;index<writes.length;index+=1){
      const write=writes[index];
      if(!['create','update'].includes(write.kind)){
        throw new Error('transaction: unsupported write kind '+write.kind);
      }
      const target=resolveInsideRoot(root,write.path,'write');
      const exists=fs.existsSync(target);

      if(write.kind==='create'&&exists){
        stale(StaleError,write.path+' unexpectedly exists before create');
      }
      if(write.kind==='update'&&!exists){
        stale(StaleError,write.path+' disappeared before update');
      }
      if(exists&&!fs.statSync(target).isFile()){
        stale(StaleError,write.path+' is not a regular file');
      }

      const snapshot={
        exists,
        bytes:exists?fs.readFileSync(target):null,
        mode:exists?(fs.statSync(target).mode&0o777):null
      };
      snapshots.set(target,snapshot);

      const temp=path.join(
        stagingRoot,
        'stage-'+String(index).padStart(4,'0')+'-'+path.basename(target)
      );
      fs.writeFileSync(temp,write.content,'utf8');
      if(snapshot.mode!==null)fs.chmodSync(temp,snapshot.mode);
      staged.push({target,temp,write});
    }

    verifyTransactionPreconditions({
      root,
      preconditions:plan.preconditions||[],
      StaleError,
      planLabel
    });

    for(let index=0;index<staged.length;index+=1){
      const item=staged[index];
      ensureParentDirectories({
        root,
        target:item.target,
        createdDirs
      });
      fs.renameSync(item.temp,item.target);
      item.temp=null;
      applied.push(item.target);

      if(faultInjector){
        faultInjector({
          phase:'after-write',
          index,
          path:item.write.path,
          applied:[...applied].map(file=>
            path.relative(root,file).replaceAll('\\','/')
          )
        });
      }
    }

    const verification=postflight({root,plan});
    return {
      changedFiles:writes.map(item=>item.path),
      verification,
      rolledBack:false
    };
  }catch(error){
    const rollbackErrors=[];
    for(let index=applied.length-1;index>=0;index-=1){
      const target=applied[index];
      const snapshot=snapshots.get(target);
      try{
        if(snapshot?.exists){
          restoreBytes(target,snapshot.bytes,snapshot.mode,stagingRoot,index);
        }else{
          fs.rmSync(target,{force:true});
        }
      }catch(rollbackError){
        rollbackErrors.push(
          path.relative(root,target).replaceAll('\\','/')+': '+rollbackError.message
        );
      }
    }

    rollbackCreatedDirectories(createdDirs,root,rollbackErrors);

    if(rollbackErrors.length){
      const combined=new Error(
        error.message+'\nRollback failed: '+rollbackErrors.join('; ')
      );
      combined.cause=error;
      combined.code=error.code;
      throw combined;
    }

    const wrapped=new Error(error.message+'\n'+rollbackMessage);
    wrapped.cause=error;
    wrapped.code=error.code;
    throw wrapped;
  }finally{
    fs.rmSync(stagingRoot,{recursive:true,force:true});
  }
}
