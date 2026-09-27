import './competence-update-20260925.js?v=20260926-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_21_2_2:3,
  oge_22_3_2:3,
  oge_22_3_3:3,
  oge_22_3_5:3
};

const evidence={
  oge_13_2_1:{text:'Занятие 27.09: сложные квадратные неравенства преобразовывались через разность квадратов вместо громоздкого раскрытия скобок.',href:'27.09.26.html#inequalities'},
  oge_13_2_2:{text:'Занятие 27.09: повторены переход к произведению, поиск критических точек и подготовка к методу интервалов.',href:'27.09.26.html#inequalities'},
  oge_13_2_3:{text:'Занятие 27.09: отдельно закреплена оценка знака множителя и правило деления неравенства только на выражение с установленным знаком.',href:'27.09.26.html#inequalities'},
  oge_13_2_4:{text:'Занятие 27.09: повторена точная запись решения квадратного неравенства с корректным включением нестрогих границ.',href:'27.09.26.html#inequalities'},
  oge_21_2_2:{text:'Занятие 27.09: уверенно восстановлена средняя скорость как полный путь, делённый на полное время; разобран случай равных половин пути.',href:'27.09.26.html#speed'},
  oge_22_3_2:{text:'Занятие 27.09: ОДЗ рациональной функции фиксируется до сокращения и сохраняется после перехода к упрощённой параболе.',href:'27.09.26.html#graph'},
  oge_22_3_3:{text:'Занятие 27.09: необходимость выколотой точки после сокращения была распознана в ходе решения; вычислены координаты (−2; −10).',href:'27.09.26.html#graph'},
  oge_22_3_5:{text:'Занятие 27.09: параметр y=m рассмотрен как горизонталь; выделены два уровня с ровно одной общей точкой — вершина и уровень выколотой точки.',href:'27.09.26.html#graph'},
  oge_24_2_2:{text:'Занятие 27.09: общий и вертикальные углы использованы как ориентир для поиска подобных треугольников.',href:'27.09.26.html#geometry'},
  oge_24_2_4:{text:'Занятие 27.09: повторены сопоставление сходственных сторон и запись пропорций после доказательства подобия.',href:'27.09.26.html#geometry'}
};

if(cfg){
  cfg.teacherSeed=Object.assign({},cfg.teacherSeed||{},levels);
  cfg.evidence=Object.assign({},cfg.evidence||{},evidence);
  try{
    const key=cfg.stateKey;
    const raw=key&&localStorage.getItem(key);
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
}
