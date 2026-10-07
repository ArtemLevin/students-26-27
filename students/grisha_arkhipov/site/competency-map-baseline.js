(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data) return;

  data.studentName = 'Григорий Архипов';
  data.updated = '07.10.2026';

  const oldIds = [
    'eq_21','eq_22','eq_23','eq_24','eq_25','eq_26','eq_27','eq_28',
    'stereo_09','stereo_10','stereo_11','stereo_12','stereo_13','stereo_14','stereo_16','stereo_18'
  ];
  const currentIds = [
    'calc_05','calc_09','calc_10','calc_15',
    'eq_02','eq_20',
    'ineq_02','ineq_03','ineq_04','ineq_05','ineq_23','ineq_24',
    'func_09',
    'text_15','text_17','text_21','text_22'
  ];

  data.baselineLevels = {};
  oldIds.forEach((id) => { data.baselineLevels[id] = 2; });

  data.evidence = {};
  oldIds.forEach((id) => {
    data.evidence[id] = {
      text: 'Тема подтверждена материалами занятия 17.09.2026.',
      date: '17.09.2026',
      href: '../pdf_docs/17.09.26.pdf',
      tex: '../tex_docs/17.09.26.tex'
    };
  });
  const lessonAnchor = {
    calc_05: 'read',
    calc_09: 'extra',
    calc_10: 'extra',
    calc_15: 'read',
    eq_02: 'quadratic',
    eq_20: 'domain',
    ineq_02: 'intervals',
    ineq_03: 'intervals',
    ineq_04: 'intervals',
    ineq_05: 'intervals',
    ineq_23: 'intervals',
    ineq_24: 'intervals',
    func_09: 'intervals',
    text_15: 'border',
    text_17: 'border',
    text_21: 'domain',
    text_22: 'domain'
  };
  currentIds.forEach((id) => {
    data.evidence[id] = {
      text: 'Навык затрагивался на занятии 30.09.2026. Диагностический уровень автоматически не повышается без подтверждения самостоятельности.',
      date: '30.09.2026',
      lesson: `30.09.26.html#${lessonAnchor[id]}`,
      ktp: 'ktp.html?lesson=ktp-001',
      href: '../pdf_docs/30.09.26.pdf',
      tex: '../tex_docs/30.09.26.tex'
    };
  });

  const graphLessonAnchor = {
    func_08: 'linear',
    func_09: 'parabola',
    func_10: 'hyperbola',
    eq_14: 'method'
  };
  Object.entries(graphLessonAnchor).forEach(([id, anchor]) => {
    data.evidence[id] = {
      text: 'Навык отрабатывался на занятии 07.10.2026. Уровень автоматически не повышается: отдельной диагностики самостоятельности на этом занятии не было.',
      date: '07.10.2026',
      lesson: `07.10.26.html#${anchor}`,
      ktp: 'ktp.html?lesson=ktp-002',
      href: '../pdf_docs/07.10.26.pdf',
      tex: '../tex_docs/07.10.26.tex'
    };
  });

  data.materials = [
    {
      date: '07.10.2026',
      title: 'Графики функций: метод узловых точек',
      pdf: '../pdf_docs/07.10.26.pdf',
      tex: '../tex_docs/07.10.26.tex',
      lesson: '07.10.26.html'
    },
    {
      date: '30.09.2026',
      title: 'Прикладные задачи с формулами: граничные значения и отбор корней',
      pdf: '../pdf_docs/30.09.26.pdf',
      tex: '../tex_docs/30.09.26.tex',
      lesson: '30.09.26.html',
      lab: '30.09.26-lab.html'
    },
    {
      date: '17.09.2026',
      title: 'Теорема Безу, схема Горнера и сечения многогранников',
      pdf: '../pdf_docs/17.09.26.pdf',
      tex: '../tex_docs/17.09.26.tex'
    }
  ];
})();