const LESSONS = window.TIMOFEY_LESSONS || window['TIMOF\u0415Y_LESSONS'] || [];
const id = document.body.dataset.lesson;
const lesson = LESSONS.find((item) => item.id === id) || LESSONS[0];
const root = document.getElementById('lessonRoot');
const title = (text) => String(text || '').replace(/[&<>]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));

function list(items) {
  return `<ul>${(items || []).map((item) => `<li>${title(item)}</li>`).join('')}</ul>`;
}

function formulas(items) {
  return (items || []).map((item) => `<div class="formula">${title(item)}</div>`).join('');
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
          ${lesson.sourcePdf ? `<a class="pill" href="${lesson.sourcePdf}">Открыть PDF</a>` : ''}
          ${lesson.sourceTex ? `<a class="pill" href="${lesson.sourceTex}">Открыть TeX</a>` : ''}
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
            ${(section.p || []).map((p) => `<p>${title(p)}</p>`).join('')}
            ${formulas(section.f)}
          </article>
        `).join('')}
        <article class="lesson-panel">
          <h2>Разобранные примеры</h2>
          ${(lesson.examples || []).map((example) => `
            <section class="example">
              <h3>${title(example.title)}</h3>
              <div class="step-list">${(example.steps || []).map((step) => `<div class="step">${title(step)}</div>`).join('')}</div>
              <div class="formula">Ответ: ${title(example.answer)}</div>
            </section>
          `).join('')}
        </article>
        <article class="lesson-panel"><h2>Типичные ошибки</h2><div class="warn">${list(lesson.mistakes)}</div></article>
        <article class="lesson-panel"><h2>Тренировочный блок</h2><div class="training">${(lesson.training || []).map((task, i) => `<div class="task"><b>${i + 1}.</b> ${title(task)}</div>`).join('')}</div></article>
        <article class="lesson-panel" id="quizBox"><h2>Мини-квиз</h2><p>${title(lesson.quiz.q)}</p>${lesson.quiz.a.map((answer, index) => `<button class="quiz-option" data-index="${index}">${title(answer)}</button>`).join('')}<p class="muted" id="quizResult">Выберите ответ.</p></article>
        <article class="lesson-panel"><h2>Самопроверка</h2>${list(['Я могу объяснить главную идею без подсказки.', 'Я понимаю, какую формулу применять и почему.', 'Я решил тренировочный блок без пропуска ветвей.', 'Я проверил ограничения и не потерял параметр n ∈ ℤ.'])}</article>
      </main>
      <aside class="visual-card">
        <h2>Единичная окружность</h2>
        <p class="muted">Двигайте угол и сверяйте значения sin x и cos x с формулами в материале.</p>
        <div class="controls"><label>Угол: <input id="angle" type="range" min="-180" max="360" value="${lesson.accentAngle || 60}"></label><output id="angleOut"></output></div>
        <canvas id="circleCanvas" width="680" height="520" aria-label="Единичная окружность"></canvas>
        <div class="formula" id="valuesBox"></div>
      </aside>
    </section>
  `;
  document.getElementById('printPage').addEventListener('click', () => window.print());
  document.querySelectorAll('.quiz-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.quiz-option').forEach((item) => item.classList.remove('correct', 'wrong'));
      const ok = Number(button.dataset.index) === lesson.quiz.correct;
      button.classList.add(ok ? 'correct' : 'wrong');
      document.getElementById('quizResult').textContent = ok ? 'Верно.' : 'Пока нет. Вернитесь к разделу с идеей решения.';
    });
  });
  setupCanvas();
}

function setupCanvas() {
  const canvas = document.getElementById('circleCanvas');
  const range = document.getElementById('angle');
  const out = document.getElementById('angleOut');
  const values = document.getElementById('valuesBox');
  function draw() {
    const angle = Number(range.value);
    out.textContent = `${angle}°`;
    const rad = angle * Math.PI / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    values.textContent = `sin x ≈ ${sin.toFixed(2)}, cos x ≈ ${cos.toFixed(2)}`;
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
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, cy); ctx.stroke();
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--ink'); ctx.font = 'bold 18px system-ui'; ctx.fillText('P', x + 12, y - 12);
    ctx.fillStyle = '#f59e0b'; ctx.fillText('cos x', (cx + x) / 2 - 20, cy + 26);
    ctx.fillStyle = '#34d399'; ctx.fillText('sin x', x + 12, (cy + y) / 2);
  }
  range.addEventListener('input', draw);
  draw();
}

renderLesson();
