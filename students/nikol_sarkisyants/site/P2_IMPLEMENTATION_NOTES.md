# P2 maintenance contract

`lesson-registry.js` is the single dashboard source for lesson navigation and the latest-lesson card.

When the lesson pipeline creates a new dated HTML page in this directory, add exactly one matching registry record in `lesson-registry.js` in newest-first order. CI compares the registry href set with all filenames matching `DD.MM.YY.html` or `DD-MM-YY.html`; a missing or duplicate registry entry fails the dashboard regression workflow.

The newest registry record must include `summary`, `topics`, `outcomes`, and available `materials`. The dashboard derives the sidebar recent lessons, archive pagination, latest card, CTA, material links, and update date from that record.
