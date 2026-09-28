(() => {
  'use strict';

  const baseLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};
  const levels={
    ...baseLevels,
    t12_applied:Math.max(Number(baseLevels.t12_applied||0),2),
    t12_domain:Math.max(Number(baseLevels.t12_domain||0),2),
    t12_endpoints:Math.max(Number(baseLevels.t12_endpoints||0),2),
    t12_product:Math.max(Number(baseLevels.t12_product||0),2),
    t12_quotient:Math.max(Number(baseLevels.t12_quotient||0),2)
  };

  const evidence={
    ...(window.__nikolEvidence||{}),
    t12_applied:{
      text:'28.09 разобран полный маршрут прикладной оптимизации: целевая величина → функция одной переменной → допустимая область → производная → критические точки → доказательство экстремума → ответ по смыслу. Рабочий уровень 2 сохраняется до отдельного подтверждения устойчивого самостоятельного решения.',
      href:'28.09.26.html#route'
    },
    t12_domain:{
      text:'28.09 ограничения включены в сам алгоритм решения: отдельно разобраны целочисленное количество товара, интервал 20≤t≤80 и условие 0<x<15 для коробки. Критическая точка вне допустимой области исключается из ответа.',
      href:'28.09.26.html#limits'
    },
    t12_endpoints:{
      text:'28.09 закреплена необходимость исследовать критические точки только в допустимой области и учитывать входящие границы, когда они принадлежат области определения. Рабочий уровень 2 до самостоятельного подтверждения.',
      href:'28.09.26.html#limits'
    },
    t12_product:{
      text:'28.09 разобрана модель Q(t)=(t−20)(80−t) на 20≤t≤80: Q′(t)=100−2t, максимум при t=50; дополнительно произведение используется в геометрической модели объёма.',
      href:'28.09.26.html#models'
    },
    t12_quotient:{
      text:'28.09 разобрана дробно-рациональная модель мощности P(R)=36²R/(3+R)², R>0. Производная упрощена до формы 36²(3−R)/(3+R)³, где знак читается по множителю 3−R.',
      href:'28.09.26.html#models'
    }
  };

  window.__nikolLevels=levels;
  window.__nikolTeacherLevels=levels;
  window.__nikolEvidence=evidence;
  window.__nikolVersion='2026-09-28-applied-optimization-v1';

  try{
    const key='nikol-competence-state-v2';
    const raw=localStorage.getItem(key);
    if(raw){
      const state=JSON.parse(raw);
      if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
        const confirmed={t12_applied:2,t12_domain:2,t12_endpoints:2,t12_product:2,t12_quotient:2};
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
