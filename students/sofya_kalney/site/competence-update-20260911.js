import './competence-update-20260906.js?v=20260906-1';

const cfg=window.STUDENT_COMPETENCE_CONFIG;
const levels={
  oge_17_1_1:2,oge_17_1_2:3,oge_17_1_3:3,oge_17_1_4:2,
  oge_17_3_1:3,oge_17_3_2:2,oge_17_3_3:3,oge_17_3_4:3,
  oge_24_3_1:2,oge_24_3_2:3,oge_24_3_3:3,oge_24_3_4:3,
  oge_25_2_1:3,oge_25_2_2:3,oge_25_2_4:2,oge_25_2_5:2
};

const evidence={
  oge_17_1_1:{text:'Занятие 11.09: равенство сторон ромба использовано для связи частей стороны прямоугольника.',href:'11.09.26.html#examples'},
  oge_17_1_2:{text:'Занятие 11.09: диагональ ромба применена как биссектриса; повторены перпендикулярность и деление диагоналей пополам.',href:'11.09.26.html#examples'},
  oge_17_1_3:{text:'Занятие 11.09: сторона ромба найдена через прямоугольный треугольник с углом 30° и разбиение AB=AK+KB.',href:'11.09.26.html#examples'},
  oge_17_1_4:{text:'Занятие 11.09: формулы площади ромба включены в систему формул для параллелограмма и четырёхугольника.',href:'11.09.26.html#theory'},
  oge_17_3_1:{text:'Занятие 11.09: свойства противоположных сторон параллелограмма применены во вписанной конфигурации и теореме Вариньона.',href:'11.09.26.html#varignon'},
  oge_17_3_2:{text:'Занятие 11.09: использовано тождество суммы квадратов диагоналей параллелограмма.',href:'11.09.26.html#theory'},
  oge_17_3_3:{text:'Занятие 11.09: длины и отношения найдены через подобие треугольников и равенство противоположных сторон.',href:'11.09.26.html#examples'},
  oge_17_3_4:{text:'Занятие 11.09: отработаны три формулы площади параллелограмма, включая формулу через диагонали.',href:'11.09.26.html#theory'},
  oge_24_3_1:{text:'Занятие 11.09: цель доказательства формулировалась через равенство и параллельность противоположных сторон внутренней фигуры.',href:'11.09.26.html#varignon'},
  oge_24_3_2:{text:'Занятие 11.09: ключевым признаком параллелограмма стали средние линии треугольников после проведения диагоналей.',href:'11.09.26.html#varignon'},
  oge_24_3_3:{text:'Занятие 11.09: проведение диагоналей свело задачу о произвольном четырёхугольнике к четырём треугольникам.',href:'11.09.26-lab.html?mode=varignon'},
  oge_24_3_4:{text:'Занятие 11.09: доказательство теоремы Вариньона построено полной цепочкой «середины — средние линии — равенство и параллельность».',href:'11.09.26.html#varignon'},
  oge_25_2_1:{text:'Занятие 11.09: структурный анализ объединял ромб в прямоугольнике, параллелограмм в треугольнике и фигуру Вариньона.',href:'11.09.26.html'},
  oge_25_2_2:{text:'Занятие 11.09: метрические связи получены через угол 30°, подобие, средние линии и диагонали параллелограмма.',href:'11.09.26.html#examples'},
  oge_25_2_4:{text:'Занятие 11.09: доказано отношение S(KLMN)=1/2·S(ABCD) по формулам через диагонали и угол между ними.',href:'11.09.26-lab.html?mode=area'},
  oge_25_2_5:{text:'Занятие 11.09: продолжена практика комбинированных задач с дополнительным построением, подобием и формулами площади.',href:'11.09.26.html#practice'}
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
