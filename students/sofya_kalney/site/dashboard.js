import {LESSONS} from './lesson-registry.js?v=20260828-1';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
initStudentDashboard({lessons:LESSONS,themeKey:'sofya-dashboard-theme-v1',summaryEvent:'sofya:competence-summary'});