export const LESSON_2109={
  date:'2026-09-21',
  href:'21.09.26.html',
  title:'Сечения куба: построение по трём точкам',
  navTitle:'Сечения куба',
  navSubtitle:'следы плоскости, общие рёбра и вспомогательные точки',
  summary:'Сечение куба как многоугольник пересечения с секущей плоскостью; построение следа на грани; переход между соседними гранями через общее ребро; вспомогательные точки вне куба; проверка принадлежности каждой стороны грани и замкнутости сечения.',
  topics:['сечения куба','секущая плоскость','след на грани','общее ребро граней','вспомогательные точки'],
  outcomes:[
    {competencyId:'t3_basic_sections',label:'Построение сечения куба и пространственная логика',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Переход с грани на грань через общее ребро',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Вспомогательные точки вне куба',level:3,tone:'good',practiceDisposition:'manual'},
    {label:'Самостоятельное построение без подсказки',level:2,tone:'process',practiceDisposition:'manual'}
  ],
  materials:{
    pdf:'../pdf_docs/21.09.26.pdf',
    tex:'../tex_docs/21.09.26.tex',
    image:'../images/21.09.26.png',
    lab:'21.09.26-lab.html?case=1'
  }
};

export function applyLesson2109CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;

  config.teacherSeed={
    ...(config.teacherSeed||{}),
    t3_basic_sections:Math.max(Number(config.teacherSeed?.t3_basic_sections||0),3)
  };

  config.evidence={
    ...(config.evidence||{}),
    t3_basic_sections:{
      text:'21.09 Ксения отработала построение сечений куба по трём точкам: соединяла точки одной грани, продолжала след секущей плоскости до общего ребра соседних граней, использовала вспомогательные точки вне куба и находила новые вершины сечения на рёбрах. К концу занятия смогла вести существенную часть построения самостоятельно; для устойчивости навыка требуется дополнительная практика, поэтому уровень остаётся «уверенно».',
      href:'21.09.26.html'
    }
  };

  const postUpgradeKey='__xenia2109CompetencePatchInstalled';
  if(!window[postUpgradeKey]){
    window[postUpgradeKey]=true;
    addEventListener('student:competence-state',()=>{
      const controller=window.__studentCompetenceMap;
      if(!controller||controller.__xenia2109CompetenceApplied)return;
      const ids=new Set((controller.items||[]).map(item=>item.id));
      if(!ids.has('t3_basic_sections'))return;
      controller.__xenia2109CompetenceApplied=true;
      controller.baseline={
        ...(controller.baseline||{}),
        t3_basic_sections:Math.max(Number(controller.baseline?.t3_basic_sections||0),3)
      };
      controller.state.studentLevels={...(controller.state?.studentLevels||{}),...controller.baseline};
      if(typeof controller.save==='function')controller.save();
      if(typeof controller.render==='function')controller.render();
    });
  }

  const migrationKey='xenia-competence-teacher-seed-applied-20260921-sections';
  try{
    if(localStorage.getItem(migrationKey))return;
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      const seeded=Number(config.teacherSeed.t3_basic_sections||0);
      const current=Number(state.studentLevels.t3_basic_sections||0);
      state.studentLevels.t3_basic_sections=Math.max(current,seeded);
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){/* При недоступном localStorage teacherSeed применится при инициализации карты. */}
}
