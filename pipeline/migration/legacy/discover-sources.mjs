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

const ORDER=new Map([
  ['competency-map-data.js',0],
  ['competency-map-baseline.js',1],
  ['linked-progress-overlay',2],
  ['competence-config.js',3],
  ['dashboard-data.js',4],
  ['mastery-authority.js',5],
  ['stage04-mastery.js',6]
]);

function discoverLinkedProgressSources(studentRoot){
  const site=path.join(studentRoot,'site');
  const index=path.join(site,'index.html');
  if(!fs.existsSync(index)||!fs.statSync(index).isFile())return [];
  const html=fs.readFileSync(index,'utf8');
  const sources=[];
  const re=/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match,runtimeOrder=0;
  while((match=re.exec(html))){
    runtimeOrder+=1;
    const src=String(match[1]||'').trim();
    if(!src||src.startsWith('/')||src.startsWith('//')||/^[a-z][a-z\d+.-]*:/i.test(src))continue;
    const clean=src.split(/[?#]/,1)[0];
    const name=path.posix.basename(clean.replaceAll('\\','/'));
    if(!/^lesson-\d{2}\.\d{2}\.\d{2}-progress\.js$/.test(name))continue;
    const file=path.resolve(site,...clean.split('/'));
    const resolvedRoot=path.resolve(studentRoot);
    if(file!==resolvedRoot&&!file.startsWith(resolvedRoot+path.sep))continue;
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    sources.push({
      name:'linked-progress-overlay',
      file,
      relativePath:path.relative(studentRoot,file).replaceAll('\\','/'),
      module:false,
      runtimeOrder
    });
  }
  return sources;
}

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
  candidates.push(...discoverLinkedProgressSources(studentRoot));
  candidates.sort((a,b)=>{
    const byName=(ORDER.get(a.name)??99)-(ORDER.get(b.name)??99);
    if(byName)return byName;
    const byRuntime=(a.runtimeOrder??Number.MAX_SAFE_INTEGER)-(b.runtimeOrder??Number.MAX_SAFE_INTEGER);
    if(byRuntime)return byRuntime;
    return a.relativePath.localeCompare(b.relativePath);
  });
  return {studentRoot,sources:candidates};
}
