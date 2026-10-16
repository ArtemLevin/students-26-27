import {transformEgeProfile2027Catalog} from '../../../../shared/student-dashboard/ege-profile-2027.js';
import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'xenia_klykova',stateKey:'xenia-competence-state-v2',storageKey:'xenia-competence-map-v1',catalog:{kind:'legacy-html',path:'students/xenia_klykova/site/index-base-2026-07-29.html',names:['groups','GROUPS']},catalogTransform:transformEgeProfile2027Catalog,canonicalCatalogPath:'students/xenia_klykova/site/data/competency-catalog.json',archiveMode:'standalone'});
await import('./probability-lab-regression.mjs');

await import('./lesson-09.10.26-review.test.mjs');

await import('./lesson-14.10.26.test.mjs');
