# Shared Practice Engine

Статическая система интервального повторения для общих ученических dashboard. Движок не обращается к внешним API, не хранит ответы в Git и не меняет mastery-state карты компетенций.

## Состав

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

Сохраняются агрегаты компетенции, не более 60 daily sessions и 200 педагогических событий. Prompt и solution восстанавливаются по generator version + seed и в history не дублируются.

## Ограничения MVP

- история локальна для одного браузера и устройства;
- синхронизации с кабинетом преподавателя пока нет;
- развёрнутые доказательства и произвольные выражения автоматически не оцениваются;
- runtime LLM, аналитика и сторонние трекеры отсутствуют.

Storage adapter позволяет позднее добавить API с optimistic concurrency без изменения scheduler, генераторов и UI.

## Интеграция уроков

Outcome может содержать optional `competencyId`. `lessonAutoActivation` активирует только ID, который одновременно существует в student config. Повторный sync сохраняет накопленный интервал и историю.

Ручная `reviewQueue` имеет высший приоритет и может активировать configured skill даже при mastery level 0. Сам scheduler уровень 0–4 не меняет.

## Legacy dashboard plan

`nikol_sarkisyants`, `nastya_pavlova` и `xenia_klykova/chemistry` остаются вне ad-hoc rollout. Для них требуется один из двух поддерживаемых путей:

1. миграция shell/map на общий `student-dashboard` contract;
2. официальный adapter, публикующий события `student:competence-state` и `student:competency-open`.

До выбора общего пути копировать practice engine или UI в legacy-каталоги запрещено.

## Проверка

```bash
node --test shared/practice/test/*.test.mjs
node shared/practice/validate-configs.mjs
node shared/student-dashboard/test-dashboard.mjs
node shared/student-dashboard/test-index-inventory.mjs
```
