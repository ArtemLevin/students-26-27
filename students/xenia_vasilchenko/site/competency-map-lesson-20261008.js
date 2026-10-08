(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;
  const items = new Map(data.groups.flatMap(group =>
    (group.items || []).map(item => [item.id, item])
  ));
  // Lesson evidence updates the history link; no mastery or repeat level is inferred.
  const sources = [
    ['units_03', 'minutes', 'перевод дробных частей минуты в секунды'],
    ['units_07', 'minutes', 'сравнение величин в одинаковых единицах'],
    ['frac_base_15', 'minutes', 'сравнение дробей через общий знаменатель'],
    ['frac_base_01', 'shares', 'доли одного целого'],
    ['word_17', 'shares', 'задачи на части одного целого'],
    ['word_02', 'stories', 'определение части и целого из условия'],
    ['word_04', 'work', 'организация данных о производительности и времени'],
    ['word_16', 'work', 'проверка результата в контексте задачи']
  ];
  for (const [id, anchor, topic] of sources) {
    const item = items.get(id);
    if (!item) continue;
    item.evidence = {
      date: '08.10.26',
      text: 'Материал занятия: ' + topic +
        '. Изучение темы само по себе не подтверждает самостоятельное освоение.',
      href: '08.10.26.html#' + anchor,
      texHref: '../tex_docs/08.10.26.tex'
    };
  }
  data.meta.updated = '08.10.2026';
  data.meta.sourceNote = 'Карта отражает материалы до 08.10.26 включительно. На занятии разобраны сравнение дробных величин, доли одного целого и задачи на работу. Уровни освоения сохраняются без дополнительной диагностики.';
  data.meta.material = {
    title: 'Сравнение дробных величин и задачи на работу',
    date: '08.10.26',
    pdf: '../pdf_docs/08.10.26.pdf',
    tex: '../tex_docs/08.10.26.tex'
  };
})();
