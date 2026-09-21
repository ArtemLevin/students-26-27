(() => {
  'use strict';

  const baseLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};
  const levels={
    ...baseLevels,
    t8_geometric:3,
    t8_derivative_graph:3,
    t8_monotonicity:3,
    t8_extrema:3,
    t8_interpret:3
  };

  const evidence={
    ...(window.__nikolEvidence||{}),
    t8_geometric:{
      text:'21.09 закреплён геометрический смысл производной: знак f′ связан с направлением изменения функции, f′(x)=0 — с горизонтальной касательной, а для касательной, параллельной y=kx+b, выполняется f′(x)=k. Николь после разбора корректно применяла эти связи; уровень 3.',
      href:'21.09.26.html#exam'
    },
    t8_derivative_graph:{
      text:'21.09 Николь уверенно различала ситуации y=f(x) и y=f′(x): по графику функции определяла знак производной через возрастание и убывание, а по графику производной читала знак относительно Ox. Навык подтверждён серией задач; уровень 3.',
      href:'21.09.26.html#read'
    },
    t8_monotonicity:{
      text:'21.09 закреплена связь f′(x)>0 с возрастанием и f′(x)<0 с убыванием, включая задачи на наибольшее и наименьшее значение функции на заданном промежутке. Николь корректно определяла нужный конец интервала; уровень 3.',
      href:'21.09.26.html#interval'
    },
    t8_extrema:{
      text:'21.09 повторена проверка экстремума по смене знака производной: +→− даёт максимум, −→+ — минимум. Отдельно проговорено, что нуль производной без смены знака не гарантирует экстремум. Уровень 3.',
      href:'21.09.26.html#extrema'
    },
    t8_interpret:{
      text:'21.09 основной практический навык — перевод формулировок ЕГЭ на язык производной и точное оформление ответа: количество, сумма целых абсцисс, длина промежутка или конкретное значение x. Николь успешно применяла этот алгоритм; уровень 3.',
      href:'21.09.26.html#algorithm'
    }
  };

  window.__nikolLevels=levels;
  window.__nikolTeacherLevels=levels;
  window.__nikolEvidence=evidence;
  window.__nikolVersion='2026-09-21-geometric-derivative-v1';

  try{
    const key='nikol-competence-state-v2';
    const raw=localStorage.getItem(key);
    if(raw){
      const state=JSON.parse(raw);
      if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
        const fresh={
          t8_geometric:3,
          t8_derivative_graph:3,
          t8_monotonicity:3,
          t8_extrema:3,
          t8_interpret:3
        };
        let changed=false;
        Object.entries(fresh).forEach(([id,level])=>{
          const current=Number(state.studentLevels[id]??0);
          if(current<level){
            state.studentLevels[id]=level;
            changed=true;
          }
        });
        if(changed){
          state.updatedAt=new Date().toISOString();
          localStorage.setItem(key,JSON.stringify(state));
        }
      }
    }
  }catch(_){}
})();