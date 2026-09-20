import './competence-update-20260919.js?v=20260919-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_8_2_2:3,
  oge_9_2_2:3,
  oge_21_1_2:3,
  oge_22_3_5:3,
  oge_15_4_1:3,
  oge_16_1_1:3,
  oge_24_3_3:3
};

const evidence={
  oge_8_2_2:{text:'Занятие 20.09: закреплено правило √(a²)=|a| и контроль модуля при извлечении корня из квадрата.',href:'20.09.26.html#equations'},
  oge_9_2_2:{text:'Занятие 20.09: уравнение x⁸=(20−x)⁴ решено двумя школьными способами — через разность квадратов и через модуль с проверкой ветвей.',href:'20.09.26.html#equations'},
  oge_21_1_2:{text:'Занятие 20.09: повторена таблица для смесей, массовый баланс и модель высушивания через сохранение сухого вещества.',href:'20.09.26.html#mixtures'},
  oge_22_3_5:{text:'Занятие 20.09: кусочный график с модулем и параболой; параметр y=m исследован по числу пересечений с отдельной проверкой уровней −2, −1 и 0.',href:'20.09.26.html#graphs'},
  oge_15_4_1:{text:'Занятие 20.09: в задаче о квадрате и окружности получен прямоугольный треугольник и применена теорема Пифагора.',href:'20.09.26.html#geometry'},
  oge_16_1_1:{text:'Занятие 20.09: центр окружности и равные радиусы использованы для восстановления симметрии конфигурации квадрата на диаметре.',href:'20.09.26.html#geometry'},
  oge_24_3_3:{text:'Занятие 20.09: закреплена стратегия начинать задачу с окружностью от центра и радиусов и искать рабочие прямоугольные треугольники.',href:'20.09.26.html#geometry'}
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
      if(changed){state.updatedAt=new Date().toISOString();localStorage.setItem(key,JSON.stringify(state));}
    }
  }
}catch(_){}
