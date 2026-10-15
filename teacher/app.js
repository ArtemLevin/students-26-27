(() => {
  "use strict";
  const items = [...document.querySelectorAll("[data-card]")];
  const grid = document.getElementById("studentGrid");
  const search = document.getElementById("search");
  const level = document.getElementById("level");
  const subject = document.getElementById("subject");
  const favoritesOnly = document.getElementById("favoritesOnly");
  const resultCount = document.getElementById("resultCount");
  const empty = document.getElementById("empty");
  const reset = document.getElementById("reset");
  const favoritesKey = "levin-teacher-favorites-v1";
  const themeKey = "levin-teacher-theme-v1";

  function getStored(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function setStored(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Storage unavailable. */ }
  }

  const normalize = value => String(value).toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
  let pinned = new Set();
  try {
    const parsed = JSON.parse(getStored(favoritesKey) || "[]");
    if (Array.isArray(parsed)) {
      pinned = new Set(parsed.filter(id => typeof id === "string" && items.some(tile => tile.dataset.slug === id)));
    }
  } catch { /* Ignore invalid preferences. */ }

  let favoriteFilter = false;

  function update() {
    const query = normalize(search.value);
    let shown = 0;
    const ordered = [...items].sort((a, b) =>
      Number(pinned.has(b.dataset.slug)) - Number(pinned.has(a.dataset.slug))
      || a.dataset.name.localeCompare(b.dataset.name, "ru")
    );

    for (const tile of ordered) {
      const favorite = pinned.has(tile.dataset.slug);
      const visible = (!query || normalize(tile.dataset.search).includes(query))
        && (!level.value || tile.dataset.level === level.value)
        && (!subject.value || tile.dataset.topics.split(" ").includes(subject.value))
        && (!favoriteFilter || favorite);
      tile.hidden = !visible;
      if (visible) shown++;

      const pin = tile.querySelector("[data-pin]");
      pin.setAttribute("aria-pressed", String(favorite));
      pin.setAttribute("aria-label", (favorite ? "Убрать " : "Добавить ")
        + tile.dataset.name + (favorite ? " из избранного" : " в избранное"));
      pin.title = favorite ? "Убрать из избранного" : "В избранное";
      grid.appendChild(tile);
    }

    resultCount.textContent = "Показано: " + shown + " из " + items.length;
    empty.hidden = shown !== 0;
    reset.hidden = !search.value && !level.value && !subject.value && !favoriteFilter;
    favoritesOnly.setAttribute("aria-pressed", String(favoriteFilter));
    favoritesOnly.querySelector(".favstar").textContent = favoriteFilter ? "★" : "☆";
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-pin]");
    if (!button || !grid.contains(button)) return;
    if (pinned.has(button.dataset.pin)) pinned.delete(button.dataset.pin);
    else pinned.add(button.dataset.pin);
    setStored(favoritesKey, JSON.stringify([...pinned]));
    update();
  });

  search.addEventListener("input", update);
  level.addEventListener("change", update);
  subject.addEventListener("change", update);
  favoritesOnly.addEventListener("click", () => {
    favoriteFilter = !favoriteFilter;
    update();
  });
  reset.addEventListener("click", () => {
    search.value = "";
    level.value = "";
    subject.value = "";
    favoriteFilter = false;
    update();
    search.focus();
  });

  const savedTheme = getStored(themeKey);
  if (savedTheme === "dark" || savedTheme === "light") document.documentElement.dataset.theme = savedTheme;

  document.getElementById("themeToggle").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark"
      || (!document.documentElement.dataset.theme
        && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setStored(themeKey, next);
  });

  update();
})();
