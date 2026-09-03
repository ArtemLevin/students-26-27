import {LESSONS} from './lesson-registry.js?v=20260831-graphs';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
import {installEgeProfile2027ControllerHook} from '../../../shared/student-dashboard/ege-profile-2027.js?v=20260903';
import {PRACTICE_CONFIG} from './practice-config.js';
installEgeProfile2027ControllerHook('__studentCompetenceMap');
initStudentDashboard({lessons:LESSONS,themeKey:'timofey-dashboard-theme-v1',summaryEvent:'timofey:competence-summary'});
import('../../../shared/practice/practice-ui.js?v=20260831-practice-2').then(({initPracticeDashboard})=>initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS})).catch(error=>{console.error('Practice module unavailable',error);const root=document.getElementById('practiceRoot');if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';});
