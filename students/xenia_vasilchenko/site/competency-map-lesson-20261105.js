(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;
  const byId = new Map(data.groups.flatMap(group => (group.items || []).map(item => [item.id, item])));
  // Lesson evidence only; all mastery levels stay unchanged.
  const sources = [
  [
    "frac_base_01",
    "relations",
    "Повторяли смысл доли как части целого."
  ],
  [
    "frac_ops_14",
    "relations",
    "Разбирали нахождение части от известного целого."
  ],
  [
    "frac_ops_15",
    "relations",
    "Находили целое по соответствующей известной части."
  ],
  [
    "frac_base_06",
    "forms",
    "Переводили смешанные числа в неправильные дроби."
  ],
  [
    "frac_ops_12",
    "forms",
    "Использовали неправильные дроби при делении смешанных чисел."
  ],
  [
    "frac_ops_16",
    "remaining",
    "Работали с оставшейся долей и многошаговыми текстовыми задачами."
  ],
  [
    "word_17",
    "remaining",
    "Решали задачи на части целого и остаток."
  ],
  [
    "word_18",
    "changes",
    "Восстанавливали первоначальную величину по известной доле."
  ],
  [
    "word_16",
    "algorithm",
    "Обсуждали проверку смысла ответа."
  ],
  [
    "dec_04",
    "percent",
    "Переводили проценты и десятичные доли в обыкновенные дроби."
  ],
  [
    "dec_14",
    "forms",
    "Разбирали деление на десятичные дроби."
  ],
  [
    "word_03",
    "algorithm",
    "Составляли схему долей и величин для текстовых задач."
  ]
];
  for (const [id, anchor, explanation] of sources) {
    const item = byId.get(id);
    if (!item) continue;
    item.evidence = {
      date: '05.11.26',
      text: explanation + ' Уровень самостоятельного освоения по итогам совместной практики не повышался.',
      href: '05.11.26.html#' + anchor,
      texHref: '../tex_docs/05.11.26.tex'
    };
  }
  data.meta.updated = '05.11.2026';
  data.meta.sourceNote = 'Карта дополнена материалами занятия 05.11.26: доли, проценты, остаток и текстовые задачи. Уровни освоения сохранены.';
  data.meta.material = {title: 'Доли, проценты и целое', date: '05.11.26', pdf: '../pdf_docs/05.11.26.pdf'};
})();
