import {LESSONS} from './lesson-registry.js';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
initStudentDashboard({lessons:LESSONS,themeKey:'xenia-dashboard-theme-v1',summaryEvent:'xenia:competence-summary'});
