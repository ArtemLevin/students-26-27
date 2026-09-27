import './competence-update-20260925.js?v=20260925-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;

const levels={
  oge_21_2_2:3,
  oge_22_3_2:3,
  oge_22_3_3:3,
  oge_22_3_5:3
};

const evidence={
  oge_13_2_1:{text:'Занятие 27.09: повторено преобразование сложных квадратных неравенств через разность квадратов вместо громоздкого раскрытия скобок.',href:'27.09.26.html#ineq'},
  oge_13_2_2:{text:'Занятие 27.09: закреплён переход к произведению, поиск критических точек и подготовка к методу интервалов.',href:'27.09.26.html#ineq'},
  oge_13_2_3:{text:'Занятие 27.09: отдельно отработана оценка знака множителя и правило деления неравенства только на выражение с установленным знаком.',href:'27.09.26.html#ineq'},
  oge_13_2_4:{text:'Занятие 27.09: повторена точная запись решения квадратного неравенства по знакам интервалов с включением нестрогих границ.',href:'27.09.26.html#ineq'},
  oge_21_2_2:{text:'Занятие 27.09: уверенно восстановлена формула средней скорости как полного пути, делённого на полное время; разобран случай равных половин пути.',href:'27.09.26.html#speed'},
  oge_22_3_2:{text:'Занятие 27.09: ОДЗ рациональной функции фиксируется до сокращения и сохраняется после перехода к параболе.',href:'27.09.26.html#graph'},
  oge_22_3_3:{text:'Занятие 27.09: София самостоятельно заметила необходимость выколотой точки после сокращения; вычислены её координаты (−2; −10).',href:'27.09.26.html#graph'},
  oge_22_3_5:{text:'Занятие 27.09: параметр y=m интерпретирован как горизонталь; выделены два особых уровня с ровно одной общей точкой — вершина и уровень выколотой точки.',href:'27.09.26.html#graph'},
  oge_24_2_2:{text:'Занятие 27.09: в задачах на подобие использованы общий и вертикальный углы как сигнал к поиску пары сходственных треугольников.',href:'27.09.26.html#geometry'},
  oge_24_2_4:{text:'Занятие 27.09: повторено сопоставление сходственных сторон и запись пропорции после доказательства подобия; навык ещё требует продолжения практики.',href:'27.09.26.html#geometry'}
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
          if(current<level){
            state.studentLevels[id]=level;
            changed=true;
          }
        }
        if(changed){
          state.updatedAt=new Date().toISOString();
          localStorage.setItem(key,JSON.stringify(state));
        }
      }
    }
  }catch(_){}
}
