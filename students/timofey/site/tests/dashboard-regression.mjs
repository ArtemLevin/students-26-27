import {transformEgeProfile2027Catalog} from '../../../../shared/student-dashboard/ege-profile-2027.js';
import './lesson-27-08-simulator.mjs';
import './lesson-27-08-simulator-static.mjs';
import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'timofey',stateKey:'timofey-competence-state-v2',storageKey:'timofey-competence-map-v1',catalog:{kind:'legacy-html',path:'students/timofey/site/index-legacy.html',names:['groups','GROUPS']},catalogTransform:transformEgeProfile2027Catalog,canonicalCatalogPath:'students/timofey/site/data/competency-catalog.json'});
