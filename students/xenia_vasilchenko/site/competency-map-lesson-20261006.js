(() => {
  'use strict';

  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;

  const byId = new Map(data.groups.flatMap(group => (group.items || []).map(item => [item.id, item])));
  const repeat = new Set(Array.isArray(data.repeatTopics) ? data.repeatTopics : []);

  const evidence = (id, level, note, needsRepeat = false) => {
    const item = byId.get(id);
    if (!item) return;
    item.baselineLevel = Math.max(Number(item.baselineLevel) || 0, level);
    item.evidence = {
      date: '06.10.26',
      text: 'Занятие: ' + note,
      href: '06.10.26.html',
      texHref: '../tex_docs/06.10.26.tex'
    };
    if (needsRepeat) repeat.add(id);
    else repeat.delete(id);
  };

  evidence('div_19', 3, 'разложение знаменателей на простые множители использовалось для поиска общего знаменателя.');
  evidence('div_21', 3, 'НОК системно использовался как наименьший общий знаменатель для двух и нескольких дробей.');
  evidence('frac_base_09', 3, 'основное свойство дроби применялось при домножении числителя и знаменателя.');
  evidence('frac_base_10', 3, 'получение равных дробей закреплялось через дополнительные множители.');
  evidence('frac_base_12', 3, 'дополнительный множитель находился как НОК, делённый на текущий знаменатель.');
  evidence('frac_ops_03', 3, 'сложение дробей с разными знаменателями отрабатывалось через НОК и общий знаменатель.');
  evidence('frac_base_13', 2, 'сравнение дробей с одинаковыми знаменателями использовалось после приведения.', true);
  evidence('frac_base_15', 2, 'сравнение дробей через общий знаменатель отрабатывалось с проверкой числителей.', true);
  evidence('frac_base_16', 2, 'упорядочивание нескольких дробей выполнялось после приведения к одному знаменателю; требуется дополнительная автоматизация.', true);

  data.repeatTopics = [...repeat];
  data.meta.studentName = 'Ксения Васильченко';
  data.meta.updated = '06.10.2026';
  data.meta.sourceNote = 'Карта учитывает входную диагностику и занятия по 06.10.26 включительно. На последнем занятии системно отработаны НОК знаменателей, дополнительные множители и сложение дробей с разными знаменателями; сравнение и упорядочивание дробей через общий знаменатель требуют дальнейшей автоматизации.';
  data.meta.material = {
    title: 'Приведение дробей к общему знаменателю',
    date: '06.10.26',
    pdf: '../pdf_docs/06.10.26.pdf',
    tex: '../tex_docs/06.10.26.tex'
  };

  const slug = value => String(value).toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const markerKey = data.meta.student + '-competency-map-lesson-20261006-v1';
  try {
    if (!localStorage.getItem(markerKey)) {
      const baseKey = data.meta.student + '-' + slug(data.meta.program);
      localStorage.removeItem(baseKey + '-competency-map');
      localStorage.removeItem(baseKey + '-repeat');
      localStorage.setItem(markerKey, '1');
    }
  } catch (_) {}
})();