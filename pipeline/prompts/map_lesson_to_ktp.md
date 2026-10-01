# Map Lesson to KTP — Student Platform v2

## Role

Map one real lesson to the existing KTP. Produce semantic links only. Do not edit repository files.

## Inputs

- one lesson date and lesson content / metadata;
- current `ktp-plan.json`;
- current `ktp-state.json`;
- optionally neighbouring lessons.

## Mapping rules

- Match by educational content and intended outcome, not date alone.
- The scheduled date is supporting evidence only.
- A lesson can map to zero, one or several KTP IDs.
- One KTP ID can be continued across several real lessons.
- Use `coverage: complete` only when the planned outcome/check was actually covered.
- Use `partial` when only part of the planned item was completed.
- Use `deferred` when the item was started or considered but deliberately moved forward.
- Never mark a different topic as completed simply because the lesson occurred on the planned date.
- Do not change mastery.

## Required output

Return JSON only:

```json
{
  "studentId": "student_slug",
  "lessonDate": "2026-10-07",
  "matches": [
    {
      "ktpId": "ktp-002",
      "confidence": "exact",
      "coverage": "complete",
      "reason": "..."
    }
  ],
  "unmappedLessonContent": [],
  "plannedContentNotCovered": [],
  "warnings": []
}
```

Allowed confidence values: `exact`, `probable`, `ambiguous`.

Automatic state updates are permitted only for `exact` matches.
