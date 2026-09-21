# LEVIN / ATLAS — Reference implementation: Darya

## Status

Primary visual and interaction reference for redesigning student navigators and dated lesson pages.

Authoritative examples:

- `students/darya_savenkova/site/index.html` — navigator / curriculum overview;
- `students/darya_savenkova/site/14.09.26.html` — dated lesson / editorial learning journal;
- `students/darya_savenkova/site/competency-map.js` — map/catalog interaction reference;
- `shared/student-dashboard/atlas-motion.js` — shared route/waypoint/parallax behavior;
- `docs/templates/template*.png` — art-direction references for cartographic/editorial backgrounds.

The Darya implementation is a **grammar**, not a page template. New students must inherit the design language while retaining a distinct fingerprint.

---

## 1. Core design idea

The product should feel like a **personal learning atlas + editorial study journal + precise mathematical instrument**.

The visual metaphor is built from:

- route;
- coordinates;
- waypoints;
- map;
- field notes;
- chapter index;
- progress as movement through knowledge.

Every decorative element must support one of those meanings.

---

## 2. Family invariants — preserve across students

These are the recognizable LEVIN / ATLAS traits.

### Composition

- one dominant visual object per screen;
- asymmetric editorial hierarchy;
- large display typography where it clarifies hierarchy;
- hairline rules before containers;
- restrained surfaces and shadows;
- radial competence map remains a product primitive when the curriculum supports it;
- learning history reads as a journal/archive, not a card feed.

### Navigation

- route or chapter logic is visible;
- section indexes are compact and technical;
- optional journey rail may connect major vertically ordered sections;
- route stops must correspond to real reading order.

### Motion

Use `shared/student-dashboard/atlas-motion.js` when the page supports the required data attributes.

Permitted shared behaviors:

- very slow coordinate waypoint drift;
- 0–12 px micro-parallax;
- route progress along real page sections;
- short one-time reveal;
- restrained hover/focus response.

No continuous spectacle, bouncing, blob motion, neon particles or decorative animation-on-scroll.

### Brand primitive: Navigator

The minimal compass-like **Navigator** symbol may appear near the next learning action.

It is a brand mark, not a cartoon character.

Allowed roles:

- marks the next topic;
- labels the current learning direction;
- appears near a route decision;
- anchors lesson folio metadata.

Avoid speech bubbles, faces, emotions, gamified reactions or mascot dialogue.

### Color

- neutral paper/surface base;
- graphite/ink text;
- one student-specific accent family;
- accent is used for route, active state, waypoint and key actions;
- glow is exceptional and normally dark-theme-only.

### Interaction

- hover and keyboard focus must communicate the same semantic relationship;
- related representations should cross-highlight when useful, e.g. radial map ↔ topic catalog;
- status meaning cannot depend on color alone.

---

## 3. What must change for every student

A redesign fails the reference if it simply clones Darya.

Change at least **three** of these axes compared with the closest recent student page:

1. composition seed;
2. accent;
3. density;
4. geometry;
5. typography balance;
6. background art direction;
7. local signature motif;
8. route presentation;
9. information hierarchy.

Examples:

- geometry student: blueprint / construction marks / orthogonal route;
- physics student: scientific instrument / measurement traces;
- archive-heavy student: chronological catalog spine;
- broad EGE navigator: cartographer / radial dominance;
- narrative lesson history: editorial / field journal.

The **metaphor stays coherent**, while the surface expression changes.

---

## 4. Background imagery

Background images must behave as environmental texture.

Good uses:

- hero landscape;
- faint mathematical drawing behind a work area;
- journal folio image;
- subject-relevant cartographic or scientific engraving.

Rules:

- text contrast wins over image visibility;
- background opacity is usually low outside hero;
- use masks/gradients to create quiet negative space;
- avoid full-page wallpaper;
- avoid stock-photo appearance;
- avoid synthetic futuristic imagery.

`docs/templates/template*.png` are reference assets. If an actual image is used in a student production page, copy the required binary into that student's `images/` directory because `docs/templates` is not part of the student static deployment bundle.

---

## 5. Navigator page reference

Darya's `index.html` demonstrates the preferred information hierarchy:

1. identity / route context;
2. concise progress ledger;
3. dominant competence map;
4. next learning focus;
5. topic catalog;
6. lesson journal/history.

Do not mechanically reproduce that sequence if the student's program needs another order.

### Strong patterns worth reusing

- oversized editorial title;
- radial map as the main object;
- ledger-like metrics instead of KPI cards;
- next action adjacent to the main map;
- map ↔ catalog cross-highlight;
- background imagery with large quiet areas;
- route waypoints tied to real sections;
- Navigator mark near the next action.

### Patterns to avoid

- four equal KPI cards;
- sidebar-first LMS composition;
- hero + card grid;
- dashboard wall;
- every lesson as a large card;
- generic CTA hierarchy.

---

## 6. Dated lesson reference

Darya's `14.09.26.html` demonstrates a **field mathematics journal**.

Preferred structure:

1. editorial lesson cover;
2. folio metadata;
3. chapter route;
4. theory chapters separated primarily by rules and whitespace;
5. formulas as working objects;
6. stepper / interactive explanations only where pedagogically useful;
7. training and self-check near the end;
8. same Navigator / route language as the student home page.

The lesson page should feel related to the navigator without becoming a duplicate dashboard.

---

## 7. Shared motion API

Load:

```html
<script src="../../../shared/student-dashboard/atlas-motion.js"></script>
```

### Coordinate field

Add to a suitable hero:

```html
<header data-coordinate-field>
```

The script adds decorative `.coordinate-waypoint` nodes. Page CSS owns their visual appearance.

### Journey rail

Mark only real vertically ordered milestones:

```html
<section
  id="theory"
  data-journey-stop
  data-journey-label="Теория">
```

Do not mark horizontally adjacent blocks as consecutive route stops.

### Parallax

Use:

```html
<section data-atlas-parallax="4">
```

Allowed strength: 0–12. Typical range: 3–7.

CSS should consume:

```css
transform: translate3d(0,var(--atlas-parallax-y,0),0);
```

All motion must have a `prefers-reduced-motion` fallback.

---

## 8. Cross-highlight pattern

When one learning object has two views, hover/focus should link them.

Reference:

- radial cell ↔ catalog row;
- active topic ↔ related route record;
- exercise ↔ relevant formula, where useful.

Requirements:

- works with mouse and keyboard;
- highlighted state is temporary;
- no automatic scroll hijacking;
- no semantic state is changed by hover alone.

---

## 9. Anti-AI guardrail

A redesign is rejected when it introduces:

- purple/indigo tech gradients as a default;
- floating blur blobs;
- glowing spheres;
- generic particles;
- glassmorphism panels;
- liquid-glass controls;
- large neon glow;
- animated gradient borders;
- generic 3D objects;
- an AI-orb assistant;
- excessive pills;
- equal card grids;
- fake analytics;
- motion without navigational or learning meaning.

A small halo is allowed for an active learning object, preferably in dark theme and at low opacity.

---

## 10. Migration sequence for another student

1. Read the student's current `index.html`, `design.json`, map/data JS and latest lesson pages.
2. Read this reference and both Darya reference pages.
3. Preserve all existing behavioral contracts before styling.
4. Choose the student's new fingerprint and identify at least three axes that differ from Darya.
5. Define one local signature motif.
6. Decide which reference primitives actually help: route rail, Navigator, coordinate field, parallax, cross-highlight.
7. Redesign the information hierarchy.
8. Apply imagery only after the hierarchy works without it.
9. Run DOM/link/JS/accessibility checks.
10. Review desktop/mobile, light/dark and reduced-motion states.
11. Merge only after recording any unavailable browser/screenshot checks.

---

## 11. Review questions

Before declaring a migration ready:

- Does this still look like the same LEVIN / ATLAS family?
- Can it be distinguished from Darya in one glance?
- Is there one clear visual leader?
- Does every animation have a route, focus or orientation purpose?
- Is the student's next action obvious?
- Is the competence map still readable without effects?
- Does the lesson page read like a learning document?
- Would removing all rounded cards preserve the hierarchy?
- Does reduced-motion preserve every interaction?
- Are local files actually shipped by the deployment bundle?

If the answer to the first two questions is not simultaneously yes, revise the design.
