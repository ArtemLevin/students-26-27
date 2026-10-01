import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createDiskFsView,
  createOverlayFsView
} from '../view.mjs';

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'overlay-fs-'));
  fs.mkdirSync(path.join(root,'site'),{recursive:true});
  fs.writeFileSync(path.join(root,'site','existing.txt'),'old\n');
  return root;
}

test('overlay shadows updates and exposes nested creates without touching disk',()=>{
  const root=fixture();
  const overlay=createOverlayFsView({
    root,
    writes:[
      {kind:'update',path:'site/existing.txt',content:'new\n'},
      {kind:'create',path:'site/data/lessons/item.json',content:'{}\n'}
    ]
  });

  assert.equal(
    overlay.readFileSync(path.join(root,'site','existing.txt'),'utf8'),
    'new\n'
  );
  assert.equal(
    fs.readFileSync(path.join(root,'site','existing.txt'),'utf8'),
    'old\n'
  );

  const nested=path.join(root,'site','data','lessons','item.json');
  assert.equal(overlay.existsSync(nested),true);
  assert.equal(fs.existsSync(nested),false);
  assert.equal(overlay.readFileSync(nested,'utf8'),'{}\n');
  assert.equal(overlay.statSync(nested).isFile(),true);
  assert.equal(
    overlay.statSync(path.join(root,'site','data','lessons')).isDirectory(),
    true
  );
});

test('overlay directory listings merge disk and candidate entries deterministically',()=>{
  const root=fixture();
  fs.writeFileSync(path.join(root,'site','z.txt'),'z');
  const overlay=createOverlayFsView({
    root,
    writes:[
      {kind:'create',path:'site/a.txt',content:'a'},
      {kind:'create',path:'site/data/item.txt',content:'x'}
    ]
  });

  assert.deepEqual(
    overlay.readdirSync(path.join(root,'site')),
    ['a.txt','data','existing.txt','z.txt']
  );

  const entries=overlay.readdirSync(path.join(root,'site'),{withFileTypes:true});
  assert.deepEqual(
    entries.map(entry=>[
      entry.name,
      entry.isDirectory()?'dir':'file'
    ]),
    [
      ['a.txt','file'],
      ['data','dir'],
      ['existing.txt','file'],
      ['z.txt','file']
    ]
  );
});

test('overlay delegates untouched files to disk view',()=>{
  const root=fixture();
  const base=createDiskFsView();
  const overlay=createOverlayFsView({root,base,writes:[]});
  const file=path.join(root,'site','existing.txt');

  assert.equal(overlay.existsSync(file),true);
  assert.equal(overlay.readFileSync(file,'utf8'),'old\n');
  assert.equal(overlay.statSync(file).isFile(),true);
});

test('overlay rejects paths escaping its repository root',()=>{
  const root=fixture();
  const overlay=createOverlayFsView({root,writes:[]});
  assert.throws(
    ()=>overlay.existsSync(path.resolve(root,'..','outside.txt')),
    /path escapes root/
  );
});
