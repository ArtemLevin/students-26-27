import {PRACTICE_CONFIG} from './site/practice-config.js';
import {LESSONS} from './site/lesson-registry.js';

import('../../shared/practice/practice-ui.js?v=20260831-practice-4')
  .then(({initPracticeDashboard})=>initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS,competenceSnapshot:window.__studentCompetenceState||null}))
  .catch(error=>{
    console.error('Practice module unavailable',error);
    const root=document.getElementById('practiceRoot');
    if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';
  });
