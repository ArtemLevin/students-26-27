(() => {
  'use strict';
  const baseLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};
  const levels={
    ...baseLevels,
    t8_derivative_rules:3,
    t8_elementary_derivatives:3
  };
  const evidence={
    ...(window.__nikolEvidence||{}),
    t8_derivative_rules:{
      text:'11.09 систематизировано правило цепочки: Николь выделяла внешнюю и внутреннюю функции, находила обе производные и собирала результат произведением. Отдельно закреплены выбор переменной дифференцирования и роль параметров как констант. Уровень 3 подтверждён типовыми задачами занятия.',
      href:'11.09.26.html#idea'
    },
    t8_elementary_derivatives:{
      text:'11.09 правило цепочки применено к квадратному корню, экспоненте, степенной сложной функции и синусу. В примере с корнем выполнена проверка области определения производной; материал закреплён пятью упражнениями. Навык переведён на уровень 3.',
      href:'11.09.26.html#examples'
    }
  };
  window.__nikolLevels=levels;
  window.__nikolTeacherLevels=levels;
  window.__nikolEvidence=evidence;
  window.__nikolVersion='2026-09-11-chain-rule-v3';
})();
