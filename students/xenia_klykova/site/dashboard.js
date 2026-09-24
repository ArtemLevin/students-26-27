import {LESSONS as BASE_LESSONS} from './lesson-registry.js?v=20260924-sections-proof-1';
import {LESSON_2409,applyLesson2409CompetenceUpdate} from './24.09.26-data.js';
import {LESSON_2109,applyLesson2109CompetenceUpdate} from './21.09.26-data.js';
import {LESSON_1709,applyLesson1709CompetenceUpdate} from './17.09.26-data.js';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
import {installEgeProfile2027ControllerHook} from '../../../shared/student-dashboard/ege-profile-2027.js?v=20260903';
import {PRACTICE_CONFIG} from './practice-config.js';

applyLesson1709CompetenceUpdate();
applyLesson2109CompetenceUpdate();
applyLesson2409CompetenceUpdate();
const LESSONS=[LESSON_2409,LESSON_2109,LESSON_1709,...BASE_LESSONS.filter(lesson=>lesson.date!==LESSON_2409.date&&lesson.date!==LESSON_2109.date&&lesson.date!==LESSON_1709.date)];
installEgeProfile2027ControllerHook('__studentCompetenceMap');
initStudentDashboard({lessons:LESSONS,themeKey:'xenia-dashboard-theme-v1',summaryEvent:'xenia:competence-summary'});
import('../../../shared/practice/practice-ui.js?v=20260831-practice-2').then(({initPracticeDashboard})=>initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS})).catch(error=>{console.error('Practice module unavailable',error);const root=document.getElementById('practiceRoot');if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';});
