# PLAN — система интервального повторения и генерации упражнений

Статус: **реализовано в полном объёме для migrated dashboards**  
Ветка реализации: `feature/spaced-practice-engine`  
Базовое состояние репозитория при планировании: `main@7fb2220f5e955fe467fb4d2faa839abdb8d33a6c`  
Дата планирования: 2026-08-31

## 0. Результат реализации — 2026-08-31

Реализованы Phase 0–8 и необходимое для текущих активных тем расширение Phase 10. Practice Engine подключён к пяти migrated dashboards: `kirill_zinoviev`, `sofya_kalney`, `timofey`, `volodia_khachaturian`, `xenia_klykova`.

Phase 9 закрыта согласованным migration/adapter plan в `shared/practice/README.md`: legacy-кабинеты не получили дублированную бизнес-логику. Функции из раздела «Осознанно не входит в MVP» по-прежнему остаются за границами реализации.

Проверяемые результаты:

- PracticeState v1, bounded storage, scheduler, selector и deterministic seed contract;
- безопасный Answer Engine и 19 централизованных generators;
- общий daily-session UI с reload, hints, rating, remediation и competency dialog status;
- lesson outcome linking, pipeline prompt и central config validation;
- rollout без изменения mastery state v2, `reviewQueue`, URL и lesson history;
- 23 practice tests, 1000 seeds на каждый generator и полная существующая dashboard regression matrix;
- отдельный GitHub Actions quality gate.

---

## 1. Цель

Создать общую систему интервального повторения для персональных кабинетов учеников в `students/<student>/site/index.html`, которая:

1. определяет, какие компетенции ученику пора повторить;
2. формирует короткую ежедневную тренировочную сессию;
3. генерирует новый вариант упражнения для выбранной компетенции;
4. проверяет ответ там, где это возможно детерминированно;
5. учитывает результат, подсказки и субъективную сложность;
6. рассчитывает следующую дату повторения;
7. сохраняет состояние независимо от существующего уровня освоения 0–4;
8. учитывает ручную очередь `reviewQueue`, уже используемую картой компетенций;
9. интегрируется с общим `shared/student-dashboard` без копирования бизнес-логики по каталогам учеников;
10. допускает последующую замену `localStorage` на backend-хранилище без переделки scheduler/UI;
11. допускает последующую замену простого интервального алгоритма на FSRS-подобную модель без миграции UI и генераторов.

Ключевой пользовательский результат: `index.html` становится ежедневной точкой входа ученика — открыть кабинет, выполнить 5–7 релевантных упражнений за 5–15 минут, получить мгновенную обратную связь, обновить очередь повторения.

---

## 2. Текущее состояние, на которое опирается план

### 2.1. Общий dashboard

В `shared/student-dashboard/` уже существуют:

- `dashboard-core.js`;
- `dashboard-shell.css`;
- `legacy-competence-map.js`;
- `test-dashboard.mjs`;
- `test-index-inventory.mjs`.

`dashboard-core.js` отвечает за lesson registry, сайдбар, архив занятий, тему, summary heatmap и shell-поведение.

`legacy-competence-map.js` содержит доменную модель карты компетенций:

- `STATE_SCHEMA_VERSION=2`;
- уровни 0–4;
- миграцию legacy state;
- `studentLevels`;
- `reviewQueue`;
- teacher seed;
- фильтры;
- summary;
- UI карты и диалога компетенции.

### 2.2. Student adapters

Для мигрированных кабинетов используется тонкий локальный adapter. Например, у Ксении `students/xenia_klykova/site/dashboard.js` только импортирует `LESSONS` и `initStudentDashboard(...)`.

Это архитектурно подходящая точка для подключения общего Practice Engine: общая логика должна жить в `shared/`, а student-specific конфигурация — рядом с `competence-config.js` / `lesson-registry.js`.

### 2.3. Компетенции

Уже есть устойчивые `competencyId`, например:

- `t5_product`;
- `t5_sum`;
- `t5_complement`;
- `t5_bernoulli`;
- `t5_combinatorics`;
- `t2_coordinates`;
- `t2_length`;
- `t10_work`;
- `t10_trains` и т. д.

Эти ID должны стать главным foreign key для системы повторения.

### 2.4. Ручная очередь

`reviewQueue` уже существует отдельно от `studentLevels`, что следует сохранить. Он будет использоваться как teacher/manual priority override поверх автоматического scheduler.

### 2.5. CI

Основной workflow `.github/workflows/student-dashboard-tests.yml` использует Node 22 и запускает:

- syntax check dashboard modules;
- student-specific dashboard regression suites;
- `shared/student-dashboard/test-index-inventory.mjs`.

Система интервального повторения должна быть добавлена в этот quality gate.

---

## 3. Основные архитектурные решения

### ADR-1. Mastery и scheduling — разные состояния

`studentLevels` отвечает на вопрос «насколько навык освоен».

Practice state отвечает на вопрос «когда и как проверить навык снова».

Не расширять семантику уровня 0–4 до scheduling-состояния.

Причины:

- mastery и forgetting curve меняются независимо;
- навык уровня 4 всё равно должен периодически проверяться;
- ошибка на повторении не должна автоматически превращать уровень 4 в уровень 1;
- scheduler можно заменять без миграции heatmap state.

### ADR-2. Расписание строится по competencyId, а не по конкретным заданиям

SRS хранит состояние компетенции. При наступлении `dueAt` Exercise Engine создаёт новый вариант задачи.

Следствие: одна компетенция может быть проверена сотнями разных задач без разрастания schedule state.

### ADR-3. Runtime-генерация первой версии детерминированная

MVP не использует внешний LLM API в браузере.

Причины:

- воспроизводимость;
- отсутствие API-ключей;
- отсутствие сетевой зависимости;
- предсказуемая математическая корректность;
- возможность unit/property tests;
- GitHub Pages остаётся статическим.

LLM может использоваться offline/pipeline для подготовки curated bank или generator templates, но runtime engine должен уметь работать полностью локально.

### ADR-4. Seed обязателен

Каждое упражнение генерируется по детерминированному seed.

Минимальные входы seed:

- student namespace;
- competencyId;
- session date;
- attempt ordinal;
- generator version.

Это позволяет воспроизвести конкретное упражнение преподавателю и тестам.

### ADR-5. Storage через adapter

Practice Engine не должен напрямую зависеть от `localStorage` в бизнес-логике.

Интерфейс:

- `load()`;
- `save(state)`;
- при необходимости `clear()`.

Первая реализация: `LocalStoragePracticeStorage`.

Будущий adapter: HTTP/API storage в `tutor-assistant-web`.

### ADR-6. Первый алгоритм — простой и прозрачный

Не внедрять FSRS в первом релизе.

Использовать дискретные интервальные ступени с корректировкой по результату. Состояние проектировать так, чтобы позднее можно было добавить stability/difficulty без изменения UI.

### ADR-7. Генераторы регистрируются централизованно

Student config хранит ссылку на generator key, но сам generator находится только в `shared/practice/generators/`.

Это исключает копирование генераторов между учениками.

### ADR-8. Ручная очередь сильнее автоматической даты

Если преподаватель включил competencyId в `reviewQueue`, она имеет повышенный приоритет при формировании ближайшей тренировочной сессии независимо от обычного `dueAt`.

### ADR-9. Уровень 0 не активируется автоматически

Компетенция со `studentLevel=0` не должна появляться в spaced practice до явной активации через урок/config/manual override.

Причина: повторение не должно знакомить ученика с ещё не изученной темой случайно.

### ADR-10. Первая пилотная интеграция — один migrated dashboard

Пилот: `students/xenia_klykova/site/index.html`.

Причины:

- shared dashboard уже используется;
- competence config содержит хорошо оформленные teacherSeed/evidence;
- есть свежий кластер вероятностных компетенций;
- генераторы вероятности хорошо поддаются детерминированной генерации и автопроверке.

После успешного пилота engine распространяется на остальные migrated dashboards.

---

## 4. Предлагаемая структура файлов

```text
shared/
├── student-dashboard/
│   ├── dashboard-core.js
│   ├── dashboard-shell.css
│   ├── legacy-competence-map.js
│   ├── test-dashboard.mjs
│   └── test-index-inventory.mjs
│
└── practice/
    ├── practice-engine.js
    ├── practice-state.js
    ├── practice-scheduler.js
    ├── practice-selector.js
    ├── practice-storage.js
    ├── practice-ui.js
    ├── practice.css
    ├── random.js
    ├── generator-registry.js
    ├── answer-engine.js
    ├── test/
    │   ├── state.test.mjs
    │   ├── scheduler.test.mjs
    │   ├── selector.test.mjs
    │   ├── random.test.mjs
    │   ├── answer-engine.test.mjs
    │   ├── generator-contract.test.mjs
    │   └── integration.test.mjs
    └── generators/
        ├── probability/
        │   ├── classical.js
        │   ├── independent-product.js
        │   ├── disjoint-sum.js
        │   ├── complement.js
        │   ├── bernoulli.js
        │   └── combinatorics.js
        ├── vectors/
        │   ├── coordinates.js
        │   ├── length.js
        │   ├── operations.js
        │   └── dot-product.js
        ├── algebra/
        │   ├── powers.js
        │   ├── radicals.js
        │   ├── linear-equations.js
        │   └── quadratic-equations.js
        └── word-problems/
            ├── motion.js
            ├── work.js
            └── mixtures.js
```

Student-specific additions:

```text
students/xenia_klykova/site/
├── competence-config.js
├── lesson-registry.js
├── practice-config.js        # новый
├── dashboard.js
└── index.html
```

После стабилизации допускается объединить `practice-config.js` с `competence-config.js`, если это не ухудшает поддержку. Для MVP отдельный файл предпочтительнее, поскольку снижает риск регрессий карты компетенций.

---

## 5. Data contracts

## 5.1. PracticeState v1

Предлагаемая схема:

```js
{
  schemaVersion: 1,
  updatedAt: '2026-08-31T12:00:00.000Z',
  competencies: {
    t5_bernoulli: {
      status: 'active',
      activatedAt: '2026-08-28T00:00:00.000Z',
      dueAt: '2026-09-01',
      intervalStep: 2,
      intervalDays: 3,
      attempts: 4,
      correct: 3,
      streak: 2,
      lapses: 1,
      hintsUsedTotal: 2,
      lastAttemptAt: '2026-08-31T09:12:00.000Z',
      lastRating: 'good',
      lastOutcome: 'correct',
      lastExerciseSeed: '...',
      lastGeneratorKey: 'probability.bernoulli',
      lastGeneratorVersion: 1
    }
  },
  sessions: {
    '2026-08-31': {
      startedAt: '...',
      completedAt: '...',
      status: 'completed',
      exerciseIds: ['...'],
      correct: 4,
      total: 5
    }
  }
}
```

### Ограничения

- `schemaVersion` обязателен;
- неизвестные поля должны безопасно игнорироваться для forward compatibility;
- отсутствующие поля нормализуются default-функцией;
- некорректный JSON не должен ломать dashboard;
- state migration должна быть идемпотентной;
- запись нового practice state не должна менять competence state v2.

## 5.2. Practice config

```js
export const PRACTICE_CONFIG = {
  studentId: 'xenia_klykova',
  storageKey: 'xenia-practice-state-v1',
  dailyTarget: 5,
  dailyMax: 7,
  maxPerGroup: 2,
  competencies: {
    t5_product: {
      generator: 'probability.independent-product',
      difficulty: [1, 2],
      active: true
    },
    t5_sum: {
      generator: 'probability.disjoint-sum',
      difficulty: [1, 2],
      active: true
    },
    t5_complement: {
      generator: 'probability.complement',
      difficulty: [1, 2, 3],
      active: true
    },
    t5_bernoulli: {
      generator: 'probability.bernoulli',
      difficulty: [1, 2, 3],
      active: true
    },
    t5_combinatorics: {
      generator: 'probability.combinatorics',
      difficulty: [1, 2],
      active: true
    }
  }
};
```

## 5.3. Generator contract

```js
{
  key: 'probability.bernoulli',
  version: 1,
  competencyIds: ['t5_bernoulli'],
  generate({seed, difficulty, locale}) => Exercise
}
```

`Exercise`:

```js
{
  exerciseId: 'probability.bernoulli:v1:<seed>',
  competencyId: 't5_bernoulli',
  generatorKey: 'probability.bernoulli',
  generatorVersion: 1,
  seed: '...',
  difficulty: 2,
  prompt: '...',
  answerSpec: {...},
  hints: [
    {level: 1, text: '...'},
    {level: 2, text: '...'},
    {level: 3, text: '...'}
  ],
  solution: [...],
  metadata: {
    topic: 'Схема Бернулли',
    expectedSeconds: 120
  }
}
```

Generator не изменяет storage и не обращается к DOM.

## 5.4. AnswerSpec

Первая поддерживаемая матрица:

```text
number
integer
fraction
choice
multi-choice
ordered-pair
vector
```

Следующая очередь:

```text
expression
set
interval
inequality
```

Пример fraction:

```js
{
  type: 'fraction',
  numerator: 5,
  denominator: 16,
  acceptDecimal: true,
  tolerance: 1e-9
}
```

Нормализация должна принимать эквивалентные формы, например `5/16`, `10/32`, `0.3125`.

---

## 6. Scheduler v1

## 6.1. Базовые интервалы

Базовая последовательность:

```js
[1, 3, 7, 14, 30, 60, 120]
```

## 6.2. Rating

UI предоставляет четыре машинных результата:

- `again` — ошибка или почти полная зависимость от подсказок;
- `hard` — верно с существенным затруднением/подсказками;
- `good` — верно самостоятельно в ожидаемом режиме;
- `easy` — верно быстро и уверенно.

Фактическое отображение для ученика можно сделать более педагогичным:

- «Повторить»;
- «Было сложно»;
- «Нормально»;
- «Легко».

## 6.3. Переходы

MVP:

```text
again -> step 0 / due +1 день / lapses +1 / streak=0
hard  -> интервал примерно max(1, current*1.5), без перескока более чем на 1 step
good  -> следующий step
easy  -> +2 steps, но не выше последнего
```

Округление интервалов должно быть детерминированным.

## 6.4. Mastery multiplier

Mastery влияет только на начальный/минимальный интервал и выбор difficulty, но не перезаписывается scheduler автоматически.

Базовая политика:

```text
level 0 -> не активировать автоматически
level 1 -> старт 1 день, difficulty 1
level 2 -> старт 1 день, difficulty 1–2
level 3 -> старт 3 дня, difficulty 2
level 4 -> старт 7 дней, difficulty 2–3
```

Если ученик проваливает несколько повторений подряд, Practice Engine создаёт сигнал/метрику `repeatedLapse`, но автоматическое снижение heatmap level в MVP не выполняется.

## 6.5. Даты и timezone

Scheduler оперирует учебной локальной календарной датой `YYYY-MM-DD`, а timestamps хранит в ISO.

Требование: выбор due-items не должен зависеть от UTC-перехода около полуночи.

Для статического MVP `todayProvider` должен инъектироваться и получать локальную дату браузера. Тесты используют фиксированный provider.

---

## 7. Daily Selector

Цель: сформировать 5–7 заданий, обеспечивая retrieval practice и interleaving.

## 7.1. Кандидаты

Порядок формирования candidate pool:

1. manual `reviewQueue`;
2. overdue competencies;
3. due today;
4. слабые активные навыки уровня 1–2, давно не проверявшиеся;
5. контрольные навыки уровня 3–4, давно не проверявшиеся;
6. optional fresh practice после урока, если session quota ещё не набрана.

## 7.2. Приоритет

Предлагаемый score:

```text
manual review override             +1000
overdue days                        +10 * days (cap)
level 1                             +80
level 2                             +50
level 3                             +20
level 4                             +10
recent lapse                        +60
not practiced before                +40
same group already selected         -penalty
same competency already selected    forbidden
```

Конкретные числа должны быть вынесены в scheduler config и покрыты tests, а не разбросаны по UI.

## 7.3. Interleaving constraints

- максимум 2 упражнения из одной competency group в daily session;
- одна competencyId не повторяется в одной обычной сессии;
- исключение: после ошибки optional immediate remediation может дать второе упражнение той же компетенции, но с новым seed;
- remediation не должна бесконечно удлинять session;
- hard cap упражнений за одну сессию: `dailyMax + remediationMax`.

## 7.4. Stable daily session

Если пользователь обновляет страницу в середине сессии, список упражнений текущего дня не должен случайно изменяться.

Поэтому при старте сессии фиксируются:

- выбранные competencyIds;
- seed каждого упражнения;
- generator version;
- порядок.

Reload восстанавливает незавершённую session.

---

## 8. Exercise Engine

## 8.1. Registry

```js
registerGenerator(generator)
getGenerator(key)
validateRegistry()
```

Startup validation:

- key unique;
- version integer > 0;
- `generate` function;
- competency mapping valid;
- config не ссылается на отсутствующий generator.

## 8.2. Random API

Нельзя использовать `Math.random()` внутри генераторов.

Создать seeded PRNG utility:

```js
createRandom(seed)
random.int(min, max)
random.pick(array)
random.shuffle(array)
random.bool(probability)
```

Property: одинаковый seed + generator version => одинаковое упражнение.

## 8.3. Generator invariants

Каждый generator обязан удовлетворять:

- задача имеет решение;
- решение однозначно в рамках answerSpec либо явно содержит множество допустимых ответов;
- числа попадают в указанный difficulty-range;
- denominator != 0;
- невозможные физические/математические комбинации не генерируются;
- текст и answerSpec согласованы;
- hint/solution вычисляются из тех же исходных параметров, а не из отдельной копии логики.

## 8.4. Первые генераторы пилота

### Probability

1. `probability.independent-product`
   - независимые события;
   - серия одинаковых испытаний;
   - простые дроби;
   - контексты: монета, кубик, стрельба, контроль качества.

2. `probability.disjoint-sum`
   - сумма несовместимых сценариев;
   - ровно одна позиция успеха;
   - короткий организованный перебор.

3. `probability.complement`
   - «хотя бы один»;
   - `1 - P(ни одного)`;
   - контроль диапазона ответа `[0,1]`.

4. `probability.bernoulli`
   - `n`, `k`, `p`;
   - `C_n^k p^k(1-p)^(n-k)`;
   - ограничивать значения, чтобы ответ оставался вычислимым школьными средствами.

5. `probability.combinatorics`
   - факториалы;
   - `C_n^k`;
   - сокращение близких факториалов.

После пилота:

### Vectors

- coordinates;
- length;
- operations;
- dot product;
- angle (с контролируемыми значениями).

### Algebra

- powers;
- radicals;
- linear/quadratic equations;
- рациональные вычисления.

### Word problems

- motion;
- relative speed;
- work;
- mixtures/alloys.

---

## 9. Answer Engine

## 9.1. API

```js
validateAnswer(spec, rawInput) => {
  status: 'correct' | 'incorrect' | 'invalid',
  normalizedInput,
  expectedDisplay,
  diagnostics
}
```

`invalid` используется для синтаксически непонятного ввода и не считается учебной ошибкой до явной отправки допустимого ответа.

## 9.2. Безопасность

Нельзя использовать `eval`, `Function` или произвольное выполнение ученического выражения.

Expression parser, если будет добавлен, должен быть ограниченным математическим parser с whitelist operators/functions.

## 9.3. Числовые ответы

- locale-friendly decimal comma;
- ведущие/хвостовые пробелы;
- дроби;
- reduced/non-reduced fractions;
- tolerance только там, где это явно разрешено spec.

## 9.4. Ошибки

Answer Engine не должен показывать полный solution сразу после первого неправильного ответа.

Предлагаемый flow:

1. первая ошибка — короткий диагностический hint;
2. вторая ошибка — hint level 2;
3. третья ошибка / «показать решение» — полный разбор;
4. scheduling rating учитывает число попыток и hints.

---

## 10. Practice UI

## 10.1. Placement

Для migrated dashboard новый блок размещается между `lesson-summary` и `map-section`.

Порядок страницы:

```text
Последнее занятие
↓
Повторение на сегодня
↓
Карта компетенций
↓
footer
```

## 10.2. Collapsed card

Минимальный вид:

```text
Повторение на сегодня
5 заданий · ~8 минут
2 просрочено · 2 слабых навыка · 1 контрольное
[Начать тренировку]
```

Если due=0:

```text
На сегодня всё ✓
Следующая проверка: <дата>
```

Не генерировать искусственные упражнения только ради заполнения UI, если активных компетенций недостаточно.

## 10.3. Session view

Показывать по одному упражнению:

- progress `2 / 5`;
- название компетенции;
- prompt;
- answer input;
- submit;
- hint;
- feedback;
- после проверки — rating;
- `Следующее`.

Не раскрывать ответ до завершения попытки.

## 10.4. Completion view

Показывать:

- `correct / total`;
- использованные подсказки;
- competency needing attention;
- следующую ближайшую due-date;
- CTA к карте компетенций.

## 10.5. Competency dialog integration

В существующий dialog карты добавить сведения:

- `В повторении: сегодня / через N дней / не активно`;
- `Последняя попытка`;
- `Последний результат`;
- `Решить сейчас` при наличии generator.

Текущая кнопка `Добавить в повторение` сохраняется и остаётся teacher/manual override.

## 10.6. Accessibility

Обязательные требования:

- keyboard complete;
- корректные labels;
- `aria-live` только для существенного feedback;
- focus после перехода к следующему упражнению переводится на heading/prompt;
- hint не должен неожиданно менять focus;
- dialog/focus trap existing behavior не ломается;
- status нельзя кодировать только цветом;
- reduced-motion friendly;
- mobile width >= 320px.

---

## 11. Lesson → competency → practice activation

## 11.1. Расширение lesson registry

Добавить optional machine-readable связи:

```js
outcomes: [
  {
    competencyId: 't5_bernoulli',
    label: 'Схема Бернулли',
    level: 2,
    tone: 'process'
  }
]
```

Backward compatibility: `competencyId` optional, старые lesson records продолжают работать.

## 11.2. Activation

При инициализации Practice Engine:

- прочитать configured competencies;
- найти lesson outcomes с competencyId;
- определить первую известную дату изучения;
- активировать только configured competency;
- не перезаписывать существующий progress;
- activation migration должна быть идемпотентной.

Для MVP допустимо первоначальное explicit `active:true` в `practice-config.js`; lesson auto-activation вводить отдельной фазой после подтверждения contracts.

## 11.3. Pipeline

Добавить `pipeline/prompts/04_spaced_practice.md` после существующих content/web stages.

Назначение prompt:

- извлечь реально затронутые competency IDs;
- запрещать создавать несуществующие IDs;
- предложить generator mapping только из registry;
- обновлять lesson outcome metadata;
- не изменять practice history;
- не изменять mastery без evidence;
- выводить migration-safe patch plan.

Автоматическое изменение production practice config pipeline-ом вводить только после статической validation.

---

## 12. Storage и миграции

## 12.1. Key namespace

Не использовать один общий key для всех учеников.

Примеры:

```text
xenia-practice-state-v1
timofey-practice-state-v1
sofya-practice-state-v1
```

## 12.2. Failure mode localStorage unavailable

Practice UI должен деградировать безопасно:

- задача может быть показана;
- persistence warning без блокировки всего dashboard;
- heatmap и lessons продолжают работать;
- не падать при SecurityError/QuotaExceededError.

## 12.3. Corrupted state

При некорректном JSON:

- не уничтожать competence state;
- восстановить нормализованный practice state;
- желательно сохранить diagnostic marker в памяти/console только в development context;
- не показывать технический stack trace ученику.

## 12.4. Future backend migration

Storage interface должен позволить:

```text
LocalStoragePracticeStorage
       ↓
ApiPracticeStorage
```

Будущий server-side state должен иметь optimistic concurrency/version field, чтобы избежать silent overwrite между телефоном и ПК.

В текущем статическом MVP синхронизация между устройствами отсутствует и должна быть явно зафиксирована как ограничение.

---

## 13. Тестовая стратегия

## 13.1. Unit — scheduler

Проверить:

- новый уровень 1 получает due +1;
- новый level 4 получает более длинный стартовый интервал;
- `again` сбрасывает streak;
- `again` увеличивает lapse;
- `good` двигает step;
- `easy` перескакивает допустимое число ступеней;
- max interval clamp;
- due date не зависит от времени суток;
- deterministic today provider;
- malformed state normalization.

## 13.2. Unit — selector

Проверить:

- manual review выше обычного due;
- overdue выше future;
- future competency не выбирается без override;
- level 0 не выбирается автоматически;
- maxPerGroup;
- duplicate competency запрещён;
- quota работает при недостатке кандидатов;
- deterministic order при одинаковом seed/date;
- repeated lapse повышает priority.

## 13.3. Unit/property — PRNG

- одинаковый seed => одинаковая последовательность;
- разные seed статистически дают разные варианты;
- range boundaries соблюдаются;
- pick не возвращает элемент вне массива.

## 13.4. Generator contract tests

Для каждого generator прогнать минимум 500–1000 seed в CI или разделить fast/full suites.

Проверки:

- генерация не throws;
- answerSpec valid;
- validator принимает эталонный ответ;
- denominator nonzero;
- finite numbers;
- prompt nonempty;
- solution nonempty;
- competencyId declared;
- generator key/version stable.

## 13.5. Mathematical regression tests

Probability:

- Bernoulli formula cross-check независимой реализацией test helper;
- probability in `[0,1]`;
- combinatorial coefficients integer;
- complement = `1 - none`;
- sum/product templates соответствуют условию.

Vectors:

- coordinates = end-start;
- length >=0;
- dot product exact;
- generated angle cases domain-safe.

Word problems:

- positive speed/time/distance;
- no division by zero;
- generated scenario physically coherent.

## 13.6. Answer Engine

Проверить:

- decimal comma;
- equivalent fractions;
- whitespace;
- invalid input;
- tolerance boundaries;
- malformed fraction;
- zero denominator rejected;
- negative values where allowed;
- no executable JS evaluation.

## 13.7. Storage/migration

- empty storage;
- valid v1;
- corrupted JSON;
- missing fields;
- unknown future fields;
- repeated migration idempotent;
- storage write failure;
- competence state untouched.

## 13.8. UI integration

Static/DOM regression должна проверить:

- practice section существует в migrated pilot;
- required IDs/classes unique;
- modules resolve;
- start/submit/hint/rating controls;
- no inline duplicated engine;
- accessibility labels;
- index still contains map and lesson shells;
- dashboard init failure в practice не должен ломать lessons/map.

## 13.9. Existing regression suite

После каждой фазы должны продолжать проходить существующие:

```bash
node shared/student-dashboard/test-dashboard.mjs
node shared/student-dashboard/test-index-inventory.mjs
node students/xenia_klykova/site/tests/dashboard-regression.mjs
```

А на полном rollout — matrix всех student dashboard tests из GitHub Actions.

---

## 14. CI plan

Расширить `.github/workflows/student-dashboard-tests.yml`.

Добавить syntax checks:

```bash
node --check shared/practice/practice-engine.js
node --check shared/practice/practice-state.js
node --check shared/practice/practice-scheduler.js
node --check shared/practice/practice-selector.js
node --check shared/practice/practice-storage.js
node --check shared/practice/practice-ui.js
node --check shared/practice/answer-engine.js
node --check shared/practice/generator-registry.js
```

Добавить tests:

```bash
node --test shared/practice/test/*.test.mjs
```

Если Node wildcard поведение окажется неодинаковым, перечислить suite через shell glob в bash или создать единый `run-tests.mjs`.

Workflow paths расширить:

```yaml
- 'shared/practice/**'
- 'pipeline/prompts/04_spaced_practice.md'
```

После rollout добавить проверки каждого student `practice-config.js`:

- syntax;
- competency IDs существуют в catalog;
- generator keys существуют в registry;
- нет duplicate mapping;
- storageKey уникален.

---

## 15. Реализация по фазам

# Phase 0 — Contracts and regression baseline

### Цель

Зафиксировать существующие contracts перед изменением UI.

### Изменения

1. Добавить `shared/practice/` skeleton.
2. Зафиксировать data schemas в code comments/tests.
3. Добавить contract validation helper.
4. Не менять ни один student index.
5. Расширить CI paths/checks.

### Acceptance criteria

- существующие dashboard tests проходят без изменений поведения;
- practice modules импортируются в Node;
- отсутствует side effect при import;
- schemas покрыты unit tests.

---

# Phase 1 — State + Scheduler + Selector

### Цель

Получить полностью протестированную бизнес-логику без DOM.

### Изменения

- `practice-state.js`;
- `practice-storage.js`;
- `practice-scheduler.js`;
- `practice-selector.js`;
- `random.js`.

### Acceptance criteria

- deterministic tests;
- manual review priority;
- due/overdue selection;
- interleaving constraints;
- reload-safe session model;
- corrupted storage recovery;
- competence state isolation.

---

# Phase 2 — Generator framework + Answer Engine

### Цель

Создать безопасный детерминированный генераторный framework.

### Изменения

- registry;
- generator contract validator;
- answer engine;
- 5 probability generators;
- mass-seed regression tests.

### Acceptance criteria

- 1000 seed на generator без invalid exercise;
- reference answer всегда принимается validator;
- одинаковый seed полностью воспроизводим;
- нет `Math.random()` в generators;
- нет `eval`/`Function` для answer parsing.

---

# Phase 3 — Pilot config: Xenia

### Цель

Связать существующие `t5_*` competency IDs с generators.

### Изменения

Создать:

`students/xenia_klykova/site/practice-config.js`

Первые competencies:

- `t5_product`;
- `t5_sum`;
- `t5_complement`;
- `t5_bernoulli`;
- `t5_combinatorics`.

### Acceptance criteria

- все IDs реально присутствуют в catalog;
- all generator mappings resolve;
- no change to heatmap levels;
- existing evidence links remain intact.

---

# Phase 4 — Practice UI pilot

### Цель

Добавить рабочую daily session в Xenia `index.html`.

### Изменения

- practice section markup;
- shared `practice.css`;
- `practice-ui.js`;
- adapter init в student `dashboard.js` или новом `practice.js`;
- status linkage к competence map.

Предпочтительный startup:

```js
initStudentDashboard(...)
initPracticeDashboard(...)
```

Два init должны быть изолированы: ошибка practice init не должна ломать основной dashboard.

### Acceptance criteria

- 5 упражнений формируются;
- reload продолжает session;
- ответ проверяется;
- hint flow работает;
- rating обновляет scheduler;
- completion summary показывается;
- storage state воспроизводим;
- keyboard/mobile accessibility.

---

# Phase 5 — Competency dialog integration

### Цель

Сделать heatmap и practice единой learning map.

### Изменения

В карточку компетенции добавить:

- schedule status;
- last attempt;
- next due;
- practice CTA.

### Acceptance criteria

- существующий level picker работает без изменений;
- `reviewQueue` semantics сохранена;
- ручной override немедленно отражается в practice candidate pool;
- нет circular import между map и practice modules.

---

# Phase 6 — Lesson outcome linking

### Цель

Убрать ручное дублирование активации новых изученных компетенций.

### Изменения

- добавить optional `competencyId` в lesson outcomes;
- registry validation;
- activation helper;
- idempotent sync.

### Acceptance criteria

- старые lesson records остаются валидными;
- новая связь machine-readable;
- повторный запуск sync не сбрасывает interval progress;
- удаление старого lesson record не уничтожает history.

---

# Phase 7 — Pipeline support

### Цель

Связать post-lesson content pipeline с practice metadata.

### Изменения

- `pipeline/prompts/04_spaced_practice.md`;
- validation utility для generated mappings;
- documentation rules.

### Acceptance criteria

- pipeline не создаёт arbitrary competency IDs;
- generator keys валидируются;
- generated config patch не трогает history;
- manual review before applying remains possible.

---

# Phase 8 — Rollout to migrated dashboards

Целевые кабинеты по текущему inventory:

- `kirill_zinoviev`;
- `sofya_kalney`;
- `timofey`;
- `volodia_khachaturian`;
- `xenia_klykova`.

Для каждого:

1. определить релевантные competency IDs;
2. добавить practice config;
3. подключить shared practice UI;
4. добавить initial generator mappings;
5. прогнать student regression;
6. проверить mobile/keyboard manually или e2e при появлении браузерного harness.

### Acceptance criteria

- shared engine один;
- student-specific code содержит только config/adaptation;
- storageKey unique;
- no copied generator code.

---

# Phase 9 — Legacy dashboards

Отдельно спланировать миграцию:

- `nikol_sarkisyants` — собственная dashboard architecture/test suite;
- `nastya_pavlova` — неполная/иная миграция;
- `xenia_klykova/chemistry` — отдельный предметный кабинет.

Не внедрять Practice Engine туда через ad-hoc duplicated UI.

Сначала либо:

1. мигрировать dashboard shell на общий contract;

либо

2. создать официально поддерживаемый adapter interface.

Решение принять после pilot + migrated rollout.

---

# Phase 10 — Generator coverage expansion

Приоритет генераторов выбирать по фактическим competence maps и частоте уроков.

Предлагаемый порядок:

1. probability;
2. vectors;
3. powers/radicals;
4. linear/quadratic equations;
5. motion/work/mixtures;
6. basic graph reading;
7. inequalities;
8. geometry curated bank;
9. physics;
10. chemistry.

Не ставить цель «генератор для каждой компетенции» до появления качественного answer contract.

Для геометрии и сложных доказательных задач использовать curated bank раньше полного procedural generator.

---

## 16. Curated bank contract

Для задач, которые трудно безопасно генерировать алгоритмически:

```js
{
  bankKey: 'geometry.right-triangle.circumradius',
  version: 1,
  competencyIds: [...],
  items: [
    {
      id: '...',
      prompt: '...',
      answerSpec: {...},
      hints: [...],
      solution: [...],
      difficulty: 2
    }
  ]
}
```

Selector выбирает item детерминированно по seed и избегает недавних повторов.

Bank data должен проходить schema validation в CI.

---

## 17. Difficulty model

MVP difficulty: integer `1..3`.

### Difficulty 1

- один основной навык;
- простые числа;
- минимум вычислительного шума;
- прямое применение правила.

### Difficulty 2

- один навык + интерпретация условия;
- более разнообразные числа;
- 2–4 вычислительных шага.

### Difficulty 3

- mixed/subtle version;
- необходимость выбора метода;
- дополнительные distractors/условия;
- остаётся в рамках competency contract.

Выбор difficulty:

```text
level 1 -> mostly 1
level 2 -> 1–2
level 3 -> mostly 2
level 4 -> 2–3
recent lapse -> -1 difficulty for remediation
streak/easy -> optional +1
```

Difficulty не должна расти бесконтрольно только из-за длинного интервала.

---

## 18. Pedagogical event model

Каждая завершённая попытка формирует event:

```js
{
  eventVersion: 1,
  timestamp: '...',
  sessionId: '...',
  exerciseId: '...',
  competencyId: '...',
  generatorKey: '...',
  generatorVersion: 1,
  seed: '...',
  difficulty: 2,
  attemptCount: 2,
  hintsUsed: 1,
  outcome: 'correct',
  rating: 'hard',
  durationMs: 84000
}
```

Для MVP не обязательно хранить бесконечный event log в localStorage. Возможные стратегии:

- хранить последние N events;
- агрегировать counters;
- сохранять последний event per competency.

Рекомендуемый MVP: capped history 100–200 events + aggregate state.

Причина: пригодится для диагностики scheduler и будущей backend migration без unbounded localStorage growth.

---

## 19. Resource limits

Practice Engine должен иметь bounded state.

Ограничить:

- sessions history;
- event history;
- generated exercise cache;
- remediation attempts;
- daily exercise count.

Не сохранять полный HTML prompt/solution в history, если exercise воспроизводится по generator version + seed.

Сохранять только идентификаторы и результат.

---

## 20. Security / privacy

Репозиторий и GitHub Pages статические; student data в текущей модели находится в browser storage.

Требования:

- не добавлять секреты/API keys;
- не отправлять ответы ученика внешним сервисам в MVP;
- не использовать third-party analytics без отдельного решения;
- user input выводить через `textContent`, а не `innerHTML`;
- generator prompt может содержать trusted static markup только через контролируемый renderer;
- answer parser без eval;
- future backend должен обеспечивать authz/tenant isolation server-side.

При backend rollout персональные результаты не должны попадать в публичный Git repository.

---

## 21. Reliability / error isolation

Practice Engine не является причиной недоступности основного учебного кабинета.

Инициализация должна иметь boundary:

```text
lesson/dashboard shell — работает
competence map         — работает
practice               — при ошибке показывает локальный fallback
```

Ошибки generator registry/config должны обнаруживаться CI. Runtime fallback нужен для corrupted local state/storage/environment failure.

---

## 22. Backward compatibility

Обязательные сохранённые контракты:

- существующие student URLs;
- lesson page URLs;
- heatmap levels 0–4;
- current competence state v2;
- `reviewQueue`;
- teacherSeed;
- evidence links;
- old lesson registry records;
- theme storage keys;
- dashboard accessibility behavior.

Запрещено в рамках feature:

- массово переименовывать competency IDs;
- менять смысл уровня 0–4;
- сбрасывать current localStorage;
- удалять legacy fallback pages;
- заменять student dashboard architecture одновременно с Practice Engine rollout.

---

## 23. Rollout strategy

### Stage A — hidden engine

- business logic + tests;
- UI ещё не подключён.

### Stage B — Xenia pilot

- visible practice card;
- probability only;
- localStorage only.

### Stage C — stabilization

- исправление реальных generator/scheduler проблем;
- подтверждение reload/session persistence;
- UX polishing.

### Stage D — migrated dashboards

- подключение общего UI;
- добавление generator mappings по текущим темам.

### Stage E — lesson pipeline automation

- competency mapping from lesson registry;
- prompt support.

### Stage F — legacy/other subjects

- Nikol/Nastya/chemistry после архитектурной унификации.

### Stage G — backend sync

- только при реальной потребности в multi-device history/teacher analytics.

---

## 24. Feature flags

Для безопасного rollout student config должен иметь:

```js
enabled: true | false
```

Дополнительно:

```js
features: {
  remediation: true,
  competencyDialogStatus: true,
  lessonAutoActivation: false
}
```

Это позволит включать функции поэтапно без ветвления shared code.

---

## 25. Observability без внешней аналитики

MVP может иметь локальный debug summary, доступный разработчику через pure function:

```js
getPracticeDiagnostics(state, config)
```

Возвращает:

- active count;
- due count;
- overdue count;
- invalid config count;
- last session;
- storage schema version.

Не выводить подробный debug UI ученику.

---

## 26. Отдельные quality gates перед rollout

### Gate 1 — Scheduler correctness

Все state/scheduler/selector unit tests green.

### Gate 2 — Generator correctness

Mass-seed tests green, reference answer validation green.

### Gate 3 — Existing dashboard compatibility

Current dashboard matrix green.

### Gate 4 — Pilot UI

Xenia regression + accessibility/static checks green.

### Gate 5 — Persistence

Manual/browser check reload/reopen session.

### Gate 6 — Multi-student rollout

Каждый config validated against catalog + registry.

---

## 27. Browser/manual verification checklist

Для пилота проверить минимум:

1. первый вход без practice state;
2. начало сессии;
3. правильный ответ;
4. неправильный ответ;
5. hint 1/2/3;
6. rating;
7. переход следующего упражнения;
8. reload на упражнении 3/5;
9. reload после submit до rating;
10. завершение session;
11. повторное открытие в тот же день;
12. наступление следующего due date через injected/test date;
13. manual reviewQueue override;
14. localStorage unavailable simulation;
15. corrupted state;
16. mobile layout;
17. keyboard-only;
18. light/dark theme;
19. dialog карты компетенций;
20. existing lesson navigation/archive.

---

## 28. Proposed implementation commits

Предпочтительно маленькие проверяемые commits:

1. `practice: add state and storage contracts`
2. `practice: add scheduler and daily selector`
3. `practice: add seeded random and generator registry`
4. `practice: add answer validation engine`
5. `practice: add probability generators`
6. `ci: run shared practice regression suite`
7. `xenia: add spaced-practice configuration`
8. `practice: add shared daily session UI`
9. `xenia: integrate daily practice into dashboard`
10. `practice: expose schedule state in competency dialog`
11. `lessons: link outcomes to competency ids`
12. `pipeline: add spaced-practice metadata stage`
13. `practice: roll out shared UI to migrated dashboards`
14. `docs: document practice architecture and operations`

Не объединять generator framework, UI и multi-student rollout в один огромный commit.

---

## 29. Definition of Done для MVP

MVP считается завершённым, когда:

- [ ] shared Practice Engine существует отдельно от student pages;
- [ ] PracticeState v1 имеет migration/normalization tests;
- [ ] scheduler deterministic;
- [ ] selector учитывает due/overdue/manual review/interleaving;
- [ ] seeded generator framework работает;
- [ ] answer engine не использует executable parsing;
- [ ] минимум 5 probability generators покрыты массовыми tests;
- [ ] Xenia `index.html` показывает daily practice;
- [ ] session восстанавливается после reload;
- [ ] rating обновляет next due;
- [ ] practice state не меняет mastery state;
- [ ] heatmap продолжает работать;
- [ ] manual reviewQueue влияет на daily selection;
- [ ] existing dashboard tests green;
- [ ] new practice tests включены в GitHub Actions;
- [ ] corrupted/unavailable storage не ломает dashboard;
- [ ] mobile + keyboard flow проверен;
- [ ] документированы ограничения localStorage/multi-device;
- [ ] diff self-review выполнен;
- [ ] CI на feature branch green.

---

## 30. Definition of Done для полного rollout

- [ ] Practice Engine подключён ко всем migrated dashboards;
- [ ] student configs проходят central validation;
- [ ] достаточное покрытие generators для текущих активных тем;
- [ ] lesson outcomes используют competencyId там, где есть точное соответствие;
- [ ] pipeline умеет безопасно предлагать practice mappings;
- [ ] legacy dashboards имеют согласованный migration/adapter plan;
- [ ] CI запускает specialized practice/generator tests;
- [ ] отсутствует duplicated core practice code в student directories;
- [ ] state schema и storage keys документированы;
- [ ] rollout не изменил публичные URL и старые материалы.

---

## 31. Риски и меры

### Риск: математически некорректный генератор

Меры:

- deterministic pure generator;
- mass-seed tests;
- independent test oracle;
- bounded parameter domains;
- curated bank для сложных типов.

### Риск: scheduler слишком агрессивен

Меры:

- короткая прозрачная interval table;
- configurable policy;
- max daily quota;
- mastery-sensitive start interval;
- real-use review после pilot.

### Риск: ученику надоедают однотипные формулировки

Меры:

- surface-context variants;
- generator template pools;
- interleaving;
- curated items;
- duplicate-seed avoidance.

### Риск: localStorage теряется / разные устройства

Меры:

- storage adapter abstraction;
- явно документировать MVP limit;
- не делать localStorage schema несовместимой с future backend event model.

### Риск: смешение teacher mastery и student self-rating

Меры:

- scheduler не меняет `studentLevels` автоматически;
- rating влияет только на practice state;
- отдельный teacher decision может обновлять mastery позже.

### Риск: чрезмерный scope

Меры:

- pilot only probability;
- без runtime LLM;
- без backend;
- без geometry procedural generation в MVP;
- legacy dashboards позже.

### Риск: CI даёт ложную уверенность

Меры:

- practice suite отдельным обязательным step;
- generator mass-seed test;
- existing student matrix не заменяется;
- specialized model/lab tests должны позднее быть включены в общий quality gate независимо от этой feature.

---

## 32. Осознанно не входит в MVP

- облачная синхронизация прогресса;
- аккаунты/авторизация;
- teacher analytics dashboard;
- push/email reminders;
- runtime LLM generation;
- автоматическая оценка доказательств/развёрнутых решений;
- полный symbolic algebra CAS;
- FSRS parameters optimization;
- автоматическое снижение/повышение heatmap mastery;
- глобальная миграция Nikol/Nastya/chemistry;
- gamification/streak badges как самостоятельная система.

Эти функции должны добавляться только после подтверждения полезности базового daily practice.

---

## 33. Следующий инженерный шаг

После принятия этого плана начать Phase 0–2 без изменения student UI:

```text
inspect current shared dashboard contracts
→ add practice state/storage
→ add scheduler/selector
→ add deterministic random
→ add generator registry
→ add answer engine
→ add probability generators
→ focused tests
→ full existing dashboard tests
→ diff review
```

Только после зелёных core tests переходить к пилотной интеграции в `students/xenia_klykova/site/index.html`.

Такой порядок ограничивает blast radius и позволяет локализовать ошибки business logic до изменения пользовательского кабинета.
