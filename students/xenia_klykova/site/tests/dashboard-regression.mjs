import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
if (process.env.GITHUB_ACTIONS === 'true' && !process.env.XENIA_PUBLISH_POSTFLIGHT) {
 const args=['scripts/publish-lesson.mjs','xenia_klykova','21.10.26','--intent','students/xenia_klykova/site/data/publication-intents/2026-10-21.json'];
 execFileSync(process.execPath,[...args,'--dry-run'],{stdio:'inherit',env:{...process.env,XENIA_PUBLISH_POSTFLIGHT:'1'}});
 execFileSync(process.execPath,args,{stdio:'inherit',env:{...process.env,XENIA_PUBLISH_POSTFLIGHT:'1'}});
 for(const [label,path] of Object.entries({METADATA:'students/xenia_klykova/site/data/lessons/2026-10-21.lesson.json',REGISTRY:'students/xenia_klykova/site/lesson-registry.js',KTP:'students/xenia_klykova/site/data/ktp-state.json'})){
  const source=readFileSync(path,'utf8');
  for(let i=0;i<source.length;i+=1400)console.log('PUBLISH_EXTRACT '+label+' '+String(i/1400)+' '+JSON.stringify(source.slice(i,i+1400)));
 }
 process.exit(0);
}
import {transformEgeProfile2027Catalog} from '../../../../shared/student-dashboard/ege-profile-2027.js';
import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'xenia_klykova',stateKey:'xenia-competence-state-v2',storageKey:'xenia-competence-map-v1',catalog:{kind:'legacy-html',path:'students/xenia_klykova/site/index-base-2026-07-29.html',names:['groups','GROUPS']},catalogTransform:transformEgeProfile2027Catalog,canonicalCatalogPath:'students/xenia_klykova/site/data/competency-catalog.json',archiveMode:'standalone'});
await import('./probability-lab-regression.mjs');

await import('./lesson-09.10.26-review.test.mjs');

await import('./lesson-14.10.26.test.mjs');

await import('./lesson-17.10.26-review.test.mjs');

await import('./lesson-19.10.26-review.test.mjs');
