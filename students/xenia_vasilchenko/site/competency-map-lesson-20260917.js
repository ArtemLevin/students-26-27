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
      description: `Нужно уметь уверенно выполнять навык «${title}», объяснять ход решения и проверять результат.`,
      diagnosis: `Объяснить правило по теме «${title}» и выполнить короткую проверку без подсказки.`,
      evidence: {
        date: '17.09.26',
        text: `Занятие: ${note}`,
        href: '17.09.26.html',
        texHref: '../tex_docs/17.09.26.tex'
      }
    });
  };

  appendSkill('div', 'div_17', 'Признак делимости на 4', 3,
    'закреплён признак по числу, составленному из двух последних цифр.');
  appendSkill('div', 'div_18', 'Признак делимости на 6', 3,
    'закреплено одновременное выполнение признаков делимости на 2 и на 3.');
  appendSkill('div', 'div_19', 'Разложение на простые множители', 3,
    'числа последовательно делились на наименьшие подходящие простые делители.');
  appendSkill('div', 'div_20', 'Наибольший общий делитель (НОД)', 3,
    'НОД находился по общим простым множителям двух разложений.');

  const byId = new Map(
    data.groups.flatMap(group => (group.items || []).map(item => [item.id, item]))
  );
  const practiced = new Set();

  const setLesson = (id, level, note) => {
    const item = byId.get(id);
    if (!item) return;
    item.baselineLevel = Math.max(Number(item.baselineLevel) || 0, level);
    item.evidence = {
      date: '17.09.26',
      text: `Занятие: ${note}`,
      href: '17.09.26.html',
      texHref: '../tex_docs/17.09.26.tex'
    };
    practiced.add(id);
  };

  setLesson('dec_08', 3, 'повторено дописывание нулей справа при выравнивании десятичных дробей.');
  setLesson('dec_09', 4, 'сложение десятичных дробей выполнялось с выравниванием по запятой.');
  setLesson('dec_12', 3, 'повторено умножение десятичных дробей с восстановлением положения запятой.');
  setLesson('dec_13', 3, 'повторено деление десятичной дроби на натуральное число.');
  setLesson('frac_base_06', 3, 'смешанное число переводилось в неправильную дробь.');
  setLesson('frac_ops_04', 3, 'вычитание дробей с разными знаменателями выполнялось через общий знаменатель.');
  setLesson('frac_ops_11', 3, 'деление дробей выполнялось как умножение на обратную вторую дробь.');

  setLesson('eq_03', 3, 'повторено нахождение неизвестного слагаемого.');
  setLesson('eq_04', 3, 'повторено нахождение неизвестного уменьшаемого.');
  setLesson('eq_05', 3, 'повторено нахождение неизвестного вычитаемого.');
  setLesson('eq_06', 3, 'повторено нахождение неизвестного множителя.');
  setLesson('eq_07', 3, 'повторено нахождение неизвестного делимого.');
  setLesson('eq_08', 2, 'повторена формула для неизвестного делителя; навык ещё требует автоматизации.');
  setLesson('eq_09', 3, 'решение уравнения проверялось подстановкой в исходное равенство.');

  setLesson('div_01', 3, 'закреплено понятие делителя натурального числа.');
  setLesson('div_03', 2, 'перечислялись все делители чисел 18 и 54; способ понятен, но используется как вводный.');
  setLesson('div_05', 3, 'закреплено разложение натурального числа на множители последовательным делением.');
  setLesson('div_06', 3, 'введено понятие простого числа и его двух натуральных делителей.');
  setLesson('div_07', 3, 'уверенно сформулирован и применён признак делимости на 2.');
  setLesson('div_08', 3, 'уверенно сформулирован и применён признак делимости на 5.');
  setLesson('div_10', 3, 'уверенно сформулирован и применён признак делимости на 3 через сумму цифр.');
  setLesson('div_12', 3, 'признаки делимости комбинировались для проверки делимости на 6.');
  setLesson('div_17', 3, 'признак делимости на 4 применялся по двум последним цифрам.');
  setLesson('div_18', 3, 'признак делимости на 6 применялся как сочетание признаков на 2 и на 3.');
  setLesson('div_19', 3, 'разложены на простые множители числа из примеров занятия.');
  setLesson('div_20', 3, 'НОД находился организованно через совпадающие простые множители.');

  setLesson('frac_base_11', 3, 'сокращение дроби связано с делением числителя и знаменателя на их НОД.');

  if (Array.isArray(data.repeatTopics)) {
    data.repeatTopics = data.repeatTopics.filter(id => !practiced.has(id));
    if (!data.repeatTopics.includes('eq_08')) data.repeatTopics.push('eq_08');
  }

  data.meta.studentName = 'Ксения Васильченко';
  data.meta.updated = '17.09.2026';
  data.meta.sourceNote = 'Карта учитывает входную диагностику 06.09.26 и занятия 08.09.26, 10.09.26, 15.09.26 и 17.09.26. На последнем занятии повторены вычисления с дробями и неизвестные компоненты действий, затем изучены признаки делимости на 2, 3, 4, 5 и 6, разложение на простые множители и поиск НОД. Уровень 4 — уверенное выполнение; уровень 3 — содержательно отработано; уровень 2 — навык понятен, требуется автоматизация; уровень 0–1 — тема ещё не подтверждена.';
  data.meta.material = {
    title: 'Признаки делимости, простые множители и НОД',
    date: '17.09.26',
    pdf: '../pdf_docs/17.09.26.pdf',
    tex: '../tex_docs/17.09.26.tex'
  };

  const slug = value => String(value).toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const markerKey = `${data.meta.student}-competency-map-lesson-20260917-v1`;
  try {
    if (!localStorage.getItem(markerKey)) {
      const baseKey = `${data.meta.student}-${slug(data.meta.program)}`;
      localStorage.removeItem(`${baseKey}-competency-map`);
      localStorage.removeItem(`${baseKey}-repeat`);
      localStorage.setItem(markerKey, '1');
    }
  } catch (_) {}
})();
