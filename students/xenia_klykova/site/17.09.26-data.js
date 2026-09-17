export const LESSON_1709={
  date:'2026-09-17',
  href:'17.09.26.html',
  title:'Теория вероятностей и статистика: выбор без возвращения и разброс данных',
  navTitle:'Вероятность и статистика',
  navSubtitle:'без возвращения, медиана, дисперсия и σ',
  summary:'Выбор без возвращения и условные вероятности; умножение по последовательной ветви и сложение несовместимых сценариев; задача о чашках и блюдцах; среднее, медиана и мода; устойчивость медианы к выбросам; размах, дисперсия и стандартное отклонение; корректная интерпретация интервала x̄ ± σ.',
  topics:['выбор без возвращения','«И» и «ИЛИ»','среднее, медиана и мода','дисперсия','стандартное отклонение'],
  outcomes:[
    {competencyId:'t5_product',label:'Умножение условных вероятностей без возвращения',level:4,tone:'good',practiceDisposition:'manual'},
    {competencyId:'t5_sum',label:'Сложение несовместимых сценариев',level:4,tone:'good',practiceDisposition:'manual'},
    {competencyId:'ege2027_t6_variance',label:'Дисперсия числового набора',level:2,tone:'process',practiceDisposition:'manual'},
    {competencyId:'ege2027_t6_stddev',label:'Стандартное отклонение и масштаб разброса',level:2,tone:'process',practiceDisposition:'manual'},
    {label:'Медиана, мода и влияние выбросов',level:3,tone:'good',practiceDisposition:'manual'}
  ],
  materials:{pdf:'../pdf_docs/17.09.26.pdf',tex:'../tex_docs/17.09.26.tex'}
};

export function applyLesson1709CompetenceUpdate(){
  const config=window.STUDENT_COMPETENCE_CONFIG;
  if(!config)return;

  config.teacherSeed={
    ...(config.teacherSeed||{}),
    ege2027_t6_variance:Math.max(Number(config.teacherSeed?.ege2027_t6_variance||0),2),
    ege2027_t6_stddev:Math.max(Number(config.teacherSeed?.ege2027_t6_stddev||0),2)
  };

  config.evidence={
    ...(config.evidence||{}),
    t5_product:{
      text:'17.09 Ксения перенесла правило умножения на зависимый выбор без возвращения: отслеживала изменение числителей и знаменателей по шагам и разобрала событие «первый синий фломастер появился третьим». Навык умножения по последовательной ветви остаётся на уровне «освоено».',
      href:'17.09.26.html'
    },
    t5_sum:{
      text:'17.09 в задаче о чашках и блюдцах Ксения собрала итоговую вероятность из несовместимых случаев по количеству выбранных синих предметов: 0, 1 или 2. Связка «умножаем внутри сценария — складываем несовместимые сценарии» подтверждена и остаётся на уровне «освоено».',
      href:'17.09.26.html'
    },
    ege2027_t6_variance:{
      text:'17.09 введена дисперсия числового набора D=(1/n)Σ(xᵢ−x̄)²: Ксения разобрала вычисление отклонений от среднего, квадраты отклонений и группировку повторяющихся значений. Основа метода понятна; вариант через распределение случайной величины ещё требует отдельного закрепления, поэтому уровень установлен «в процессе».',
      href:'17.09.26.html'
    },
    ege2027_t6_stddev:{
      text:'17.09 стандартное отклонение введено как σ=√D и интерпретировано как масштаб разброса. Отдельно зафиксировано, что интервал x̄±σ без дополнительных предпосылок не является гарантированным вероятностным интервалом. Навык установлен на уровне «в процессе».',
      href:'17.09.26.html'
    }
  };

  const migrationKey='xenia-competence-teacher-seed-applied-20260917-probability-statistics';
  if(localStorage.getItem(migrationKey))return;
  try{
    const state=JSON.parse(localStorage.getItem(config.stateKey)||'null');
    if(state&&state.schemaVersion===2&&state.studentLevels&&typeof state.studentLevels==='object'){
      for(const id of ['t5_product','t5_sum','ege2027_t6_variance','ege2027_t6_stddev']){
        const seeded=Number(config.teacherSeed[id]||0);
        const current=Number(state.studentLevels[id]||0);
        state.studentLevels[id]=Math.max(current,seeded);
      }
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(config.stateKey,JSON.stringify(state));
    }
    localStorage.setItem(migrationKey,'1');
  }catch(_){/* При недоступном localStorage teacherSeed применится при инициализации карты. */}
}
