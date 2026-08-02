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
  }
];
const LESSONS = [...BASE_LESSONS, ...ADDITIONAL_LESSONS];
const lessonGrid = document.getElementById('materialGrid');
const resourceGrid = document.getElementById('resourceGrid');
const lessonCount = document.getElementById('lessonCount');
const LAST_LESSON_KEY = 'timofey-last-lesson';

const escapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[char]));

const lessonHref = (lesson) => lesson.href || `lessons/${lesson.id}.html`;

const tagsFor = (lesson) => {
  const text = `${lesson.title} ${lesson.subtitle}`.toLowerCase();
  const tags = [];
  if (/тригоном|синус|косинус|арк/.test(text)) tags.push('тригонометрия');
  if (/неравен|интервал/.test(text)) tags.push('неравенства');
  if (/логариф/.test(text)) tags.push('логарифмы');
  if (/корн|модул|одз|огранич/.test(text)) tags.push('ОДЗ и корни');
  if (/формул|преобраз|разлож|групп/.test(text)) tags.push('преобразования');
  if (/вклад|процент|банк|эконом/.test(text)) tags.push('экономическая задача');
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
});
