# LEVIN / ATLAS — Fingerprints

Every adopted student navigator owns `students/<student>/site/design.json`.

## Fields

- `system`: always `LEVIN_ATLAS`.
- `version`: current design-system major/minor.
- `composition`: cartographer | lab | editorial | blueprint | archive | cosmos.
- `accent`: vermilion | cobalt | forest | ochre | plum | petrol | burgundy | graphite.
- `density`: compact | balanced | airy.
- `geometry`: circular | orthogonal | mixed.
- `typography`: technical | editorial | technical-editorial.
- `motion`: calm | mechanical.
- `signature`: 1–4 concrete recurring motifs.

## Example

```json
{
  "system": "LEVIN_ATLAS",
  "version": "1.0",
  "composition": "blueprint",
  "accent": "cobalt",
  "density": "airy",
  "geometry": "orthogonal",
  "typography": "technical-editorial",
  "motion": "calm",
  "signature": ["coordinate-grid", "section-index", "dimension-rules"]
}
```

## Uniqueness check

Before generating a new page, inspect recent `design.json` files. Change at least three axes versus the nearest visual neighbor. The radial competence map may remain consistent across the ecosystem; its surrounding composition should change.

## Runtime mapping

The fingerprint is documentation/source-of-truth. Runtime uses body data attributes for the axes that affect shared CSS. Page-specific adapters own detailed selector mapping.

## Runtime attributes

Adopted pages expose the documented fingerprint through body attributes:

```html
<body
  data-atlas
  data-atlas-adapter="universal"
  data-atlas-composition="cartographer"
  data-atlas-accent="vermilion"
  data-atlas-density="airy"
  data-atlas-motion="calm">
```

`data-atlas-accent` is independent from the composition seed. This makes the roster combinatorial instead of producing six fixed color themes.
