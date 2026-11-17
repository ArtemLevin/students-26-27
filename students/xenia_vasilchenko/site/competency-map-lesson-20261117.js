(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;
  const byId = new Map(data.groups.flatMap(g => (g.items || []).map(item => [item.id,item])));
  const sources = [
  [
    "frac_base_01",
    "meaning",
    "Разбирали долю как отношение части к целому на примере решённых задач."
  ],
  [
    "frac_base_11",
    "denominator",
    "Сокращали отношения 320/480 и 24/42, проверяли смысл знаменателя."
  ],
  [
    "frac_base_15",
    "comparison",
    "Сравнивали 15/18 и 19/21, приводя к знаменателю 42."
  ],
  [
    "frac_ops_11",
    "remaining",
    "Делили доли 5/9 и 4/9, сравнивая участки тоннеля."
  ],
  [
    "frac_ops_16",
    "remaining",
    "В многошаговой задаче сначала находили оставшуюся долю, затем отношение частей."
  ],
  [
    "dec_04",
    "percent",
    "Находили процент от выбранной группы: 44/71·100% и 44/73·100%."
  ],
  [
    "units_02",
    "units",
    "Переводили 4,4 кг в 4400 г перед сравнением масс."
  ],
  [
    "units_07",
    "units",
    "Сравнивали массу 99 г с 4,4 кг после приведения к одной единице."
  ],
  [
    "word_02",
    "algorithm",
    "В текстовых задачах выделяли первую и вторую величину отношения."
  ],
  [
    "word_16",
    "algorithm",
    "Проверяли ответ на смысл и соответствие единиц и знаменателя."
  ],
  [
    "word_17",
    "denominator",
    "Находили часть от целого по смыслу задачи о букете и сплаве."
  ]
];
  for (const [id,anchor,explanation] of sources) {
    const item=byId.get(id);
    if(!item)continue;
    item.evidence={date:'17.11.26',text:explanation+' Занятие содержит совместную практику; уровень освоения не повышается.',href:'17.11.26.html#'+anchor,texHref:'../tex_docs/17.11.26.tex'};
  }
  data.meta.updated='17.11.2026';
  data.meta.sourceNote='Добавлены материалы занятия 17.11.26 об отношениях, долях и пропорциях. Подтверждённые уровни освоения сохранены.';
  data.meta.material={title:'Отношения, доли и пропорции',date:'17.11.26',pdf:'../pdf_docs/17.11.26.pdf'};
})();
