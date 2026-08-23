import {LESSONS} from './lesson-registry.js';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
initStudentDashboard({lessons:LESSONS,themeKey:'kirill-dashboard-theme-v1',summaryEvent:'kirill:competence-summary'});
