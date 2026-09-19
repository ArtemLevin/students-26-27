import './competence-update-20260913.js?v=20260913-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_17_4_1:3,
  oge_17_4_2:3,
  oge_17_4_3:3,
  oge_17_4_4:3,
  oge_16_3_2:2,
  oge_16_3_3:2,
  oge_15_4_1:3,
  oge_24_3_3:3,
  oge_24_3_4:2,
  oge_25_1_1:3
};

const evidence={
  oge_17_4_1:{text:'Занятие 19.09: систематизированы свойства трапеции и равнобедренной трапеции, односторонние углы и связь высоты с основаниями.',href:'19.09.26.html#iso'},
  oge_17_4_2:{text:'Занятие 19.09: диагонали использованы в параллельном переносе; отдельно разобран случай равных перпендикулярных диагоналей равнобедренной трапеции.',href:'19.09.26.html#iso'},
  oge_17_4_3:{text:'Занятие 19.09: закреплены средняя линия, полусумма и полуразность оснований, а также отрезок между серединами диагоналей.',href:'19.09.26.html#midpoints'},
  oge_17_4_4:{text:'Занятие 19.09: площадь трапеции найдена через высоту, полученную параллельным переносом боковой стороны и методом равенства площадей.',href:'19.09.26.html#method'},
  oge_16_3_2:{text:'Занятие 19.09: для окружности, вписанной в трапецию, использовано метрическое соотношение высоты к гипотенузе r²=xy.',href:'19.09.26.html#circle'},
  oge_16_3_3:{text:'Занятие 19.09: радиус восстановлен по отрезкам боковой стороны, после чего высота трапеции найдена как диаметр 2r.',href:'19.09.26.html#circle'},
  oge_15_4_1:{text:'Занятие 19.09: повторены метрические соотношения прямоугольного треугольника BH²=AH·HC, AB²=AH·AC, BC²=HC·AC.',href:'19.09.26.html#triangle'},
  oge_24_3_3:{text:'Занятие 19.09: закреплён выбор дополнительного построения — перпендикуляр или параллельный перенос боковой стороны/диагонали — ради получения рабочего треугольника.',href:'19.09.26.html#method'},
  oge_24_3_4:{text:'Занятие 19.09: обоснованы равенства после параллельного переноса и вывод прямого угла AOB через биссектрисы и односторонние углы.',href:'19.09.26.html#circle'},
  oge_25_1_1:{text:'Занятие 19.09: стратегия сложной планиметрии усилена принципом «ищем треугольник», включая перенос стороны, перенос диагонали и работу с высотой.',href:'19.09.26.html#method'}
};

if(cfg){
  cfg.teacherSeed=Object.assign({},cfg.teacherSeed||{},levels);
  cfg.evidence=Object.assign({},cfg.evidence||{},evidence);
}

try{
  const key=(cfg&&cfg.stateKey)||'sofya-competence-state-v2';
  const raw=localStorage.getItem(key);
  if(raw){
    const state=JSON.parse(raw);
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      let changed=false;
      for(const [id,level] of Object.entries(levels)){
        const current=Number(state.studentLevels[id]??0);
        if(current<level){state.studentLevels[id]=level;changed=true;}
      }
      if(changed){
        state.updatedAt=new Date().toISOString();
        localStorage.setItem(key,JSON.stringify(state));
      }
    }
  }
}catch(_){}
