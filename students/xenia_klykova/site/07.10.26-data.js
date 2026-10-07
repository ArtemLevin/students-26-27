export const LESSON_0710={
  date:'2026-10-07',
  href:'07.10.26.html',
  title:'Быстрые методы первой части ЕГЭ',
  navTitle:'Быстрые методы первой части',
  navSubtitle:'тождества · тригонометрия · корни · векторы · вероятность',
  summary:'Повторение коротких приёмов первой части: сумма квадратов через тождества, дополнительные углы в прямоугольном треугольнике, точные корни, координатные операции с векторами и классическая вероятность.',
  topics:['алгебраические тождества','прямоугольный треугольник','точные корни','векторы','классическая вероятность'],
  outcomes:[
    {competencyId:'t1_right',label:'Прямоугольный треугольник: sin и cos дополнительных углов',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'t7_power_actions',label:'Тождества и короткие преобразования без поиска лишних неизвестных',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'t2_dot',label:'Координаты, сумма и скалярное произведение векторов',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'t4_classic',label:'Классическая вероятность после фиксации одного участника',level:3,tone:'good',practiceDisposition:'manual'}
  ],
  materials:{pdf:'../pdf_docs/07.10.26.pdf',tex:'../tex_docs/07.10.26.tex',image:'../images/07.10.26.png'}
};

export function applyLesson0710CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;
  config.teacherSeed={
    ...(config.teacherSeed||{}),
    t1_right:Math.max(Number(config.teacherSeed?.t1_right||0),2)
  };
  config.evidence={
    ...(config.evidence||{}),
    t1_right:{
      text:'07.10 Ксения повторила работу с прямоугольным треугольником и дополнительными углами: связь sin A = cos B использовалась для перехода к малому треугольнику после высоты к гипотенузе. Формулу и выбор отношения требовалось восстанавливать с опорой на вопросы, поэтому навык фиксируется на уровне «в процессе».',
      href:'07.10.26.html#trig'
    }
  };

  const patchKey='__xenia0710CompetenceApplied';
  addEventListener('student:competence-state',()=>{
    const controller=window.__studentCompetenceMap;
    if(!controller||controller[patchKey])return;
    const ids=new Set((controller.items||[]).map(item=>item.id));
    const patch={};
    if(ids.has('t1_right'))patch.t1_right=Math.max(Number(controller.baseline?.t1_right||0),2);
    if(!Object.keys(patch).length)return;
    controller[patchKey]=true;
    controller.baseline={...(controller.baseline||{}),...patch};
    controller.state.studentLevels={...(controller.state?.studentLevels||{}),...controller.baseline};
    if(typeof controller.save==='function')controller.save();
    if(typeof controller.render==='function')controller.render();
  });

  const migrationKey='xenia-competence-teacher-seed-applied-20261007-review';
  try{
    if(localStorage.getItem(migrationKey))return;
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      state.studentLevels.t1_right=Math.max(Number(state.studentLevels.t1_right||0),2);
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){}
}
