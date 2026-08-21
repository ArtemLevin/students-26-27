(() => {
  const BASE_LESSONS = window.TIMOFEY_LESSONS || window['TIMOF\u0415Y_LESSONS'] || [];
  const ADDITIONAL_LESSONS = [
    {
      id: '02-08-26',
      date: '02.08.26',
      title: 'Банковские вклады и сложные проценты',
      subtitle: 'Табличная модель, промежуточные операции, сравнение вкладов и подбор целой ставки',
      sourcePdf: '../pdf_docs/02.08.26.pdf',
      sourceTex: '../tex_docs/02.08.26.tex',
      href: '02.08.26.html'
    },
    {
      id: '18-08-26',
      date: '18.08.26',
      title: 'Геометрия, векторы и базовая стереометрия',
      subtitle: 'Вписанные углы, площади, медиана и высота, трапеция, векторы, цилиндр и пирамида',
      sourcePdf: '../pdf_docs/18.08.26.pdf',
      sourceTex: '../tex_docs/18.08.26.tex',
      href: '18.08.26.html'
    },
    {
      id: '21-08-26',
      date: '21.08.26',
      title: 'Повторение алгебры: ключевые модели ЕГЭ',
      subtitle: 'Степени и корни, иррациональные и логарифмические уравнения, тригонометрия и производная',
      sourcePdf: null,
      sourceTex: '../tex_docs/21.08.26.tex',
      href: '21.08.26.html'
    }
  ];
  const LESSONS = [...BASE_LESSONS, ...ADDITIONAL_LESSONS];
  const lessonGrid = document.getElementById('materialGrid');
  const resourceGrid = document.getElementById('resourceGrid');
  const lessonCount = document.getElementById('lessonCount');
  const LAST_LESSON_KEY = 'timofey-last-lesson';

  const MAP_KEY = 'timofey-competence-map-v1';
  const MAP_VERSION_KEY = 'timofey-competence-evidence-version';
  const MAP_VERSION = '2026-08-21-algebra-review-v1';
  const LESSON_HREF = '18.08.26.html';
  const MAP_LEVELS = {
    t1_right: 3,
    t1_parallelogram: 3,
    t1_trapezoid: 3,
    t1_circle_angles: 3,
    t1_medians: 3,
    t2_coordinates: 3,
    t2_length: 3,
    t2_operations: 3,
    t2_dot: 3,
    t2_angle: 2,
    t3_box: 2,
    t3_pyramid: 3,
    t3_cylinder: 3,
    t3_scale: 2,
    t3_composite_volume: 2,
    t6_exponential: 3,
    t6_power: 3,
    t6_irrational: 3,
    t6_logarithmic: 3,
    t6_log_properties: 3,
    t7_double_angle: 3,
    t8_geometric: 3,
    t8_derivative_graph: 3,
    t8_extrema: 3
  };
  const MAP_EVIDENCE = {
    t1_right: '18.08 повторены свойства прямоугольного треугольника: медиана к гипотенузе, высота и связь острых углов; выполнены тренировочные задачи.',
    t1_parallelogram: '18.08 закреплена работа с площадью параллелограмма через общую высоту и середину стороны; разобран пример и дана тренировка.',
    t1_trapezoid: '18.08 повторены средняя линия трапеции и её деление диагональю на половины оснований; разобран пример и дана тренировка.',
    t1_circle_angles: '18.08 закреплена связь вписанного угла и дуги, выбор правильной дуги и переходы ×2/÷2; разобраны пример и тренировочная задача.',
    t1_medians: '18.08 повторены медиана, высота и биссектриса из одной вершины, включая порядок лучей и вычисление углов.',
    t2_coordinates: '18.08 повторено правило координат вектора «конец − начало» и чтение знаков перемещений по координатной плоскости.',
    t2_length: '18.08 закреплена длина вектора по координатам и вычисление длины результирующего вектора.',
    t2_operations: '18.08 повторены умножение вектора на число, сложение и вычитание координат; применено в примере a+3b и тренировке a+2b.',
    t2_dot: '18.08 закреплено скалярное произведение по координатам и через длины и косинус угла; выполнен числовой пример и тренировка.',
    t2_angle: '18.08 повторена формула cos φ = (a·b)/(|a||b|). Тема отмечена как «в процессе», так как отдельной тренировочной задачи на угол в чек-листе нет.',
    t3_box: '18.08 прямоугольный параллелепипед использован как опорное тело для сравнения объёма с пирамидой с теми же основанием и высотой.',
    t3_pyramid: '18.08 закреплена формула V = Sh/3, связь Vпир = Vпар/3 и выполнена тренировочная задача.',
    t3_cylinder: '18.08 повторены V = πr²h, отношения объёмов и переливание жидкости; выполнены две тренировочные задачи.',
    t3_scale: '18.08 повторено влияние изменения радиуса цилиндра на объём через квадрат коэффициента масштаба.',
    t3_composite_volume: '18.08 отработано сравнение объёмов тел с общими основанием и высотой на паре «параллелепипед — пирамида».',
    t6_exponential: '21.08 повторено приведение показательных выражений к одному основанию и сравнение показателей; разобраны уравнение 4^(x−7)=1/64 и преобразование корней в дробные степени.',
    t6_power: '21.08 повторены отрицательные и дробные показатели, переход 1/a^n=a^(−n), корни как степени и правило (a^m)^n=a^(mn).',
    t6_irrational: '21.08 закреплена равносильная схема √f(x)=g(x): условие g(x)≥0, возведение в квадрат и обязательная фильтрация лишних корней.',
    t6_logarithmic: '21.08 повторено определение log_a b=c ⇔ b=a^c и решение базовых логарифмических уравнений с проверкой ОДЗ.',
    t6_log_properties: '21.08 повторены условия существования логарифма и сворачивание разности логарифмов; отдельно разобрана проверка аргументов.',
    t7_double_angle: '21.08 повторены sin 2α=2 sin α cos α и три формы cos 2α; выполнены вычисления с приведением угла и контролем знака.',
    t8_geometric: '21.08 закреплён геометрический смысл производной: f′(x0)=tg α=Δy/Δx и обязательный контроль знака наклона касательной.',
    t8_derivative_graph: '21.08 повторено чтение графика f′: знак производной определяет возрастание и убывание исходной функции; выполнены графические задания.',
    t8_extrema: '21.08 закреплены экстремумы по смене знака производной: +→− максимум, −→+ минимум; отдельно отмечено, что f′(x0)=0 без смены знака экстремума не гарантирует.'
  };
  const MAP_LINKS = {
    t6_exponential: '21.08.26.html',
    t6_power: '21.08.26.html',
    t6_irrational: '21.08.26.html',
    t6_logarithmic: '21.08.26.html',
    t6_log_properties: '21.08.26.html',
    t7_double_angle: '21.08.26.html',
    t8_geometric: '21.08.26.html',
    t8_derivative_graph: '21.08.26.html',
    t8_extrema: '21.08.26.html'
  };

  function syncMapState() {
    let state = {};
    try { state = JSON.parse(localStorage.getItem(MAP_KEY) || '{}') || {}; } catch (_) { state = {}; }
    let changed = false;
    Object.entries(MAP_LEVELS).forEach(([id, target]) => {
      const current = Number(state[id] ?? 0);
      if (!Number.isFinite(current) || current < target) {
        state[id] = target;
        changed = true;
      }
    });
    try {
      if (changed) localStorage.setItem(MAP_KEY, JSON.stringify(state));
      const previousVersion = localStorage.getItem(MAP_VERSION_KEY);
      if (previousVersion !== MAP_VERSION) {
        localStorage.setItem(MAP_VERSION_KEY, MAP_VERSION);
        changed = true;
      }
    } catch (_) {}
    return changed;
  }

  const needsReload = syncMapState();
  if (needsReload) {
    const guard = 'timofey-map-reload-210826';
    try {
      if (sessionStorage.getItem(guard) !== '1') {
        sessionStorage.setItem(guard, '1');
        location.reload();
        return;
      }
      sessionStorage.removeItem(guard);
    } catch (_) {}
  }

  const escapeHtml = (value) => String(value || '').replace(/[&<>\"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[char]));

  const lessonHref = (lesson) => lesson.href || `lessons/${lesson.id}.html`;

  const tagsFor = (lesson) => {
    const text = `${lesson.title} ${lesson.subtitle}`.toLowerCase();
    const tags = [];
    if (/тригоном|синус|косинус|арк/.test(text)) tags.push('тригонометрия');
    if (/неравен|интервал/.test(text)) tags.push('неравенства');
    if (/логариф/.test(text)) tags.push('логарифмы');
    if (/производн|касательн|экстрем/.test(text)) tags.push('производная');
    if (/корн|модул|одз|огранич/.test(text)) tags.push('ОДЗ и корни');
    if (/формул|преобраз|разлож|групп/.test(text)) tags.push('преобразования');
    if (/вклад|процент|банк|эконом/.test(text)) tags.push('экономическая задача');
    if (/геометр|окруж|треуголь|трапец|параллелограмм/.test(text)) tags.push('планиметрия');
    if (/вектор|скаляр/.test(text)) tags.push('векторы');
    if (/стереометр|цилиндр|пирами|параллелепипед/.test(text)) tags.push('стереометрия');
    return [...new Set(tags)].slice(0, 3);
  };

  if (lessonCount) lessonCount.textContent = LESSONS.length;

  if (lessonGrid) {
    lessonGrid.innerHTML = LESSONS.map((lesson, index) => {
      const tags = tagsFor(lesson);
      const href = lessonHref(lesson);
      return `
        <article class="lesson-card">
          <div class="lesson-number">
            <span>Занятие ${String(index + 1).padStart(2, '0')}</span>
            <time>${escapeHtml(lesson.date)}</time>
          </div>
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.subtitle)}</p>
          <div class="skills">${tags.map((tag) => `<span class="chip">${tag}</span>`).join('')}</div>
          <div class="lesson-actions">
            <a class="btn primary lesson-link" data-lesson="${escapeHtml(lesson.id)}" href="${escapeHtml(href)}">Открыть занятие</a>
          </div>
        </article>
      `;
    }).join('');
  }

  if (resourceGrid) {
    resourceGrid.innerHTML = LESSONS.map((lesson) => {
      const href = lessonHref(lesson);
      const pdf = lesson.sourcePdf
        ? `<a href="${escapeHtml(lesson.sourcePdf)}" download aria-label="Скачать PDF: ${escapeHtml(lesson.title)}">PDF</a>`
        : '';
      const tex = lesson.sourceTex
        ? `<a href="${escapeHtml(lesson.sourceTex)}" download aria-label="Скачать TeX: ${escapeHtml(lesson.title)}">TeX</a>`
        : '';
      return `
        <div class="resource-row">
          <div><b>${escapeHtml(lesson.title)}</b><small>${escapeHtml(lesson.date)}</small></div>
          <div class="resource-links">
            <a href="${escapeHtml(href)}" aria-label="Открыть веб-урок: ${escapeHtml(lesson.title)}">Web</a>
            ${pdf}${tex}
          </div>
        </div>
      `;
    }).join('');
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.lesson-link');
    if (link?.dataset.lesson) localStorage.setItem(LAST_LESSON_KEY, link.dataset.lesson);

    const competency = event.target.closest('.radial-cell,.topic-row');
    if (competency?.dataset.id && MAP_EVIDENCE[competency.dataset.id]) {
      const id = competency.dataset.id;
      setTimeout(() => {
        const evidence = document.getElementById('dialogEvidence');
        const dialogLink = document.getElementById('dialogLink');
        if (evidence) evidence.textContent = MAP_EVIDENCE[id];
        if (dialogLink) dialogLink.href = MAP_LINKS[id] || LESSON_HREF;
      }, 0);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const competency = event.target.closest('.radial-cell,.topic-row');
    if (!competency?.dataset.id || !MAP_EVIDENCE[competency.dataset.id]) return;
    const id = competency.dataset.id;
    setTimeout(() => {
      const evidence = document.getElementById('dialogEvidence');
      const dialogLink = document.getElementById('dialogLink');
      if (evidence) evidence.textContent = MAP_EVIDENCE[id];
      if (dialogLink) dialogLink.href = MAP_LINKS[id] || LESSON_HREF;
    }, 0);
  });

  const resetMap = document.getElementById('resetMap');
  if (resetMap) {
    resetMap.addEventListener('click', () => {
      setTimeout(() => {
        syncMapState();
        location.reload();
      }, 180);
    });
  }
})();
