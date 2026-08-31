import {LESSONS} from './lesson-registry.js';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
import {PRACTICE_CONFIG} from './practice-config.js';
initStudentDashboard({lessons:LESSONS,themeKey:'timofey-dashboard-theme-v1',summaryEvent:'timofey:competence-summary'});
import('../../../shared/practice/practice-ui.js').then(({initPracticeDashboard})=>initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS})).catch(error=>{console.error('Practice module unavailable',error);const root=document.getElementById('practiceRoot');if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';});
