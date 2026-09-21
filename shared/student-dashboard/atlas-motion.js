(() => {
  'use strict';

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let frame = 0;

  function buildCoordinateField() {
    const host = document.querySelector('[data-coordinate-field]');
    if (!host || host.querySelector('.coordinate-field')) return;

    const points = [
      { x: 58, y: 18, size: 5, dx: 4, dy: -3, duration: 14, delay: -3 },
      { x: 76, y: 29, size: 3, dx: -4, dy: 4, duration: 18, delay: -8 },
      { x: 88, y: 46, size: 6, dx: 3, dy: 5, duration: 16, delay: -5 },
      { x: 69, y: 63, size: 4, dx: -3, dy: -4, duration: 20, delay: -11 },
      { x: 91, y: 76, size: 3, dx: -5, dy: 3, duration: 17, delay: -2 },
      { x: 53, y: 82, size: 4, dx: 4, dy: 3, duration: 19, delay: -13 }
    ];

    const field = document.createElement('div');
    field.className = 'coordinate-field';
    field.setAttribute('aria-hidden', 'true');

    points.forEach((point, index) => {
      const marker = document.createElement('i');
      marker.className = 'coordinate-waypoint';
      marker.style.setProperty('--point-x', point.x + '%');
      marker.style.setProperty('--point-y', point.y + '%');
      marker.style.setProperty('--point-size', point.size + 'px');
      marker.style.setProperty('--point-dx', point.dx + 'px');
      marker.style.setProperty('--point-dy', point.dy + 'px');
      marker.style.setProperty('--point-duration', point.duration + 's');
      marker.style.setProperty('--point-delay', point.delay + 's');
      marker.dataset.routePoint = String(index + 1).padStart(2, '0');
      field.appendChild(marker);
    });

    host.appendChild(field);
  }

  function buildJourneyRail() {
    const stops = [...document.querySelectorAll('[data-journey-stop][id]')];
    if (stops.length < 2 || document.querySelector('.journey-rail')) return;

    const nav = document.createElement('nav');
    nav.className = 'journey-rail';
    nav.setAttribute('aria-label', 'Маршрут страницы');

    const track = document.createElement('span');
    track.className = 'journey-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('i');
    fill.className = 'journey-track-fill';
    track.appendChild(fill);
    nav.appendChild(track);

    const list = document.createElement('ol');
    stops.forEach((stop, index) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const label = stop.dataset.journeyLabel || stop.querySelector('h1,h2,h3')?.textContent?.trim() || `Раздел ${index + 1}`;
      link.href = '#' + stop.id;
      link.dataset.label = label;
      link.setAttribute('aria-label', label);
      link.innerHTML = `<span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>`;
      item.appendChild(link);
      list.appendChild(item);
    });
    nav.appendChild(list);
    document.body.appendChild(nav);

    function updateRail() {
      const marker = window.scrollY + window.innerHeight * 0.44;
      const positions = stops.map(stop => stop.getBoundingClientRect().top + window.scrollY);
      const first = positions[0];
      const last = positions[positions.length - 1];
      const progress = last > first ? clamp((marker - first) / (last - first), 0, 1) : 0;
      nav.style.setProperty('--journey-progress', progress.toFixed(4));

      let activeIndex = 0;
      let bestDistance = Infinity;
      positions.forEach((position, index) => {
        const distance = Math.abs(position - marker);
        if (distance < bestDistance) {
          bestDistance = distance;
          activeIndex = index;
        }
      });
      [...nav.querySelectorAll('a')].forEach((link, index) => {
        const active = index === activeIndex;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    nav._updateJourney = updateRail;
    updateRail();
  }

  function updateParallax() {
    const elements = [...document.querySelectorAll('[data-atlas-parallax]')];
    if (!elements.length) return;

    if (reduceMotion?.matches) {
      elements.forEach(element => element.style.setProperty('--atlas-parallax-y', '0px'));
      return;
    }

    const viewportCenter = window.innerHeight / 2;
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const strength = clamp(Number(element.dataset.atlasParallax || 7), 0, 12);
      const normalized = clamp((center - viewportCenter) / Math.max(window.innerHeight, 1), -1, 1);
      const offset = -normalized * strength;
      element.style.setProperty('--atlas-parallax-y', offset.toFixed(2) + 'px');
    });
  }

  function update() {
    frame = 0;
    document.querySelector('.journey-rail')?._updateJourney?.();
    updateParallax();
  }

  function scheduleUpdate() {
    if (frame) return;
    frame = requestAnimationFrame(update);
  }

  buildCoordinateField();
  buildJourneyRail();
  update();

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  reduceMotion?.addEventListener?.('change', scheduleUpdate);
})();
