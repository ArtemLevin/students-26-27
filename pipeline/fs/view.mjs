import fs from 'node:fs';
import path from 'node:path';

function resolveInsideRoot(root,relative){
  const base=path.resolve(root);
  const target=path.isAbsolute(relative)
    ?path.resolve(relative)
    :path.resolve(base,...String(relative).split('/'));
  if(target!==base&&!target.startsWith(base+path.sep)){
    throw new Error('overlay fs: path escapes root: '+relative);
  }
  return target;
}

function fakeStat({directory=false,size=0,mode=0o644}={}){
  return {
    mode,
    size,
    isFile:()=>!directory,
    isDirectory:()=>directory,
    isSymbolicLink:()=>false
  };
}

function fakeDirent(name,{directory=false}={}){
  return {
    name,
    isFile:()=>!directory,
    isDirectory:()=>directory,
    isSymbolicLink:()=>false
  };
}

export function createDiskFsView(){
  return {
    existsSync:file=>fs.existsSync(file),
    readFileSync:(file,options)=>fs.readFileSync(file,options),
    readdirSync:(directory,options)=>fs.readdirSync(directory,options),
    statSync:file=>fs.statSync(file),
    lstatSync:file=>fs.lstatSync(file)
  };
}

export function createOverlayFsView({
  root=process.cwd(),
  writes=[],
  base=createDiskFsView()
}={}){
  const baseRoot=path.resolve(root);
  const files=new Map();
  const directories=new Set([baseRoot]);

  for(const write of writes){
    if(!write||!['create','update'].includes(write.kind)){
      throw new Error('overlay fs: unsupported write');
    }
    const target=resolveInsideRoot(baseRoot,write.path);
    files.set(target,Buffer.from(String(write.content),'utf8'));

    let current=path.dirname(target);
    while(current===baseRoot||current.startsWith(baseRoot+path.sep)){
      directories.add(current);
      if(current===baseRoot)break;
      current=path.dirname(current);
    }
  }

  function existsSync(file){
    const target=resolveInsideRoot(baseRoot,file);
    if(files.has(target)||directories.has(target))return true;
    return base.existsSync(target);
  }

  function readFileSync(file,options){
    const target=resolveInsideRoot(baseRoot,file);
    if(files.has(target)){
      const buffer=files.get(target);
      if(typeof options==='string')return buffer.toString(options);
      if(options&&typeof options==='object'&&options.encoding){
        return buffer.toString(options.encoding);
      }
      return Buffer.from(buffer);
    }
    return base.readFileSync(target,options);
  }

  function statSync(file){
    const target=resolveInsideRoot(baseRoot,file);
    if(files.has(target)){
      let mode=0o644;
      if(base.existsSync(target)){
        try{mode=base.statSync(target).mode&0o777;}catch{}
      }
      return fakeStat({size:files.get(target).length,mode});
    }
    if(directories.has(target)&&!base.existsSync(target)){
      return fakeStat({directory:true,mode:0o755});
    }
    return base.statSync(target);
  }

  function readdirSync(directory,options){
    const target=resolveInsideRoot(baseRoot,directory);
    const entries=new Map();

    if(base.existsSync(target)){
      const stat=base.statSync(target);
      if(!stat.isDirectory())throw new Error('ENOTDIR: '+target);
      for(const entry of base.readdirSync(target,{withFileTypes:true})){
        entries.set(entry.name,{
          name:entry.name,
          directory:entry.isDirectory()
        });
      }
    }else if(!directories.has(target)){
      throw new Error('ENOENT: '+target);
    }

    for(const file of files.keys()){
      if(path.dirname(file)===target){
        entries.set(path.basename(file),{
          name:path.basename(file),
          directory:false
        });
      }
    }
    for(const directoryPath of directories){
      if(directoryPath===target)continue;
      if(path.dirname(directoryPath)===target){
        entries.set(path.basename(directoryPath),{
          name:path.basename(directoryPath),
          directory:true
        });
      }
    }

    const values=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name,'en'));
    if(options&&typeof options==='object'&&options.withFileTypes){
      return values.map(item=>fakeDirent(item.name,{directory:item.directory}));
    }
    return values.map(item=>item.name);
  }

  return {
    existsSync,
    readFileSync,
    readdirSync,
    statSync,
    lstatSync:statSync
  };
}
