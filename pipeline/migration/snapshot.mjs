import fs from 'node:fs';
import path from 'node:path';
import {
  directoryEntriesSha256,
  sha256
} from '../fs/atomic-transaction.mjs';

function relative(root,target){
  return path.relative(root,target).replaceAll('\\','/');
}
function insideRoot(root,target){
  const base=path.resolve(root),resolved=path.resolve(target);
  return resolved===base||resolved.startsWith(base+path.sep);
}
function resolveRepoPath(root,value,label){
  const target=path.isAbsolute(value)
    ?path.resolve(value)
    :path.resolve(root,...String(value).split('/'));
  if(!insideRoot(root,target)){
    throw new Error('migration snapshot: '+label+' is outside repository root');
  }
  return target;
}
function filePrecondition(root,file){
  const exists=fs.existsSync(file);
  return {
    kind:'file',
    path:relative(root,file),
    exists,
    sha256:exists?sha256(fs.readFileSync(file)):null
  };
}
function directoryPrecondition(root,directory){
  const exists=fs.existsSync(directory);
  return {
    kind:'directory',
    path:relative(root,directory)||'.',
    exists,
    entriesSha256:exists?directoryEntriesSha256(directory):null
  };
}
function protectedStudentFile(studentRoot,file){
  const rel=path.relative(studentRoot,file).replaceAll('\\','/');
  if(rel.startsWith('pdf_docs/')||rel.startsWith('tex_docs/')||rel.startsWith('images/'))return true;
  if(rel.startsWith('site/')&&rel.endsWith('.html'))return true;
  return [
    'site/design.json',
    'site/dashboard.js',
    'site/practice-config.js',
    'site/ktp.html'
  ].includes(rel);
}
function walkTree(root,directory,target){
  const stat=fs.lstatSync(directory);
  if(stat.isSymbolicLink()){
    throw new Error('migration snapshot: symlink is not supported: '+relative(root,directory));
  }
  if(!stat.isDirectory()){
    throw new Error('migration snapshot: expected directory: '+relative(root,directory));
  }
  target.directories.push(directory);
  const entries=fs.readdirSync(directory,{withFileTypes:true})
    .sort((a,b)=>a.name.localeCompare(b.name,'en'));
  for(const entry of entries){
    const file=path.join(directory,entry.name);
    const item=fs.lstatSync(file);
    if(item.isSymbolicLink()){
      throw new Error('migration snapshot: symlink is not supported: '+relative(root,file));
    }
    if(item.isDirectory()){
      walkTree(root,file,target);
    }else if(item.isFile()){
      target.files.push(file);
    }else{
      throw new Error('migration snapshot: unsupported filesystem entry: '+relative(root,file));
    }
  }
}
function dedupePreconditions(items){
  const seen=new Set(),out=[];
  for(const item of items){
    const key=item.kind+'\u0000'+item.path;
    if(seen.has(key))continue;
    seen.add(key);out.push(item);
  }
  return out.sort((a,b)=>
    a.path.localeCompare(b.path,'en')||
    a.kind.localeCompare(b.kind,'en')
  );
}

export function buildMigrationSnapshot({
  root=process.cwd(),
  studentId,
  manifestPath,
  writePaths=[]
}={}){
  if(!studentId)throw new Error('migration snapshot: studentId is required');
  if(!manifestPath)throw new Error('migration snapshot: manifestPath is required');

  const studentRoot=path.join(root,'students',studentId);
  if(!fs.existsSync(studentRoot)||!fs.statSync(studentRoot).isDirectory()){
    throw new Error('migration snapshot: student directory does not exist: '+studentId);
  }

  const manifestFile=resolveRepoPath(root,manifestPath,'manifest');
  if(!fs.existsSync(manifestFile)||!fs.statSync(manifestFile).isFile()){
    throw new Error('migration snapshot: manifest file does not exist');
  }
  const baselineFile=path.join(root,'pipeline','migration','baseline.json');
  if(!fs.existsSync(baselineFile)||!fs.statSync(baselineFile).isFile()){
    throw new Error('migration snapshot: baseline file does not exist');
  }

  const tree={directories:[],files:[]};
  walkTree(root,studentRoot,tree);

  const preconditions=[
    ...tree.directories.map(directory=>directoryPrecondition(root,directory)),
    ...tree.files.map(file=>filePrecondition(root,file)),
    filePrecondition(root,manifestFile),
    filePrecondition(root,baselineFile)
  ];

  for(const relativePath of writePaths){
    const target=resolveRepoPath(root,relativePath,'write target');
    if(!fs.existsSync(target)){
      preconditions.push(filePrecondition(root,target));
    }
  }

  const protectedFiles=tree.files
    .filter(file=>protectedStudentFile(studentRoot,file))
    .map(file=>({
      path:relative(root,file),
      sha256:sha256(fs.readFileSync(file))
    }))
    .sort((a,b)=>a.path.localeCompare(b.path,'en'));

  return {
    preconditions:dedupePreconditions(preconditions),
    protectedFiles,
    manifest:{
      path:relative(root,manifestFile),
      sha256:sha256(fs.readFileSync(manifestFile))
    },
    baseline:{
      path:relative(root,baselineFile),
      sha256:sha256(fs.readFileSync(baselineFile))
    }
  };
}

export function verifyProtectedFiles({
  root=process.cwd(),
  protectedFiles=[]
}={}){
  for(const item of protectedFiles){
    const file=resolveRepoPath(root,item.path,'protected file');
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
      throw new Error('migration preservation: protected file is missing: '+item.path);
    }
    const current=sha256(fs.readFileSync(file));
    if(current!==item.sha256){
      throw new Error('migration preservation: protected file changed: '+item.path);
    }
  }
  return {
    protectedFiles:protectedFiles.length,
    unchanged:true
  };
}
