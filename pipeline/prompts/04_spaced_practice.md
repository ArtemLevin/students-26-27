# Этап 04 — исполняемая привязка интервального повторения

Цель этапа — сформировать **machine-readable analysis result** для `pipeline/practice/post-lesson-practice.mjs`. Stage 04 изменяет только lesson/practice metadata. Он не читает и не изменяет браузерную историю попыток, `PracticeState`, `studentLevels`, `reviewQueue`, интервалы и прошлые сессии.

## Входы

1. итоговый lesson artifact текущего занятия (`site`, `tex_docs`, `pdf_docs` и/или lesson JSON);
2. `students/<student>/site/lesson-registry.js`;
3. полный каталог компетенций ученика;
4. `students/<student>/site/practice-config.js`;
5. `shared/practice/generators/index.js`;
6. `shared/practice/curated-banks/index.js`;
7. JSON Schema `pipeline/schemas/spaced-practice-stage-v1.schema.json`;
8. shared policy `shared/practice/coverage-policy.js`.

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
- Для любого `coverage-gap` или `competency-gap`, который допускается к публикации, добавьте `practiceGap` с непустыми `reason` и `issue`. Это machine-readable waiver для Track C CI.

## Допустимые `practiceDisposition`

- `generator` — точный competency и зарегистрированный deterministic generator;
- `curated` — точный competency и зарегистрированный curated bank;
- `manual` — навык требует преподавателя/развёрнутого решения;
- `none` — spaced practice для outcome не требуется;
- `coverage-gap` — practice нужен, coverage пока отсутствует;
- `competency-gap` — точного competency в каталоге нет;
- `ambiguous` — соответствие неоднозначно, auto-apply запрещён.

Для нового lesson merge-gate принимает `generator | curated | manual | none`. Gap-disposition допускается только вместе с валидным `practiceGap`. `ambiguous` всегда требует review.

## Формат выхода

Верните **только JSON**, соответствующий `pipeline/schemas/spaced-practice-stage-v1.schema.json`.

Пример обычного покрытого outcome:

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

Пример осознанного gap:

```json
{
  "label": "Сложная геометрическая конструкция",
  "practiceDisposition": "coverage-gap",
  "confidence": "exact",
  "evidence": ["на уроке навык отрабатывался отдельно"],
  "reason": "процедурный generator педагогически недостаточен",
  "practiceGap": {
    "reason": "generator-missing",
    "issue": "planned:geometry-curated-bank"
  }
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

CLI `--waiver` остаётся совместимым способом подтвердить exit code 2 на уровне post-lesson orchestration, однако Track C merge-gate требует machine-readable `practiceGap` внутри outcome. Текстовый CLI waiver его не заменяет.

Exit codes:

- `0` — apply выполнен, изменений нет либо gap подтверждён orchestration waiver;
- `2` — coverage gap без orchestration waiver;
- `3` — structural contract error;
- `4` — ambiguous/conflicting mapping, требуется review.

## Проверка репозитория

```bash
node shared/practice/validate-configs.mjs && \
node shared/practice/audit-lesson-coverage.mjs && \
node --test shared/practice/test/*.test.mjs && \
node --test pipeline/practice/test/*.test.mjs
```
