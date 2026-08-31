# Shared Practice Engine

Статическая система интервального повторения для общих ученических dashboard. Движок не обращается к внешним API, не хранит ответы в Git и не меняет mastery-state карты компетенций.

## Состав

- `activation-policy.js` — единый contract `lesson | always | manual | disabled`, calendar-date validation и legacy aliases;
- `coverage-policy.js` — единый contract Stage 04/CI для `practiceDisposition`, gap waiver и coverage statuses;
- `audit-lesson-coverage.mjs` — педагогический аудит `lesson → competency → practice provider`;
- `coverage-baseline-v1.json` — ratchet baseline исторических implicit outcomes;
- `practice-state.js` — PracticeState v1, миграция, capped sessions/events;
- `practice-storage.js` — adapter для `localStorage` и memory adapter для тестов;
- `practice-scheduler.js` — интервалы `[1, 3, 7, 14, 30, 60, 120]`;
- `practice-selector.js` — manual override, due/overdue, interleaving;
- `generator-registry.js` и `generators/` — детерминированные генераторы;
- `answer-engine.js` — безопасная проверка number/integer/fraction/choice/multi-choice/ordered-pair/vector;
- `practice-engine.js` — стабильная daily session, reload, remediation и события;
- `practice-ui.js` / `practice.css` — общий keyboard/mobile UI и связь с competency dialog;
- `curated-bank.js` — контракт проверяемых банков сложных заданий.

## Состояния

Mastery хранится в существующем competence state v2. PracticeState v1 использует отдельный уникальный ключ:

| Ученик | Practice key |
|---|---|
| Кирилл | `kirill-practice-state-v1` |
| Софья | `sofya-practice-state-v1` |
| Тимофей | `timofey-practice-state-v1` |
| Володя | `volodia-practice-state-v1` |
| Ксения | `xenia-practice-state-v1` |
| Настя | `nastya-practice-state-v1` |
| Николь | `nikol-practice-state-v1` |

Сохраняются агрегаты компетенции, не более 60 daily sessions и 200 педагогических событий. Prompt и solution восстанавливаются по generator version + seed и в history не дублируются.

## Ограничения MVP

- история локальна для одного браузера и устройства;
- синхронизации с кабинетом преподавателя пока нет;
- развёрнутые доказательства и произвольные выражения автоматически не оцениваются;
- runtime LLM, аналитика и сторонние трекеры отсутствуют.

Storage adapter позволяет позднее добавить API с optimistic concurrency без изменения scheduler, генераторов и UI.

## Интеграция уроков и activation policy

Каждый новый practice mapping явно указывает `activation`:

- `lesson` — skill активируется после наступления даты урока с matching `competencyId`;
- `always` — migration/фундаментальный skill активируется при инициализации;
- `manual` — skill входит в daily selection только через `reviewQueue`, при этом `startFocused()` также разрешён;
- `disabled` — mapping сохраняется, daily selection и `startFocused()` выключены.

Если `activation` отсутствует, новый default — `lesson`. Для backward compatibility runtime продолжает принимать deprecated aliases `active:true → always` и `active:false → lesson`. Семь подключённых student configs уже мигрированы на explicit `activation`; central validation запрещает возврат deprecated boolean в них.

`lessonAutoActivation` использует только валидные calendar-date `YYYY-MM-DD`. Будущий lesson record может находиться в registry, однако его outcomes не активируются до фактической даты урока. Повторный sync сохраняет `dueAt`, interval step, attempts, lapses, sessions/events и mastery-state.

Ручная `reviewQueue` имеет высший приоритет среди selectable skills и может активировать configured `lesson`/`always`/`manual` skill даже при mastery level 0. Scheduler уровень 0–4 не меняет.

## Track C: lesson coverage audit

Structural validation и педагогическое coverage разделены. `validate-configs.mjs` проверяет существование и совместимость каталогов, mappings, generators и activation policy. `audit-lesson-coverage.mjs` отвечает на вопрос, что происходит с каждым lesson outcome в Practice lifecycle.

Статусы coverage:

- `covered-generator`;
- `covered-curated`;
- `manual-assessment`;
- `excluded-explicitly`;
- `missing-competency`;
- `missing-practice-mapping`;
- `missing-generator`;
- `generator-does-not-declare-competency`;
- `ambiguous`.

Новый outcome обязан явно указывать `practiceDisposition: generator | curated | manual | none`. `coverage-gap` и `competency-gap` допускаются только с machine-readable waiver:

```js
practiceGap:{
  reason:'generator-missing',
  issue:'planned:geometry-curated-bank'
}
```

`coverage-baseline-v1.json` содержит только исторические outcomes, созданные до обязательного `practiceDisposition`. Новый implicit outcome отсутствует в baseline и блокирует CI. Когда исторический outcome получает явный disposition или удаляется, соответствующую baseline-запись требуется удалить в том же изменении. Так baseline может только сокращаться и не маскирует новые пробелы.

CLI:

```bash
node shared/practice/audit-lesson-coverage.mjs
node shared/practice/audit-lesson-coverage.mjs --student xenia_klykova --format json
node shared/practice/audit-lesson-coverage.mjs --format markdown --json-output practice-coverage-report.json
```

Coverage percentage — observability metric. Merge gate опирается на конкретные violations/gap statuses, поэтому intentional `manual`/`none` не создают ложной ошибки, а machine-waived gap остаётся видимым в отчёте.

## Legacy dashboard plan

`nikol_sarkisyants` и `nastya_pavlova` подключены через официальный событийный adapter, который сохраняет их существующие карты и storage-контракты. `xenia_klykova/chemistry` остаётся вне rollout до появления отдельного химического набора генераторов.

Для последующих legacy-кабинетов поддерживаются два пути:

1. миграция shell/map на общий `student-dashboard` contract;
2. официальный adapter, публикующий события `student:competence-state` и `student:competency-open`.

До выбора общего пути копировать practice engine или UI в legacy-каталоги запрещено.

## Проверка

Перед commit/merge основной contract:

```bash
node shared/practice/validate-configs.mjs && \
node shared/practice/audit-lesson-coverage.mjs && \
node --test shared/practice/test/*.test.mjs && \
node --test pipeline/practice/test/*.test.mjs
```

Дополнительно:

```bash
node shared/student-dashboard/test-index-inventory.mjs
```
