import './competence-update-20260927.js?v=20260927-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_25_1_4:3
};

const evidence={
  oge_23_2_1:{text:'Занятие 02.10: в задачах на высоту и биссектрису системно выделялись рабочие треугольники и связанные с ними элементы.',href:'02.10.26.html#overview'},
  oge_23_2_2:{text:'Занятие 02.10: для одной высоты сопоставлены два школьных способа — через площадь с формулой Герона и через два прямоугольных треугольника.',href:'02.10.26.html#height'},
  oge_23_2_3:{text:'Занятие 02.10: отработана цепочка Герон → площадь → высота и альтернативная цепочка через систему двух теорем Пифагора.',href:'02.10.26.html#height'},
  oge_24_2_2:{text:'Занятие 02.10: при работе с биссектрисой использованы равные половины угла и разложение площади большого треугольника на сумму двух меньших.',href:'02.10.26.html#bisector'},
  oge_25_1_2:{text:'Занятие 02.10: метрические связи треугольника использованы для высоты и биссектрисы; отдельно сопоставлены формулы l_a=2bc cos(A/2)/(b+c) и l_a²=bc−mn.',href:'02.10.26.html#bisector'},
  oge_25_1_4:{text:'Занятие 02.10: площадь треугольника выражалась несколькими способами; самостоятельная работа с разложением площади при выводе и применении формулы биссектрисы была принята без содержательных замечаний.',href:'02.10.26.html#bisector'},
  oge_25_1_5:{text:'Занятие 02.10: в одной теме объединены формула Герона, площадь через синус, теорема Пифагора и формулы биссектрисы с выбором метода по данным задачи.',href:'02.10.26.html#overview'}
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
