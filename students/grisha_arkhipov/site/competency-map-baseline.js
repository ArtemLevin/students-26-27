(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data) return;

  data.studentName = 'Григорий Архипов';
  data.updated = '30.09.2026';

  const oldIds = [
    'eq_21','eq_22','eq_23','eq_24','eq_25','eq_26','eq_27','eq_28',
    'stereo_09','stereo_10','stereo_11','stereo_12','stereo_13','stereo_14','stereo_16','stereo_18'
  ];
  const currentIds = [
    'calc_05','calc_15',
    'eq_02','eq_20',
    'ineq_02','ineq_03','ineq_04','ineq_05','ineq_23','ineq_24',
    'func_09',
    'text_15','text_17','text_21','text_22'
  ];

  data.baselineLevels = {};
  oldIds.forEach((id) => { data.baselineLevels[id] = 2; });
  currentIds.forEach((id) => { data.baselineLevels[id] = 2; });

  data.evidence = {};
  oldIds.forEach((id) => {
    data.evidence[id] = {
      text: 'Тема подтверждена материалами занятия 17.09.2026.',
      date: '17.09.2026',
      href: '../pdf_docs/17.09.26.pdf',
      tex: '../tex_docs/17.09.26.tex'
    };
  });
  currentIds.forEach((id) => {
    data.evidence[id] = {
      text: 'Навык отрабатывался на занятии 30.09.2026: прикладные формулы, границы, квадратные уравнения, метод интервалов и отбор ответа по смыслу.',
      date: '30.09.2026',
      href: '../pdf_docs/30.09.26.pdf',
      tex: '../tex_docs/30.09.26.tex'
    };
  });

  data.materials = [
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