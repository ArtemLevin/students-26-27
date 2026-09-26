(() => {
  'use strict';

  const baseLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};
  const levels={
    ...baseLevels,
    t8_geometric:3,
    t8_derivative_graph:3,
    t8_interpret:3
  };

  const evidence={
    ...(window.__nikolEvidence||{}),
    t8_geometric:{
      text:'25.09 закреплена центральная связь f′(x₀)=k=tg α. Николь научилась находить производную по двум точкам касательной, учитывать знак наклона и использовать равенство угловых коэффициентов параллельных прямых. После разбора типовые задачи выполнялись корректно; уровень сохраняется 3.',
      href:'25.09.26.html#slope'
    },
    t8_derivative_graph:{
      text:'25.09 отработан переход от условия f′(x)=m к горизонтальному уровню y=m на графике производной. Николь корректно использовала этот перевод в задачах с касательной, параллельной заданной прямой; уровень 3.',
      href:'25.09.26.html#parallel'
    },
    t8_interpret:{
      text:'25.09 систематизированы разные форматы задач на касательную: вычисление k по координатам, использование параллельности и поиск абсциссы точки касания по двум условиям f′(x₀)=k и f(x₀)=kx₀+b. Навык применяется с пониманием; уровень 3.',
      href:'25.09.26.html#contact'
    }
  };

  window.__nikolLevels=levels;
  window.__nikolTeacherLevels=levels;
  window.__nikolEvidence=evidence;
  window.__nikolVersion='2026-09-25-tangent-slope-v1';

  try{
    const key='nikol-competence-state-v2';
    const raw=localStorage.getItem(key);
    if(raw){
      const state=JSON.parse(raw);
      if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
        const confirmed={
          t8_geometric:3,
          t8_derivative_graph:3,
          t8_interpret:3
        };
        let changed=false;
        Object.entries(confirmed).forEach(([id,level])=>{
          const current=Number(state.studentLevels[id]??0);
          if(current===0){
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