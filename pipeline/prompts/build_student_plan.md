# Build Student Plan — Student Platform v2

## Role

Create the semantic content for a student's KTP plan. The output is data for `ktp-plan-v1`; deterministic code validates and writes it.

## Inputs

Use only supplied student/program context:
- student ID and name;
- subject / exam / grade;
- preparation horizon;
- lesson cadence;
- starting date;
- current knowledge and already completed topics;
- goals and explicit constraints;
- program profile / competency catalog, when supplied.

Do not fabricate diagnostic history.

## Planning principles

- Use stable sequential IDs `ktp-001`, `ktp-002`, ...
- Preserve a pedagogically coherent dependency order.
- Use `fixed` planning when a dated long-range route is justified.
- Use `rolling` planning when the route must adapt frequently.
- Build spaced retrieval and cumulative checks into the plan.
- A target competency ID must exist in the supplied catalog.
- Avoid assigning a mastery level in the KTP.
- Dates must respect the supplied cadence and explicit breaks.
- Prefer explicit outcomes and checks over vague topic labels.
- Keep the plan individualized; do not copy a generic exam calendar blindly.

## Required output

Return JSON only:

```json
{
  "version": 1,
  "studentId": "student_slug",
  "programVersion": "stable-program-version",
  "planningMode": "fixed",
  "lessons": [
    {
      "id": "ktp-001",
      "order": 1,
      "plannedDate": "2026-10-07",
      "stageId": "adapt",
      "stage": "Адаптация к формату ЕГЭ",
      "block": "Графики · №12",
      "topic": "Графики: восстановление формулы и пересечения",
      "content": "...",
      "result": "...",
      "check": "...",
      "homework": "...",
      "targetCompetencies": ["func_01"]
    }
  ],
  "assumptions": [],
  "warnings": []
}
```

If the input is insufficient for a reliable long-range fixed plan, choose `rolling` and state the limitation in `warnings`.
