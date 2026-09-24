export const LESSON_2409={
  date:'2026-09-24',
  href:'24.09.26.html',
  title:'Сечения куба и тетраэдра: построение и обоснование',
  navTitle:'Сечения многогранников',
  navSubtitle:'след плоскости · вспомогательные точки · строгая запись',
  summary:'Построение сечений куба и тетраэдра методом перехода от грани к грани; вспомогательные точки и продолжения прямых; обоснование принадлежности каждой новой точки плоскости сечения; видимые и скрытые линии.',
  topics:['сечения куба','сечения тетраэдра','след плоскости','вспомогательные точки','обоснование построения'],
  outcomes:[
    {competencyId:'t3_basic_sections',label:'Построение сечений и переход от грани к грани',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Вспомогательные точки и продолжение прямых',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Строгое обоснование принадлежности точек плоскости сечения',level:2,tone:'process',practiceDisposition:'manual'},
    {label:'Видимые и скрытые линии на чертеже',level:3,tone:'good',practiceDisposition:'manual'}
  ],
  materials:{pdf:'../pdf_docs/24.09.26.pdf',tex:'../tex_docs/24.09.26.tex',image:'../images/24.09.26.png'}
};

export function applyLesson2409CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;
  config.teacherSeed={...(config.teacherSeed||{}),t3_basic_sections:Math.max(Number(config.teacherSeed?.t3_basic_sections||0),3)};
  config.evidence={...(config.evidence||{}),t3_basic_sections:{
    text:'24.09 Ксения продолжила работу с сечениями куба и перешла к тетраэдру: уверенно находила следы плоскости, использовала продолжения прямых и вспомогательные точки, самостоятельно доводила построение до замкнутого многоугольника. Отдельно отработана строгая запись — почему каждая вспомогательная точка и следующая прямая принадлежат плоскости сечения. Построение сохраняется на уровне «уверенно»; формальная запись многошагового обоснования остаётся зоной закрепления.',
    href:'24.09.26.html'
  }};
  const patchKey='__xenia2409CompetenceApplied';
  addEventListener('student:competence-state',()=>{
    const controller=window.__studentCompetenceMap;
    if(!controller||controller[patchKey])return;
    const ids=new Set((controller.items||[]).map(item=>item.id));
    if(!ids.has('t3_basic_sections'))return;
    controller[patchKey]=true;
    controller.baseline={...(controller.baseline||{}),t3_basic_sections:Math.max(Number(controller.baseline?.t3_basic_sections||0),3)};
    controller.state.studentLevels={...(controller.state?.studentLevels||{}),...controller.baseline};
    if(typeof controller.save==='function')controller.save();
    if(typeof controller.render==='function')controller.render();
  });
  const migrationKey='xenia-competence-teacher-seed-applied-20260924-sections-proof';
  try{
    if(localStorage.getItem(migrationKey))return;
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      state.studentLevels.t3_basic_sections=Math.max(Number(state.studentLevels.t3_basic_sections||0),3);
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){}
}
