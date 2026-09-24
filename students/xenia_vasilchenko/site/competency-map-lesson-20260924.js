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
        date: '24.09.26',
        text: 'Занятие: ' + note,
        href: '24.09.26.html',
        texHref: '../tex_docs/24.09.26.tex'
      }
    });
  };

  appendSkill('div', 'div_21', 'Наименьшее общее кратное (НОК)', 3,
    'введено определение НОК и отработан поиск по разложению на простые множители с добавлением недостающих множителей.');
  appendSkill('word', 'word_21', 'Выбор НОД или НОК по смыслу задачи', 3,
    'задачи различались по смыслу: одинаковые группы и части — НОД; первое совпадение или наименьшая общая величина — НОК.');

  const byId = new Map(
    data.groups.flatMap(group => (group.items || []).map(item => [item.id, item]))
  );
  const practiced = new Set();

  const setLesson = (id, level, note) => {
    const item = byId.get(id);
    if (!item) return;
    item.baselineLevel = Math.max(Number(item.baselineLevel) || 0, level);
    item.evidence = {
      date: '24.09.26',
      text: 'Занятие: ' + note,
      href: '24.09.26.html',
      texHref: '../tex_docs/24.09.26.tex'
    };
    practiced.add(id);
  };

  // Вычислительная разминка.
  setLesson('dec_09', 4, 'сложение десятичных дробей выполнялось уверенно с выравниванием по запятой.');
  setLesson('dec_10', 4, 'вычитание десятичных дробей выполнено с корректным выравниванием разрядов.');
  setLesson('dec_12', 4, 'умножение десятичных дробей повторено с правильной постановкой запятой.');
  setLesson('dec_13', 3, 'повторено деление десятичной дроби на натуральное число.');

  setLesson('frac_ops_03', 3, 'сложение дробей с разными знаменателями выполнялось через общий знаменатель.');
  setLesson('frac_ops_08', 3, 'повторено умножение обыкновенных дробей.');
  setLesson('frac_ops_09', 3, 'сокращение множителей перед умножением использовалось осознанно.');
  setLesson('frac_ops_11', 3, 'деление дробей выполнялось как умножение на обратную дробь.');

  // Делимость, НОД и НОК.
  setLesson('div_01', 3, 'повторено понятие делителя и направление деления.');
  setLesson('div_02', 3, 'повторено понятие кратного и его отличие от делителя.');
  setLesson('div_19', 3, 'разложение натуральных чисел на простые множители использовалось как общий старт алгоритмов НОД и НОК.');
  setLesson('div_20', 3, 'НОД находился по общим простым множителям; смысл результата проверялся делением исходных чисел.');
  setLesson('div_21', 3, 'НОК находился по простым множителям с добавлением недостающих множителей; результат проверялся делением на исходные числа.');

  // Текстовые задачи.
  setLesson('word_02', 3, 'в условии выделялось, что именно должно быть общим: группа, часть, момент или сумма.');
  setLesson('word_16', 3, 'ответ связывался с вопросом задачи и проверялся по смыслу.');
  setLesson('word_20', 3, 'закреплено применение НОД в задачах на одинаковые группы и наборы.');
  setLesson('word_21', 3, 'на серии задач различались признаки НОД и НОК без выполнения лишних вычислений.');

  // Неизвестные компоненты действий и проверка.
  setLesson('eq_03', 3, 'повторено нахождение неизвестного слагаемого.');
  setLesson('eq_05', 3, 'повторено нахождение неизвестного вычитаемого.');
  setLesson('eq_07', 3, 'неизвестное делимое находилось умножением делителя на частное.');
  setLesson('eq_08', 2, 'неизвестный делитель найден по связи компонентов деления; навык ещё стоит довести до автоматизма.');
  setLesson('eq_09', 3, 'найденное значение проверялось подстановкой в исходное равенство.');

  if (Array.isArray(data.repeatTopics)) {
    data.repeatTopics = data.repeatTopics.filter(id => !practiced.has(id));
    if (!data.repeatTopics.includes('eq_08')) data.repeatTopics.push('eq_08');
  }

  data.meta.studentName = 'Ксения Васильченко';
  data.meta.updated = '24.09.2026';
  data.meta.sourceNote = 'Карта учитывает входную диагностику и занятия по 24.09.26 включительно. На последнем занятии повторены вычисления с десятичными и обыкновенными дробями и простейшие уравнения, закреплены разложение на простые множители и НОД, введён НОК и отработан выбор НОД или НОК по смыслу текстовой задачи. Уровень 4 — уверенное выполнение; уровень 3 — содержательно отработано; уровень 2 — навык понятен, требуется автоматизация; уровень 0–1 — тема ещё не подтверждена.';
  data.meta.material = {
    title: 'НОД и НОК: вычисление и выбор в задачах',
    date: '24.09.26',
    pdf: '../pdf_docs/24.09.26.pdf',
    tex: '../tex_docs/24.09.26.tex'
  };

  const slug = value => String(value).toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const markerKey = data.meta.student + '-competency-map-lesson-20260924-v1';
  try {
    if (!localStorage.getItem(markerKey)) {
      const baseKey = data.meta.student + '-' + slug(data.meta.program);
      localStorage.removeItem(baseKey + '-competency-map');
      localStorage.removeItem(baseKey + '-repeat');
      localStorage.setItem(markerKey, '1');
    }
  } catch (_) {}
})();