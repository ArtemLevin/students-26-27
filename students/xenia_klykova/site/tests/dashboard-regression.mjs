import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'xenia_klykova',expectedLessons:10,stateKey:'xenia-competence-state-v2',storageKey:'xenia-competence-map-v1',catalog:{kind:'legacy-html',path:'students/xenia_klykova/site/index-base-2026-07-29.html',names:['groups','GROUPS']}});
await import('./probability-lab-regression.mjs');
