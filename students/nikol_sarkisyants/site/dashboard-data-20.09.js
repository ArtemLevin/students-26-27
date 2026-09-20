(() => {
  'use strict';

  const baseLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};
  const levels={
    ...baseLevels,
    t8_geometric:2,
    t8_derivative_graph:3,
    t8_monotonicity:3,
    t8_extrema:3,
    t8_interpret:3
  };

  const evidence={
    ...(window.__nikolEvidence||{}),
    t8_geometric:{
      text:'20.09 разобран геометрический смысл производной: знак f′(x) связан с направлением наклона касательной, а f′(x)=0 — с горизонтальной касательной. Количественные задачи на угловой коэффициент касательной отдельно не отрабатывались, поэтому уровень 2.',
      href:'20.09.26.html#idea'
    },
    t8_derivative_graph:{
      text:'20.09 Николь уверенно строила качественный эскиз f′(x) по графику f(x) и выполняла обратное чтение: по положению графика f′ относительно Ox определяла возрастание и убывание исходной функции. Несколько заданий выполнены без замечаний; уровень 3.',
      href:'20.09.26.html#reading'
    },
    t8_monotonicity:{
      text:'20.09 закреплена связь f′(x)>0 ⇔ функция возрастает и f′(x)<0 ⇔ функция убывает. Николь уверенно разделяла график функции на промежутки монотонности и график производной — на промежутки знакопостоянства. Уровень 3 подтверждён.',
      href:'20.09.26.html#algorithm'
    },
    t8_extrema:{
      text:'20.09 повторено необходимое условие f′(x₀)=0 для дифференцируемой функции в точке локального экстремума и обязательная проверка смены знака производной. Отдельно зафиксировано, что ноль производной сам по себе экстремум не гарантирует. Уровень 3.',
      href:'20.09.26.html#idea'
    },
    t8_interpret:{
      text:'20.09 основной акцент занятия — различать, чей график дан, и переводить информацию между f и f′. Николь успешно выполнила задания в обе стороны и уверенно применяла правило «дан f — смотрим монотонность; дан f′ — смотрим знак относительно Ox». Уровень 3.',
      href:'20.09.26.html#reading'
    }
  };

  window.__nikolLevels=levels;
  window.__nikolTeacherLevels=levels;
  window.__nikolEvidence=evidence;
  window.__nikolVersion='2026-09-20-function-derivative-graphs-v1';

  // Для уже созданного состояния v2 добавляем только ранее неоценённые
  // компетенции текущего урока. Пользовательские уровни выше нуля сохраняются.
  try{
    const key='nikol-competence-state-v2';
    const raw=localStorage.getItem(key);
    if(raw){
      const state=JSON.parse(raw);
      if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
        const fresh={
          t8_geometric:2,
          t8_derivative_graph:3,
          t8_interpret:3
        };
        let changed=false;
        Object.entries(fresh).forEach(([id,level])=>{
          if(Number(state.studentLevels[id]??0)===0){
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
