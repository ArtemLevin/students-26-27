export const LESSON_3009={
  date:'2026-09-30',
  href:'30.09.26.html',
  title:'Теорема Безу и схема Горнера: рациональные корни многочлена',
  navTitle:'Теорема Безу и схема Горнера',
  navSubtitle:'корень · множитель · p/q · нулевые коэффициенты',
  summary:'Поиск рациональных корней многочлена; связь P(a)=0 с множителем x−a; деление многочлена и схема Горнера; рациональные кандидаты p/q; нулевые коэффициенты при пропущенных степенях; последовательное понижение степени.',
  topics:['теорема Безу','рациональные корни','схема Горнера','деление многочлена','пропущенные степени'],
  outcomes:[
    {competencyId:'t6_factor',label:'Разложение многочлена через найденный корень и свойство нулевого произведения',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Поиск целых и рациональных кандидатов на корни',level:2,tone:'process',practiceDisposition:'manual'},
    {label:'Схема Горнера: остаток и коэффициенты частного',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Нулевые коэффициенты при пропущенных степенях',level:3,tone:'good',practiceDisposition:'manual'}
  ],
  materials:{pdf:'../pdf_docs/30.09.26.pdf',tex:'../tex_docs/30.09.26.tex',image:'../images/30.09.26.png',lab:'30.09.26-lab.html'}
};

export function applyLesson3009CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;
  config.teacherSeed={...(config.teacherSeed||{}),t6_factor:Math.max(Number(config.teacherSeed?.t6_factor||0),3)};
  config.evidence={...(config.evidence||{}),t6_factor:{
    text:'30.09 Ксения работала с кубическими уравнениями через теорему Безу и схему Горнера: находила кандидатов среди делителей свободного члена, проверяла P(a)=0, переходила от корня к множителю x−a и восстанавливала частное по строке Горнера. Отдельно закреплены нулевые коэффициенты при пропущенных степенях. В ходе занятия были отдельные ошибки по невнимательности в вычислениях, после разбора финальный пример выполнен верно; уровень по разложению уравнений сохраняется «уверенно».',
    href:'30.09.26.html#horner'
  }};
  const patchKey='__xenia3009CompetenceApplied';
  addEventListener('student:competence-state',()=>{
    const controller=window.__studentCompetenceMap;
    if(!controller||controller[patchKey])return;
    const ids=new Set((controller.items||[]).map(item=>item.id));
    if(!ids.has('t6_factor'))return;
    controller[patchKey]=true;
    controller.baseline={...(controller.baseline||{}),t6_factor:Math.max(Number(controller.baseline?.t6_factor||0),3)};
    controller.state.studentLevels={...(controller.state?.studentLevels||{}),...controller.baseline};
    if(typeof controller.save==='function')controller.save();
    if(typeof controller.render==='function')controller.render();
  });
  const migrationKey='xenia-competence-teacher-seed-applied-20260930-horner';
  try{
    if(localStorage.getItem(migrationKey))return;
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      state.studentLevels.t6_factor=Math.max(Number(state.studentLevels.t6_factor||0),3);
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){}
}
