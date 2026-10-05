export const LESSON_0510={
  date:'2026-10-05',
  href:'05.10.26.html',
  title:'Повторение ключевых тем ЕГЭ: геометрия, вероятность и модели',
  navTitle:'Повторение ключевых тем ЕГЭ',
  navSubtitle:'геометрия · векторы · вероятность · уравнения · движение',
  summary:'Смешанное повторение: вписанный угол, площадь треугольника, скалярное произведение, классическая и условная вероятность, формула Бернулли, уравнения с корнем и дробями, прикладные формулы и движение.',
  topics:['геометрия','векторы','условная вероятность','формула Бернулли','уравнения','движение'],
  outcomes:[
    {competencyId:'t2_dot',label:'Скалярное произведение и угол между векторами',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'t5_conditional',label:'Условная вероятность: выбор правильного знаменателя',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'t5_bernoulli',label:'Формула Бернулли и сокращение факториалов',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'t10_line',label:'Движение по прямой: таблица S–v–t и разница во времени',level:2,tone:'process',practiceDisposition:'manual'}
  ],
  materials:{pdf:'../pdf_docs/05.10.26.pdf',tex:'../tex_docs/05.10.26.tex',image:'../images/05.10.26.png'}
};

export function applyLesson0510CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;
  config.teacherSeed={
    ...(config.teacherSeed||{}),
    t5_conditional:Math.max(Number(config.teacherSeed?.t5_conditional||0),2),
    t5_tree:Math.max(Number(config.teacherSeed?.t5_tree||0),2)
  };
  config.evidence={
    ...(config.evidence||{}),
    t5_conditional:{
      text:'05.10 Ксения повторяла условную вероятность по дереву: отдельно считала P(B) и P(A∩B), затем использовала P(A|B)=P(A∩B)/P(B). Потребовалось восстановить алгоритм и исправить вычислительную ошибку, поэтому навык фиксируется на уровне «в процессе».',
      href:'05.10.26.html#probability'
    },
    t5_tree:{
      text:'05.10 при разборе дерева вероятностей Ксения восстановила правило: вероятности вдоль одной траектории перемножаются, подходящие траектории складываются. Для самостоятельного применения ещё требуется закрепление, уровень «в процессе».',
      href:'05.10.26.html#probability'
    },
    t10_line:{
      text:'05.10 в задаче на встречное движение Ксения построила таблицу S–v–t и выразила пути через x и 510−x. Ошибка возникла в выборе разности времён; после разбора зафиксировано правило «раньше выехал → дольше ехал».',
      href:'05.10.26.html#motion'
    }
  };

  const patchKey='__xenia0510CompetenceApplied';
  addEventListener('student:competence-state',()=>{
    const controller=window.__studentCompetenceMap;
    if(!controller||controller[patchKey])return;
    const ids=new Set((controller.items||[]).map(item=>item.id));
    const patch={};
    if(ids.has('t5_conditional'))patch.t5_conditional=Math.max(Number(controller.baseline?.t5_conditional||0),2);
    if(ids.has('t5_tree'))patch.t5_tree=Math.max(Number(controller.baseline?.t5_tree||0),2);
    if(!Object.keys(patch).length)return;
    controller[patchKey]=true;
    controller.baseline={...(controller.baseline||{}),...patch};
    controller.state.studentLevels={...(controller.state?.studentLevels||{}),...controller.baseline};
    if(typeof controller.save==='function')controller.save();
    if(typeof controller.render==='function')controller.render();
  });

  const migrationKey='xenia-competence-teacher-seed-applied-20261005-review';
  try{
    if(localStorage.getItem(migrationKey))return;
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      state.studentLevels.t5_conditional=Math.max(Number(state.studentLevels.t5_conditional||0),2);
      state.studentLevels.t5_tree=Math.max(Number(state.studentLevels.t5_tree||0),2);
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){}
}
