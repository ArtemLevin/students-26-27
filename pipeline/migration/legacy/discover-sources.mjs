import fs from 'node:fs';
import path from 'node:path';

const CANDIDATE_NAMES=[
  'competency-map-data.js',
  'competency-map-baseline.js',
  'competence-config.js',
  'dashboard-data.js',
  'mastery-authority.js',
  'stage04-mastery.js'
];

const ORDER=new Map(CANDIDATE_NAMES.map((name,index)=>[name,index]));

export function discoverLegacyLearningSources({root=process.cwd(),studentId}={}){
  if(!studentId)throw new Error('legacy source discovery: studentId is required');
  const studentRoot=path.join(root,'students',studentId);
  if(!fs.existsSync(studentRoot))throw new Error('legacy source discovery: student directory does not exist: '+studentId);
  const candidates=[];
  for(const directory of [studentRoot,path.join(studentRoot,'site')]){
    if(!fs.existsSync(directory)||!fs.statSync(directory).isDirectory())continue;
    for(const name of CANDIDATE_NAMES){
      const file=path.join(directory,name);
      if(fs.existsSync(file)&&fs.statSync(file).isFile()){
        candidates.push({
          name,
          file,
          relativePath:path.relative(studentRoot,file).replaceAll('\\','/'),
          module:name==='stage04-mastery.js'
        });
      }
    }
  }
  candidates.sort((a,b)=>{
    const byName=(ORDER.get(a.name)??99)-(ORDER.get(b.name)??99);
    if(byName)return byName;
    return a.relativePath.localeCompare(b.relativePath);
  });
  return {studentRoot,sources:candidates};
}
