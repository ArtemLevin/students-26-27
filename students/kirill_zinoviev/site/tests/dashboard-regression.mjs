import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'kirill_zinoviev',expectedLessons:6,stateKey:'kirill-competence-state-v2',storageKey:'kirill-competence-map-v2',catalog:{kind:'window-script',path:'students/kirill_zinoviev/site/competency-map-data.js',global:'KIRILL_GRADE7_GROUPS'}});
