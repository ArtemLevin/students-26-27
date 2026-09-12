import {LESSONS} from './lesson-registry.js?v=20260912';
import {initStudentDashboard} from '../../../shared/student-dashboard/dashboard-core.js';
import {PRACTICE_CONFIG} from './practice-config.js';
initStudentDashboard({lessons:LESSONS,themeKey:'kirill-dashboard-theme-v1',summaryEvent:'kirill:competence-summary'});
const latest=LESSONS[0];
const labLink=document.getElementById('latestLabLink');
if(labLink){const href=latest?.materials?.lab;labLink.hidden=!href;if(href)labLink.href=href;else labLink.removeAttribute('href');}
import('../../../shared/practice/practice-ui.js?v=20260831-practice-2').then(({initPracticeDashboard})=>initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS})).catch(error=>{console.error('Practice module unavailable',error);const root=document.getElementById('practiceRoot');if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';});