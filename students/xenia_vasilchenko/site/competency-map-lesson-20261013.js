(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;
  const items = new Map(data.groups.flatMap(group =>
    (group.items || []).map(item => [item.id, item])
  ));
  // Source evidence only: no automatic mastery or repeat-level change.
  const sources = [
  [
    "eq_03",
    "equations",
    "нахождение неизвестного слагаемого"
  ],
  [
    "eq_04",
    "equations",
    "нахождение неизвестного уменьшаемого"
  ],
  [
    "eq_05",
    "equations",
    "нахождение неизвестного вычитаемого"
  ],
  [
    "frac_base_07",
    "equations",
    "выделение целой части неправильной дроби"
  ],
  [
    "frac_ops_04",
    "mixed",
    "вычитание дробей с разными знаменателями"
  ],
  [
    "frac_ops_06",
    "mixed",
    "вычитание смешанных чисел без занимания"
  ],
  [
    "frac_ops_07",
    "borrow",
    "вычитание смешанных чисел с заниманием единицы"
  ],
  [
    "frac_ops_13",
    "brackets",
    "порядок действий в выражениях с дробями"
  ],
  [
    "frac_ops_05",
    "brackets",
    "сложение смешанных чисел в скобках"
  ],
  [
    "frac_base_11",
    "equations",
    "сокращение дробей"
  ]
];
  for (const [id, anchor, topic] of sources) {
    const item = items.get(id);
    if (!item) continue;
    item.evidence = {
      date: '13.10.26',
      text: 'Материал занятия: ' + topic + '. Самостоятельный уровень освоения здесь не диагностировался.',
      href: '13.10.26.html#' + anchor,
      texHref: ''
    };
  }
  data.meta.updated = '13.10.2026';
  data.meta.sourceNote = 'Карта отражает занятия по 13.10.26 включительно. На последнем занятии разобраны уравнения с дробями, вычитание смешанных чисел и действия со скобками. Уровни освоения не повышались автоматически.';
  data.meta.material = {
    title: 'Уравнения с дробями и вычитание смешанных чисел',
    date: '13.10.26',
    pdf: '../pdf_docs/13.10.26.pdf'
  };
})();
