(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;
  const byId = new Map(data.groups.flatMap(group => (group.items || []).map(item => [item.id, item])));
  // Only add dated evidence; student mastery levels must remain unchanged.
  const sources = [
  [
    "frac_base_01",
    "foundation",
    "Выделяли 100% как целое и сопоставляли его с частью и долей."
  ],
  [
    "frac_ops_14",
    "triangle",
    "Находили часть от целого, включая 6% от 12,5 кг и остаток расходов."
  ],
  [
    "frac_ops_15",
    "whole",
    "Восстанавливали целое по известной части: 24 человека составляют 30% секции."
  ],
  [
    "dec_04",
    "foundation",
    "Переводили проценты в сотые и десятичные доли: 6%=0,06, 30%=0,3."
  ],
  [
    "frac_ops_16",
    "diagram",
    "Решали задачи с несколькими процентами одной первоначальной суммы и остатком."
  ],
  [
    "word_05",
    "diagram",
    "Строили схему-отрезок для распределения расходов."
  ],
  [
    "word_17",
    "diagram",
    "Определяли часть целого в задачах про ремонт, бюджет и сахар в ягодах."
  ],
  [
    "word_18",
    "discount",
    "Находили исходную цену, когда известна цена после скидки."
  ],
  [
    "word_16",
    "algorithm",
    "Сверяли результат с условиями задачи, единицами и смыслом ответа."
  ]
];
  for (const [id,anchor,explanation] of sources) {
    const item=byId.get(id);
    if(!item)continue;
    item.evidence={date:'12.11.26',text:explanation+' Уровень самостоятельного освоения по итогам совместной практики не повышался.',href:'12.11.26.html#'+anchor,texHref:'../tex_docs/12.11.26.tex'};
  }
  data.meta.updated='12.11.2026';
  data.meta.sourceNote='Карта дополнена материалами занятия 12.11.26: проценты, часть и целое, схема-отрезок, остаток и скидки. Уровни освоения сохранены.';
  data.meta.material={title:'Проценты: часть, целое и скидки',date:'12.11.26',pdf:'../pdf_docs/12.11.26.pdf'};
})();
