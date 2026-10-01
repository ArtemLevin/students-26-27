#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT} from './inventory-students.mjs';
import {validateStudentMigrationManifest} from './manifest.mjs';

export function parseArgs(argv){
  const out={root:ROOT,manifestPath:null,json:false,help:false};
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--json'){out.json=true;continue;}
    if(token==='--root'){out.root=path.resolve(args.shift()||'');continue;}
    if(token==='--manifest'){
      out.manifestPath=args.shift()||null;
      if(!out.manifestPath)throw new Error('--manifest requires a file path');
      continue;
    }
    throw new Error('Unknown option: '+token);
  }
  if(!out.help&&!out.manifestPath)throw new Error('--manifest is required');
  return out;
}

export function loadManifest(file){
  let value;
  try{value=JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(error){throw new Error('Cannot parse migration manifest '+file+': '+error.message);}
  return value;
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){
    process.stdout.write('Usage: node pipeline/migration/validate-manifest.mjs --manifest FILE [--root ROOT] [--json]\n');
    return null;
  }
  const manifestFile=path.isAbsolute(options.manifestPath)
    ?options.manifestPath
    :path.resolve(options.root,options.manifestPath);
  if(!fs.existsSync(manifestFile))throw new Error('Migration manifest file does not exist: '+options.manifestPath);
  const report=validateStudentMigrationManifest({
    root:options.root,
    manifest:loadManifest(manifestFile)
  });
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  return report;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){
    process.stderr.write('validate-manifest: '+error.message+'\n');
    process.exitCode=1;
  }
}
