(() => {
  'use strict';
  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;
  const byId = new Map(data.groups.flatMap(g => g.items || []).map(i => [i.id, i]));
  // This layer adds traceable lesson evidence only. Baseline and saved mastery stay unchanged.
  const sources = [
    ['frac_base_01', 'relations', 'Разобрали долю как часть целого и обозначения N, f, d.'],
    ['frac_ops_14', 'examples', 'Находили часть от известного целого.'],
    ['frac_ops_15', 'examples', 'Находили целое по доле и соответствующей ей части.'],
    ['frac_ops_16', 'rectangle', 'Решали многошаговую задачу на площадь, сторону и периметр.'],
    ['word_01', 'language', 'Переводили условия задач на язык трёх величин.'],
    ['word_17', 'examples', 'Разбирали задачи на часть целого.'],
    ['word_18', 'examples', 'Разбирали задачи на целое по его части.'],
    ['word_16', 'relations', 'Проверяли смысл результата по формуле d = N · f.'],
    ['dec_04', 'examples', 'Сопоставляли десятичную долю и процентную запись.'],
    ['dec_14', 'examples', 'Обсуждали деление десятичных дробей в текстовых задачах.'],
    ['frac_ops_12', 'rectangle', 'Переводили смешанные числа в неправильные дроби.'],
    ['eq_15', 'rectangle', 'Применяли формулу периметра прямоугольника.'],
    ['eq_16', 'rectangle', 'Применяли формулу площади прямоугольника.']
  ];
  for (const [id, anchor, explanation] of sources) {
    const item = byId.get(id);
    if (!item) continue;
    item.evidence = {
      date: '03.11.26',
      text: explanation + ' Материал урока подтверждает знакомство или совместную практику; уровень не повышался.',
      href: '03.11.26.html#' + anchor,
      texHref: '../tex_docs/03.11.26.tex'
    };
  }
  data.meta.updated = '03.11.2026';
  data.meta.sourceNote = 'Карта дополнена свидетельствами занятия 03.11.26: часть и целое, задачи на доли и прямоугольник. Уровни освоения сохранены.';
  data.meta.material = {title: 'Дробь от числа и число по его дроби', date: '03.11.26', pdf: '../pdf_docs/03.11.26.pdf'};
})();