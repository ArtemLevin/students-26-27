import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';
await runDashboardTests({student:'volodia_khachaturian',expectedLessons:1,storageKey:'competency-map',catalog:{kind:'window-script',path:'students/volodia_khachaturian/competency-map-data.js',global:'COMPETENCY_MAP_DATA'}});
