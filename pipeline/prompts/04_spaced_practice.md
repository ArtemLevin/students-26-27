# Этап 04 — исполняемая привязка интервального повторения

Цель этапа — сформировать **machine-readable analysis result** для `pipeline/practice/post-lesson-practice.mjs`. Stage 04 изменяет только lesson/practice metadata. Он не читает и не изменяет браузерную историю попыток, `PracticeState`, `studentLevels`, `reviewQueue`, интервалы и прошлые сессии.

## Входы

1. итоговый lesson artifact текущего занятия (`site`, `tex_docs`, `pdf_docs` и/или lesson JSON);
2. `students/<student>/site/lesson-registry.js`;
3. полный каталог компетенций ученика;
4. `students/<student>/site/practice-config.js`;
5. `shared/practice/generators/index.js`;
6. `shared/practice/curated-banks/index.js`;
7. JSON Schema `pipeline/schemas/spaced-practice-stage-v1.schema.json`.

## Обязательные правила

- Используйте только существующий `competencyId`, дословно взятый из каталога.
- Не создавайте новые ID и не подменяйте близкий по смыслу навык.
- `confidence: "exact"` ставьте только при однозначном соответствии реально отработанному outcome.
- Для `practiceDisposition: "generator"` используйте только зарегистрированный `generatorKey`; его `competencyIds` обязан содержать выбранный ID.
- Для `practiceDisposition: "curated"` используйте только зарегистрированный `bankKey`; банк обязан декларировать выбранный ID.
- Сложную геометрию, доказательства, исследовательские задания и неоднозначные ответы не сводите к искусственному procedural generator.
- Если practice полезен, но coverage отсутствует, используйте `coverage-gap`.
- Если в каталоге отсутствует точный навык, используйте `competency-gap` и не придумывайте `competencyId`.
- Если подходят несколько компетенций, используйте `ambiguous`; auto-apply будет заблокирован.
- Существующий generator для competency не заменяйте. Такая миграция выполняется отдельным педагогическим review.
- Для нового generator mapping укажите `difficulty` как непустой набор уникальных целых значений 1–3. Если mapping уже существует, поле можно опустить — Stage 04 возьмёт текущий difficulty contract.
- Сохраняйте существующие lesson metadata, mastery level/tone и все поля `PRACTICE_CONFIG`, которые Stage 04 не обязан менять.

## Допустимые `practiceDisposition`

- `generator` — точный competency и зарегистрированный deterministic generator;
- `curated` — точный competency и зарегистрированный curated bank;
- `manual` — навык требует преподавателя/развёрнутого решения;
- `none` — spaced practice для outcome не требуется;
- `coverage-gap` — practice нужен, coverage пока отсутствует;
- `competency-gap` — точного competency в каталоге нет;
- `ambiguous` — соответствие неоднозначно, auto-apply запрещён.

## Формат выхода

Верните **только JSON**, соответствующий `pipeline/schemas/spaced-practice-stage-v1.schema.json`.

Пример:

```json
{
  "schemaVersion": 1,
  "studentId": "xenia_klykova",
  "lessonDate": "2026-08-31",
  "lessonHref": "31.08.26.html",
  "lesson": {
    "title": "Основы стереометрии",
    "navTitle": "Стереометрия",
    "navSubtitle": "обозначения и аксиомы",
    "summary": "Ключевые результаты занятия",
    "topics": ["обозначения", "аксиомы"],
    "materials": {
      "pdf": "../pdf_docs/31.08.26.pdf",
      "tex": "../tex_docs/31.08.26.tex"
    }
  },
  "outcomes": [
    {
      "label": "Пример точного процедурного навыка",
      "practiceDisposition": "generator",
      "competencyId": "existing_competency_id",
      "generatorKey": "registered.generator-key",
      "difficulty": [1, 2],
      "confidence": "exact",
      "evidence": ["конкретный фрагмент результата урока"],
      "reason": "почему соответствие однозначно"
    }
  ],
  "gaps": [],
  "warnings": []
}
```

## Исполнение

Технический запуск:

```bash
node pipeline/practice/run-stage-04.mjs \
  --student xenia_klykova \
  --date 2026-08-31 \
  --analysis path/to/stage-04-result.json
```

Обязательная post-lesson точка входа перед публикацией dashboard:

```bash
node pipeline/practice/post-lesson-practice.mjs \
  --student xenia_klykova \
  --date 2026-08-31 \
  --analysis path/to/stage-04-result.json
```

Для предварительной проверки используйте `--dry-run`.

Если есть допустимый `coverage-gap`, публикация требует явного waiver с причиной:

```bash
node pipeline/practice/post-lesson-practice.mjs \
  --student xenia_klykova \
  --date 2026-08-31 \
  --analysis path/to/stage-04-result.json \
  --waiver "generator будет добавлен отдельной задачей"
```

Exit codes:

- `0` — apply выполнен, изменений нет либо gap явно waived;
- `2` — coverage gap без waiver;
- `3` — structural contract error;
- `4` — ambiguous/conflicting mapping, требуется review.

## Проверка репозитория

```bash
node shared/practice/validate-configs.mjs
node --test shared/practice/test/*.test.mjs
node --test pipeline/practice/test/*.test.mjs
```
