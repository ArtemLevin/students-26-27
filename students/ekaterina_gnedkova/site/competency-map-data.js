(() => {
'use strict';
for (let i = 1; i <= 4; i += 1) {
  document.write(`<script src="competency-map-data-part-${i}.js?v=20260925-1"><\/script>`);
}
document.write('<script src="competency-map-data-assemble.js?v=20260925-1"><\/script>');
})();