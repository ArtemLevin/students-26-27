# LEVIN / ATLAS — Design System v1.0

LEVIN / ATLAS is the visual system for personal student navigators in this repository.

## Design intent

The interface should feel like a modern mathematical atlas, research notebook and scientific instrument. The system deliberately avoids the generic AI/SaaS visual vocabulary.

## Two-layer model

**Core identity (about 70%)**
- radial knowledge map;
- section indexes and technical metadata;
- hairline rules;
- consistent status semantics;
- one shared spatial/type scale;
- restrained motion;
- accessible interaction.

**Student fingerprint (about 20%)**
- one composition seed;
- one accent;
- geometry character;
- information density;
- typography character;
- motion character.

**Experiment (up to 10%)**
- one local signature gesture tied to the learner or subject.

## Required files for an adopted page

```html
<link rel="stylesheet" href="../../../design-system/tokens.css">
<link rel="stylesheet" href="../../../design-system/foundations.css">
<link rel="stylesheet" href="../../../design-system/archetypes.css">
```

The `body` gets a fingerprint:

```html
<body
  data-atlas
  data-atlas-composition="blueprint"
  data-atlas-density="airy"
  data-atlas-motion="calm">
```

A student page may then load a small local adapter after the shared files. The adapter maps existing selectors to LEVIN / ATLAS tokens; application logic stays untouched.

## Public token contract

All shared variables start with `--la-`. Existing project variables such as `--paper`, `--teal`, `--line` remain page-owned. Adapters may map those legacy variables to LEVIN / ATLAS variables.

## Typography roles

- **Display:** editorial headings; serif is allowed and encouraged when the fingerprint calls for it.
- **Body/UI:** neutral sans-serif.
- **Technical:** mono stack for dates, IDs, section codes, percentages and metadata.

No external font dependency is required by the core.

## Geometry

Preferred radii: 0, 2, 5, 9 px. Large capsule radii are reserved for small status tokens or genuinely pill-shaped controls.

## Shadow policy

Structure should be communicated primarily with whitespace, rules, hierarchy, type and contrast. Shadows are exceptional and subtle.

## Motion policy

Allowed defaults: reveal, line draw, radial progress and number transition. Motion must still communicate correctly when disabled.

## Status semantics

Color cannot be the only signal. Every status must also have text, shape, symbol or state wording.

## Versioning

- `1.x`: compatible token additions and archetype refinements.
- `2.0`: breaking token/markup contract.

See `DESIGN_RULES.md`, `COMPOSITIONS.md`, `FINGERPRINTS.md` and `MIGRATION.md`.

## Legacy-site adapter

Existing navigator generations share `student-sites.css`, scoped by `data-atlas-adapter="universal"`. It normalizes card geometry, shadows, typography and composition while preserving each page's DOM and behavioral JavaScript. Grigory's original pilot remains a dedicated adapter and serves as the reference implementation for deeper page-specific art direction.

The authoritative assignment of fingerprints is `STUDENT_ROSTER.md`.
