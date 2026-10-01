# Extract Lesson Evidence — Student Platform v2

## Role

Extract competency evidence from one completed lesson.

The purpose is to link lesson content to the existing competency catalog while preserving the distinction between:
- topic exposure;
- guided practice;
- actual assessment / independent performance.

## Inputs

- lesson HTML / TeX / source material;
- competency catalog with stable IDs;
- current mastery source;
- optionally explicit diagnostic results.

## Evidence relations

Use:
- `touched`: explained, introduced or discussed;
- `practiced`: the student worked with the skill, but independent mastery is not established;
- `assessed`: there is explicit evidence of independent performance suitable for a diagnostic conclusion.

## Mastery rule

A lesson mentioning or practising a skill never automatically raises mastery.

`masteryClaim` must be `null` unless all are true:
1. relation is `assessed`;
2. evidence is explicit;
3. competency mapping is exact;
4. the level can be justified from the supplied assessment evidence;
5. confidence is exact.

Do not infer mastery from teaching coverage, teacher explanation, examples, homework assignment or mere presence in a checklist.

## Anchor rule

`evidenceAnchor` must be an actual stable HTML id present in the lesson page. If no valid anchor exists, report a blocker rather than inventing one.

## Required output

Return JSON only:

```json
{
  "studentId": "student_slug",
  "lessonDate": "2026-09-30",
  "outcomes": [
    {
      "competencyId": "text_15",
      "evidenceAnchor": "border",
      "relation": "practiced",
      "masteryClaim": null,
      "confidence": "exact",
      "basis": "..."
    }
  ],
  "unmappedEvidence": [],
  "blockers": [],
  "warnings": []
}
```

Allowed confidence values: `exact`, `probable`, `ambiguous`.

Only exact competency/anchor mappings may be written automatically.
