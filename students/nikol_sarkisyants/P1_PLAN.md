# P1 — native competency map

## Цель

Устранить архитектурную рассинхронизацию между новым учебным кабинетом и legacy-картой: один DOM, одна тема, один persistent state и одна статистика для полного каталога ЕГЭ.

## Рабочие пакеты

### P1.1. Канонический каталог 19 / 284

- `index-original.html` временно остаётся каноническим каталогом 19 групп и 284 рубрик.
- Новый компонент загружает legacy-файл как текст и извлекает только JSON-литерал `groups` без `eval`/`Function`.
- Экстрактор использует bracket-aware parsing с учётом строк и escape-последовательностей.
- При несовпадении ожидаемой структуры компонент переходит в контролируемое error-state с fallback-ссылкой.

**Definition of Done:** извлечено 19 групп и 284 уникальные компетенции; дубликатов `id` нет.

### P1.2. Единый persistent state

- Используется существующий `nikol-competence-map-v1`.
- P0-инвариант сохраняется: существующие пользовательские значения имеют приоритет.
- Недостающие из 284 ключей досеиваются legacy-default уровнями.
- Поддерживаются `legacyId` / `legacyIds` для миграции старых ключей.
- Изменение уровня сразу сохраняется и становится источником следующего render/summary.

**Definition of Done:** reload и повторная инициализация сохраняют пользовательские изменения по любому из 284 `id`.

### P1.3. Живая статистика

- Статистика считается по текущим 284 значениям, без статического `window.__nikolLevels`.
- Метрики: `total`, `evaluated (>0)`, `confident (>=3)`, `process (=2)`, `repeat (<=1)`, `mastered (=4)`, `average`.
- Компонент публикует `nikol:competence-summary`; dashboard обновляет main/sidebar из события.
- После выбора уровня summary обновляется в том же render-cycle.

**Definition of Done:** изменение уровня 2→3 немедленно меняет `process` и `confident` без reload.

### P1.4. Нативный DOM вместо iframe

- `<iframe id="base">` удаляется из `index.html`.
- В `map-section` монтируются SVG radial map, фильтры, topic index и dialog.
- Внешний dashboard больше не патчит DOM другого документа.
- Нет двойного scroll-контекста и вложенной навигации.

**Definition of Done:** активный `index.html` не содержит iframe; карта полностью интерактивна в документе кабинета.

### P1.5. Ссылки и evidence

- `window.__nikolEvidence` имеет приоритет над legacy evidence для свежих подтверждений.
- Реальные ссылки на занятия открываются в top-level текущего документа естественным образом.
- Generic legacy-link `index.html#lessons` считается отсутствием конкретного материала и скрывается в dialog.
- В активном UI отсутствуют ссылки на несуществующий `#lessons`.

**Definition of Done:** отсутствуют пользовательские переходы на `index.html#lessons`; невозможно получить вложенный `index.html`.

### P1.6. Единая тема

- Карта использует CSS variables dashboard (`--surface`, `--text`, `--line`, `--teal` и heat-level variables).
- Отдельный `nikol-site-theme` для активной карты не используется.
- Переключатель dashboard автоматически меняет карту как часть того же DOM.

**Definition of Done:** light/dark применяются синхронно без отдельной синхронизации документов.

### P1.7. Надёжность и CI

- Добавить pure-function tests для extraction, state merge, summary и link normalization.
- Добавить structural tests: 19 / 284, уникальность ID, отсутствие iframe и stale anchors.
- Сохранить P0 regression suite.
- CI выполняет `node --check` для `dashboard-data.js`, `dashboard.js`, `competence-map.js`, затем все `tests/*.test.mjs`.

## Порядок реализации

1. Создать `competence-map.js` с pure core и browser controller.
2. Создать `competence-map.css`.
3. Заменить iframe-разметку в `index.html` нативным map shell/dialog.
4. Упростить `dashboard.js`: удалить iframe bridge, подключить summary-event.
5. Добавить P1 regression tests и расширить workflow.
6. Проверить diff, CI и только после green status выполнить merge.

## Ограничение P1

`index-original.html` используется как read-only источник каталога, чтобы избежать двух копий 284 рубрик. Он больше не участвует в UI/DOM активного кабинета. Выделение каталога в отдельный JSON-файл возможно следующим housekeeping-этапом без изменения поведения.