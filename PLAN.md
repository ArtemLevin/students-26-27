# PLAN — post-MVP развитие интервального повторения

Статус: **MVP Practice Engine реализован; следующий этап — автоматический жизненный цикл новых уроков, серверная синхронизация и педагогическая аналитика**

Дата актуализации: 2026-08-31  
Базовое состояние при перепланировании: `main@a948d9e421a6b40fce3a91271503521c8cfe19de`

Этот документ заменяет первоначальный implementation-plan MVP актуальным operational roadmap. Подробности реализованного MVP сохраняются в Git history до этой ревизии.

---

## 0. Текущее состояние

К 31.08.2026 в репозитории уже существует рабочий общий Practice Engine:

- отдельный `PracticeState v1`;
- scheduler с интервалами `[1, 3, 7, 14, 30, 60, 120]`;
- daily selector с due/overdue/manual priority и interleaving;
- deterministic generators и seed contract;
- Answer Engine;
- hints, rating, remediation, stable daily session и reload recovery;
- отдельные storage keys на ученика;
- `lessonAutoActivation`;
- `reviewQueue` как teacher/manual override;
- central validation student config → competency catalog → generator registry;
- native MathML renderer для математического контента Practice UI;
- GitHub Actions regression matrix;
- Practice Engine подключён к семи основным кабинетам: `kirill_zinoviev`, `sofya_kalney`, `timofey`, `volodia_khachaturian`, `xenia_klykova`, `nastya_pavlova`, `nikol_sarkisyants`.

Текущая граница автоматизации проходит после создания материалов урока. `pipeline/prompts/04_spaced_practice.md` описывает безопасную привязку, однако исполняемого обязательного Stage 04 пока нет. Новый урок может появиться в `tex_docs` и других материалах без обновления `lesson-registry.js`, без machine-readable `competencyId` и без generator coverage.

Коммит `Xenia 31 08 26` является полезным реальным regression-case: новый материал занятия появился в репозитории, а `students/xenia_klykova/site/lesson-registry.js` на момент планирования заканчивается уроком 28.08.2026. Будущий Stage 04 должен автоматически обнаруживать такую рассинхронизацию.

Текущее PracticeState хранится в `localStorage`. Поэтому история повторения остаётся привязанной к конкретному браузеру и устройству. Teacher analytics пока не имеет централизованного источника событий.

---

## 1. Целевой operational flow

После завершения этого roadmap жизненный цикл занятия должен выглядеть так:

```text
проведено занятие
    ↓
созданы transcript / lesson JSON / TeX / PDF / web-материалы
    ↓
Stage 04 автоматически анализирует результаты урока
    ↓
lesson outcomes получают проверенные competencyId
    ↓
каждый practice-eligible outcome классифицируется:
    generator | curated bank | manual | no-practice | coverage-gap
    ↓
lesson-registry и practice-config получают migration-safe update
    ↓
CI проверяет lesson → competency → practice coverage
    ↓
после даты урока competency активируется в Practice Engine
    ↓
ученик проходит ежедневные повторения
    ↓
Practice events синхронизируются с сервером
    ↓
retention aggregates и teacher analytics обновляются
    ↓
следующее занятие начинается с актуального pre-lesson brief
```

Ключевая эксплуатационная цель: **рост банка занятий не создаёт пропорционально растущую ручную работу по сопровождению интервального повторения**.

---

## 2. Архитектурные инварианты

Следующие решения остаются обязательными во всех пяти направлениях.

### 2.1. `competencyId` — главный foreign key

Связь уроков, heatmap, practice schedule, generators, curated banks, server state и analytics строится вокруг стабильного `competencyId`.

Новый ID создаётся только в каталоге компетенций. Stage 04 не генерирует произвольные идентификаторы.

### 2.2. Mastery и retention/scheduling остаются разными состояниями

`studentLevels` 0–4 остаётся педагогической оценкой освоения. Practice events и интервалы описывают сохранность навыка во времени.

Practice Engine не меняет heatmap level автоматически. Teacher analytics может формировать рекомендацию на пересмотр mastery, решение остаётся отдельным педагогическим действием.

### 2.3. Runtime generators остаются deterministic

Упражнение воспроизводится по `studentId + competencyId + date + ordinal + generatorVersion`.

Runtime LLM не требуется для ежедневной сессии. LLM допускается в offline/pipeline для классификации содержания урока и подготовки curated material при обязательной deterministic validation.

### 2.4. Student-specific code остаётся конфигурационным

Scheduler, selector, sync, coverage audit, MathML, analytics contracts и generator registry живут в shared/backend слоях. Каталоги учеников содержат lesson registry, competence data и mapping/config.

### 2.5. Локальная работа сохраняется при недоступности API

Server sync расширяет persistence. Practice session должна продолжать работать при временной сетевой ошибке. Локальный durable cache остаётся обязательным.

### 2.6. Любая автоматизация должна быть идемпотентной

Повторный запуск Stage 04, lesson activation, sync или analytics aggregation на одинаковых входах не создаёт дублей и не сбрасывает интервалы.

---

# TRACK A — обязательный автоматический Stage 04 после каждого занятия

## 3. Цель Track A

Перевести `pipeline/prompts/04_spaced_practice.md` из advisory prompt в обязательный исполняемый post-lesson stage.

Stage 04 отвечает только за metadata/integration. Историю попыток, текущие интервалы, `studentLevels` и `reviewQueue` он не редактирует.

## 4. Новый machine-readable контракт Stage 04

Добавить JSON Schema:

```text
pipeline/schemas/spaced-practice-stage-v1.schema.json
```

Предлагаемый результат:

```json
{
  "schemaVersion": 1,
  "studentId": "xenia_klykova",
  "lessonDate": "2026-08-31",
  "lessonHref": "31.08.26.html",
  "outcomes": [
    {
      "label": "Обозначения стереометрии",
      "practiceDisposition": "generator",
      "competencyId": "...",
      "generatorKey": "...",
      "confidence": "exact",
      "evidence": ["..."],
      "reason": "..."
    }
  ],
  "gaps": [],
  "warnings": []
}
```

Допустимые `practiceDisposition`:

- `generator` — существует точный competency и registered generator;
- `curated` — competency существует, procedural generator педагогически нежелателен, требуется curated bank;
- `manual` — навык проверяется преподавателем/развёрнутым решением;
- `none` — outcome информационный или организационный и не требует spaced practice;
- `coverage-gap` — practice уместен, однако подходящего generator/bank пока нет;
- `competency-gap` — в каталоге отсутствует точный competency;
- `ambiguous` — несколько допустимых соответствий, auto-apply запрещён.

`confidence=exact` является единственным режимом, разрешающим автоматическое изменение mapping.

## 5. Исполняемый Stage 04

Добавить:

```text
pipeline/practice/
├── run-stage-04.mjs
├── validate-stage-result.mjs
├── build-practice-patch.mjs
├── apply-practice-patch.mjs
├── discover-student-contracts.mjs
└── test/
```

CLI:

```bash
node pipeline/practice/run-stage-04.mjs \
  --student xenia_klykova \
  --date 2026-08-31 \
  --analysis path/to/stage-04-result.json
```

### 5.1. Inputs

Stage runner загружает:

1. lesson artifact/lesson JSON текущего занятия;
2. `students/<student>/site/lesson-registry.js`;
3. полный competency catalog ученика;
4. `students/<student>/site/practice-config.js`;
5. `shared/practice/generators/index.js`;
6. registry curated banks;
7. текущий `pipeline/prompts/04_spaced_practice.md`.

### 5.2. Deterministic validation перед apply

Для каждого предложенного outcome проверяется:

- competency ID существует в каталоге ученика;
- generator key существует в registry;
- generator декларирует данный competency ID;
- difficulty contract валиден;
- lesson date валидна;
- существующий mapping не заменяется несовместимым generator без явной migration directive;
- существующая lesson metadata не теряется;
- state/storage files не затронуты.

### 5.3. Auto-apply policy

Автоматически разрешены только изменения следующих классов:

- добавление `competencyId` к outcome при `confidence=exact`;
- добавление нового mapping в `practice-config.js`, когда generator уже зарегистрирован и declares competency;
- добавление lesson record в `lesson-registry.js` из уже созданного lesson artifact;
- добавление explicit `practiceDisposition` для CI audit.

`coverage-gap`, `competency-gap`, `ambiguous`, новая geometry/chemistry generator logic и смена generator существующей competency формируют отчёт для ручного решения.

### 5.4. Idempotence

Повторный запуск на одинаковом уроке должен давать zero diff.

Уникальность урока задаётся `studentId + lessonDate`. При повторной генерации с тем же `lessonDate` stage обновляет только разрешённые metadata-поля существующей записи.

## 6. Интеграция Stage 04 в production lesson workflow

Добавить единую точку входа:

```text
pipeline/practice/post-lesson-practice.mjs
```

Она должна запускаться после появления финального lesson metadata и до публикации/merge student dashboard.

Если текущий внешний pipeline запускается из другого приложения, этот script становится обязательным contract endpoint: внешний orchestrator передаёт student/date/result и получает `applied | blocked | gaps`.

Exit codes:

- `0` — stage валиден, apply выполнен или изменений нет;
- `2` — обнаружен coverage gap, публикация допускается только при explicit waiver policy;
- `3` — structural contract error, публикация блокируется;
- `4` — ambiguous mapping, требуется review.

## 7. Acceptance criteria Track A

- новый lesson artifact невозможно тихо опубликовать без Stage 04 result;
- реальный сценарий `Xenia 31.08.26 material exists / registry missing` обнаруживается автоматически;
- exact mapping обновляется без ручного редактирования двух файлов;
- повторный запуск не создаёт diff;
- arbitrary competency ID отклоняется;
- existing practice state byte-for-byte не участвует в patch;
- CI тестирует schema и patch builder.

---

# TRACK B — activation-by-lesson и future-date guard

## 8. Цель Track B

Новые skills должны становиться активными в интервальном повторении после фактической даты изучения. Legacy `active:true` постепенно остаётся только для явных always-on/migration cases.

## 9. Исправление future-date bug

В `syncLessonActivations(...)` добавить обязательный guard:

```js
if (!lesson.date || lesson.date > today) continue;
```

Дополнительные правила:

- malformed date отклоняется validation до runtime;
- timezone сравнение выполняется на calendar-date `YYYY-MM-DD`;
- будущий lesson record может присутствовать в registry для планирования, его outcomes до даты урока не активируются;
- наступление даты урока приводит к idempotent activation при следующей инициализации.

Unit tests:

1. yesterday lesson activates;
2. today lesson activates;
3. tomorrow lesson stays inactive;
4. repeated sync preserves `dueAt`, attempts и interval step;
5. переход injected `todayProvider` с D-1 на D активирует skill ровно один раз.

## 10. Явная activation policy

Расширить mapping contract без резкого breaking change:

```js
{
  generator: 'algebra.powers',
  difficulty: [1, 2],
  activation: 'lesson'
}
```

Режимы:

- `lesson` — стандарт для новых mappings;
- `always` — migration/always-on skill;
- `manual` — только `reviewQueue` или explicit `startFocused`;
- `disabled` — mapping существует, selection выключен.

Backward compatibility:

```text
active:true  → legacy alias activation:'always'
active:false → legacy alias activation:'lesson' до завершения миграции
```

После миграции всех семи кабинетов boolean `active` помечается deprecated, удаление возможно только в следующей major schema revision.

## 11. Миграция существующих кабинетов

Миграция выполняется student-by-student.

### 11.1. Перед переключением на `activation:'lesson'`

Для каждого mapping определить:

- существует ли исторический lesson outcome с этим competencyId;
- существует ли current PracticeState entry, уже активированная ранее;
- является ли skill фундаментальным always-on навыком;
- есть ли legacy lesson без machine-readable outcomes, который требуется backfill.

### 11.2. Правило сохранения истории

Уже активированная competency остаётся активной при смене config policy. Накопленные `dueAt`, `intervalStep`, `attempts`, `lapses`, sessions/events сохраняются.

### 11.3. Migration order

1. Xenia — наиболее развитый lesson registry и probability mappings;
2. Nastya — один свежий lesson с точными `calc_*` outcomes;
3. Nikol — сначала backfill точных historical outcomes, потому что часть уроков содержит labels без competencyId;
4. Timofey;
5. Sofya;
6. Kirill;
7. Volodia.

Migration commit каждого ученика проходит central coverage audit до merge.

## 12. Activation provenance

Для будущей analytics желательно добавить в PracticeState следующей schema revision:

```js
activation: {
  source: 'lesson' | 'manual' | 'config',
  lessonDate: '2026-08-31' | null,
  firstActivatedAt: '...'
}
```

Это поле не используется scheduler для расчёта интервалов. Оно обеспечивает аудит происхождения skill и объяснимость teacher UI.

## 13. Acceptance criteria Track B

- future lesson никогда не создаёт due item раньше даты занятия;
- новые mappings по умолчанию используют lesson activation;
- миграция config не сбрасывает существующую историю;
- manual queue продолжает иметь максимальный приоритет;
- legacy dashboards работают через тот же shared contract;
- tests покрывают date boundary и idempotence.

---

# TRACK C — CI-аудит `lesson → competency → generator coverage`

## 14. Цель Track C

CI должен отвечать на два разных вопроса:

1. **структурная корректность** — все ссылки существуют и совместимы;
2. **педагогическое покрытие** — каждый новый practice-eligible outcome имеет generator/curated/manual disposition либо explicit waiver.

Существующий `validate-configs.mjs` сохраняется как structural validator и расширяется отдельным coverage layer.

## 15. Coverage audit utility

Добавить:

```text
shared/practice/audit-lesson-coverage.mjs
shared/practice/coverage-policy.js
shared/practice/test/coverage-audit.test.mjs
```

CLI:

```bash
node shared/practice/audit-lesson-coverage.mjs
node shared/practice/audit-lesson-coverage.mjs --student xenia_klykova --format json
```

## 16. Coverage model

Для каждого outcome формируется статус:

- `covered-generator`;
- `covered-curated`;
- `manual-assessment`;
- `excluded-explicitly`;
- `missing-competency`;
- `missing-practice-mapping`;
- `missing-generator`;
- `generator-does-not-declare-competency`;
- `ambiguous`.

Отчёт ученика:

```text
Xenia
lessons: 11
practice-eligible outcomes: 24
generator-covered: 18
curated-covered: 2
manual: 2
gaps: 2
coverage: 91.7%
```

Процент используется как observability metric. Merge gate опирается на конкретные gap statuses.

## 17. Policy для старой и новой истории

Полный historical backfill может выполняться постепенно. Поэтому CI вводится через ratchet policy.

### 17.1. Hard gate для нового урока

У самого свежего добавленного/изменённого lesson каждый outcome обязан иметь один из explicit dispositions:

```text
generator | curated | manual | none
```

Статус `coverage-gap` допустим только с отдельным machine-readable waiver, например:

```js
practiceGap: {
  reason: 'generator-missing',
  issue: 'planned:geometry-curated-bank'
}
```

### 17.2. Historical baseline

Существующие gaps фиксируются baseline-report и постепенно уменьшаются. PR не может увеличивать количество unexplained historical gaps.

После backfill конкретного ученика baseline для него переводится в strict mode.

## 18. GitHub Actions integration

В `.github/workflows/student-dashboard-tests.yml` добавить отдельный job:

```text
practice coverage audit
```

Шаги:

1. validate configs;
2. validate lesson outcome schema;
3. run coverage audit;
4. fail on structural error;
5. fail on uncovered new outcome without waiver;
6. записать Markdown summary в GitHub Actions job summary;
7. при необходимости сохранять JSON report как artifact.

CI должен запускаться при изменениях:

- `students/**/lesson-registry.js`;
- `students/**/practice-config.js`;
- competency catalogs;
- `shared/practice/generators/**`;
- curated banks;
- Stage 04 schema/policy.

## 19. Coverage audit в developer workflow

Добавить одну команду проверки перед commit/merge:

```bash
node shared/practice/validate-configs.mjs && \
node shared/practice/audit-lesson-coverage.mjs && \
node --test shared/practice/test/*.test.mjs
```

Опционально создать `npm`/`make`-подобный wrapper script, если в репозитории появится общий task runner.

## 20. Acceptance criteria Track C

- новая тема не может исчезнуть из Practice lifecycle без явного статуса;
- CI различает отсутствие competency и отсутствие generator;
- intentional manual/none outcome не создаёт ложную ошибку;
- historical gaps видимы и ratchet не допускает ухудшения;
- coverage report понятен без чтения source code;
- Stage 04 и CI используют один schema/policy module.

---

# TRACK D — серверная синхронизация PracticeState

## 21. Цель Track D

Сделать историю повторения устойчивой к смене браузера/устройства и создать центральный источник данных для teacher analytics.

Рекомендуемый backend: существующий `ArtemLevin/tutor-assistant-web`.

Он уже содержит:

- FastAPI;
- SQLAlchemy;
- PostgreSQL driver;
- Alembic;
- identity module с ролями `student`, `parent`, `tutor`, `admin`;
- student domain/module;
- audit infrastructure;
- production deployment/CI контур.

Это позволяет реализовать sync как отдельный доменный модуль без появления второго backend-проекта.

## 22. Cross-repo boundary

`students-26-27` остаётся владельцем:

- scheduler rules;
- generator registry;
- browser Practice Engine;
- lesson/competency metadata;
- local fallback;
- client sync contract tests.

`tutor-assistant-web` становится владельцем:

- authentication/authorization;
- canonical remote persistence;
- event ingestion;
- optimistic concurrency;
- teacher analytics aggregation/API/UI;
- server audit trail.

Создать версионированный контракт `practice-sync-v1` и fixture tests в обоих репозиториях.

## 23. Backend module

В `tutor-assistant-web` добавить:

```text
src/tutor_assistant_web/modules/practice/
├── __init__.py
├── module.py
├── models.py
├── schemas.py
├── repository.py
├── application.py
├── routes.py
└── analytics.py
```

Плюс Alembic migration и tests.

## 24. Data model v1

### 24.1. `practice_profiles`

Одна canonical snapshot на student:

```text
id
organization_id
student_id
schema_version
revision
state_jsonb
created_at
updated_at
```

Unique constraint:

```text
(organization_id, student_id)
```

`revision` увеличивается при каждом accepted mutation.

### 24.2. `practice_events`

Immutable/queryable event log:

```text
id
event_id              unique idempotency key
organization_id
student_id
session_id
exercise_id
competency_id
generator_key
generator_version
difficulty
attempt_count
hints_used
outcome
rating
duration_ms
occurred_at
received_at
client_instance_id
payload_version
```

Indexes минимум:

```text
(student_id, occurred_at desc)
(student_id, competency_id, occurred_at desc)
(student_id, outcome, occurred_at desc)
(event_id unique)
```

### 24.3. Почему нужны snapshot + events

Snapshot обеспечивает быстрый bootstrap daily practice. Event log обеспечивает idempotent sync, teacher analytics, аудит и будущую миграцию scheduler/retention model.

## 25. PracticeState v2 для sync

Добавить additive fields:

```js
{
  schemaVersion: 2,
  revision: 17,
  clientInstanceId: 'uuid',
  competencies: {...},
  sessions: {...},
  events: [
    {
      eventVersion: 2,
      eventId: 'uuid-or-stable-id',
      ...
    }
  ]
}
```

Migration `v1 → v2`:

- сохраняет competencies/sessions;
- существующим локальным events присваивает deterministic migration IDs;
- повторная миграция идемпотентна;
- storage key можно оставить прежним при корректной schema migration либо перейти на `*-practice-state-v2` через explicit migration; предпочтительно сохранить key и мигрировать содержимое.

## 26. API contract v1

Предпочтительные endpoints:

```text
GET  /api/v1/practice/me/bootstrap
POST /api/v1/practice/me/events:batch
PUT  /api/v1/practice/me/state
GET  /api/v1/practice/me/state
```

Teacher endpoints добавляются Track E.

### 26.1. Bootstrap

Response:

```json
{
  "contractVersion": 1,
  "studentId": "...",
  "revision": 17,
  "state": {...},
  "serverTime": "..."
}
```

### 26.2. Event batch

- принимает до bounded N events;
- `eventId` обеспечивает idempotence;
- повторная доставка одинакового batch безопасна;
- неизвестный student/tenant отклоняется server-side;
- payload validation запрещает произвольные fields вне версии контракта.

### 26.3. Optimistic snapshot update

Client отправляет `baseRevision`. Несовпадение возвращает `409 Conflict` и canonical latest snapshot.

## 27. Client architecture: local-first sync

Синхронный API текущего `PracticeEngine` сохраняется. Async network logic выносится рядом:

```text
shared/practice/practice-sync.js
shared/practice/practice-sync-merge.js
shared/practice/practice-sync-client.js
```

Flow:

1. кабинет мгновенно загружает local state;
2. sync coordinator запрашивает remote bootstrap;
3. remote/local state reconciliation выполняется pure function;
4. engine получает reconciled snapshot/state через controlled rehydrate path;
5. новые completed events складываются в local outbox;
6. outbox отправляется batch-ами с retry/backoff;
7. accepted revision сохраняется локально;
8. offline session продолжает работать.

Никакой network request не выполняется внутри generators/scheduler.

## 28. Conflict policy

Merge должен быть детерминированным и покрытым property tests.

### 28.1. Events

Union по `eventId`.

### 28.2. Competency schedule

Canonical server state имеет приоритет после успешного event replay. Если реализуется snapshot merge до server replay, более свежий `lastAttemptAt` побеждает только при совместимой event ancestry.

### 28.3. Sessions

- `completed` имеет приоритет над `active` той же даты;
- одинаковый `exerciseIds` допускает merge progress;
- разные exercise lists для одной даты считаются conflict, canonical server session сохраняется, локальный вариант остаётся diagnostic record до ack;
- ни одна completed attempt не удаляется из event log.

### 28.4. Clock

Ordering опирается на server revision/event receipt плюс `occurredAt` как учебный metadata. Клиентское время не является единственным источником истины.

## 29. Authentication and hosting decision

Секреты нельзя встраивать в публичный `students-26-27`.

Предпочтительный production topology: student dashboard доступен через authenticated `tutor-assistant-web` portal/same-origin route либо через контролируемый portal handoff с short-lived scoped credential.

Для первого production rollout рекомендуется same-origin путь, потому что в `tutor-assistant-web` уже существует student login/session model. Это упрощает HttpOnly session, CSRF/CORS policy и tenant isolation.

Если GitHub Pages остаётся отдельным origin на переходном этапе, требуется отдельный security review для token handoff. Long-lived bearer token в repository source запрещён.

## 30. LocalStorage migration rollout

Порядок для каждого student:

1. backend profile отсутствует;
2. client обнаруживает local PracticeState;
3. authenticated first sync создаёт remote profile из local snapshot + events;
4. server возвращает revision;
5. client помечает migration complete;
6. далее local storage используется как cache/outbox;
7. teacher analytics включается только после успешной server binding.

Rollback: feature flag `serverSync:false` возвращает local-only режим без потери локальной истории.

## 31. Reliability и observability Track D

Metrics/logging:

- sync success/failure count;
- conflict rate;
- outbox size;
- bootstrap latency;
- event ingestion duplicates;
- schema validation failures;
- last successful sync per student;
- profiles with stale sync > policy threshold.

Server audit должен фиксировать administrative access/export, при этом обычные practice events остаются в domain event table.

## 32. Acceptance criteria Track D

- один student открывает кабинет на двух устройствах и видит одну canonical history;
- offline completion позже синхронизируется без потери events;
- duplicate batch не увеличивает attempts дважды;
- 409 conflict восстанавливается автоматически или показывает безопасный retry state;
- tenant isolation тестируется server-side;
- local-only fallback сохраняется;
- corrupted remote payload не ломает student dashboard;
- migration v1 → v2 сохраняет интервалы и history;
- backend backup/restore включает practice tables.

---

# TRACK E — retention + teacher analytics

## 33. Цель Track E

Сделать накопленные practice events полезными для подготовки преподавателя к следующему занятию и для оценки устойчивости навыков во времени.

Analytics использует server event log после Track D. Локальные diagnostics остаются вспомогательными.

## 34. Терминология

Ввести два отдельных показателя:

### `masteryLevel`

Педагогическая оценка 0–4 из competence map.

### `retentionIndex`

Операционный индекс устойчивости retrieval practice 0–100. Он не называется вероятностью воспоминания и не подменяет mastery.

Индекс используется для сортировки рисков и trend analytics.

## 35. Retention Index v1

Первую версию делать прозрачной и детерминированной. Inputs per competency:

- последние N practice events;
- correctness;
- attempts;
- hints;
- rating;
- duration relative to expected time, если generator предоставляет baseline;
- current interval step/days;
- lapses и repeated lapse;
- overdue status.

Предлагаемая decomposition:

```text
retrievalSuccess   0..1
independence       0..1
spacingStrength    0..1
lapsePenalty       0..1
```

Стартовая формула должна жить в отдельном pure module и иметь version:

```text
retentionIndexVersion = 1
```

Пример весов для пилота:

```text
45% retrieval success
25% independence from hints/retries
20% spacing strength
10% lapse/overdue adjustment
```

Конкретные коэффициенты утверждаются только вместе с unit tests и real-data review. Изменение весов требует version bump, чтобы historical charts оставались объяснимыми.

## 36. Retention categories

Teacher UI показывает также категорию, чтобы число 0–100 не воспринималось как абсолютная истина:

```text
stable      — устойчиво
watch       — стоит проверить
fragile     — высокий риск забывания
rebuild     — повторные провалы
insufficient-data — мало наблюдений
```

Минимум 2–3 retrieval events рекомендуется до показа числового индекса; до этого выводится `insufficient-data`.

## 37. Analytics aggregates

На ученика:

- due today;
- overdue count;
- overdue days distribution;
- repeated lapses;
- fragile competencies;
- hint dependence;
- first-attempt accuracy;
- completion rate daily sessions;
- median/percentile duration;
- practice consistency по календарным дням;
- generator coverage gaps;
- last successful sync;
- retention trend 7/30 practice events или calendar window.

На competency:

- mastery 0–4;
- retention category/index;
- current due date;
- current interval;
- attempts/correct/lapses/streak;
- last N outcomes;
- hints/retries trend;
- average duration;
- source lesson/date;
- current generator/bank;
- recommended teacher action.

## 38. Teacher action rules v1

Rules должны быть explainable:

```text
repeatedLapse >= 2
→ «Разобрать навык на ближайшем занятии»

overdueDays >= 7
→ «Вернуть в обязательный короткий блок»

masteryLevel >= 3 + retention fragile
→ «Проверить сохранность: уровень освоения высокий, retrieval просел»

masteryLevel <= 2 + retention stable
→ «Есть положительная динамика, рассмотреть teacher reassessment»

high hint dependence
→ «Проверить самостоятельность решения»
```

Rules формируют recommendation, heatmap level автоматически не изменяется.

## 39. Teacher UI в `tutor-assistant-web`

Добавить student page section:

```text
/students/{student_id}/practice
```

Блоки:

1. **Сегодня** — due/overdue/backlog;
2. **Требуют внимания** — repeated lapse/fragile;
3. **Устойчивые навыки** — контрольные long-interval skills;
4. **Последние сессии**;
5. **Retention × Mastery matrix**;
6. **Generator coverage**;
7. **Sync health**.

## 40. Pre-lesson brief

Отдельный aggregate endpoint/service:

```text
build_pre_lesson_practice_brief(student_id)
```

Результат содержит максимум педагогически полезной информации без длинного event log:

```text
3 skills requiring attention
2 overdue
1 repeated lapse
1 mastery/retention mismatch
last practice session summary
recommended warm-up competencies
```

Позднее этот brief может использоваться desktop Tutor Assistant или lesson generation pipeline.

## 41. Privacy / access control analytics

- student видит только собственные practice data;
- parent — только связанных students согласно существующей identity model;
- tutor/admin — students своей organization;
- raw answer strings по возможности не сохраняются server-side, достаточно normalized event metadata;
- public Git repository не содержит personal practice history;
- export/delete policy добавляется вместе с backend module.

## 42. Acceptance criteria Track E

- teacher page строится из canonical server data;
- retentionIndex versioned и deterministic;
- mastery/retention отображаются как разные оси;
- рекомендация объясняет, какие события её вызвали;
- insufficient-data корректно обрабатывается;
- analytics не требует чтения raw student input;
- pre-lesson brief покрыт snapshot tests;
- изменение retention formula не переписывает historical event log.

---

## 43. Общая последовательность реализации

Порядок выбран по зависимостям и blast radius.

### Milestone 1 — Lesson automation foundation

1. future-date guard + tests;
2. Stage 04 JSON schema;
3. Stage 04 validator/patch builder;
4. executable post-lesson entrypoint;
5. Xenia 31.08 regression fixture.

**Gate:** новый урок проходит end-to-end metadata update idempotently.

### Milestone 2 — Activation migration

1. `activation` policy contract;
2. backward compatibility aliases;
3. Xenia/Nastya pilot migration;
4. Nikol historical outcome backfill;
5. остальные кабинеты;
6. deprecation warning для new `active:true` mappings.

**Gate:** future lessons safe, новые skills активируются по фактической дате.

### Milestone 3 — Coverage quality gate

1. coverage audit utility;
2. dispositions/waivers contract;
3. historical baseline;
4. GitHub Actions job;
5. strict latest-lesson rule;
6. ratchet to strict per student.

**Gate:** CI исключает silent practice coverage drift.

### Milestone 4 — Practice sync contract/backend

Работа затрагивает два репозитория.

`students-26-27`:

- PracticeState v2;
- event IDs;
- sync client/coordinator;
- merge/outbox tests;
- feature flag.

`tutor-assistant-web`:

- practice module;
- DB migration;
- API contract;
- authz;
- event idempotence;
- optimistic concurrency;
- backup/restore coverage.

**Gate:** multi-device test и offline replay проходят.

### Milestone 5 — Retention & teacher analytics

1. analytics aggregation layer;
2. retentionIndex v1;
3. teacher student-practice page;
4. pre-lesson brief;
5. mastery/retention mismatch rules;
6. trend/coverage/sync health.

**Gate:** преподаватель перед занятием получает короткий объяснимый список skills requiring attention.

---

## 44. Предлагаемая серия PR

Чтобы review оставался локальным и понятным:

1. `practice: guard lesson activation by lesson date`
2. `pipeline: define spaced-practice stage result schema`
3. `pipeline: add deterministic stage-04 validator and patch builder`
4. `pipeline: require post-lesson practice stage`
5. `practice: introduce explicit activation policy`
6. `students: migrate lesson-based activation in pilot dashboards`
7. `students: complete activation migration across dashboards`
8. `practice: add lesson coverage audit`
9. `ci: enforce new-lesson practice coverage`
10. `practice: add state-v2 event identity and sync contracts`
11. `practice: add local-first sync coordinator`
12. cross-repo `tutor-assistant-web: add practice persistence API`
13. cross-repo `practice: enable authenticated server sync pilot`
14. cross-repo `practice: roll out sync to students`
15. `tutor-assistant-web: add retention aggregates`
16. `tutor-assistant-web: add teacher practice analytics`
17. `practice: add pre-lesson brief integration`

Каждый PR должен сохранять green current dashboard matrix.

---

## 45. Test strategy

### 45.1. Stage 04

- valid exact mapping;
- unknown competency;
- unknown generator;
- generator competency mismatch;
- ambiguous mapping;
- curated/manual/none dispositions;
- repeated run zero diff;
- lesson exists, registry entry missing;
- registry entry exists, metadata partial;
- state/history files untouched.

### 45.2. Activation

- past/today/future boundary;
- timezone-independent calendar date;
- migration preserving interval;
- manual override;
- existing active state with new lesson policy;
- future planned lesson.

### 45.3. Coverage

- strict current lesson;
- historical baseline ratchet;
- explicit waiver;
- curated coverage;
- intentional no-practice;
- unknown ID hard failure;
- report deterministic ordering.

### 45.4. Sync

- v1→v2 migration;
- eventId idempotence;
- duplicate batch;
- offline outbox;
- device A/device B bootstrap;
- 409 reconciliation;
- same-day session conflict;
- server unavailable;
- auth expired;
- tenant isolation;
- corrupted payload;
- retry/backoff bounded;
- local session remains usable.

### 45.5. Analytics

- empty history;
- insufficient data;
- stable skill;
- repeated lapse;
- hint dependence;
- mastery/retention mismatch;
- versioned retention calculation;
- aggregate timezone boundaries;
- teacher authz;
- pre-lesson brief deterministic ranking.

---

## 46. CI architecture after roadmap

`students-26-27` minimum jobs:

```text
student dashboard regression
shared practice engine
practice config validation
lesson practice coverage audit
pipeline Stage 04 contract tests
MathML contract tests
index inventory
```

`tutor-assistant-web` minimum additions:

```text
practice API unit/integration tests
Alembic migration test
practice authz tests
idempotency/concurrency tests
analytics tests
cross-repo contract fixtures
```

Cross-repo contract version mismatch должен обнаруживаться fixture/schema tests до production deployment.

---

## 47. Rollout flags

Student config/shared config должен позволять независимое включение:

```js
features: {
  remediation: true,
  competencyDialogStatus: true,
  lessonAutoActivation: true,
  serverSync: false,
  retentionStudentView: false
}
```

Backend/teacher analytics feature flags:

```text
PRACTICE_SYNC_ENABLED
PRACTICE_ANALYTICS_ENABLED
PRACTICE_RETENTION_INDEX_VERSION
```

Это обеспечивает rollback одного слоя без отключения daily Practice Engine.

---

## 48. Risks and mitigations

### Риск: Stage 04 ошибочно связывает outcome с похожим skill

Меры:

- auto-apply только `confidence=exact`;
- существующие IDs/registry как whitelist;
- ambiguous status;
- evidence в stage result;
- CI structural validation.

### Риск: planned future lesson активирует задания заранее

Меры:

- calendar-date guard в shared activation function;
- dedicated future-date tests;
- config policy `activation:'lesson'`.

### Риск: historical lesson data неполно

Меры:

- baseline + ratchet;
- strict policy сначала для новых уроков;
- student-by-student backfill;
- explicit manual/none dispositions.

### Риск: две версии состояния на разных устройствах

Меры:

- event IDs;
- canonical server revision;
- local outbox;
- deterministic conflict policy;
- immutable event ingestion.

### Риск: сервер становится single point of failure

Меры:

- local-first session;
- cached state;
- retry/backoff;
- feature-flag rollback;
- backend backup/restore.

### Риск: retentionIndex воспринимается как абсолютная педагогическая оценка

Меры:

- отдельный термин `retentionIndex`;
- category + explanation;
- `insufficient-data`;
- mastery остаётся отдельной teacher-owned величиной;
- versioned formula.

### Риск: cross-repo contract drift

Меры:

- versioned contract;
- shared JSON fixtures/schema;
- compatibility tests в обоих CI;
- API versioning.

---

## 49. Definition of Done всего post-MVP roadmap

### Lesson lifecycle

- [ ] каждый новый урок проходит mandatory Stage 04;
- [ ] exact mappings применяются idempotently;
- [ ] gaps классифицируются machine-readably;
- [ ] future lesson guard покрыт tests;
- [ ] new mappings используют lesson activation;
- [ ] семь основных кабинетов мигрированы без потери history.

### Coverage

- [ ] CI показывает coverage per student;
- [ ] новый practice-eligible outcome не может остаться unexplained;
- [ ] historical gaps имеют baseline/waiver;
- [ ] generator/curated/manual/none различаются явно.

### Sync

- [ ] PracticeState v2 мигрирует v1 без потерь;
- [ ] server profile и immutable events реализованы;
- [ ] duplicate delivery idempotent;
- [ ] optimistic concurrency работает;
- [ ] offline outbox работает;
- [ ] multi-device сценарий протестирован;
- [ ] local fallback сохраняется;
- [ ] security/tenant isolation tests green.

### Analytics

- [ ] retentionIndex v1 versioned;
- [ ] teacher analytics page доступна по student;
- [ ] mastery и retention отображаются раздельно;
- [ ] repeated lapses/overdue/hint dependence видны;
- [ ] pre-lesson brief генерируется автоматически;
- [ ] recommendations объяснимы по underlying events.

### Operations

- [ ] оба репозитория имеют совместимые contract tests;
- [ ] backup/restore включает practice persistence;
- [ ] observability показывает sync health;
- [ ] feature flags позволяют безопасный rollback;
- [ ] документация отражает фактический production flow.

---

## 50. Что остаётся за пределами этого roadmap

После выполнения пяти tracks отдельно рассматриваются:

- FSRS или другая calibrated memory model;
- push/email reminders;
- gamification;
- автоматическая symbolic проверка сложных доказательств;
- runtime LLM exercise generation;
- автоматическое изменение mastery level по practice events;
- глобальная оптимизация scheduler parameters по cohort data.

Эти направления не требуются для того, чтобы система уже сейчас масштабировалась вместе с растущим банком уроков.

---

## 51. Следующий инженерный шаг

Начать с одного небольшого correctness PR:

```text
future-date guard
→ unit tests past/today/future
→ activation policy contract tests
→ full shared Practice Engine suite
→ full student dashboard matrix
```

После зелёного gate переходить к Stage 04 schema/runner. Так сначала устраняется известная runtime-ошибка, затем строится автоматизация поверх исправленного activation contract.
