import {LESSONS} from './lesson-registry.js';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
initStudentDashboard({lessons:LESSONS,themeKey:'volodia-dashboard-theme-v1',summaryEvent:'volodia:competence-summary'});
