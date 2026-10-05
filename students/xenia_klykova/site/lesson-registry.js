export const RECENT_LIMIT=3;
export const ARCHIVE_PAGE_SIZE=10;

const MONTHS_GENITIVE=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export const LESSONS=[
  {
    "date": "2026-10-05",
    "ktpRefs": [],
    "href": "05.10.26.html",
    "title": "Повторение ключевых тем ЕГЭ: геометрия, вероятность и модели",
    "navTitle": "Повторение ключевых тем ЕГЭ",
    "navSubtitle": "геометрия · векторы · вероятность · уравнения · движение",
    "summary": "Смешанное повторение: вписанный угол, площадь треугольника, скалярное произведение, классическая и условная вероятность, формула Бернулли, уравнения с корнем и дробями, прикладные формулы и движение.",
    "topics": [
      "геометрия",
      "векторы",
      "условная вероятность",
      "формула Бернулли",
      "уравнения",
      "движение"
    ],
    "outcomes": [
      {
        "label": "Скалярное произведение и угол между векторами",
        "level": 2,
        "competencyId": "t2_dot",
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Условная вероятность: выбор правильного знаменателя",
        "level": 2,
        "competencyId": "t5_conditional",
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Формула Бернулли и сокращение факториалов",
        "level": 2,
        "competencyId": "t5_bernoulli",
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Движение по прямой: таблица S–v–t и разница во времени",
        "level": 2,
        "competencyId": "t10_line",
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "05.10.26.html",
      "pdf": "../pdf_docs/05.10.26.pdf",
      "tex": "../tex_docs/05.10.26.tex"
    }
  },
  {
    "date": "2026-09-30",
    "ktpRefs": [],
    "href": "30.09.26.html",
    "title": "Теорема Безу и схема Горнера: рациональные корни многочлена",
    "navTitle": "Теорема Безу и схема Горнера",
    "navSubtitle": "корень · множитель · p/q · нулевые коэффициенты",
    "summary": "Поиск рациональных корней многочлена; связь P(a)=0 с множителем x−a; деление многочлена и схема Горнера; рациональные кандидаты p/q; нулевые коэффициенты при пропущенных степенях; последовательное понижение степени.",
    "topics": [
      "теорема Безу",
      "рациональные корни",
      "схема Горнера",
      "деление многочлена",
      "пропущенные степени"
    ],
    "outcomes": [
      {
        "label": "Разложение многочлена через найденный корень и свойство нулевого произведения",
        "level": 3,
        "competencyId": "t6_factor",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Поиск целых и рациональных кандидатов на корни",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Схема Горнера: остаток и коэффициенты частного",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Нулевые коэффициенты при пропущенных степенях",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "30.09.26.html",
      "pdf": "../pdf_docs/30.09.26.pdf",
      "tex": "../tex_docs/30.09.26.tex",
      "lab": "30.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-28",
    "ktpRefs": [],
    "href": "28.09.26.html",
    "title": "Математическое ожидание: распределение и число испытаний",
    "navTitle": "Математическое ожидание",
    "navSubtitle": "распределение · E(X)=np · 1/p · r/p",
    "summary": "Математическое ожидание дискретной случайной величины как долгосрочное среднее; построение распределения; линейность ожидания для суммы индикаторов; ожидаемое число успехов в n испытаниях; ожидаемое число испытаний до первого и нескольких успехов.",
    "topics": [
      "математическое ожидание",
      "дискретная случайная величина",
      "распределение",
      "число успехов",
      "число испытаний до успеха"
    ],
    "outcomes": [
      {
        "label": "Смысл математического ожидания как долгосрочного среднего",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Вычисление E(X) по распределению",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Построение распределения числа событий",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Ожидаемое число успехов в фиксированном числе испытаний",
        "level": 3,
        "competencyId": "t5_bernoulli",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Ожидаемое число испытаний до первого и нескольких успехов",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "28.09.26.html",
      "pdf": "../pdf_docs/28.09.26.pdf",
      "tex": "../tex_docs/28.09.26.tex"
    }
  },
  {
    "date": "2026-09-24",
    "ktpRefs": [],
    "href": "24.09.26.html",
    "title": "Сечения куба и тетраэдра: построение и обоснование",
    "navTitle": "Сечения многогранников",
    "navSubtitle": "след плоскости · вспомогательные точки · строгая запись",
    "summary": "Построение сечений куба и тетраэдра методом перехода от грани к грани; вспомогательные точки и продолжения прямых; обоснование принадлежности каждой новой точки плоскости сечения; видимые и скрытые линии.",
    "topics": [
      "сечения куба",
      "сечения тетраэдра",
      "след плоскости",
      "вспомогательные точки",
      "обоснование построения"
    ],
    "outcomes": [
      {
        "label": "Построение сечений и переход от грани к грани",
        "level": 3,
        "competencyId": "t3_basic_sections",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Вспомогательные точки и продолжение прямых",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Строгое обоснование принадлежности точек плоскости сечения",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Видимые и скрытые линии на чертеже",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "24.09.26.html",
      "pdf": "../pdf_docs/24.09.26.pdf",
      "tex": "../tex_docs/24.09.26.tex"
    }
  },
  {
    "date": "2026-09-21",
    "ktpRefs": [],
    "href": "21.09.26.html",
    "title": "Сечения куба: построение по трём точкам",
    "navTitle": "Сечения куба",
    "navSubtitle": "следы плоскости · общие рёбра · вспомогательные точки",
    "summary": "Сечение куба как многоугольник пересечения с секущей плоскостью; построение следа на грани; переход между соседними гранями через общее ребро; вспомогательные точки вне куба; проверка принадлежности каждой стороны грани и замкнутости сечения.",
    "topics": [
      "сечения куба",
      "секущая плоскость",
      "след на грани",
      "общее ребро граней",
      "вспомогательные точки"
    ],
    "outcomes": [
      {
        "label": "Построение сечения куба и пространственная логика",
        "level": 3,
        "competencyId": "t3_basic_sections",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Переход с грани на грань через общее ребро",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Вспомогательные точки вне куба",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Самостоятельное построение без подсказки",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "21.09.26.html",
      "pdf": "../pdf_docs/21.09.26.pdf",
      "tex": "../tex_docs/21.09.26.tex",
      "lab": "21.09.26-lab.html?case=1"
    }
  },
  {
    "date": "2026-09-17",
    "ktpRefs": [],
    "href": "17.09.26.html",
    "title": "Теория вероятностей и статистика: выбор без возвращения, центр и разброс данных",
    "navTitle": "Вероятность и статистика",
    "navSubtitle": "без возвращения · среднее · медиана · дисперсия",
    "summary": "Выбор без возвращения через последовательные условные вероятности; различие правил «и» и «или»; среднее, медиана и мода; размах, дисперсия и стандартное отклонение как характеристики разброса.",
    "topics": [
      "выбор без возвращения",
      "условная вероятность",
      "среднее и медиана",
      "мода",
      "дисперсия",
      "стандартное отклонение"
    ],
    "outcomes": [
      {
        "label": "Выбор без возвращения и последовательные вероятности",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Выбор характеристики центра данных",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Размах, дисперсия и стандартное отклонение",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Интерпретация разброса и выбросов",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "17.09.26.html",
      "pdf": "../pdf_docs/17.09.26.pdf",
      "tex": "../tex_docs/17.09.26.tex",
      "lab": "17.09.26-lab.html?mode=markers"
    }
  },
  {
    "date": "2026-09-16",
    "ktpRefs": [],
    "href": "16.09.26.html",
    "title": "Стереометрия: параллельность и переход к плоской задаче",
    "navTitle": "Параллельность и плоская задача",
    "navSubtitle": "прямая и плоскость, средняя линия и подобие",
    "summary": "Принадлежность прямой плоскости через две точки; роль параллельности; вспомогательная плоскость через параллельные прямые; единственная прямая пересечения двух плоскостей; средние линии граней тетраэдра; переход к подобию треугольников и отношениям отрезков.",
    "topics": [
      "прямая и плоскость",
      "параллельные прямые",
      "пересечение плоскостей",
      "средняя линия",
      "подобие треугольников"
    ],
    "outcomes": [
      {
        "label": "Пространственная логика и вспомогательная плоскость",
        "level": 3,
        "competencyId": "t3_basic_sections",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Принадлежность прямой плоскости через две точки",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Пересечение плоскостей и коллинеарность",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Средняя линия в пространственной конструкции",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Подобие после сведения к плоской задаче",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "16.09.26.html",
      "pdf": "../pdf_docs/16.09.26.pdf",
      "tex": "../tex_docs/16.09.26.tex",
      "lab": "16.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-14",
    "ktpRefs": [],
    "href": "14.09.26.html",
    "title": "Статистические данные: частоты и средние",
    "navTitle": "Частоты и средние",
    "navSubtitle": "вариационный ряд, выборка, частоты и взвешенное среднее",
    "summary": "Вариационный ряд и объём выборки; абсолютная и относительная частоты; контроль сумм частот; таблицы и интервальные данные; среднее арифметическое и взвешенное среднее; восстановление суммы по среднему и анализ изменения выборки.",
    "topics": [
      "вариационный ряд",
      "объём выборки",
      "абсолютная и относительная частоты",
      "таблицы частот",
      "среднее и взвешенное среднее"
    ],
    "outcomes": [
      {
        "label": "Абсолютная и относительная частоты",
        "level": 3,
        "competencyId": "t4_frequency",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Вариационный ряд и объём выборки",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Таблица частот и контроль сумм",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Среднее и взвешенное среднее",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Интервальные данные",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "14.09.26.html",
      "pdf": "../pdf_docs/14.09.26.pdf",
      "tex": "../tex_docs/14.09.26.tex"
    }
  },
  {
    "date": "2026-09-10",
    "ktpRefs": [],
    "href": "10.09.26.html",
    "title": "Теория вероятностей: дерево и повторные испытания",
    "navTitle": "Дерево и повторные испытания",
    "navSubtitle": "маршруты, дополнение, полная вероятность и минимальное число попыток",
    "summary": "Дерево вероятностей как модель последовательного эксперимента; умножение вдоль маршрута и сложение несовместимых маршрутов; различие «ровно на k-й» и «не позднее k-й»; дополнение для «хотя бы одного»; минимальное число попыток для заданного порога; полная вероятность, неизвестная первая ветвь, таблица для двух игр и повторный анализ.",
    "topics": [
      "дерево вероятностей",
      "повторные попытки",
      "противоположное событие",
      "полная вероятность",
      "«ровно» и «не позднее»"
    ],
    "outcomes": [
      {
        "label": "Умножение вдоль маршрута",
        "level": 4,
        "competencyId": "t5_product",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Сложение несовместимых маршрутов",
        "level": 4,
        "competencyId": "t5_sum",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Дополнение и «хотя бы один»",
        "level": 4,
        "competencyId": "t5_complement",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Минимальное число повторных попыток",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Полная вероятность и неизвестная ветвь",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "10.09.26.html",
      "pdf": "../pdf_docs/10.09.26.pdf",
      "tex": "../tex_docs/10.09.26.tex",
      "lab": "10.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-09",
    "ktpRefs": [],
    "href": "09.09.26.html",
    "title": "Стереометрия: способы задания плоскости",
    "navTitle": "Способы задания плоскости",
    "navSubtitle": "единственность, пересекающиеся, параллельные и скрещивающиеся прямые",
    "summary": "Аксиомы A1–A3 и три следствия о единственной плоскости; доказательства для прямой и точки вне неё, пересекающихся и параллельных прямых; использование единственности для совпадения плоскостей; различие параллельных и скрещивающихся прямых.",
    "topics": [
      "единственная плоскость",
      "следствия из аксиом",
      "пересекающиеся прямые",
      "параллельные прямые",
      "скрещивающиеся прямые"
    ],
    "outcomes": [
      {
        "label": "Базовая пространственная логика",
        "level": 3,
        "competencyId": "t3_basic_sections",
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Следствие 1: прямая и точка",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Следствие 2: пересекающиеся прямые",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Следствие 3: параллельные прямые",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Единственность и совпадение плоскостей",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "09.09.26.html",
      "pdf": "../pdf_docs/09.09.26.pdf",
      "tex": "../tex_docs/09.09.26.tex",
      "lab": "09.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-07",
    "ktpRefs": [],
    "href": "07.09.26.html",
    "title": "Дерево вероятностей и диагностические тесты",
    "navTitle": "Дерево вероятностей",
    "navSubtitle": "траектории, полная вероятность и диагностические тесты",
    "summary": "Последовательные случайные процессы через дерево вероятностей; умножение вероятностей вдоль траектории и сложение подходящих несовместимых маршрутов; повторный анализ; различие истинного состояния и результата теста; ложноположительные и ложноотрицательные результаты; полная вероятность, обратная задача и условная вероятность P(D|+).",
    "topics": [
      "дерево вероятностей",
      "траектории «и/или»",
      "диагностические тесты",
      "полная вероятность",
      "условная вероятность"
    ],
    "outcomes": [
      {
        "label": "Умножение вдоль траектории",
        "level": 3,
        "competencyId": "t5_product",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Сложение подходящих маршрутов",
        "level": 3,
        "competencyId": "t5_sum",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Повторный анализ через дополнение",
        "level": 3,
        "competencyId": "t5_complement",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Диагностические тесты и полная вероятность",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Различение P(D), P(+) и P(D|+)",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "07.09.26.html",
      "pdf": "../pdf_docs/07.09.26.pdf",
      "tex": "../tex_docs/07.09.26.tex",
      "lab": "07.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-03",
    "ktpRefs": [],
    "href": "03.09.26.html",
    "title": "Теория вероятностей: дерево и язык событий",
    "navTitle": "Дерево вероятностей",
    "navSubtitle": "«И», «ИЛИ», дополнение, Бернулли и полная вероятность",
    "summary": "Перевод текста задачи на язык событий; умножение независимых событий и сложение несовместимых вариантов; дополнение для «хотя бы один»; различие между заданным порядком и ровно k успехами; схема Бернулли; дерево вероятностей; полная вероятность в задаче о лампах.",
    "topics": [
      "дерево вероятностей",
      "«И» и «ИЛИ»",
      "противоположное событие",
      "схема Бернулли",
      "полная вероятность"
    ],
    "outcomes": [
      {
        "label": "Умножение независимых событий",
        "level": 3,
        "competencyId": "t5_product",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Сложение несовместимых маршрутов",
        "level": 3,
        "competencyId": "t5_sum",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "«Хотя бы один» через дополнение",
        "level": 3,
        "competencyId": "t5_complement",
        "tone": "good",
        "practiceDisposition": "generator"
      },
      {
        "label": "Схема Бернулли",
        "level": 3,
        "competencyId": "t5_bernoulli",
        "tone": "good",
        "practiceDisposition": "generator"
      }
    ],
    "materials": {
      "html": "03.09.26.html",
      "pdf": "../pdf_docs/03.09.26.pdf",
      "tex": "../tex_docs/03.09.26.tex",
      "lab": "03.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-02",
    "ktpRefs": [],
    "href": "02.09.26.html",
    "title": "Стереометрия: аксиома A3 и следствия",
    "navTitle": "Аксиома A3 и следствия",
    "navSubtitle": "пересечение плоскостей, A1–A3 и единственность",
    "summary": "Третья аксиома стереометрии; линия пересечения двух плоскостей; математическая запись принадлежности; доказательство от противного; следствия о прямой и точке вне неё, пересекающихся и параллельных прямых; выбор между A1, A2 и A3.",
    "topics": [
      "аксиома 3",
      "пересечение плоскостей",
      "следствия из аксиом",
      "доказательство от противного"
    ],
    "outcomes": [
      {
        "label": "Базовая пространственная логика",
        "level": 2,
        "competencyId": "t3_basic_sections",
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Аксиома A3",
        "level": 3,
        "tone": "good",
        "practiceDisposition": "manual"
      },
      {
        "label": "Выбор A1 / A2 / A3",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      },
      {
        "label": "Строгая запись доказательства",
        "level": 2,
        "tone": "process",
        "practiceDisposition": "manual"
      }
    ],
    "materials": {
      "html": "02.09.26.html",
      "pdf": "../pdf_docs/02.09.26.pdf",
      "tex": "../tex_docs/02.09.26.tex",
      "lab": "02.09.26-lab.html"
    }
  },
  {
    "date": "2026-08-31",
    "ktpRefs": [],
    "href": "31.08.26.html",
    "title": "Основы стереометрии: обозначения и аксиомы",
    "navTitle": "Основы стереометрии",
    "navSubtitle": "плоскости, принадлежность и первые аксиомы",
    "summary": "Точки, прямые и плоскости; знаки принадлежности и пересечения; первая и вторая аксиомы стереометрии; совпадение плоскостей и доказательство от противного.",
    "topics": [
      "обозначения",
      "аксиома 1",
      "аксиома 2",
      "доказательство от противного"
    ],
    "outcomes": [
      {
        "label": "Язык стереометрии",
        "level": 3,
        "tone": "good"
      },
      {
        "label": "Первая аксиома",
        "level": 3,
        "tone": "good"
      },
      {
        "label": "Вторая аксиома",
        "level": 2,
        "tone": "process"
      },
      {
        "label": "Доказательство от противного",
        "level": 2,
        "tone": "process"
      }
    ],
    "materials": {
      "html": "31.08.26.html",
      "pdf": "../pdf_docs/31.08.26.pdf",
      "tex": "../tex_docs/31.08.26.tex"
    }
  },
  {
    "date": "2026-08-28",
    "ktpRefs": [],
    "href": "28.08.26.html",
    "title": "Теория вероятностей: схема Бернулли",
    "navTitle": "Схема Бернулли",
    "navSubtitle": "ровно k успехов и «хотя бы один»",
    "summary": "Независимые испытания, союзы «И» и «ИЛИ», выбор успеха по смыслу вопроса, факториалы, формула Бернулли и переход к противоположному событию для формулировки «хотя бы один».",
    "topics": [
      "формула Бернулли",
      "независимые испытания",
      "«И» и «ИЛИ»",
      "противоположное событие"
    ],
    "outcomes": [
      {
        "label": "Умножение независимых событий",
        "level": 3,
        "competencyId": "t5_product",
        "tone": "good"
      },
      {
        "label": "Сложение несовместимых вариантов",
        "level": 2,
        "competencyId": "t5_sum",
        "tone": "process"
      },
      {
        "label": "Схема Бернулли",
        "level": 2,
        "competencyId": "t5_bernoulli",
        "tone": "process"
      },
      {
        "label": "«Хотя бы один» через дополнение",
        "level": 2,
        "competencyId": "t5_complement",
        "tone": "process"
      }
    ],
    "materials": {
      "html": "28.08.26.html",
      "pdf": "../pdf_docs/28.08.26.pdf",
      "tex": "../tex_docs/28.08.26.tex"
    }
  },
  {
    "date": "2026-08-24",
    "ktpRefs": [],
    "href": "24.08.26.html",
    "title": "Теория вероятностей: метод позиций",
    "navTitle": "Метод позиций",
    "navSubtitle": "быстрый подсчёт исходов",
    "summary": "Классическая вероятность, перевод условия на математический язык, метод позиций, повторные испытания, очереди и выбор, правила «И» и «ИЛИ», гибридный подсчёт без громоздких таблиц.",
    "topics": [
      "метод позиций",
      "классическая вероятность",
      "повторные испытания",
      "«И» и «ИЛИ»"
    ],
    "outcomes": [
      {
        "label": "Классическая вероятность",
        "level": 4,
        "tone": "good"
      },
      {
        "label": "Метод позиций",
        "level": 4,
        "tone": "good"
      },
      {
        "label": "Контроль порядка и выбора",
        "level": 3,
        "tone": "good"
      },
      {
        "label": "«И» и «ИЛИ»",
        "level": 2,
        "tone": "process"
      }
    ],
    "materials": {
      "html": "24.08.26.html",
      "pdf": "../pdf_docs/24.08.26.pdf",
      "tex": "../tex_docs/24.08.26.tex"
    }
  },
  {
    "date": "2026-08-21",
    "ktpRefs": [],
    "href": "21.08.26.html",
    "title": "Классическая вероятность: табличный метод",
    "navTitle": "Классическая вероятность",
    "navSubtitle": "табличный перебор исходов",
    "summary": "Равновозможные исходы, дубли и очередность, организованный перебор в таблице, задачи на выбор, порядок и серии испытаний без формул комбинаторики.",
    "topics": [
      "равновозможные исходы",
      "табличный перебор",
      "выбор и порядок",
      "серии испытаний"
    ],
    "outcomes": [
      {
        "label": "Построение пространства исходов",
        "level": 3,
        "tone": "good"
      },
      {
        "label": "Контроль дублей и порядка",
        "level": 3,
        "tone": "good"
      },
      {
        "label": "Проверка m и n",
        "level": 2,
        "tone": "process"
      }
    ],
    "materials": {
      "html": "21.08.26.html",
      "pdf": "../pdf_docs/21.08.26.pdf",
      "tex": "../tex_docs/21.08.26.tex"
    }
  },
  {
    "date": "2026-08-14",
    "ktpRefs": [],
    "href": "14.08.26.html",
    "title": "Векторы на координатной плоскости",
    "navTitle": "Векторы",
    "navSubtitle": "координаты, длина и скалярное произведение",
    "summary": "Интерактивное занятие Ксении Клыковой по векторам на координатной плоскости: координаты, длина, скалярное произведение, угол и действия с векторами.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "14.08.26.html",
      "pdf": "../pdf_docs/14.08.26.pdf",
      "tex": "../tex_docs/14.08.26.tex"
    }
  },
  {
    "date": "2026-08-10",
    "ktpRefs": [],
    "href": "10.08.26.html",
    "title": "Повторение текстовых задач",
    "navTitle": "Текстовые задачи",
    "navSubtitle": "движение, работа, сплавы",
    "summary": "Интерактивное пособие Ксении Клыковой по повторению текстовых задач ЕГЭ.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "10.08.26.html",
      "pdf": "../pdf_docs/10.08.26.pdf",
      "tex": "../tex_docs/10.08.26.tex"
    }
  },
  {
    "date": "2026-08-07",
    "ktpRefs": [],
    "href": "07.08.26.html",
    "title": "Производительность и растворы",
    "navTitle": "Производительность и растворы",
    "navSubtitle": "таблицы и баланс вещества",
    "summary": "Интерактивное пособие Ксении Клыковой по текстовым задачам на производительность и растворы.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "07.08.26.html",
      "pdf": "../pdf_docs/07.08.26.pdf",
      "tex": "../tex_docs/07.08.26.tex"
    }
  },
  {
    "date": "2026-08-03",
    "ktpRefs": [],
    "href": "03.08.26.html",
    "title": "Текстовые задачи на движение",
    "navTitle": "Движение",
    "navSubtitle": "S–v–t, встреча и догонка",
    "summary": "Интерактивное пособие Ксении Клыковой по текстовым задачам на движение.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "03.08.26.html",
      "pdf": "../pdf_docs/03.08.26.pdf",
      "tex": "../tex_docs/03.08.26.tex"
    }
  },
  {
    "date": "2026-07-31",
    "ktpRefs": [],
    "href": "31.07.26.html",
    "title": "Прикладные модели, степени и линейная функция",
    "navTitle": "Модели и функции",
    "navSubtitle": "графики и самопроверка",
    "summary": "Интерактивное пособие для Ксении Клыковой: прикладные модели, степени и линейная функция.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "31.07.26.html",
      "pdf": "../pdf_docs/31.07.26.pdf",
      "tex": "../tex_docs/31.07.26.tex"
    }
  },
  {
    "date": "2026-07-20",
    "ktpRefs": [],
    "href": "20-07-26.html",
    "title": "Занятие 20.07.26",
    "navTitle": "Занятие 20.07",
    "navSubtitle": "профильная математика",
    "summary": "Ксения Клыкова: полный интерактивный конспект по графикам функций, методу узловых точек и пересечениям графиков.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "20-07-26.html",
      "pdf": "../pdf_docs/20.07.26.pdf",
      "tex": "../tex_docs/20.07.26.tex"
    }
  },
  {
    "date": "2026-07-15",
    "ktpRefs": [],
    "href": "15-07-26.html",
    "title": "Занятие 15.07.26",
    "navTitle": "Занятие 15.07",
    "navSubtitle": "профильная математика",
    "summary": "Ксения Клыкова: прикладные формулы, зависимости, степени и проверка ответа.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "15-07-26.html",
      "pdf": "../pdf_docs/15.07.26.pdf",
      "tex": "../tex_docs/15.07.26.tex"
    }
  }
];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
export function getRecentLessons(lessons=LESSONS,limit=RECENT_LIMIT){return sortedLessons(lessons).slice(0,Math.max(0,limit));}
export function getArchiveLessons(lessons=LESSONS,limit=RECENT_LIMIT){return sortedLessons(lessons).slice(Math.max(0,limit));}
export function paginateArchive(lessons=LESSONS,pageIndex=0,pageSize=ARCHIVE_PAGE_SIZE){const archive=getArchiveLessons(lessons);const safeSize=Math.max(1,Number(pageSize)||ARCHIVE_PAGE_SIZE);const pageCount=Math.max(1,Math.ceil(archive.length/safeSize));const safeIndex=Math.max(0,Math.min(pageCount-1,Number(pageIndex)||0));const start=safeIndex*safeSize;return {items:archive.slice(start,start+safeSize),pageIndex:safeIndex,pageCount,total:archive.length};}
function parseIsoDate(isoDate){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));if(!match)throw new Error('Invalid lesson date: '+isoDate);const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);if(month<1||month>12||day<1||day>31)throw new Error('Invalid lesson date: '+isoDate);return {year,month,day};}
export function formatShortDate(isoDate){const {month,day}=parseIsoDate(isoDate);return String(day).padStart(2,'0')+'.'+String(month).padStart(2,'0');}
export function formatLongDateRu(isoDate){const {year,month,day}=parseIsoDate(isoDate);return day+' '+MONTHS_GENITIVE[month-1]+' '+year;}
export function validateLessonRegistry(lessons=LESSONS){if(!Array.isArray(lessons)||lessons.length===0)throw new Error('Lesson registry is empty');const dates=new Set(),hrefs=new Set();let previousDate=null;lessons.forEach((lesson,index)=>{parseIsoDate(lesson.date);if(!lesson.href||!lesson.title||!lesson.navTitle)throw new Error('Lesson '+index+' is incomplete');if(dates.has(lesson.date))throw new Error('Duplicate lesson date: '+lesson.date);if(hrefs.has(lesson.href))throw new Error('Duplicate lesson href: '+lesson.href);if(previousDate!==null&&lesson.date>previousDate)throw new Error('Lesson registry must be sorted newest-first');dates.add(lesson.date);hrefs.add(lesson.href);previousDate=lesson.date;});const latest=lessons[0];if(!latest.summary||!Array.isArray(latest.topics)||latest.topics.length===0)throw new Error('Latest lesson requires summary and topics');if(!Array.isArray(latest.outcomes)||latest.outcomes.length===0)throw new Error('Latest lesson requires outcomes');if(!latest.materials||typeof latest.materials!=='object')throw new Error('Latest lesson requires materials metadata');return {count:lessons.length,latest:latest.href};}
