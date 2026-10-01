#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,inspectStudent} from './inventory-students.mjs';

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

export function parseArgs(argv){
  const out={studentId:null,root:ROOT,dryRun:false,json:false,help:false};
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--dry-run'){out.dryRun=true;continue;}
    if(token==='--json'){out.json=true;continue;}
    if(token==='--root'){out.root=path.resolve(args.shift()||'');continue;}
    if(token.startsWith('--'))throw new Error('Unknown option: '+token);
    if(out.studentId)throw new Error('Unexpected argument: '+token);
    out.studentId=token;
  }
  if(!out.help&&!out.studentId)throw new Error('studentId is required');
  return out;
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){
    process.stdout.write('Usage: node pipeline/migration/migrate-student.mjs STUDENT --dry-run [--json]\n');
    return null;
  }
  if(!options.dryRun)throw new Error('Write migration is intentionally disabled in P2. Run with --dry-run; semantic mappings must be reviewed before writes.');
  const plan=buildMigrationPlan(options);
  process.stdout.write(JSON.stringify(plan,null,2)+'\n');
  return plan;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){try{run();}catch(error){process.stderr.write('migrate-student: '+error.message+'\n');process.exitCode=1;}}
