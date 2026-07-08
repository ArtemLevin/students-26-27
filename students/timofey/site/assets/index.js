const LESSONS = window.TIMOFEY_LESSONS || window['TIMOF\u0415Y_LESSONS'] || [];
const grid = document.getElementById('materialGrid');
if (grid) {
  grid.innerHTML = LESSONS.map((lesson, index) => `
    <article class="card material" data-num="${String(index + 1).padStart(2, '0')}">
      <span class="material__date">${lesson.date}</span>
      <h3>${lesson.title}</h3>
      <p>${lesson.subtitle}</p>
      <div class="material__links">
        <a class="button button--accent" href="lessons/${lesson.id}.html">Открыть страницу</a>
        ${lesson.sourcePdf ? `<a class="button" href="${lesson.sourcePdf}" download>PDF</a>` : ''}
        ${lesson.sourceTex ? `<a class="button" href="${lesson.sourceTex}" download>TeX</a>` : ''}
      </div>
    </article>
  `).join('');
}
