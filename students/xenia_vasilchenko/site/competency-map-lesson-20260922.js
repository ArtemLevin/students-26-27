(() => {
  'use strict';

  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;

  const findGroup = id => data.groups.find(group => group.id === id);
  const appendSkill = (groupId, id, title, level, note) => {
    const group = findGroup(groupId);
    if (!group || !Array.isArray(group.items) || group.items.some(item => item.id === id)) return;
    group.items.push({
      id,
      title,
      baselineLevel: level,
      description: 'Нужно уметь уверенно выполнять навык «' + title + '», объяснять ход решения и проверять результат.',
      diagnosis: 'Объяснить правило по теме «' + title + '» и выполнить короткую проверку без подсказки.',
      evidence: {
        date: '22.09.26',
        text: 'Занятие: ' + note,
        href: '22.09.26.html',
        texHref: '../tex_docs/22.09.26.tex'
      }
    });
  };

  appendSkill('word', 'word_20', 'НОД в задачах на одинаковые группы и наборы', 3,
    'разобран смысл НОД в двух разных моделях: максимальное число одинаковых наборов и максимальный одинаковый размер группы.');
  appendSkill('eq', 'eq_17', 'Составное уравнение с выражением в числителе или знаменателе', 2,
    'выражение с x рассматривалось как единый компонент действия; навык ещё закрепляется.');

  const byId = new Map(
    data.groups.flatMap(group => (group.items || []).map(item => [item.id, item]))
  );
  const practiced = new Set();

  const setLesson = (id, level, note) => {
    const item = byId.get(id);
    if (!item) return;
    item.baselineLevel = Math.max(Number(item.baselineLevel) || 0, level);
    item.evidence = {
      date: '22.09.26',
      text: 'Занятие: ' + note,
      href: '22.09.26.html',
      texHref: '../tex_docs/22.09.26.tex'
    };
    practiced.add(id);
  };

  setLesson('dec_09', 4, 'сложение десятичных дробей выполнялось уверенно с выравниванием по запятой.');
  setLesson('dec_10', 4, 'вычитание десятичных дробей повторено с корректным выравниванием разрядов.');
  setLesson('dec_12', 4, 'умножение десятичных дробей выполнялось с контролем общего числа знаков после запятой.');
  setLesson('dec_13', 3, 'повторено деление десятичной дроби на натуральное число.');

  setLesson('frac_base_05', 3, 'повторены правильные, неправильные и смешанные дроби.');
  setLesson('frac_base_06', 3, 'смешанное число переводилось в неправильную дробь.');
  setLesson('frac_base_07', 3, 'неправильная дробь переводилась в смешанное число.');
  setLesson('frac_ops_03', 3, 'сложение дробей с разными знаменателями выполнялось через общий знаменатель.');
  setLesson('frac_ops_04', 3, 'вычитание дробей с разными знаменателями повторено на смешанных числах.');
  setLesson('frac_ops_08', 3, 'повторено умножение обыкновенных дробей.');
  setLesson('frac_ops_09', 3, 'сокращение перед умножением связывалось с общими множителями.');
  setLesson('frac_ops_11', 3, 'деление дробей выполнялось как умножение на обратную дробь.');

  setLesson('div_19', 3, 'повторено разложение натуральных чисел на простые множители.');
  setLesson('div_20', 3, 'НОД находился по общим простым множителям в наименьших степенях.');

  setLesson('word_02', 3, 'в текстовой задаче выделялись исходные количества и смысл искомой одинаковой величины.');
  setLesson('word_16', 3, 'ответ интерпретировался и проверялся по смыслу условия.');
  setLesson('word_20', 3, 'различены два смысла НОД: число одинаковых наборов и размер одной группы.');

  setLesson('eq_03', 3, 'повторено нахождение неизвестного слагаемого.');
  setLesson('eq_04', 3, 'повторено нахождение неизвестного уменьшаемого.');
  setLesson('eq_05', 3, 'повторено нахождение неизвестного вычитаемого.');
  setLesson('eq_06', 3, 'повторено нахождение неизвестного множителя.');
  setLesson('eq_07', 3, 'повторено нахождение неизвестного делимого.');
  setLesson('eq_08', 2, 'неизвестный делитель требует дополнительной автоматизации.');
  setLesson('eq_09', 3, 'найденное значение проверялось подстановкой в исходное уравнение.');
  setLesson('eq_17', 2, 'составные уравнения решались по внешнему действию; при неизвестном в знаменателе учитывалось ограничение.');

  if (Array.isArray(data.repeatTopics)) {
    data.repeatTopics = data.repeatTopics.filter(id => !practiced.has(id));
    ['eq_08', 'eq_17'].forEach(id => {
      if (!data.repeatTopics.includes(id)) data.repeatTopics.push(id);
    });
  }

  data.meta.studentName = 'Ксения Васильченко';
  data.meta.updated = '22.09.2026';
  data.meta.sourceNote = 'Карта учитывает входную диагностику и занятия по 22.09.26 включительно. На последнем занятии уверенно повторены десятичные и обыкновенные дроби, закреплены разложение на простые множители и НОД, разобран смысл НОД в задачах на одинаковые наборы и группы, повторены неизвестные компоненты действий и начато закрепление составных уравнений. Уровень 4 — уверенное выполнение; уровень 3 — содержательно отработано; уровень 2 — навык понятен, требуется автоматизация; уровень 0–1 — тема ещё не подтверждена.';
  data.meta.material = {
    title: 'НОД в задачах и составные уравнения',
    date: '22.09.26',
    pdf: '../pdf_docs/22.09.26.pdf',
    tex: '../tex_docs/22.09.26.tex'
  };

  const slug = value => String(value).toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const markerKey = data.meta.student + '-competency-map-lesson-20260922-v1';
  try {
    if (!localStorage.getItem(markerKey)) {
      const baseKey = data.meta.student + '-' + slug(data.meta.program);
      localStorage.removeItem(baseKey + '-competency-map');
      localStorage.removeItem(baseKey + '-repeat');
      localStorage.setItem(markerKey, '1');
    }
  } catch (_) {}
})();