export const LESSON_2809={
  date:'2026-09-28',
  href:'28.09.26.html',
  title:'Математическое ожидание: распределение и число испытаний',
  navTitle:'Математическое ожидание',
  navSubtitle:'распределение · E(X)=np · 1/p · r/p',
  summary:'Математическое ожидание дискретной случайной величины как долгосрочное среднее; построение распределения; линейность ожидания для суммы индикаторов; ожидаемое число успехов в n испытаниях; ожидаемое число испытаний до первого и нескольких успехов.',
  topics:['математическое ожидание','дискретная случайная величина','распределение','число успехов','число испытаний до успеха'],
  outcomes:[
    {label:'Смысл математического ожидания как долгосрочного среднего',level:2,tone:'process',practiceDisposition:'manual'},
    {label:'Вычисление E(X) по распределению',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Построение распределения числа событий',level:3,tone:'good',practiceDisposition:'manual'},
    {competencyId:'t5_bernoulli',label:'Ожидаемое число успехов в фиксированном числе испытаний',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Ожидаемое число испытаний до первого и нескольких успехов',level:2,tone:'process',practiceDisposition:'manual'}
  ],
  materials:{pdf:'../pdf_docs/28.09.26.pdf',tex:'../tex_docs/28.09.26.tex',image:'../images/28.09.26.png'}
};

export function applyLesson2809CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;
  config.teacherSeed={...(config.teacherSeed||{}),t5_bernoulli:Math.max(Number(config.teacherSeed?.t5_bernoulli||0),3)};
  config.evidence={...(config.evidence||{}),t5_bernoulli:{
    text:'28.09 Ксения связала схему повторных испытаний с математическим ожиданием: для числа успехов при фиксированном числе одинаковых испытаний использовала E(X)=np и сравнила этот короткий путь с построением полного биномиального распределения. Уровень по схеме Бернулли сохраняется «уверенно»; новое содержание занятия — смысл математического ожидания и выбор между общей формулой, np, 1/p и r/p — продолжает закрепляться.',
    href:'28.09.26.html'
  }};
  const patchKey='__xenia2809CompetenceApplied';
  addEventListener('student:competence-state',()=>{
    const controller=window.__studentCompetenceMap;
    if(!controller||controller[patchKey])return;
    const ids=new Set((controller.items||[]).map(item=>item.id));
    if(!ids.has('t5_bernoulli'))return;
    controller[patchKey]=true;
    controller.baseline={...(controller.baseline||{}),t5_bernoulli:Math.max(Number(controller.baseline?.t5_bernoulli||0),3)};
    controller.state.studentLevels={...(controller.state?.studentLevels||{}),...controller.baseline};
    if(typeof controller.save==='function')controller.save();
    if(typeof controller.render==='function')controller.render();
  });
  const migrationKey='xenia-competence-teacher-seed-applied-20260928-expectation';
  try{
    if(localStorage.getItem(migrationKey))return;
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      state.studentLevels.t5_bernoulli=Math.max(Number(state.studentLevels.t5_bernoulli||0),3);
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){}
}
