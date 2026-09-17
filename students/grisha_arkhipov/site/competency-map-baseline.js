(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data) return;

  data.studentName = 'Григорий Архипов';
  data.baselineLevels = {
    eq_21: 2,
    eq_22: 2,
    eq_23: 2,
    eq_24: 2,
    eq_25: 2,
    eq_26: 2,
    eq_27: 2,
    eq_28: 2,
    stereo_09: 2,
    stereo_10: 2,
    stereo_11: 2,
    stereo_12: 2,
    stereo_13: 2,
    stereo_14: 2,
    stereo_16: 2,
    stereo_18: 2
  };

  data.evidence = {};
  Object.keys(data.baselineLevels).forEach((id) => {
    data.evidence[id] = {
      text: 'Тема подтверждена материалами занятия 17.09.2026.',
      date: '17.09.2026',
      href: '../pdf_docs/17.09.26.pdf',
      tex: '../tex_docs/17.09.26.tex'
    };
  });
})();
