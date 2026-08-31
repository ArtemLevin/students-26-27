(()=>{
const teacherSeed={
  t9_linear:2,
  t9_power:2,
  t9_other:2,
  t9_units:3,
  t9_formula_transform:2,
  t10_percent:2,
  t10_line:3,
  t10_work:3,
  t10_pipes:2,
  t10_validation:3,
  t11_linear:3,
  t11_parabola:3,
  t11_hyperbola:3,
  t11_transformations:2,
  t11_domain:2,
  t11_roots:2,
  t11_intersections:3
};
window.STUDENT_COMPETENCE_CONFIG={
  stateKey:'timofey-competence-state-v2',
  storageKey:'timofey-competence-map-v1',
  baselineKey:'timofey-competence-teacher-baseline-v1',
  legacyStorageKeys:[],
  legacyUrl:'index-legacy.html',
  fallbackHref:'index-legacy.html#competencies',
  catalogNames:['groups','GROUPS'],
  summaryEvent:'timofey:competence-summary',
  teacherSeed,
  evidence:{
    t9_linear:{text:'Линейная прикладная модель отработана на занятии 27.08.26 на формуле теплового расширения.',href:'27.08.26.html'},
    t9_power:{text:'Квадратные и степенные прикладные модели отработаны на занятии 27.08.26: траектория и формулы с четвёртой степенью.',href:'27.08.26.html'},
    t9_other:{text:'Отбор допустимого и требуемого корня по смыслу условия повторён 28.08.26 на текстовой задаче со скоростью.',href:'28.08.26.html'},
    t9_units:{text:'28.08.26 Тимофей корректно согласовал единицы в задаче на производительность: время переведено в часы в соответствии с размерностью «вопросов в час».',href:'28.08.26.html'},
    t9_formula_transform:{text:'Выражение искомой величины из готовой прикладной формулы отработано на занятии 27.08.26.',href:'27.08.26.html'},
    t10_percent:{text:'28.08.26 разобрана табличная модель растворов: масса раствора, концентрация, масса вещества и система двух уравнений по двум опытам. Навык оставлен «в процессе» до самостоятельного закрепления.',href:'28.08.26.html'},
    t10_line:{text:'28.08.26 отработаны задачи на движение по прямой с задержкой старта и разностью времён; таблица S–v–t и перевод условия в уравнение применялись последовательно.',href:'28.08.26.html'},
    t10_work:{text:'28.08.26 отработана производительность как объём работы за единицу времени; задачи на трубы и вопросы в час решались через таблицу p–t–W.',href:'28.08.26.html'},
    t10_pipes:{text:'28.08.26 разобрана модель производительности труб и связь времени с одинаковым объёмом. Специальные задачи на совместный приток и отток ещё требуют отдельного закрепления.',href:'28.08.26.html'},
    t10_validation:{text:'28.08.26 системно применялись ОДЗ, проверка знаменателей, согласование единиц, отбор положительной скорости и проверка кандидата для √D возведением в квадрат.',href:'28.08.26.html'},
    t11_linear:{text:'31.08.26 отработано восстановление линейной функции y=kx+b по двум узловым точкам, решение системы для k и b, быстрый контроль наклона и вычисление f(a).',href:'31.08.26.html'},
    t11_parabola:{text:'31.08.26 закреплено восстановление параболы по узловым точкам; отдельно использована удобная точка с x=0 для мгновенного нахождения свободного коэффициента.',href:'31.08.26.html'},
    t11_hyperbola:{text:'31.08.26 отработано восстановление функции вида y=k/x+a по двум узловым точкам, решение системы и обязательное ограничение x≠0.',href:'31.08.26.html'},
    t11_transformations:{text:'31.08.26 теоретически повторены базовые преобразования графиков: вертикальные и горизонтальные переносы, отражения относительно осей Ox и Oy.',href:'31.08.26.html'},
    t11_domain:{text:'31.08.26 повторены ограничения области определения для дробей, корней и логарифмов; в задачах на гиперболу условие x≠0 применялось явно.',href:'31.08.26.html'},
    t11_roots:{text:'31.08.26 повторены задачи вида f(x)=c и нахождение пересечения графика с осью Ox; акцент сделан на различии f(a) и f(x)=c.',href:'31.08.26.html'},
    t11_intersections:{text:'31.08.26 отработан принцип f(x)=g(x) для нахождения точек пересечения: две прямые, парабола с прямой и гипербола с прямой.',href:'31.08.26.html'}
  }
};
try{
  const key=window.STUDENT_COMPETENCE_CONFIG.stateKey;
  const state=JSON.parse(localStorage.getItem(key)||'null');
  if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
    let changed=false;
    for(const [id,target] of Object.entries(teacherSeed)){
      const current=Number(state.studentLevels[id]??0);
      if(!Number.isFinite(current)||current<target){state.studentLevels[id]=target;changed=true;}
    }
    if(changed){state.updatedAt=new Date().toISOString();localStorage.setItem(key,JSON.stringify(state));}
  }
}catch(_){ }
})();