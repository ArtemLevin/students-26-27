(() => {
  "use strict";

  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = {
    div_10: {
      level: 4,
      text: "НОД находился алгоритмом Евклида через последовательное деление с остатком; метод применялся к крупным числам и прикладным задачам на максимально крупные одинаковые части."
    },
    div_11: {
      level: 4,
      text: "НОК вычислялся через связь НОД(a,b)·НОК(a,b)=ab и применялся к задаче на первое совпадение периодических событий."
    },
    div_14: {
      level: 4,
      text: "Деление с остатком использовалось как основной шаг алгоритма Евклида: остаток переносился в новую пару до получения нулевого остатка."
    },
    frac_08: {
      level: 4,
      text: "Сокращение дробей выполнялось через НОД числителя и знаменателя; результат доводился до несократимой дроби."
    },
    strategy_10: {
      level: 4,
      text: "Результат проверялся по смыслу: найденный НОД должен делить исходные числа, а выбор НОД или НОК сверялся с формулировкой прикладной задачи."
    }
  };

  for (const group of data.groups) {
    for (const item of group.items || []) {
      const entry = evidence[item.id];
      if (!entry) continue;
      item.baseLevel = Math.max(Number(item.baseLevel || 0), entry.level);
      item.baseRepeat = false;
      item.evidence = Array.isArray(item.evidence)
        ? item.evidence.filter(record => record?.date !== "29.09.26")
        : [];
      item.evidence.push({
        date: "29.09.26",
        text: "На занятии 29.09.26 " + entry.text,
        href: "29.09.26.html",
        tex: "../tex_docs/29.09.26.tex"
      });
    }
  }

  data.updated = "29.09.26";
  data.latestLesson = {
    date: "29.09.26",
    title: "НОД, алгоритм Евклида и НОК",
    href: "29.09.26.html"
  };
})();