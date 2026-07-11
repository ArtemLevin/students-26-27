const LESSONS = window.TIMOFEY_LESSONS || window['TIMOF\u0415Y_LESSONS'] || [];
const id = document.body.dataset.lesson;
const lesson = LESSONS.find((item) => item.id === id) || LESSONS[0];
localStorage.setItem('timofey-last-lesson', id);
const COMPETENCY_KEY = 'timofey-competence-map-v1';
const LESSON_COMPETENCIES = {
  '20-05-26':['trig_eq'], '27-05-26':['trig_eq'], '30-05-26':['trig_eq'],
  '02-06-26':['trig_expr','trig_eq'], '05-06-26':['transform','trig_eq'],
  '09-06-26':['trig_expr','transform'], '14-06-26':['trig_expr'],
  '20-06-26':['trig_expr','trig_eq'], '25-06-26':['irrational_eq','powers','root_selection'],
  '27-06-26':['trig_expr','logs']
};
function recordCompetency(ok) {
  let map = {};
  try { map = JSON.parse(localStorage.getItem(COMPETENCY_KEY) || '{}'); } catch {}
  (LESSON_COMPETENCIES[id] || []).forEach((competency, index) => {
    const current = Number(map[competency] ?? 2);
    map[competency] = ok ? Math.min(4, current + (index === 0 ? 1 : 0)) : Math.min(current, index === 0 ? 1 : 2);
  });
  localStorage.setItem(COMPETENCY_KEY, JSON.stringify(map));
}
const root = document.getElementById('lessonRoot');
const title = (text) => String(text || '').replace(/[&<>]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
const lessonPath = (path) => path ? path.replace(/^\.\.\//, '../../') : '';

function isMathLike(text) {
  return /[=→±√π∈ℤ²³⁴αβφ≤≥≠∞]|\b(sin|cos|tg|ctg|arcsin|arccos|arctg|log)\b|\^|\//i.test(String(text || ''));
}

function mathText(text, display = 'inline') {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display}"><mtext>${title(text)}</mtext></math>`;
}

function renderText(text) {
  return isMathLike(text) ? mathText(text, 'inline') : title(text);
}

function formulaItem(text) {
  return `<div class="formula">${mathText(text, 'block')}</div>`;
}

function list(items) {
  return `<ul>${(items || []).map((item) => `<li>${renderText(item)}</li>`).join('')}</ul>`;
}

function formulas(items) {
  return (items || []).map((item) => formulaItem(item)).join('');
}

function allFormulas() {
  return (lesson.sections || []).flatMap((section) => section.f || []);
}

function compactText(items, limit = 4) {
  return (items || []).slice(0, limit).map((item) => title(item)).join(' ');
}

function importantBlock() {
  const keyFormulas = allFormulas().slice(0, 7);
  const principles = (lesson.idea || []).slice(0, 4);
  const warnings = (lesson.mistakes || []).slice(0, 3);
  return `
    <section class="important-box">
      <h3>Ключевые принципы</h3>
      ${list(principles)}
    </section>
    <section class="important-box">
      <h3>Опорные формулы</h3>
      ${formulas(keyFormulas)}
    </section>
    <section class="important-box important-box--warn">
      <h3>На что обратить внимание</h3>
      ${list(warnings)}
    </section>
  `;
}

function buildSelfCheck() {
  const sections = lesson.sections || [];
  const f = allFormulas();
  const e = lesson.examples || [];
  const t = lesson.training || [];
  const s0 = sections[0] || {h:'основной раздел', p:[], f:[]};
  const s1 = sections[1] || s0;
  const ex0 = e[0] || {title:'разобранный пример', steps:[], answer:''};
  const ex1 = e[1] || ex0;
  return [
    {q:'В чём главная идея этого занятия?', a:`Главная идея: ${compactText(lesson.idea, 5)} Если сформулировать коротко, нужно не заучивать отдельные ответы, а понимать, какой приём переводит исходное выражение к простейшему уравнению.`},
    {q:'Какие цели нужно закрыть после изучения страницы?', a:`После занятия нужно уметь: ${compactText(lesson.goals, 6)} Эти умения проверяются не пересказом, а решением тренировочного блока.`},
    {q:`Что важно в разделе «${title(s0.h)}»?`, a:`В этом разделе главное следующее: ${compactText(s0.p, 4)} Опорные записи: ${(s0.f || []).map(title).join('; ') || 'смотрите формулы раздела.'}`},
    {q:`Как использовать раздел «${title(s1.h)}» при решении?`, a:`Смысл раздела: ${compactText(s1.p, 4)} Его нужно применять до ответа, когда в уравнении появляется соответствующий тип выражения или ограничения.`},
    {q:'Какая формула или запись является первой опорной?', a:`Первая важная запись: ${title(f[0] || 'опорная формула указана в материале')}. Её нужно не просто переписать, а понять, какой объект она заменяет и к какому простейшему уравнению ведёт.`},
    {q:`Какой алгоритм показывает пример «${title(ex0.title)}»?`, a:`Алгоритм примера: ${compactText(ex0.steps, 8)} Итог: ${title(ex0.answer)}. Важно уметь восстановить эти шаги без подсказки.`},
    {q:`Что показывает пример «${title(ex1.title)}»?`, a:`Этот пример закрепляет переходы: ${compactText(ex1.steps, 8)} Ответ в примере: ${title(ex1.answer)}. Проверьте, где именно используется формула, а где — простейшее уравнение.`},
    {q:'Какие ошибки наиболее опасны в этой теме?', a:`Самые опасные ошибки: ${compactText(lesson.mistakes, 6)} Чтобы их избежать, после каждого преобразования задавайте вопрос: не потеряна ли ветвь, не добавлены ли лишние корни, не забыты ли ограничения.`},
    {q:'Как начинать тренировочный блок?', a:`Начинайте с определения типа каждого задания. Например: ${t.slice(0, 4).map((task, i) => `${i + 1}) ${title(task)}`).join('; ')}. Перед вычислениями нужно выбрать метод: окружность, формула, замена, группировка или ОДЗ.`},
    {q:'Как понять, что материал действительно усвоен?', a:`Материал усвоен, если вы можете объяснить идею, выбрать формулу, решить пример без просмотра решения, проверить ограничения и исправить типичные ошибки. Дополнительно ответьте на мини-квиз: ${title(lesson.quiz?.q || '')}`}
  ];
}

function renderSelfCheck() {
  const questions = buildSelfCheck();
  return `
    <article class="lesson-panel self-check" id="selfCheck">
      <h2>Самопроверка</h2>
      <p class="muted">Ответьте на 10 вопросов. Развернутый ответ открывается только по запросу, чтобы сначала попробовать сформулировать самостоятельно.</p>
      <div class="self-check-grid">
        ${questions.map((item, index) => `
          <button class="self-question" data-answer="${index}" type="button">
            <span>${index + 1}</span>
            <strong>${renderText(item.q)}</strong>
          </button>
        `).join('')}
      </div>
    </article>
  `;
}

function renderLesson() {
  document.title = `${lesson.date} — ${lesson.title}`;
  root.innerHTML = `
    <section class="lesson-hero">
      <div class="lesson-title card">
        <div class="breadcrumbs"><a href="../index.html">← Все материалы</a><span>${lesson.date}</span></div>
        <p class="eyebrow">учебное пособие</p>
        <h1>${title(lesson.title)}</h1>
        <p class="lesson-lead">${title(lesson.subtitle)}</p>
        <div class="lesson-meta">
          ${lesson.sourcePdf ? `<a class="pill" href="${lessonPath(lesson.sourcePdf)}">Открыть PDF</a>` : ''}
          ${lesson.sourceTex ? `<a class="pill" href="${lessonPath(lesson.sourceTex)}">Открыть TeX</a>` : ''}
          <button class="pill" id="printPage" type="button">Печать</button>
        </div>
      </div>
    </section>
    <section class="lesson-layout">
      <main class="lesson-main">
        <article class="lesson-panel"><h2>Цели занятия</h2>${list(lesson.goals)}</article>
        <article class="lesson-panel"><h2>Идея решения</h2>${list(lesson.idea)}</article>
        ${(lesson.sections || []).map((section) => `
          <article class="lesson-panel">
            <h2>${title(section.h)}</h2>
            ${(section.p || []).map((p) => `<p>${renderText(p)}</p>`).join('')}
            ${formulas(section.f)}
          </article>
        `).join('')}
        <article class="lesson-panel">
          <h2>Разобранные примеры</h2>
          ${(lesson.examples || []).map((example) => `
            <section class="example">
              <h3>${title(example.title)}</h3>
              <div class="step-list">${(example.steps || []).map((step) => `<div class="step">${renderText(step)}</div>`).join('')}</div>
              <div class="formula"><span class="formula-label">Ответ:</span> ${mathText(example.answer, 'block')}</div>
            </section>
          `).join('')}
        </article>
        <article class="lesson-panel"><h2>Типичные ошибки</h2><div class="warn">${list(lesson.mistakes)}</div></article>
        <article class="lesson-panel"><h2>Тренировочный блок</h2><div class="training">${(lesson.training || []).map((task, i) => `<div class="task"><b>${i + 1}.</b> ${mathText(task, 'inline')}</div>`).join('')}</div></article>
        <article class="lesson-panel" id="quizBox"><h2>Мини-квиз</h2><p>${renderText(lesson.quiz.q)}</p>${lesson.quiz.a.map((answer, index) => `<button class="quiz-option" data-index="${index}">${renderText(answer)}</button>`).join('')}<p class="muted" id="quizResult">Выберите ответ.</p></article>
        ${renderSelfCheck()}
      </main>
      <aside class="visual-card">
        <h2>Самое важное</h2>
        <p class="muted">Здесь собраны опорные идеи и формулы этой страницы. Нажмите на модель, чтобы открыть увеличенное окно.</p>
        ${importantBlock()}
        <div class="controls"><label>Угол: <input id="angle" type="range" min="-180" max="360" value="${lesson.accentAngle || 60}"></label><output id="angleOut"></output></div>
        <canvas id="circleCanvas" width="680" height="520" aria-label="Единичная окружность"></canvas>
        <button class="button button--accent open-visual" id="openVisual" type="button">Открыть крупно</button>
        <div class="formula" id="valuesBox"></div>
      </aside>
    </section>
    <div class="study-overlay" id="visualOverlay" aria-hidden="true">
      <div class="study-modal" role="dialog" aria-modal="true" aria-label="Самое важное по странице">
        <div class="modal-head"><h2>Самое важное по теме</h2><button class="modal-close" data-close="visual" type="button">×</button></div>
        <div class="modal-grid">
          <section>
            <div class="controls"><label>Угол: <input id="modalAngle" type="range" min="-180" max="360" value="${lesson.accentAngle || 60}"></label><output id="modalAngleOut"></output></div>
            <canvas id="modalCanvas" width="900" height="620" aria-label="Увеличенная единичная окружность"></canvas>
          </section>
          <aside class="modal-important">${importantBlock()}</aside>
        </div>
      </div>
    </div>
    <div class="study-overlay" id="answerOverlay" aria-hidden="true">
      <div class="answer-modal" role="dialog" aria-modal="true" aria-label="Развернутый ответ самопроверки">
        <div class="modal-head"><h2 id="answerTitle">Ответ</h2><button class="modal-close" data-close="answer" type="button">×</button></div>
        <p id="answerText"></p>
      </div>
    </div>
  `;
  document.getElementById('printPage').addEventListener('click', () => window.print());
  setupQuiz();
  setupSelfCheck();
  setupCanvas();
  setupModals();
}

function setupQuiz() {
  document.querySelectorAll('.quiz-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.quiz-option').forEach((item) => item.classList.remove('correct', 'wrong'));
      const ok = Number(button.dataset.index) === lesson.quiz.correct;
      recordCompetency(ok);
      button.classList.add(ok ? 'correct' : 'wrong');
      document.getElementById('quizResult').textContent = ok ? 'Верно.' : 'Пока нет. Вернитесь к разделу с идеей решения.';
    });
  });
}

function setupSelfCheck() {
  const questions = buildSelfCheck();
  const overlay = document.getElementById('answerOverlay');
  const answerTitle = document.getElementById('answerTitle');
  const answerText = document.getElementById('answerText');
  document.querySelectorAll('.self-question').forEach((button) => {
    button.addEventListener('click', () => {
      const item = questions[Number(button.dataset.answer)];
      answerTitle.innerHTML = renderText(item.q);
      answerText.innerHTML = renderText(item.a);
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    });
  });
}

function setupModals() {
  const visualOverlay = document.getElementById('visualOverlay');
  const answerOverlay = document.getElementById('answerOverlay');
  const close = (overlay) => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); };
  document.getElementById('openVisual').addEventListener('click', () => {
    syncModalAngle();
    visualOverlay.classList.add('open');
    visualOverlay.setAttribute('aria-hidden', 'false');
    drawAllCircles();
  });
  document.getElementById('circleCanvas').addEventListener('click', () => document.getElementById('openVisual').click());
  document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', () => close(button.dataset.close === 'visual' ? visualOverlay : answerOverlay));
  });
  [visualOverlay, answerOverlay].forEach((overlay) => overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close(overlay);
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close(visualOverlay);
      close(answerOverlay);
    }
  });
}

function setupCanvas() {
  const range = document.getElementById('angle');
  const modalRange = document.getElementById('modalAngle');
  range.addEventListener('input', () => {
    modalRange.value = range.value;
    drawAllCircles();
  });
  modalRange.addEventListener('input', () => {
    range.value = modalRange.value;
    drawAllCircles();
  });
  drawAllCircles();
}

function syncModalAngle() {
  const range = document.getElementById('angle');
  const modalRange = document.getElementById('modalAngle');
  modalRange.value = range.value;
}

function drawAllCircles() {
  const angle = Number(document.getElementById('angle').value);
  drawCircle(document.getElementById('circleCanvas'), angle, 'angleOut', 'valuesBox');
  const modalAngle = Number(document.getElementById('modalAngle').value);
  drawCircle(document.getElementById('modalCanvas'), modalAngle, 'modalAngleOut');
}

function drawCircle(canvas, angle, outId, valuesId) {
  if (!canvas) return;
  const out = document.getElementById(outId);
  if (out) out.innerHTML = mathText(`${angle}°`, 'inline');
  const rad = angle * Math.PI / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  if (valuesId) document.getElementById(valuesId).innerHTML = mathText(`sin x ≈ ${sin.toFixed(2)}, cos x ≈ ${cos.toFixed(2)}`, 'block');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const r = Math.min(w, h) * 0.32;
  const cx = w / 2;
  const cy = h / 2;
  const x = cx + cos * r;
  const y = cy - sin * r;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(148,163,184,.35)';
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * r / 2, 20); ctx.lineTo(cx + i * r / 2, h - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, cy + i * r / 2); ctx.lineTo(w - 20, cy + i * r / 2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(244,248,255,.62)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, cy); ctx.lineTo(w - 24, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, h - 24); ctx.lineTo(cx, 24); ctx.stroke();
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, -rad, rad < 0); ctx.stroke();
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, cy); ctx.stroke();
  ctx.strokeStyle = '#34d399'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--ink'); ctx.font = 'bold 18px system-ui'; ctx.fillText('P(cos x; sin x)', x + 12, y - 12);
  ctx.fillStyle = '#f59e0b'; ctx.fillText('cos x', (cx + x) / 2 - 20, cy + 26);
  ctx.fillStyle = '#34d399'; ctx.fillText('sin x', x + 12, (cy + y) / 2);
}

renderLesson();
