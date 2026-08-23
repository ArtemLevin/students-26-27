# P2 — lesson registry, mobile drawer accessibility and latest-lesson CTA

## Цель

Устранить оставшийся ручной дубляж данных занятий, довести мобильную навигацию до корректного keyboard/screen-reader поведения и сделать последнее занятие явной точкой продолжения работы.

## P2.1. Единый реестр занятий

Создать `site/lesson-registry.js` как единственный источник данных для:

- трёх свежих занятий в sidebar;
- раскрываемого архива и пагинации;
- главной карточки последнего занятия;
- CTA «Открыть занятие»;
- ссылок на последний PDF / TeX / review;
- даты обновления кабинета.

Для каждого занятия хранить:

- ISO-дата `YYYY-MM-DD`;
- отображаемая дата;
- HTML-файл;
- полный заголовок;
- компактный заголовок для sidebar;
- краткий subtitle;
- для актуального урока: summary, topics, outcomes;
- доступные материалы: PDF, TeX, review.

### Инварианты

1. Реестр отсортирован по убыванию даты.
2. `href` и `date` уникальны.
3. Весь датированный HTML-архив из `site/` представлен в реестре ровно один раз.
4. Актуальная запись содержит полный набор данных для hero/latest lesson.
5. Архив строится как `lessons.slice(3)` и не содержит отдельного hardcoded-массива.

**Definition of Done:** `dashboard.js` не содержит литералов массива архива и дат последних занятий; добавление нового датированного lesson HTML без обновления реестра ломает CI.

## P2.2. Data-driven sidebar и архив

- Контейнер `#recentLessons` рендерится из первых трёх записей реестра.
- Первая запись автоматически получает маркер «последнее занятие» и active-state.
- `#recentLessonCount` получает фактическое число постоянно показанных занятий.
- `#archiveToggleMeta` получает фактический остаток и page size.
- Архив сохраняет пагинацию по 10 и вычисляет число страниц из реестра.
- При смене страницы focus не теряется; `aria-live` сообщает новое содержимое.

**Definition of Done:** recent + archive = полный реестр без дублей и пропусков.

## P2.3. Последнее занятие как точка продолжения

- Главная карточка заполняется из `LESSONS[0]`.
- Добавляется один основной CTA `#latestLessonCta` — «Открыть занятие →».
- Заголовок, дата, summary, topics и outcomes берутся из той же записи.
- Ссылки «Последний PDF», «Последний TeX», «Ревью преподавателя» гидратируются из `materials` актуального урока; отсутствующий ресурс скрывается.
- Footer-дата обновления берётся из даты актуального урока.

**Definition of Done:** данные последнего занятия в `index.html` не дублируют registry; CTA ведёт на тот же `href`, что первая запись sidebar.

## P2.4. Доступный mobile drawer

Для breakpoint `max-width: 900px`:

- закрытый sidebar получает `inert` и `aria-hidden="true"`, поэтому скрытые ссылки не попадают в tab-order;
- при открытии сохраняется элемент, вызвавший drawer;
- sidebar снимается с `inert`, основной контент и mobile bar становятся `inert`;
- focus переводится на кнопку закрытия;
- Tab / Shift+Tab замыкаются внутри sidebar;
- Escape и backdrop закрывают drawer;
- после закрытия focus возвращается на исходный opener;
- body-scroll блокируется, while sidebar retains its own scroll;
- при переходе desktop ↔ mobile состояние нормализуется и `inert` снимается/ставится корректно.

**Definition of Done:** невозможно клавиатурой сфокусировать скрытый sidebar; focus не уходит за пределы открытого drawer; после Escape focus возвращается на menu button.

## P2.5. Cleanup и mobile polish

- Удалить мёртвые CSS-правила `.map-frame`, `iframe`, `#base`, оставшиеся после P1.
- Добавить стили CTA и lesson actions.
- На мобильном CTA становится удобной touch-target кнопкой.
- Проверить, что нативная карта P1 не создаёт второго page-level scroll-контекста; локальный scroll topic index сохраняется как управляемый список.
- `prefers-reduced-motion` продолжает отключать transitions.

**Definition of Done:** активные CSS/JS не содержат iframe bridge/dead selectors; sidebar и CTA корректны на desktop/mobile.

## P2.6. Регрессионные тесты и CI

Добавить `tests/dashboard-p2.test.mjs`:

1. registry содержит 13 текущих датированных уроков и отсортирован newest-first;
2. registry href-ы ровно совпадают с датированными HTML-файлами в `site/`;
3. latest lesson содержит detail/topics/outcomes и материалы;
4. recent/archive partition не теряет записи;
5. archive page size = 10;
6. active `index.html` содержит CTA и data-driven shells без hardcoded recent lessons;
7. `dashboard.js` импортирует registry и не содержит `archiveLessons=[`;
8. drawer implementation содержит `inert`, focus trap, restore focus, media-query normalization;
9. CSS блокирует body scroll только при открытом mobile drawer и не содержит iframe/#base selectors;
10. P0/P1 tests продолжают проходить.

CI расширить синтаксической проверкой `lesson-registry.js`; запускать весь `tests/*.test.mjs`.

## Порядок реализации

1. Создать `P2_PLAN.md` и feature branch.
2. Добавить `lesson-registry.js` с pure helpers и текущими 13 уроками.
3. Перевести `dashboard.js` на ES module и registry-driven rendering.
4. Упростить `index.html` до динамических lesson/sidebar shells и добавить CTA.
5. Доработать drawer focus management и responsive state.
6. Очистить/дополнить `dashboard.css`.
7. Добавить P2 tests и расширить workflow.
8. Сравнить feature branch с актуальным `main`.
9. Открыть PR, дождаться green CI, выполнить squash merge.
