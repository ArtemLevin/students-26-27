import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  directoryEntriesSha256,
  executeAtomicPlan,
  sha256,
  StaleTransactionPlanError,
  verifyTransactionPreconditions
} from '../atomic-transaction.mjs';

function fixture(){
  return fs.mkdtempSync(path.join(os.tmpdir(),'student-tx-core-'));
}
function write(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function tempRoots(root){
  return fs.readdirSync(root).filter(name=>name.startsWith('.student-tx-'));
}
function filePrecondition(root,relative){
  const file=path.join(root,...relative.split('/'));
  const exists=fs.existsSync(file);
  return {
    kind:'file',
    path:relative,
    exists,
    sha256:exists?sha256(fs.readFileSync(file)):null
  };
}
function dirPrecondition(root,relative){
  const directory=path.join(root,...relative.split('/'));
  const exists=fs.existsSync(directory);
  return {
    kind:'directory',
    path:relative,
    exists,
    entriesSha256:exists?directoryEntriesSha256(directory):null
  };
}
function plan(overrides={}){
  return {
    version:1,
    executable:true,
    reviewItems:[],
    conflicts:[],
    preconditions:[],
    writes:[],
    ...overrides
  };
}

test('shared transaction creates nested directories and files atomically',()=>{
  const root=fixture();
  const value=plan({
    writes:[
      {kind:'create',path:'students/demo/site/data/a.txt',content:'A\n'},
      {kind:'create',path:'students/demo/site/data/lessons/b.txt',content:'B\n'}
    ]
  });
  const result=executeAtomicPlan({
    root,
    plan:value,
    postflight:()=>({ok:true})
  });

  assert.deepEqual(result.changedFiles,value.writes.map(item=>item.path));
  assert.equal(result.rolledBack,false);
  assert.equal(result.verification.ok,true);
  assert.equal(
    fs.readFileSync(path.join(root,'students/demo/site/data/a.txt'),'utf8'),
    'A\n'
  );
  assert.equal(
    fs.readFileSync(path.join(root,'students/demo/site/data/lessons/b.txt'),'utf8'),
    'B\n'
  );
  assert.deepEqual(tempRoots(root),[]);
});

test('file and directory preconditions detect stale repository state',()=>{
  const root=fixture();
  write(path.join(root,'data/a.txt'),'A');
  const file=filePrecondition(root,'data/a.txt');
  const directory=dirPrecondition(root,'data');

  assert.equal(
    verifyTransactionPreconditions({
      root,
      preconditions:[file,directory]
    }),
    true
  );

  write(path.join(root,'data/b.txt'),'B');
  assert.throws(
    ()=>verifyTransactionPreconditions({
      root,
      preconditions:[file,directory]
    }),
    error=>
      error instanceof StaleTransactionPlanError&&
      /entries changed/.test(error.message)
  );
});

test('transaction staging directory is ignored by directory precondition hashing',()=>{
  const root=fixture();
  write(path.join(root,'data/a.txt'),'A');
  const directory=dirPrecondition(root,'.');
  const value=plan({
    preconditions:[directory],
    writes:[{kind:'update',path:'data/a.txt',content:'B'}]
  });

  executeAtomicPlan({root,plan:value});
  assert.equal(fs.readFileSync(path.join(root,'data/a.txt'),'utf8'),'B');
  assert.deepEqual(tempRoots(root),[]);
});

test('stale file aborts before target writes',()=>{
  const root=fixture();
  write(path.join(root,'data/a.txt'),'A');
  const value=plan({
    preconditions:[filePrecondition(root,'data/a.txt')],
    writes:[{kind:'update',path:'data/a.txt',content:'B'}]
  });
  write(path.join(root,'data/a.txt'),'external');

  assert.throws(
    ()=>executeAtomicPlan({root,plan:value}),
    error=>
      error instanceof StaleTransactionPlanError&&
      error.code==='STALE_TRANSACTION_PLAN'
  );
  assert.equal(fs.readFileSync(path.join(root,'data/a.txt'),'utf8'),'external');
  assert.deepEqual(tempRoots(root),[]);
});

test('partial failure restores bytes and removes newly created directories',()=>{
  const root=fixture();
  write(path.join(root,'existing.txt'),'before');
  const before=fs.readFileSync(path.join(root,'existing.txt'));

  const value=plan({
    writes:[
      {kind:'update',path:'existing.txt',content:'after'},
      {kind:'create',path:'nested/deeper/new.txt',content:'new'}
    ]
  });

  assert.throws(
    ()=>executeAtomicPlan({
      root,
      plan:value,
      faultInjector:event=>{
        if(event.phase==='after-write'&&event.index===1){
          throw new Error('forced migration fault');
        }
      }
    }),
    /Transaction changes were rolled back/
  );

  assert.deepEqual(fs.readFileSync(path.join(root,'existing.txt')),before);
  assert.equal(fs.existsSync(path.join(root,'nested')),false);
  assert.deepEqual(tempRoots(root),[]);
});

test('postflight failure restores updates and created directories',()=>{
  const root=fixture();
  write(path.join(root,'state.json'),'old\n');
  const value=plan({
    writes:[
      {kind:'update',path:'state.json',content:'new\n'},
      {kind:'create',path:'site/data/lessons/item.json',content:'{}\n'}
    ]
  });

  assert.throws(
    ()=>executeAtomicPlan({
      root,
      plan:value,
      postflight:()=>{
        throw new Error('candidate invalid after commit');
      }
    }),
    /candidate invalid after commit[\s\S]*rolled back/
  );

  assert.equal(fs.readFileSync(path.join(root,'state.json'),'utf8'),'old\n');
  assert.equal(fs.existsSync(path.join(root,'site')),false);
  assert.deepEqual(tempRoots(root),[]);
});

test('update preserves existing file mode',()=>{
  const root=fixture();
  const file=path.join(root,'script.sh');
  write(file,'echo old\n');
  fs.chmodSync(file,0o744);

  executeAtomicPlan({
    root,
    plan:plan({
      writes:[{kind:'update',path:'script.sh',content:'echo new\n'}]
    })
  });

  assert.equal(fs.statSync(file).mode&0o777,0o744);
});

test('validated no-op runs postflight with zero writes',()=>{
  const root=fixture();
  let called=0;
  const result=executeAtomicPlan({
    root,
    plan:plan(),
    postflight:()=>{
      called+=1;
      return {validated:true};
    }
  });
  assert.equal(called,1);
  assert.deepEqual(result.changedFiles,[]);
  assert.deepEqual(result.verification,{validated:true});
  assert.deepEqual(tempRoots(root),[]);
});

test('review items and conflicts block execution before writes',()=>{
  const root=fixture();
  const target=path.join(root,'blocked.txt');

  assert.throws(
    ()=>executeAtomicPlan({
      root,
      plan:plan({
        reviewItems:[{type:'review'}],
        writes:[{kind:'create',path:'blocked.txt',content:'x'}]
      })
    }),
    /unresolved review items/
  );
  assert.equal(fs.existsSync(target),false);

  assert.throws(
    ()=>executeAtomicPlan({
      root,
      plan:plan({
        conflicts:[{type:'conflict'}],
        writes:[{kind:'create',path:'blocked.txt',content:'x'}]
      })
    }),
    /unresolved conflicts/
  );
  assert.equal(fs.existsSync(target),false);
});
