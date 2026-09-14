(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;

  const lesson = {
    href: '14.09.26.html',
    label: 'Открыть занятие 14.09.26 →'
  };
  const evidence = text => [{ date: '14.09.2026', text }];

  const updates = {
    ege08_02: {
      level: 3,
      evidence: evidence('На пробном занятии уверенно применялись целые показатели, нулевая и отрицательная степени.'),
      material: lesson
    },
    ege08_03: {
      level: 2,
      repeat: true,
      evidence: evidence('Разобран переход между корнями и рациональными показателями; навык требует закрепления.'),
      material: lesson
    },
    ege08_04: {
      level: 3,
      evidence: evidence('Отработаны умножение и деление степеней, степень произведения, степень частного и степень степени.'),
      material: lesson
    },
    ege08_05: {
      level: 2,
      evidence: evidence('Корни использовались как часть стратегии приведения основания к степенному виду.'),
      material: lesson
    },
    ege08_06: {
      level: 2,
      repeat: true,
      evidence: evidence('Разобраны преобразования корней через дробный показатель и объединение одинаковых оснований.'),
      material: lesson
    },
    ege20_02: {
      level: 2,
      evidence: evidence('Повторены определения простого и составного числа и примеры их распознавания.'),
      material: lesson
    },
    ege20_03: {
      level: 2,
      evidence: evidence('Показана факторизация 81 и представление составных чисел в виде степеней простых оснований.'),
      material: lesson
    }
  };

  for (const group of data.groups) {
    for (const item of group.items) {
      if (updates[item.id]) Object.assign(item, updates[item.id]);
    }
  }

  data.meta.sourceNote = 'Карта обновлена 14.09.2026: добавлены подтверждённые результаты пробного занятия по степеням, корням и факторизации.';
  data.meta.updated = '14.09.2026';
})();
