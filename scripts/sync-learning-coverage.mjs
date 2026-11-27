import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryStudents} from '../pipeline/migration/inventory-students.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SCRIPT='  <script type="module" data-atlas-learning-coverage data-contract="../student-contract.json" src="../../../shared/student-dashboard/learning-coverage-ui.js"></script>';
const MAP_PAGE=/^(?:heatmap|competency(?:-map|-catalog)?|competence(?:-map)?|competencies|skill-map|map)\.html$/i;
export function syncCoverage({root=ROOT,apply=false}={}){
  const inventory=inventoryStudents(root),files=[],missing=[],native=[],standalone=[];
  for(const student of inventory.students){
    if(student.architecture!=='v2')throw Error('Coverage requires v2 contract: '+student.studentId);
    const site=path.join(root,'students',student.studentId,'site');
    const pages=['index.html',...fs.readdirSync(site,{withFileTypes:true}).filter(e=>e.isFile()&&MAP_PAGE.test(e.name)).map(e=>e.name)];
    for(const name of pages){
      const file=path.join(site,name),relative=path.relative(root,file).replaceAll('\\','/');
      let html=fs.readFileSync(file,'utf8');
      if(name!=='index.html')standalone.push(relative);
      if(html.includes('data-atlas-coverage-native')){
        if(html.includes('data-atlas-learning-coverage'))throw Error('Duplicate coverage adapters: '+relative);
        native.push(relative);files.push(relative);continue;
      }
      const existing=(html.match(/data-atlas-learning-coverage\b/g)||[]).length;
      if(existing>1)throw Error('Duplicate coverage scripts: '+relative);
      if(existing===1){if(!html.includes(SCRIPT.trim()))throw Error('Unexpected coverage adapter: '+relative);files.push(relative);continue;}
      if(!/<\/body\s*>/i.test(html))throw Error('Missing body: '+relative);
      missing.push(relative);files.push(relative);
      if(apply){html=html.replace(/<\/body\s*>/i,SCRIPT+'\n</body>');fs.writeFileSync(file,html);}
    }
  }
  return {students:inventory.students.length,pages:files.length,native,standalone,missing,files};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const apply=process.argv.includes('--apply');
  const report=syncCoverage({apply});console.log(JSON.stringify(report,null,2));
  if(!apply&&report.missing.length)process.exitCode=1;
}
