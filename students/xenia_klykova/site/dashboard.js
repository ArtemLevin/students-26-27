import {LESSONS as BASE_LESSONS} from './lesson-registry.js?v=20261009-review-2';
import {LESSON_0710,applyLesson0710CompetenceUpdate} from './07.10.26-data.js';
import {LESSON_0510,applyLesson0510CompetenceUpdate} from './05.10.26-data.js';
import {LESSON_3009,applyLesson3009CompetenceUpdate} from './30.09.26-data.js';
import {LESSON_2809,applyLesson2809CompetenceUpdate} from './28.09.26-data.js';
import {LESSON_2409,applyLesson2409CompetenceUpdate} from './24.09.26-data.js';
import {LESSON_2109,applyLesson2109CompetenceUpdate} from './21.09.26-data.js';
import {LESSON_1709,applyLesson1709CompetenceUpdate} from './17.09.26-data.js';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
import {installEgeProfile2027ControllerHook} from '../../../shared/student-dashboard/ege-profile-2027.js?v=20260903';
import {PRACTICE_CONFIG} from './practice-config.js';

applyLesson0710CompetenceUpdate();
applyLesson1709CompetenceUpdate();
applyLesson0510CompetenceUpdate();
applyLesson3009CompetenceUpdate();
applyLesson2809CompetenceUpdate();
applyLesson2109CompetenceUpdate();
applyLesson2409CompetenceUpdate();
// Preserve the richer lesson snapshots for historical dates. The canonical registry
// owns the chronology: no legacy snapshot may displace a newer published lesson.
const LEGACY_SNAPSHOTS=[LESSON_0710,LESSON_0510,LESSON_3009,LESSON_2809,LESSON_2409,LESSON_2109,LESSON_1709];
const SNAPSHOT_BY_DATE=new Map(LEGACY_SNAPSHOTS.map(lesson=>[lesson.date,lesson]));
const LESSONS=BASE_LESSONS.map(lesson=>SNAPSHOT_BY_DATE.get(lesson.date)||lesson);
LESSONS.sort((left,right)=>right.date.localeCompare(left.date));
installEgeProfile2027ControllerHook('__studentCompetenceMap');
initStudentDashboard({lessons:LESSONS,themeKey:'xenia-dashboard-theme-v1',summaryEvent:'xenia:competence-summary'});
import('../../../shared/practice/practice-ui.js?v=20260831-practice-2').then(({initPracticeDashboard})=>initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS})).catch(error=>{console.error('Practice module unavailable',error);const root=document.getElementById('practiceRoot');if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';});
