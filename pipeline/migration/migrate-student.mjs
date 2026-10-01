#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isCalendarDate} from '../student/contract.mjs';
import {ROOT,inspectStudent} from './inventory-students.mjs';
import {buildValidatedMigrationPlan} from './plan.mjs';

export function buildMigrationPlan({root=ROOT,studentId}){
  if(!studentId)throw new Error('studentId is required');
  const snapshot=inspectStudent(root,studentId);
  if(snapshot.architecture==='v2'){
    return {studentId,status:'noop',architecture:snapshot.architecture,automaticWrites:false,operations:[],semanticTasks:[],blockers:[]};
  }

  const blockers=[];
  if(!snapshot.features.index)blockers.push('site/index.html is missing');
  if(!snapshot.features.design)blockers.push('site/design.json is missing');

  const operations=[
    'create student-contract.json',
    'create site/data/ktp-plan.json',
    'create site/data/ktp-state.json',
    'create site/data/lessons/',
    snapshot.features.lessonRegistry?'preserve and normalize lesson-registry.js':'create lesson-registry.js',
    'wire dashboard/KTP/competency evidence to repository state',
    'add student-specific v2 regression'
  ];
  const semanticTasks=[
    snapshot.features.ktp
      ?'extract the existing KTP into stable ktp-NNN records without rewriting its meaning'
      :'choose fixed or rolling planning mode and build the initial KTP plan',
    snapshot.counts.lessonHtml
      ?'map existing lesson pages to lesson metadata and KTP refs'
      :'initialize an empty lesson metadata registry',
    snapshot.features.competency
      ?'map lesson evidence to existing stable competency IDs without auto-promoting mastery'
      :'establish a competency catalog before evidence mapping'
  ];

  return {
    studentId,
    status:blockers.length?'blocked':'ready',
    architecture:snapshot.architecture,
    recommendedPlanningMode:snapshot.features.ktp?'fixed':'rolling',
    automaticWrites:false,
    operations,
    semanticTasks,
    preserve:[
      'existing lesson HTML',
      'existing PDF/TeX/images',
      'existing confirmed mastery levels',
      'LEVIN / ATLAS design fingerprint'
    ],
    blockers,
    snapshot
  };
}

function optionValue(args,token){
  const value=args.shift();
  if(value===undefined||value.startsWith('--'))throw new Error(token+' requires a value');
  return value;
}

export function parseArgs(argv){
  const out={
    studentId:null,
    root:ROOT,
    dryRun:false,
    apply:false,
    json:false,
    manifestPath:null,
    date:null,
    help:false
  };
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--dry-run'){out.dryRun=true;continue;}
    if(token==='--apply'){out.apply=true;continue;}
    if(token==='--json'){out.json=true;continue;}
    if(token==='--root'){
      out.root=path.resolve(optionValue(args,'--root'));
      continue;
    }
    if(token==='--manifest'){
      out.manifestPath=optionValue(args,'--manifest');
      continue;
    }
    if(token==='--date'){
      out.date=optionValue(args,'--date');
      continue;
    }
    if(token.startsWith('--'))throw new Error('Unknown option: '+token);
    if(out.studentId)throw new Error('Unexpected argument: '+token);
    out.studentId=token;
  }
  if(!out.help&&!out.studentId)throw new Error('studentId is required');
  if(out.dryRun&&out.apply)throw new Error('--dry-run and --apply are mutually exclusive');
  if(out.date!==null&&!isCalendarDate(out.date))throw new Error('--date must be a valid YYYY-MM-DD calendar date');
  return out;
}

function resolveManifestPath(root,manifestPath){
  if(path.isAbsolute(manifestPath))return path.resolve(manifestPath);
  return path.resolve(root,...String(manifestPath).split('/'));
}

export function loadMigrationManifest({root=ROOT,manifestPath}={}){
  if(!manifestPath)throw new Error('--manifest is required for validated migration dry-run');
  const file=resolveManifestPath(root,manifestPath);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
    throw new Error('Migration manifest does not exist: '+manifestPath);
  }
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(error){throw new Error('Cannot parse migration manifest '+manifestPath+': '+error.message);}
}

export function migrationDateToday(){
  return new Date().toISOString().slice(0,10);
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){
    process.stdout.write(
      'Usage: node pipeline/migration/migrate-student.mjs STUDENT --dry-run [--manifest FILE] [--date YYYY-MM-DD] [--json]\n'
    );
    return null;
  }
  if(options.apply){
    throw new Error('Write migration remains disabled in P5.0d.3. Use --dry-run; transactional activation is P5.0d.4.');
  }
  if(!options.dryRun){
    throw new Error('Write migration remains disabled in P5.0d.3. Run with --dry-run.');
  }

  let plan;
  if(options.manifestPath){
    const manifest=loadMigrationManifest({
      root:options.root,
      manifestPath:options.manifestPath
    });
    if(manifest.studentId!==options.studentId){
      throw new Error(
        'Migration manifest studentId '+String(manifest.studentId)+
        ' does not match requested student '+options.studentId
      );
    }
    plan=buildValidatedMigrationPlan({
      root:options.root,
      manifest,
      migrationDate:options.date||migrationDateToday()
    });
  }else{
    if(options.date!==null){
      throw new Error('--date requires --manifest');
    }
    plan=buildMigrationPlan(options);
  }

  process.stdout.write(JSON.stringify(plan,null,2)+'\n');
  return plan;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){
    process.stderr.write('migrate-student: '+error.message+'\n');
    process.exitCode=1;
  }
}
