(() => {
  'use strict';
  const baseLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};
  const levels={
    ...baseLevels,
    t8_derivative_rules:3,
    t8_elementary_derivatives:2
  };
  const evidence={
    ...(window.__nikolEvidence||{}),
    t8_derivative_rules:{
      text:'07.09 Николь уверенно применила правила произведения и частного: выделяла u и v, находила u′ и v′, корректно собирала u′v + uv′ и u′v − uv′, а также учитывала квадрат исходного знаменателя. Навык переведён на уровень 3: типовые вычислительные задачи выполняются самостоятельно.',
      href:'07.09.26.html#rules'
    },
    t8_elementary_derivatives:{
      text:'07.09 расширена таблица производных: sin, cos, tg, ctg, показательная, экспоненциальная и логарифмическая функции; отдельно разобраны правило цепочки и ОДЗ логарифмов. Формулы применялись в смешанных примерах, но часть специальных формул ещё требует воспроизведения по памяти, поэтому уровень сохраняется 2.',
      href:'07.09.26.html#elementary'
    }
  };
  window.__nikolLevels=levels;
  window.__nikolTeacherLevels=levels;
  window.__nikolEvidence=evidence;
  window.__nikolVersion='2026-09-07-derivative-v2';
})();
