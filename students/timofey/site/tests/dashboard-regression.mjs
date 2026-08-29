import './lesson-27-08-simulator.mjs';
import './lesson-27-08-simulator-static.mjs';
import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'timofey',expectedLessons:21,stateKey:'timofey-competence-state-v2',storageKey:'timofey-competence-map-v1',catalog:{kind:'legacy-html',path:'students/timofey/site/index-legacy.html',names:['groups','GROUPS']}});
