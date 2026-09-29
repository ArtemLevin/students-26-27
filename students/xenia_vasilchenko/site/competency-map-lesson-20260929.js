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
        date: '29.09.26',
        text: 'Занятие: ' + note,
        href: '29.09.26.html',
        texHref: '../tex_docs/29.09.26.tex'
      }
    });
  };

  appendSkill('frac_base', 'frac_base_17', 'Проверка возможности приведения к заданному знаменателю', 3,
    'отработана проверка делением нового знаменателя на старый без остатка и поиск дополнительного множителя.');
  appendSkill('dec', 'dec_19', 'Перевод обыкновенной дроби в конечную десятичную', 3,
    'разобран критерий конечной десятичной записи после сокращения и приведение знаменателя к 10, 100, 1000 и далее.');

  const byId = new Map(
    data.groups.flatMap(group => (group.items || []).map(item => [item.id, item]))
  );
  const practiced = new Set();

  const setLesson = (id, level, note) => {
    const item = byId.get(id);
    if (!item) return;
    item.baselineLevel = Math.max(Number(item.baselineLevel) || 0, level);
    item.evidence = {
      date: '29.09.26',
      text: 'Занятие: ' + note,
      href: '29.09.26.html',
      texHref: '../tex_docs/29.09.26.tex'
    };
    practiced.add(id);
  };

  // Вычислительная разминка.
  setLesson('dec_09', 4, 'сложение десятичных дробей выполнялось с корректным выравниванием разрядов.');
  setLesson('dec_10', 4, 'вычитание десятичных дробей повторено уверенно.');
  setLesson('dec_12', 4, 'умножение десятичных дробей выполнено с правильным восстановлением запятой.');
  setLesson('dec_13', 3, 'повторено деление десятичной дроби на натуральное число.');

  // Формы записи и действия с обыкновенными дробями.
  setLesson('frac_base_05', 3, 'повторено понятие смешанного числа.');
  setLesson('frac_base_06', 3, 'смешанное число переводилось в неправильную дробь.');
  setLesson('frac_base_07', 3, 'неправильная дробь переводилась в смешанную.');
  setLesson('frac_base_09', 3, 'основное свойство дроби использовалось при сокращении и домножении.');
  setLesson('frac_base_10', 3, 'равные дроби получались одновременным умножением числителя и знаменателя.');
  setLesson('frac_base_11', 3, 'дроби сокращались через общий множитель числителя и знаменателя.');
  setLesson('frac_base_12', 3, 'отработано приведение дроби к заданному знаменателю через дополнительный множитель.');
  setLesson('frac_base_17', 3, 'закреплена проверка: новый знаменатель должен делиться на старый без остатка.');

  setLesson('frac_ops_03', 3, 'сложение дробей с разными знаменателями повторено через общий знаменатель.');
  setLesson('frac_ops_08', 3, 'повторено умножение обыкновенных дробей.');
  setLesson('frac_ops_11', 3, 'деление дробей повторено как умножение на обратную дробь.');

  // НОД/НОК как инструменты.
  setLesson('div_19', 3, 'разложение на простые множители использовалось для сокращения и повторения НОД/НОК.');
  setLesson('div_20', 3, 'НОД связывался с общим делителем и сокращением дробей.');
  setLesson('div_21', 3, 'НОК использовался как инструмент выбора наименьшего общего знаменателя.');

  // Связь обыкновенной и десятичной записи.
  setLesson('dec_04', 3, 'связь обыкновенной и десятичной дроби закреплена через знаменатели 10, 100, 1000.');
  setLesson('dec_19', 3, 'после сокращения проверялись множители знаменателя: только 2 и 5 дают конечную десятичную запись.');

  // Неизвестный делитель был повторён, но потребовал подсказки.
  setLesson('eq_08', 2, 'неизвестный делитель повторён по связи компонентов деления; навык ещё требует автоматизации.');

  if (Array.isArray(data.repeatTopics)) {
    data.repeatTopics = data.repeatTopics.filter(id => !practiced.has(id));
    if (!data.repeatTopics.includes('eq_08')) data.repeatTopics.push('eq_08');
  }

  data.meta.studentName = 'Ксения Васильченко';
  data.meta.updated = '29.09.2026';
  data.meta.sourceNote = 'Карта учитывает входную диагностику и занятия по 29.09.26 включительно. На последнем занятии повторены вычисления с десятичными и обыкновенными дробями, НОД/НОК и неизвестные компоненты действий; подробно отработаны сокращение дробей, приведение к заданному и общему знаменателю, проверка достижимости знаменателя и перевод обыкновенной дроби в конечную десятичную. Уровень 4 — уверенное выполнение; уровень 3 — содержательно отработано; уровень 2 — навык понятен, требуется автоматизация; уровень 0–1 — тема ещё не подтверждена.';
  data.meta.material = {
    title: 'Дроби: общий знаменатель и десятичная запись',
    date: '29.09.26',
    pdf: '../pdf_docs/29.09.26.pdf',
    tex: '../tex_docs/29.09.26.tex'
  };

  const slug = value => String(value).toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const markerKey = data.meta.student + '-competency-map-lesson-20260929-v1';
  try {
    if (!localStorage.getItem(markerKey)) {
      const baseKey = data.meta.student + '-' + slug(data.meta.program);
      localStorage.removeItem(baseKey + '-competency-map');
      localStorage.removeItem(baseKey + '-repeat');
      localStorage.setItem(markerKey, '1');
    }
  } catch (_) {}
})();