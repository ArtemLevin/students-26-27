#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DATE_HTML=/^(?:\d{2}\.\d{2}\.\d{2}|\d{2}-\d{2}-\d{2})\.html$/;

function exists(file){return fs.existsSync(file);}
function countFiles(dir,predicate=()=>true){
  if(!exists(dir))return 0;
  return fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>entry.isFile()&&predicate(entry.name)).length;
}
function firstExisting(paths){return paths.find(exists)||null;}

export function inspectStudent(root,studentId){
  const base=path.join(root,'students',studentId),site=path.join(base,'site');
  const contract=path.join(base,'student-contract.json');
  const index=path.join(site,'index.html');
  const lessonRegistry=path.join(site,'lesson-registry.js');
  const dashboard=path.join(site,'dashboard.js');
  const ktp=path.join(site,'ktp.html');
  const competency=firstExisting([
    path.join(site,'competency-map-data.js'),
    path.join(base,'competency-map-data.js'),
    path.join(site,'competence-config.js'),
    path.join(site,'dashboard-data.js')
  ]);
  const mastery=firstExisting([
    path.join(site,'mastery-authority.js'),
    path.join(site,'stage04-mastery.js'),
    path.join(site,'competence-config.js'),
    path.join(site,'competency-map-baseline.js'),
    path.join(site,'dashboard-data.js')
  ]);
  const practice=path.join(site,'practice-config.js');
  const design=path.join(site,'design.json');
  const chemistry=path.join(base,'chemistry');

  let architecture='legacy-bespoke';
  if(exists(contract))architecture='v2';
  else if(exists(lessonRegistry)&&exists(dashboard))architecture='modern-shared';
  else if(exists(ktp))architecture='legacy-ktp';
  else if(competency)architecture='legacy-structured';

  return {
    studentId,
    architecture,
    features:{
      contract:exists(contract),
      index:exists(index),
      design:exists(design),
      ktp:exists(ktp),
      lessonRegistry:exists(lessonRegistry),
      dashboard:exists(dashboard),
      competency:!!competency,
      mastery:!!mastery,
      practice:exists(practice),
      chemistry:exists(chemistry)
    },
    counts:{
      lessonHtml:countFiles(site,name=>DATE_HTML.test(name)),
      lessonLabs:countFiles(site,name=>/-lab\.html$/.test(name)),
      tex:countFiles(path.join(base,'tex_docs'),name=>name.endsWith('.tex')),
      pdf:countFiles(path.join(base,'pdf_docs'),name=>name.endsWith('.pdf'))
    },
    paths:{
      competency:competency?path.relative(root,competency).replaceAll('\\','/'):null,
      mastery:mastery?path.relative(root,mastery).replaceAll('\\','/'):null
    }
  };
}

export function inventoryStudents(root=ROOT){
  const studentsDir=path.join(root,'students');
  if(!exists(studentsDir))return {students:[],summary:{total:0,byArchitecture:{}}};
  const students=fs.readdirSync(studentsDir,{withFileTypes:true})
    .filter(entry=>entry.isDirectory())
    .map(entry=>inspectStudent(root,entry.name))
    .filter(item=>item.features.index||item.features.contract)
    .sort((a,b)=>a.studentId.localeCompare(b.studentId,'en'));
  const byArchitecture={};
  for(const item of students)byArchitecture[item.architecture]=(byArchitecture[item.architecture]||0)+1;
  return {students,summary:{total:students.length,byArchitecture}};
}

export function inventoryMarkdown(report){
  const lines=['# Student architecture inventory','',`Total: **${report.summary.total}**`,''];
  for(const [name,count] of Object.entries(report.summary.byArchitecture).sort())lines.push(`- ${name}: **${count}**`);
  lines.push('','| Student | Architecture | KTP | Registry | Competency | Mastery | Lessons |','|---|---|---:|---:|---:|---:|---:|');
  for(const item of report.students)lines.push(`| ${item.studentId} | ${item.architecture} | ${item.features.ktp?'yes':'—'} | ${item.features.lessonRegistry?'yes':'—'} | ${item.features.competency?'yes':'—'} | ${item.features.mastery?'yes':'—'} | ${item.counts.lessonHtml} |`);
  return lines.join('\n')+'\n';
}

export function parseArgs(argv){
  const out={root:ROOT,json:false,jsonOutput:null,markdownOutput:null,help:false};
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--json'){out.json=true;continue;}
    if(token==='--root'){out.root=path.resolve(args.shift()||'');continue;}
    if(token==='--json-output'){out.jsonOutput=args.shift()||null;continue;}
    if(token==='--markdown-output'){out.markdownOutput=args.shift()||null;continue;}
    throw new Error('Unknown option: '+token);
  }
  return out;
}

export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){
    process.stdout.write('Usage: node pipeline/migration/inventory-students.mjs [--json] [--json-output FILE] [--markdown-output FILE]\n');
    return null;
  }
  const report=inventoryStudents(options.root);
  if(options.jsonOutput)fs.writeFileSync(options.jsonOutput,JSON.stringify(report,null,2)+'\n');
  if(options.markdownOutput)fs.writeFileSync(options.markdownOutput,inventoryMarkdown(report));
  process.stdout.write(options.json?JSON.stringify(report,null,2)+'\n':inventoryMarkdown(report));
  return report;
}

const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){try{run();}catch(error){process.stderr.write('student-inventory: '+error.message+'\n');process.exitCode=1;}}
