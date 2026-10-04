import './competence-update-20261002.js?v=20261002-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_21_2_2:2,
  oge_21_2_3:2,
  oge_22_3_1:3,
  oge_22_3_2:2,
  oge_22_3_5:3
};

const evidence={
  oge_21_2_1:{text:'Занятие 04.10: при моделировании движения по круговой трассе выбор неизвестной связывался с величиной, которую требуется найти.',href:'04.10.26.html#motion'},
  oge_21_2_2:{text:'Занятие 04.10: для движения по кругу использована таблица «скорость — время — путь» и круг как удобная единица пути.',href:'04.10.26.html#motion'},
  oge_21_2_3:{text:'Занятие 04.10: уравнение строилось из разности пройденных путей; отдельно разобран более короткий путь через неизвестное время круга.',href:'04.10.26.html#motion'},
  oge_11_4_1:{text:'Занятие 04.10: функция с модулем раскрывалась по двум случаям с последующим построением двух параболических частей.',href:'04.10.26.html#graph'},
  oge_11_4_2:{text:'Занятие 04.10: кусочная запись использована как рабочий способ построения графика функции с модулем.',href:'04.10.26.html#graph'},
  oge_22_3_1:{text:'Занятие 04.10: кусочный график с гиперболической ветвью был построен самостоятельно; преподаватель принял решение без содержательных замечаний.',href:'04.10.26.html#piecewise'},
  oge_22_3_2:{text:'Занятие 04.10: разобрано, что условие x < −4 уже исключает x = 0, поэтому отдельное ограничение для гиперболической ветви избыточно.',href:'04.10.26.html#piecewise'},
  oge_22_3_5:{text:'Занятие 04.10: горизонтальная прямая y=m использовалась для анализа числа общих точек; особые значения связаны с вершинами частей графика.',href:'04.10.26.html#graph'}
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
