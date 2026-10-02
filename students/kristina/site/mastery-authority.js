(()=>{
    'use strict';
    const data=window.COMPETENCY_MAP_DATA;
    if(!data||!Array.isArray(data.groups)) return;
    const byId=new Map(data.groups.flatMap(group=>group.items).map(item=>[item.id,item]));
    const material={href:'15.09.26.html',label:'Открыть занятие 15.09.26 →'};
    const updates=[
      ['ege08_16',2,false,'15.09.26: ФСУ использовались для разложения разности квадратов и квадратов суммы и разности.'],
      ['ege08_17',3,false,'15.09.26: разложение квадратного трёхчлена через дискриминант и корни отработано на нескольких примерах.'],
      ['ege08_18',2,true,'15.09.26: отработано приведение алгебраических дробей к общему знаменателю; навык оставлен в повторении для закрепления.'],
      ['ege08_19',3,false,'15.09.26: деление алгебраических дробей заменялось умножением на обратную дробь с последующим сокращением.'],
      ['ege08_20',2,true,'15.09.26: отдельно разобраны ОДЗ рационального выражения и сохранение ограничений после сокращения.'],
      ['ege08_21',3,false,'15.09.26: вынесение минуса применялось для согласования противоположных скобок и последующего сокращения.'],
      ['ege08_22',2,true,'15.09.26: контроль знаков и скобок закреплялся в многошаговых преобразованиях; навык оставлен в повторении.'],
      ['ege07_04',2,false,'15.09.26: разобрано рациональное уравнение вида «дробь = 0» через ноль числителя и ненулевой знаменатель.'],
      ['ege07_15',2,true,'15.09.26: ОДЗ и ограничения знаменателя выделены как обязательный этап решения; требуется закрепление.'],
      ['ege07_16',2,false,'15.09.26: отработан отбор допустимого корня после проверки знаменателя.']
    ];
    updates.forEach(([id,level,repeat,text])=>{
      const item=byId.get(id); if(!item) return;
      item.level=Math.max(Number(item.level)||0,level);
      item.repeat=repeat;
      item.evidence=Array.isArray(item.evidence)?item.evidence:[];
      if(!item.evidence.some(entry=>entry&&entry.text===text)) item.evidence.push({text});
      item.material={...material};
    });
    const graphMaterial={href:'22.09.26.html',label:'Открыть занятие 22.09.26 →'};
    const graphUpdates=[
      ['ege07_01',2,false,'22.09.26: линейные уравнения использовались на финальном этапе задач для нахождения аргумента по заданному значению функции.'],
      ['ege07_12',2,false,'22.09.26: по двум точкам графика составлялась система двух линейных уравнений для неизвестных коэффициентов.'],
      ['ege07_13',2,true,'22.09.26: система для коэффициентов решалась способом подстановки; навык оставлен в повторении для уверенного контроля знаков и обратной подстановки.'],
      ['ege12_07',2,false,'22.09.26: коэффициент k линейной функции восстанавливался по узловым точкам графика вместе со свободным коэффициентом b.'],
      ['ege12_18',2,true,'22.09.26: отрабатывалось чтение координат точек графика и различение задач f(a) и f(x)=c; навык оставлен в повторении.']
    ];
    graphUpdates.forEach(([id,level,repeat,text])=>{
      const item=byId.get(id); if(!item) return;
      item.level=Math.max(Number(item.level)||0,level);
      item.repeat=repeat;
      item.evidence=Array.isArray(item.evidence)?item.evidence:[];
      if(!item.evidence.some(entry=>entry&&entry.text===text)) item.evidence.push({text});
      item.material={...graphMaterial};
    });
    if(data.meta) data.meta.updated='22.09.2026';
  })();

(() => {
  'use strict';
  const data=window.COMPETENCY_MAP_DATA;
  if(!data||!Array.isArray(data.groups)){
    throw new Error('Kristina mastery authority requires loaded competency catalog');
  }
  const levels={};
  for(const group of data.groups){
    if(!group||!Array.isArray(group.items))continue;
    for(const item of group.items){
      if(!item||typeof item.id!=='string'||!item.id){
        throw new Error('Kristina mastery authority found competency without stable id');
      }
      const level=Number(item.level);
      if(!Number.isInteger(level)||level<0||level>4){
        throw new Error('Kristina mastery authority found invalid level for '+item.id);
      }
      if(Object.prototype.hasOwnProperty.call(levels,item.id)){
        throw new Error('Kristina mastery authority found duplicate id: '+item.id);
      }
      levels[item.id]=level;
    }
  }
  window.STUDENT_MASTERY_AUTHORITY={
    version:1,
    basis:'Repository-authored baseline levels after the 14.09 source state and dated 15.09/22.09 overlays formerly embedded in index.html.',
    levels
  };
})();
