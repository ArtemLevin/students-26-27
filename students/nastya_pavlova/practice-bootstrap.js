import {PRACTICE_CONFIG} from './site/practice-config.js';
import {LESSONS} from './site/lesson-registry.js';

async function waitForCompetenceSnapshot(){
  if(window.__studentCompetenceState)return window.__studentCompetenceState;
  await Promise.race([
    new Promise(resolve=>window.addEventListener('student:competence-state',resolve,{once:true})),
    new Promise(resolve=>setTimeout(resolve,2500))
  ]);
  return window.__studentCompetenceState||null;
}

(async()=>{
  const competenceSnapshot=await waitForCompetenceSnapshot();
  const {initPracticeDashboard}=await import('../../shared/practice/practice-ui.js?v=20260831-practice-4');
  initPracticeDashboard({config:PRACTICE_CONFIG,lessons:LESSONS,competenceSnapshot});
})().catch(error=>{
  console.error('Practice module unavailable',error);
  const root=document.getElementById('practiceRoot');
  if(root)root.textContent='Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.';
});
