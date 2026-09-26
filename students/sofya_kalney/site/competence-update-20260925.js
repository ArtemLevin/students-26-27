import './competence-update-20260920.js?v=20260920-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_17_4_1:3,
  oge_17_4_3:3,
  oge_16_3_2:3,
  oge_16_3_3:3,
  oge_15_4_1:3,
  oge_16_1_1:3,
  oge_24_3_3:3,
  oge_24_3_4:2,
  oge_25_1_1:3
};

const evidence={
  oge_17_4_1:{text:'Занятие 25.09: повторены свойства равнобедренной и прямоугольной трапеции, высота к большему основанию и переход к рабочему прямоугольному треугольнику.',href:'25.09.26.html#circumscribed'},
  oge_17_4_3:{text:'Занятие 25.09: закреплены формулы AH=(AD+BC)/2=m и DH=(AD−BC)/2 в равнобедренной трапеции.',href:'25.09.26.html#circumscribed'},
  oge_16_3_2:{text:'Занятие 25.09: для окружности, вписанной в прямоугольную трапецию, радиус использован как высота к гипотенузе; применено r²=pq.',href:'25.09.26.html#inscribed'},
  oge_16_3_3:{text:'Занятие 25.09: использованы равные касательные, радиусы в точки касания и расстояние между параллельными основаниями, равное диаметру 2r.',href:'25.09.26.html#tangents'},
  oge_15_4_1:{text:'Занятие 25.09: систематизированы метрические соотношения прямоугольного треугольника h²=pq, a²=cp, b²=cq и формула h=ab/c.',href:'25.09.26.html#height'},
  oge_16_1_1:{text:'Занятие 25.09: повторено свойство вписанного угла, опирающегося на диаметр, и переход от трапеции к треугольнику в той же описанной окружности.',href:'25.09.26.html#circumscribed'},
  oge_24_3_3:{text:'Занятие 25.09: закреплена стратегия дополнительных построений: радиусы к касаниям, биссектрисы, высота и диагональ выбираются ради получения рабочего треугольника.',href:'25.09.26.html#tangents'},
  oge_24_3_4:{text:'Занятие 25.09: разобрано доказательство прямого угла при центре через половины соседних углов трапеции; аргументация закреплялась с подсказкой.',href:'25.09.26.html#inscribed'},
  oge_25_1_1:{text:'Занятие 25.09: сложные задачи повышенного уровня сведены к прямоугольным треугольникам через касания, высоты и диагонали.',href:'25.09.26.html#inscribed'}
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
