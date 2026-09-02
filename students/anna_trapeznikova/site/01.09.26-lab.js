(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function integer(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var next = a % b;
      a = b;
      b = next;
    }
    return a || 1;
  }

  function pow10(power) {
    return Math.pow(10, power);
  }

  function factorForFiniteDenominator(value) {
    var rest = Math.abs(value);
    var twos = 0;
    var fives = 0;
    while (rest > 0 && rest % 2 === 0) {
      rest /= 2;
      twos += 1;
    }
    while (rest > 0 && rest % 5 === 0) {
      rest /= 5;
      fives += 1;
    }
    return { rest: rest, twos: twos, fives: fives, finite: rest === 1 };
  }

  function analyzeFraction(rawNumerator, rawDenominator) {
    var numerator = integer(rawNumerator, 0);
    var denominator = clamp(Math.abs(integer(rawDenominator, 1)), 1, 24);
    var common = gcd(numerator, denominator);
    var reducedNumerator = numerator / common;
    var reducedDenominator = denominator / common;
    var sign = reducedNumerator < 0 ? '−' : '';
    var absoluteNumerator = Math.abs(reducedNumerator);
    var whole = Math.floor(absoluteNumerator / reducedDenominator);
    var remainder = absoluteNumerator % reducedDenominator;
    var initialRemainder = remainder;
    var seen = new Map();
    var digits = [];
    var steps = [];

    while (remainder !== 0 && !seen.has(remainder)) {
      seen.set(remainder, digits.length);
      var scaled = remainder * 10;
      var digit = Math.floor(scaled / reducedDenominator);
      var next = scaled % reducedDenominator;
      steps.push({
        index: digits.length,
        before: remainder,
        scaled: scaled,
        digit: digit,
        after: next
      });
      digits.push(String(digit));
      remainder = next;
    }

    var repeatAt = remainder === 0 ? -1 : seen.get(remainder);
    var prefix = repeatAt < 0 ? digits.join('') : digits.slice(0, repeatAt).join('');
    var period = repeatAt < 0 ? '' : digits.slice(repeatAt).join('');
    var decimal;
    if (initialRemainder === 0) {
      decimal = sign + String(whole);
    } else if (repeatAt < 0) {
      decimal = sign + String(whole) + ',' + (digits.join('') || '0');
    } else {
      decimal = sign + String(whole) + ',' + prefix + '(' + period + ')';
    }
    var factors = factorForFiniteDenominator(reducedDenominator);

    return {
      numerator: numerator,
      denominator: denominator,
      reducedNumerator: reducedNumerator,
      reducedDenominator: reducedDenominator,
      whole: whole,
      initialRemainder: initialRemainder,
      digits: digits,
      steps: steps,
      repeatAt: repeatAt,
      prefix: prefix,
      period: period,
      prefixLength: prefix.length,
      periodLength: period.length,
      finite: repeatAt < 0,
      decimal: decimal,
      factors: factors,
      value: numerator / denominator
    };
  }

  function periodicToFraction(rawWhole, rawDigits, rawSplit) {
    var whole = clamp(integer(rawWhole, 0), 0, 3);
    var digits = String(rawDigits || '').replace(/\D/g, '').slice(0, 6) || '0';
    var split = clamp(integer(rawSplit, 0), 0, Math.max(0, digits.length - 1));
    var prefix = digits.slice(0, split);
    var period = digits.slice(split) || '0';
    var m = prefix.length;
    var k = period.length;
    var prefixValue = prefix ? Number(prefix) : 0;
    var periodValue = Number(period);
    var A = whole * pow10(m) + prefixValue;
    var B = whole * pow10(m + k) + prefixValue * pow10(k) + periodValue;
    var numerator = B - A;
    var denominator = pow10(m) * (pow10(k) - 1);
    var common = gcd(numerator, denominator);
    var reducedNumerator = numerator / common;
    var reducedDenominator = denominator / common;
    var decimal = String(whole) + ',' + prefix + '(' + period + ')';

    return {
      whole: whole,
      digits: digits,
      split: split,
      prefix: prefix,
      period: period,
      m: m,
      k: k,
      A: A,
      B: B,
      numerator: numerator,
      denominator: denominator,
      reducedNumerator: reducedNumerator,
      reducedDenominator: reducedDenominator,
      decimal: decimal,
      value: reducedNumerator / reducedDenominator,
      nines: k,
      zeros: m
    };
  }

  function simplifyTerm(coefficient, radicand) {
    var coef = integer(coefficient, 0);
    var rad = clamp(integer(radicand, 1), 1, 50);
    var square = 1;
    for (var candidate = Math.floor(Math.sqrt(rad)); candidate >= 2; candidate -= 1) {
      if (rad % (candidate * candidate) === 0) {
        square = candidate;
        break;
      }
    }
    return {
      sourceCoefficient: coef,
      sourceRadicand: rad,
      outside: coef * square,
      inside: rad / (square * square),
      square: square,
      value: coef * Math.sqrt(rad)
    };
  }

  function analyzeRadicals(a, n, b, m) {
    var left = simplifyTerm(a, n);
    var right = simplifyTerm(b, m);
    var leftZero = left.outside === 0;
    var rightZero = right.outside === 0;
    var like = left.inside === right.inside || leftZero || rightZero;
    var combined = left.inside === right.inside ? left.outside + right.outside : null;
    var rational = false;
    var value = left.value + right.value;
    var result;
    if (leftZero && rightZero) {
      result = '0';
      combined = 0;
      rational = true;
    } else if (leftZero) {
      result = termText(right.outside, right.inside, true);
      rational = right.inside === 1;
    } else if (rightZero) {
      result = termText(left.outside, left.inside, true);
      rational = left.inside === 1;
    } else if (left.inside === right.inside) {
      rational = combined === 0 || left.inside === 1;
      if (combined === 0) result = '0';
      else if (left.inside === 1) result = String(combined);
      else result = String(combined) + '√' + String(left.inside);
    } else {
      rational = left.inside === 1 && right.inside === 1;
      result = termText(left.outside, left.inside, true) + termText(right.outside, right.inside, false);
    }
    return {
      left: left,
      right: right,
      like: like,
      combined: combined,
      rational: rational,
      value: value,
      result: result
    };
  }

  function termText(coefficient, inside, first) {
    if (coefficient === 0) return first ? '0' : '';
    var sign = coefficient < 0 ? '−' : (first ? '' : '+');
    var absolute = Math.abs(coefficient);
    var coef = absolute === 1 && inside !== 1 ? '' : String(absolute);
    var root = inside === 1 ? '' : '√' + String(inside);
    return sign + coef + root;
  }

  function classifySet(kind, a, b) {
    var label = '';
    var exact = '';
    var set = 'Q';
    var rank = 3;
    if (kind === 'integer') {
      var intValue = integer(a, 0);
      label = String(intValue).replace('-', '−');
      exact = label;
      set = intValue > 0 ? 'N' : 'Z';
      rank = set === 'N' ? 1 : 2;
    } else if (kind === 'fraction') {
      var numerator = integer(a, 1);
      var denominator = clamp(Math.abs(integer(b, 2)), 1, 24);
      var common = gcd(numerator, denominator);
      var rn = numerator / common;
      var rd = denominator / common;
      label = String(numerator) + '/' + String(denominator);
      exact = String(rn) + '/' + String(rd);
      if (rd === 1) {
        set = rn > 0 ? 'N' : 'Z';
        rank = set === 'N' ? 1 : 2;
      }
    } else if (kind === 'finite') {
      var tenths = clamp(integer(a, 25), -99, 99);
      label = String(tenths / 10).replace('.', ',');
      exact = String(tenths) + '/10';
      if (tenths % 10 === 0) {
        set = tenths > 0 ? 'N' : 'Z';
        rank = set === 'N' ? 1 : 2;
      }
    } else if (kind === 'periodic') {
      var digit = clamp(Math.abs(integer(a, 37)), 1, 99);
      label = '0,(' + String(digit) + ')';
      exact = String(digit) + '/' + String(pow10(String(digit).length) - 1);
    } else {
      var radicand = clamp(integer(a, 7), 0, 100);
      var root = Math.sqrt(radicand);
      label = '√' + String(radicand);
      if (Number.isInteger(root)) {
        exact = String(root);
        set = root > 0 ? 'N' : 'Z';
        rank = set === 'N' ? 1 : 2;
      } else {
        exact = 'иррациональное';
        set = 'I';
        rank = 4;
      }
    }
    return { kind: kind, label: label, exact: exact, set: set, rank: rank };
  }

  var LabMath = {
    gcd: gcd,
    analyzeFraction: analyzeFraction,
    periodicToFraction: periodicToFraction,
    simplifyTerm: simplifyTerm,
    analyzeRadicals: analyzeRadicals,
    classifySet: classifySet,
    factorForFiniteDenominator: factorForFiniteDenominator
  };

  var SCENARIOS = {
    decimal: [
      { id: 'd-basic', title: 'Базовый · 2/3', state: { numerator: 2, denominator: 3 } },
      { id: 'd-finite', title: 'Контраст · 3/5', state: { numerator: 3, denominator: 5 } },
      { id: 'd-mixed', title: 'Предпериод · 5/18', state: { numerator: 5, denominator: 18 } },
      { id: 'd-long', title: 'Длинный цикл · 1/7', state: { numerator: 1, denominator: 7 } },
      { id: 'd-boundary', title: 'Граница · 7/20', state: { numerator: 7, denominator: 20 } }
    ],
    period: [
      { id: 'p-basic', title: 'Базовый · 0,(15)', state: { whole: 0, digits: '15', split: 0 } },
      { id: 'p-prefix', title: 'С предпериодом · 0,23(18)', state: { whole: 0, digits: '2318', split: 2 } },
      { id: 'p-whole', title: 'С целой частью · 1,2(34)', state: { whole: 1, digits: '234', split: 1 } },
      { id: 'p-nine', title: 'Неожиданное · 0,(9)', state: { whole: 0, digits: '9', split: 0 } },
      { id: 'p-zero', title: 'Нуль в периоде · 0,1(06)', state: { whole: 0, digits: '106', split: 1 } }
    ],
    sets: [
      { id: 's-root-natural', title: 'Корень-квадрат · √81', state: { kind: 'root', a: 81, b: 1 } },
      { id: 's-zero', title: 'Граница · 0', state: { kind: 'integer', a: 0, b: 1 } },
      { id: 's-periodic', title: 'Периодическая · 0,(37)', state: { kind: 'periodic', a: 37, b: 99 } },
      { id: 's-irrational', title: 'Иррациональная · √7', state: { kind: 'root', a: 7, b: 1 } },
      { id: 's-reduced', title: 'Сокращение · 6/3', state: { kind: 'fraction', a: 6, b: 3 } }
    ],
    radical: [
      { id: 'r-cancel', title: 'Полное сокращение', state: { a: 2, n: 12, b: -4, m: 3 } },
      { id: 'r-like', title: 'Подобные корни', state: { a: 1, n: 18, b: -3, m: 2 } },
      { id: 'r-sum', title: 'Сумма · √12 + √3', state: { a: 1, n: 12, b: 1, m: 3 } },
      { id: 'r-unlike', title: 'Разные корни', state: { a: 1, n: 2, b: 1, m: 3 } },
      { id: 'r-rational', title: 'Оба корня точные', state: { a: 2, n: 9, b: -1, m: 16 } }
    ]
  };

  var MODE_META = {
    decimal: { title: 'Орбита остатков', label: 'Деление дроби', color: 'var(--teal)' },
    period: { title: 'Конструктор периода', label: 'Период → дробь', color: 'var(--coral)' },
    sets: { title: 'Карта числовых множеств', label: 'Классификация', color: 'var(--gold)' },
    radical: { title: 'Баланс радикалов', label: 'Упрощение корней', color: 'var(--teal)' }
  };

  function createInitialState() {
    return {
      mode: 'decimal',
      scenarioId: 'd-basic',
      sandbox: false,
      decimal: { numerator: 2, denominator: 3, step: 0 },
      period: { whole: 0, digits: '15', split: 0, step: 0 },
      sets: { kind: 'root', a: 81, b: 1, step: 0 },
      radical: { a: 2, n: 12, b: -4, m: 3, step: 0 },
      ui: { playing: false, speed: 1, labels: true, guides: true, zoom: 1, panX: 0, panY: 0, highlight: '' },
      prediction: { choice: '', checked: false },
      comparison: { A: null, B: null },
      challengesDone: {}
    };
  }

  function AnnaLab(options) {
    this.options = options || {};
    this.state = createInitialState();
    this.els = {};
    this.renderQueued = false;
    this.animationFrame = 0;
    this.lastAnimationTime = 0;
    this.drag = null;
  }

  AnnaLab.prototype.query = function (selector) {
    return document.querySelector(selector);
  };

  AnnaLab.prototype.queryAll = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };

  AnnaLab.prototype.init = function () {
    var ids = [
      'modelTitle', 'modelDialogTitle', 'labModeLabel', 'scenarioSelect', 'sandboxToggle', 'labControls',
      'stateMetrics', 'modalMetrics', 'modelSvg', 'modelSvgLarge', 'timelineRange',
      'timelineOutput', 'modalTimelineRange', 'modalTimelineOutput', 'causeValue',
      'effectValue', 'modelNote', 'modalModelNote', 'discoveryNote', 'interactiveLegend',
      'predictionQuestion', 'predictionOptions', 'predictionFeedback', 'challengeText',
      'challengeBar', 'challengeScore', 'checkChallenge', 'challengeFeedback',
      'labelsToggle', 'guidesToggle', 'speedSelect', 'zoomRange', 'zoomOutput',
      'clearSnapshots', 'snapshotA', 'snapshotB', 'comparisonBars', 'modelDialog'
    ];
    for (var i = 0; i < ids.length; i += 1) this.els[ids[i]] = this.query('#' + ids[i]);
    this.bindStaticEvents();
    this.applyScenario('d-basic', false);
    this.setMode('decimal');
    return this;
  };

  AnnaLab.prototype.modeState = function () {
    return this.state[this.state.mode];
  };

  AnnaLab.prototype.setMode = function (mode) {
    if (!SCENARIOS[mode]) return;
    var changed = this.state.mode !== mode;
    this.state.mode = mode;
    this.state.ui.playing = false;
    if (changed || !SCENARIOS[mode].some(function (item) { return item.id === this.state.scenarioId; }, this)) {
      this.applyScenario(SCENARIOS[mode][0].id, false);
    }
    this.state.mode = mode;
    this.buildScenarioSelect();
    this.buildControls();
    this.scheduleRender();
  };

  AnnaLab.prototype.applyScenario = function (id, shouldRender) {
    var mode = this.state.mode;
    var scenario = SCENARIOS[mode].find(function (item) { return item.id === id; });
    if (!scenario) return;
    Object.assign(this.state[mode], scenario.state, { step: 0 });
    this.state.scenarioId = scenario.id;
    this.state.sandbox = false;
    this.state.ui.playing = false;
    this.state.prediction = { choice: '', checked: false };
    if (shouldRender !== false) {
      this.buildControls();
      this.scheduleRender();
    }
  };

  AnnaLab.prototype.makeCustom = function () {
    this.state.sandbox = true;
    this.state.scenarioId = 'custom';
    this.state.ui.playing = false;
    this.state.prediction = { choice: '', checked: false };
    this.modeState().step = 0;
    this.syncScenarioUi();
    this.scheduleRender();
  };

  AnnaLab.prototype.buildScenarioSelect = function () {
    var select = this.els.scenarioSelect;
    if (!select) return;
    select.textContent = '';
    SCENARIOS[this.state.mode].forEach(function (scenario) {
      var option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.title;
      select.appendChild(option);
    });
    var custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Исследовать самому';
    select.appendChild(custom);
    this.syncScenarioUi();
  };

  AnnaLab.prototype.syncScenarioUi = function () {
    if (this.els.scenarioSelect) this.els.scenarioSelect.value = this.state.sandbox ? 'custom' : this.state.scenarioId;
    if (this.els.sandboxToggle) {
      this.els.sandboxToggle.classList.toggle('active', this.state.sandbox);
      this.els.sandboxToggle.setAttribute('aria-pressed', String(this.state.sandbox));
      this.els.sandboxToggle.textContent = this.state.sandbox ? 'Свободный режим включён' : 'Исследовать самому';
    }
  };

  AnnaLab.prototype.controlRange = function (field, label, min, max, value, step) {
    return '<label class="control-card"><span class="control-label">' + label + '<output data-output="' + field + '">' + value + '</output></span>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + value +
      '" data-lab-field="' + field + '" aria-label="' + label + '"></label>';
  };

  AnnaLab.prototype.buildControls = function () {
    var controls = this.els.labControls;
    if (!controls) return;
    var mode = this.state.mode;
    var current = this.modeState();
    var html = '';
    if (mode === 'decimal') {
      html = this.controlRange('numerator', 'Числитель', -20, 20, current.numerator, 1) +
        this.controlRange('denominator', 'Знаменатель', 1, 24, current.denominator, 1);
    } else if (mode === 'period') {
      html = this.controlRange('whole', 'Целая часть', 0, 3, current.whole, 1) +
        '<label class="control-card"><span class="control-label">Цифры после запятой<output data-output="digits">' + current.digits + '</output></span>' +
        '<input type="text" inputmode="numeric" maxlength="6" value="' + current.digits +
        '" data-lab-field="digits" aria-label="Цифры предпериода и периода"></label>' +
        this.controlRange('split', 'Длина предпериода', 0, Math.max(0, current.digits.length - 1), current.split, 1);
    } else if (mode === 'sets') {
      html = '<label class="control-card"><span class="control-label">Вид записи</span><select data-lab-field="kind" aria-label="Вид числа">' +
        '<option value="integer">целое число</option><option value="fraction">обыкновенная дробь</option>' +
        '<option value="finite">конечная десятичная</option><option value="periodic">периодическая</option>' +
        '<option value="root">квадратный корень</option></select></label>';
      var label = current.kind === 'root' ? 'Подкоренное число' : (current.kind === 'periodic' ? 'Цифры периода' : 'Числитель / значение');
      html += this.controlRange('a', label, current.kind === 'root' ? 0 : -99, current.kind === 'root' ? 100 : 99, current.a, 1);
      if (current.kind === 'fraction') html += this.controlRange('b', 'Знаменатель', 1, 24, current.b, 1);
    } else {
      html = this.controlRange('a', 'Коэффициент a', -6, 6, current.a, 1) +
        this.controlRange('n', 'Подкоренное n', 1, 50, current.n, 1) +
        this.controlRange('b', 'Коэффициент b', -6, 6, current.b, 1) +
        this.controlRange('m', 'Подкоренное m', 1, 50, current.m, 1);
    }
    controls.innerHTML = html;
    if (mode === 'sets') controls.querySelector('[data-lab-field="kind"]').value = current.kind;
    this.bindControlEvents();
  };

  AnnaLab.prototype.bindControlEvents = function () {
    var self = this;
    this.queryAll('[data-lab-field]', this.els.labControls).forEach(function (control) {
      var eventName = control.tagName === 'SELECT' ? 'change' : 'input';
      control.addEventListener(eventName, function () {
        var field = control.dataset.labField;
        var current = self.modeState();
        if (field === 'digits') {
          current.digits = control.value.replace(/\D/g, '').slice(0, 6) || '0';
          control.value = current.digits;
          current.split = clamp(current.split, 0, Math.max(0, current.digits.length - 1));
          self.buildControls();
        } else if (field === 'kind') {
          current.kind = control.value;
          if (current.kind === 'root') current.a = clamp(Math.abs(current.a), 0, 100);
          if (current.kind === 'fraction') current.b = clamp(Math.abs(current.b || 2), 1, 24);
          self.buildControls();
        } else {
          current[field] = integer(control.value, current[field]);
        }
        self.makeCustom();
        self.syncControlOutputs();
        self.scheduleRender();
      });
    });
  };

  AnnaLab.prototype.syncControlOutputs = function () {
    var current = this.modeState();
    this.queryAll('[data-output]', this.els.labControls).forEach(function (output) {
      var field = output.dataset.output;
      output.textContent = current[field];
    });
    this.queryAll('[data-lab-field]', this.els.labControls).forEach(function (control) {
      var field = control.dataset.labField;
      if (field in current && document.activeElement !== control) control.value = String(current[field]);
      if (field === 'split') control.max = String(Math.max(0, current.digits.length - 1));
    });
  };

  AnnaLab.prototype.derive = function () {
    var mode = this.state.mode;
    var current = this.modeState();
    if (mode === 'decimal') {
      var fraction = LabMath.analyzeFraction(current.numerator, current.denominator);
      return {
        mode: mode,
        data: fraction,
        maxStep: fraction.steps.length,
        result: fraction.decimal,
        answer: fraction.finite ? 'finite' : 'periodic',
        metrics: [
          ['Дробь', String(current.numerator) + '/' + String(current.denominator)],
          ['Результат', fraction.decimal],
          ['Предпериод', String(fraction.prefixLength)],
          ['Период', fraction.finite ? 'нет' : String(fraction.periodLength)]
        ]
      };
    }
    if (mode === 'period') {
      var periodic = LabMath.periodicToFraction(current.whole, current.digits, current.split);
      return {
        mode: mode,
        data: periodic,
        maxStep: 4,
        result: String(periodic.reducedNumerator) + '/' + String(periodic.reducedDenominator),
        answer: periodic.zeros ? 'mixed' : 'pure',
        metrics: [
          ['Запись', periodic.decimal],
          ['Предпериод', String(periodic.m)],
          ['Период', String(periodic.k)],
          ['Дробь', String(periodic.reducedNumerator) + '/' + String(periodic.reducedDenominator)]
        ]
      };
    }
    if (mode === 'sets') {
      var classification = LabMath.classifySet(current.kind, current.a, current.b);
      return {
        mode: mode,
        data: classification,
        maxStep: 1,
        result: classification.set,
        answer: classification.set,
        metrics: [
          ['Число', classification.label],
          ['Точная форма', classification.exact],
          ['Наименьшее множество', classification.set],
          ['Уровень вложения', String(classification.rank)]
        ]
      };
    }
    var radicals = LabMath.analyzeRadicals(current.a, current.n, current.b, current.m);
    return {
      mode: mode,
      data: radicals,
      maxStep: 3,
      result: radicals.result,
      answer: radicals.rational ? 'rational' : 'irrational',
      metrics: [
        ['Левый корень', termText(radicals.left.outside, radicals.left.inside, true)],
        ['Правый корень', termText(radicals.right.outside, radicals.right.inside, true)],
        ['Результат', radicals.result],
        ['Тип', radicals.rational ? 'рациональное' : 'иррациональное']
      ]
    };
  };

  AnnaLab.prototype.scheduleRender = function () {
    var self = this;
    if (this.renderQueued) return;
    this.renderQueued = true;
    global.requestAnimationFrame(function () {
      self.renderQueued = false;
      self.render();
    });
  };

  AnnaLab.prototype.render = function () {
    var derived = this.derive();
    var current = this.modeState();
    current.step = clamp(current.step, 0, derived.maxStep);
    var meta = MODE_META[this.state.mode];
    if (this.els.modelTitle) this.els.modelTitle.textContent = meta.title;
    if (this.els.modelDialogTitle) this.els.modelDialogTitle.textContent = meta.title;
    if (this.els.labModeLabel) this.els.labModeLabel.textContent = meta.label;
    this.queryAll('[data-mode]').forEach(function (button) {
      var active = button.dataset.mode === this.state.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }, this);
    this.syncScenarioUi();
    this.syncControlOutputs();
    this.renderMetrics(this.els.stateMetrics, derived.metrics);
    this.renderMetrics(this.els.modalMetrics, derived.metrics);
    this.renderTimeline(derived);
    this.renderCauseEffect(derived);
    this.renderNotes(derived);
    this.renderLegend();
    this.renderPrediction(derived);
    this.renderChallenge(derived);
    this.renderComparison();
    this.renderSvg(this.els.modelSvg, derived);
    this.renderSvg(this.els.modelSvgLarge, derived);
    if (this.state.ui.activeLink) this.applyActiveLink(this.state.ui.activeLink);
  };

  AnnaLab.prototype.renderMetrics = function (container, metrics) {
    if (!container) return;
    container.textContent = '';
    metrics.forEach(function (metric) {
      var card = document.createElement('div');
      card.className = 'metric';
      var label = document.createElement('strong');
      label.textContent = metric[0];
      var value = document.createElement('strong');
      value.textContent = metric[1];
      card.append(label, value);
      container.appendChild(card);
    });
  };

  AnnaLab.prototype.renderTimeline = function (derived) {
    var step = this.modeState().step;
    var ranges = [this.els.timelineRange, this.els.modalTimelineRange];
    var outputs = [this.els.timelineOutput, this.els.modalTimelineOutput];
    ranges.forEach(function (range) {
      if (!range) return;
      range.max = String(derived.maxStep);
      range.value = String(step);
    });
    outputs.forEach(function (output) {
      if (output) output.textContent = String(step) + ' / ' + String(derived.maxStep);
    });
    this.queryAll('[data-lab-action="play"]').forEach(function (button) {
      button.textContent = this.state.ui.playing ? '❚❚' : '▶';
      button.setAttribute('aria-label', this.state.ui.playing ? 'Поставить эксперимент на паузу' : 'Запустить эксперимент');
    }, this);
  };

  AnnaLab.prototype.renderCauseEffect = function (derived) {
    var step = this.modeState().step;
    var cause = '';
    var effect = '';
    if (derived.mode === 'decimal') {
      var fraction = derived.data;
      var currentStep = fraction.steps[Math.max(0, Math.min(step - 1, fraction.steps.length - 1))];
      cause = step && currentStep ? 'остаток ' + currentStep.before + ' умножен на 10' : 'заданы числитель и знаменатель';
      effect = step && currentStep ? 'цифра ' + currentStep.digit + ', новый остаток ' + currentStep.after : 'готова цепочка деления';
    } else if (derived.mode === 'period') {
      cause = 'предпериод: ' + derived.data.m + ', период: ' + derived.data.k;
      effect = derived.data.k + ' девяток и ' + derived.data.m + ' нулей в знаменателе';
    } else if (derived.mode === 'sets') {
      cause = 'запись ' + derived.data.label + ' сначала вычислена';
      effect = 'наименьшее множество: ' + derived.data.set;
    } else {
      cause = derived.data.like ? 'после упрощения корни подобны' : 'подкоренные части различаются';
      effect = derived.data.like ? 'коэффициенты можно сложить: ' + derived.data.result : 'слагаемые остаются разными';
    }
    if (this.els.causeValue) this.els.causeValue.textContent = cause;
    if (this.els.effectValue) this.els.effectValue.textContent = effect;
  };

  AnnaLab.prototype.noteText = function (derived) {
    var step = this.modeState().step;
    if (derived.mode === 'decimal') {
      if (step === 0) return 'Сделайте прогноз, затем запускайте деление. Каждый новый остаток определяет следующую цифру.';
      var item = derived.data.steps[step - 1];
      if (!item) return 'Деление завершено.';
      var suffix = item.after === 0 ? ' Остаток стал нулём: запись конечна.' :
        (derived.data.repeatAt >= 0 && step === derived.maxStep ? ' Остаток уже встречался: начался цикл.' : '');
      return String(item.before) + ' × 10 = ' + String(item.digit) + ' × ' + String(derived.data.reducedDenominator) +
        ' + ' + String(item.after) + '.' + suffix;
    }
    if (derived.mode === 'period') {
      var notes = [
        'Отметьте границу: слева предпериод, справа повторяющийся блок.',
        'Сдвигаем запятую сначала на длину предпериода.',
        'Второй сдвиг охватывает предпериод и один полный период.',
        'Вычитаем: повторяющиеся хвосты взаимно уничтожаются.',
        'Сокращаем точную дробь и проверяем обратным делением.'
      ];
      return notes[step];
    }
    if (derived.mode === 'sets') {
      return step ? 'Сначала вычисляем значение, затем выбираем самое узкое подходящее множество.' :
        'Сделайте прогноз по внешнему виду записи, потом откройте результат.';
    }
    var radicalNotes = [
      'Разложите каждое подкоренное число на полный квадрат и остаточный множитель.',
      'Квадратный множитель выходит из-под корня и меняет коэффициент.',
      'Сравните остаточные подкоренные части: только одинаковые корни складываются.',
      'Полученный результат определяет тип числа.'
    ];
    return radicalNotes[step];
  };

  AnnaLab.prototype.renderNotes = function (derived) {
    var note = this.noteText(derived);
    if (this.els.modelNote) this.els.modelNote.textContent = note;
    if (this.els.modalModelNote) this.els.modalModelNote.textContent = note;
    var discovery = '';
    if (derived.mode === 'decimal') {
      if (derived.data.periodLength >= 6) discovery = 'Открытие: знаменатель ' + derived.data.reducedDenominator +
        ' создал длинный цикл из ' + derived.data.periodLength + ' разных ненулевых остатков.';
      else if (derived.data.finite) discovery = 'Обратите внимание: после сокращения в знаменателе остались только множители 2 и 5.';
      else if (derived.data.prefixLength) discovery = 'Интересный случай: цикл начинается после ' + derived.data.prefixLength + ' неповторяющихся цифр.';
    } else if (derived.mode === 'period' && derived.data.reducedNumerator === derived.data.reducedDenominator) {
      discovery = 'Неожиданный результат: 0,(9) и 1 — две записи одного числа.';
    } else if (derived.mode === 'sets' && this.modeState().kind === 'root' && derived.data.set !== 'I') {
      discovery = 'Обратите внимание: знак корня исчез после вычисления. Тип определяется значением; внешний вид записи вторичен.';
    } else if (derived.mode === 'radical' && derived.data.like && derived.data.combined === 0) {
      discovery = 'Открытие: два иррациональных слагаемых полностью сократились, и результат стал рациональным нулём.';
    }
    if (this.els.discoveryNote) {
      this.els.discoveryNote.hidden = !discovery;
      this.els.discoveryNote.classList.toggle('show', Boolean(discovery));
      this.els.discoveryNote.textContent = discovery;
    }
  };

  AnnaLab.prototype.predictionConfig = function (derived) {
    if (derived.mode === 'decimal') {
      return {
        question: 'Как завершится деление?',
        options: [['finite', 'Конечная запись'], ['periodic', 'Появится период']],
        correct: derived.answer,
        explanation: derived.data.finite ?
          'После сокращения знаменатель содержит только 2 и 5, поэтому остаток дошёл до нуля.' :
          'В знаменателе после сокращения остался иной простой множитель, поэтому ненулевой остаток повторился.'
      };
    }
    if (derived.mode === 'period') {
      return {
        question: 'Как устроен знаменатель до сокращения?',
        options: [['pure', 'Только девятки'], ['mixed', 'Девятки, затем нули']],
        correct: derived.answer,
        explanation: 'Девяток столько, сколько цифр в периоде; нулей столько, сколько цифр в предпериоде.'
      };
    }
    if (derived.mode === 'sets') {
      return {
        question: 'Какое множество будет самым узким?',
        options: [['N', 'N'], ['Z', 'Z'], ['Q', 'Q'], ['I', 'I']],
        correct: derived.answer,
        explanation: 'Классифицируем вычисленное значение: ' + derived.data.exact + '.'
      };
    }
    return {
      question: 'Каким будет результат после упрощения?',
      options: [['rational', 'Рациональным'], ['irrational', 'Иррациональным']],
      correct: derived.answer,
      explanation: derived.data.like ?
        'Остаточные корни одинаковы; решает сумма коэффициентов.' :
        'Остались разные иррациональные корни, которые нельзя объединить.'
    };
  };

  AnnaLab.prototype.renderPrediction = function (derived) {
    var config = this.predictionConfig(derived);
    if (this.els.predictionQuestion) this.els.predictionQuestion.textContent = config.question;
    if (!this.els.predictionOptions) return;
    this.els.predictionOptions.textContent = '';
    var self = this;
    config.options.forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = option[1];
      button.dataset.prediction = option[0];
      button.classList.toggle('selected', self.state.prediction.choice === option[0]);
      button.setAttribute('aria-pressed', String(self.state.prediction.choice === option[0]));
      button.addEventListener('click', function () {
        self.state.prediction.choice = option[0];
        self.state.prediction.checked = false;
        self.scheduleRender();
      });
      self.els.predictionOptions.appendChild(button);
    });
    var feedback = '';
    if (this.state.prediction.choice && this.modeState().step < derived.maxStep) {
      feedback = 'Прогноз записан. Запустите или пролистайте эксперимент до конца.';
    } else if (this.state.prediction.choice && this.modeState().step === derived.maxStep) {
      var correct = this.state.prediction.choice === config.correct;
      feedback = (correct ? 'Прогноз подтвердился. ' : 'Результат оказался другим. ') + config.explanation;
    }
    if (this.els.predictionFeedback) this.els.predictionFeedback.textContent = feedback;
  };

  AnnaLab.prototype.challengeConfig = function (derived) {
    var current = this.modeState();
    if (derived.mode === 'decimal') {
      return {
        text: 'Вызов: получите конечную нецелую дробь со знаменателем 8.',
        done: current.denominator === 8 && Math.abs(current.numerator) % 8 !== 0 && derived.data.finite
      };
    }
    if (derived.mode === 'period') {
      return {
        text: 'Вызов: создайте запись с двумя цифрами предпериода и двумя цифрами периода.',
        done: derived.data.m === 2 && derived.data.k === 2
      };
    }
    if (derived.mode === 'sets') {
      return {
        text: 'Вызов: задайте квадратный корень, который попадёт в N.',
        done: current.kind === 'root' && derived.data.set === 'N'
      };
    }
    return {
      text: 'Вызов: добейтесь точного нуля сокращением подобных радикалов.',
      done: derived.data.like && derived.data.combined === 0
    };
  };

  AnnaLab.prototype.renderChallenge = function (derived) {
    var challenge = this.challengeConfig(derived);
    if (this.els.challengeText) this.els.challengeText.textContent = challenge.text;
    var doneCount = Object.keys(this.state.challengesDone).length;
    if (this.els.challengeScore) this.els.challengeScore.textContent = String(doneCount) + ' / 4';
    if (this.els.challengeBar) this.els.challengeBar.style.width = String(doneCount * 25) + '%';
    if (this.els.challengeFeedback && this.els.challengeFeedback.dataset.mode !== this.state.mode) {
      this.els.challengeFeedback.textContent = '';
    }
    if (this.els.checkChallenge) this.els.checkChallenge.dataset.ready = String(challenge.done);
  };

  AnnaLab.prototype.snapshot = function (slot) {
    var derived = this.derive();
    var metric = 0;
    if (derived.mode === 'decimal') metric = derived.data.periodLength || derived.data.digits.length;
    if (derived.mode === 'period') metric = derived.data.m + derived.data.k;
    if (derived.mode === 'sets') metric = derived.data.rank;
    if (derived.mode === 'radical') metric = Math.min(12, Math.abs(derived.data.value));
    this.state.comparison[slot] = {
      mode: derived.mode,
      title: MODE_META[derived.mode].label,
      result: derived.result,
      metric: metric,
      params: Object.assign({}, this.modeState())
    };
    this.scheduleRender();
  };

  AnnaLab.prototype.renderComparison = function () {
    var self = this;
    ['A', 'B'].forEach(function (slot) {
      var target = self.els['snapshot' + slot];
      if (!target) return;
      var shot = self.state.comparison[slot];
      target.textContent = '';
      var strong = document.createElement('strong');
      strong.textContent = 'Снимок ' + slot;
      target.appendChild(strong);
      target.appendChild(document.createTextNode(shot ? shot.title + ': ' + shot.result : 'пока пуст'));
    });
    if (!this.els.comparisonBars) return;
    this.els.comparisonBars.textContent = '';
    var a = this.state.comparison.A;
    var b = this.state.comparison.B;
    if (!a || !b) return;
    var max = Math.max(1, a.metric, b.metric);
    [a, b].forEach(function (shot, index) {
      var row = document.createElement('div');
      row.className = 'comparison-bar';
      row.style.setProperty('--bar-color', index ? 'var(--coral)' : 'var(--teal)');
      var label = document.createElement('span');
      label.textContent = index ? 'B' : 'A';
      var track = document.createElement('span');
      var fill = document.createElement('i');
      fill.style.width = String(shot.metric / max * 100) + '%';
      track.appendChild(fill);
      var value = document.createElement('em');
      value.textContent = String(Math.round(shot.metric * 100) / 100);
      row.append(label, track, value);
      self.els.comparisonBars.appendChild(row);
    });
  };

  AnnaLab.prototype.renderLegend = function () {
    if (!this.els.interactiveLegend) return;
    var definitions = {
      decimal: [['input', 'Бирюзовый маркер', 'можно тянуть'], ['process', 'Графитовая орбита', 'остатки'], ['result', 'Коралловый акцент', 'текущий шаг']],
      period: [['prefix', 'Золотые ячейки', 'предпериод'], ['period', 'Бирюзовые ячейки', 'период'], ['result', 'Коралловая формула', 'результат']],
      sets: [['process', 'Вложенные области', 'множества'], ['input', 'Маркер числа', 'исследуемый объект'], ['result', 'Яркая область', 'ответ']],
      radical: [['input', 'Бирюзовые ручки', 'коэффициенты'], ['process', 'Карточки', 'упрощение'], ['result', 'Коралловая сумма', 'результат']]
    };
    this.els.interactiveLegend.textContent = '';
    var self = this;
    definitions[this.state.mode].forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'legend-button';
      button.dataset.layer = item[0];
      button.style.setProperty('--legend-color', item[0] === 'result' ? 'var(--coral)' : (item[0] === 'prefix' ? 'var(--gold)' : 'var(--teal)'));
      button.innerHTML = '<i></i><span><strong>' + item[1] + '</strong>' + item[2] + '</span>';
      button.addEventListener('mouseenter', function () { self.highlightLayer(item[0]); });
      button.addEventListener('focus', function () { self.highlightLayer(item[0]); });
      button.addEventListener('mouseleave', function () { self.highlightLayer(''); });
      button.addEventListener('blur', function () { self.highlightLayer(''); });
      self.els.interactiveLegend.appendChild(button);
    });
  };

  AnnaLab.prototype.highlightLayer = function (layer) {
    this.state.ui.highlight = layer;
    [this.els.modelSvg, this.els.modelSvgLarge].forEach(function (svg) {
      if (!svg) return;
      Array.prototype.forEach.call(svg.querySelectorAll('[data-layer]'), function (node) {
        node.style.opacity = layer && node.dataset.layer !== layer ? '0.18' : '1';
      });
    });
  };

  AnnaLab.prototype.bindStaticEvents = function () {
    var self = this;
    this.queryAll('[data-mode]').forEach(function (button) {
      button.addEventListener('click', function () { self.setMode(button.dataset.mode); });
    });
    if (this.els.scenarioSelect) {
      this.els.scenarioSelect.addEventListener('change', function () {
        if (self.els.scenarioSelect.value === 'custom') self.makeCustom();
        else self.applyScenario(self.els.scenarioSelect.value);
      });
    }
    if (this.els.sandboxToggle) {
      this.els.sandboxToggle.addEventListener('click', function () {
        if (self.state.sandbox) self.applyScenario(SCENARIOS[self.state.mode][0].id);
        else self.makeCustom();
      });
    }
    [this.els.timelineRange, this.els.modalTimelineRange].forEach(function (range) {
      if (!range) return;
      range.addEventListener('input', function () {
        self.state.ui.playing = false;
        self.modeState().step = integer(range.value, 0);
        self.scheduleRender();
      });
    });
    this.queryAll('[data-lab-action]').forEach(function (button) {
      button.addEventListener('click', function () { self.handleAction(button.dataset.labAction, button); });
    });
    if (this.els.labelsToggle) this.els.labelsToggle.addEventListener('change', function () {
      self.state.ui.labels = self.els.labelsToggle.checked;
      self.scheduleRender();
    });
    if (this.els.guidesToggle) this.els.guidesToggle.addEventListener('change', function () {
      self.state.ui.guides = self.els.guidesToggle.checked;
      self.scheduleRender();
    });
    if (this.els.speedSelect) this.els.speedSelect.addEventListener('change', function () {
      self.state.ui.speed = Number(self.els.speedSelect.value) || 1;
    });
    if (this.els.zoomRange) this.els.zoomRange.addEventListener('input', function () {
      self.state.ui.zoom = Number(self.els.zoomRange.value) || 1;
      self.scheduleRender();
    });
    this.queryAll('[data-snapshot]').forEach(function (button) {
      button.addEventListener('click', function () { self.snapshot(button.dataset.snapshot); });
    });
    if (this.els.clearSnapshots) this.els.clearSnapshots.addEventListener('click', function () {
      self.state.comparison.A = null;
      self.state.comparison.B = null;
      self.scheduleRender();
    });
    if (this.els.checkChallenge) this.els.checkChallenge.addEventListener('click', function () {
      var derived = self.derive();
      var challenge = self.challengeConfig(derived);
      self.els.challengeFeedback.dataset.mode = self.state.mode;
      if (challenge.done) {
        self.state.challengesDone[self.state.mode] = true;
        self.els.challengeFeedback.textContent = 'Готово! Закономерность воспроизведена самостоятельно.';
      } else {
        self.els.challengeFeedback.textContent = 'Условие пока не выполнено. Меняйте параметры и следите за показателями.';
      }
      self.scheduleRender();
    });
    [this.els.modelSvg, this.els.modelSvgLarge].forEach(function (svg) {
      if (svg) self.bindSvgEvents(svg);
    });
  };

  AnnaLab.prototype.handleAction = function (action, trigger) {
    var derived = this.derive();
    var current = this.modeState();
    if (action === 'prev') {
      this.state.ui.playing = false;
      current.step = Math.max(0, current.step - 1);
    } else if (action === 'next') {
      this.state.ui.playing = false;
      current.step = Math.min(derived.maxStep, current.step + 1);
    } else if (action === 'play') {
      if (current.step >= derived.maxStep) current.step = 0;
      this.state.ui.playing = !this.state.ui.playing;
      if (this.state.ui.playing) this.startAnimation();
    } else if (action === 'restart') {
      this.state.ui.playing = false;
      current.step = 0;
    } else if (action === 'reset') {
      this.applyScenario(SCENARIOS[this.state.mode][0].id);
      return;
    } else if (action === 'in' || action === 'out') {
      this.state.ui.zoom = clamp(this.state.ui.zoom + (action === 'in' ? 0.1 : -0.1), 0.85, 1.5);
    } else if (action === 'open' && this.options.openDialog) {
      this.options.openDialog(this.els.modelDialog, trigger);
      return;
    }
    this.scheduleRender();
  };

  AnnaLab.prototype.startAnimation = function () {
    var self = this;
    this.lastAnimationTime = 0;
    global.cancelAnimationFrame(this.animationFrame);
    function tick(time) {
      if (!self.state.ui.playing) return;
      if (!self.lastAnimationTime) self.lastAnimationTime = time;
      var interval = reducedMotion ? 0 : 850 / self.state.ui.speed;
      if (time - self.lastAnimationTime >= interval) {
        var derived = self.derive();
        self.modeState().step += 1;
        self.lastAnimationTime = time;
        if (self.modeState().step >= derived.maxStep || reducedMotion) self.state.ui.playing = false;
        self.scheduleRender();
      }
      if (self.state.ui.playing) self.animationFrame = global.requestAnimationFrame(tick);
    }
    this.animationFrame = global.requestAnimationFrame(tick);
  };

  AnnaLab.prototype.svgPoint = function (svg, event) {
    var point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    var local = point.matrixTransform(svg.getScreenCTM().inverse());
    return {
      x: (local.x - this.state.ui.panX) / this.state.ui.zoom,
      y: (local.y - this.state.ui.panY) / this.state.ui.zoom
    };
  };

  AnnaLab.prototype.bindSvgEvents = function (svg) {
    var self = this;
    svg.addEventListener('pointerdown', function (event) {
      var target = event.target.closest('[data-drag]');
      var point = self.svgPoint(svg, event);
      self.drag = {
        type: target ? target.dataset.drag : 'pan',
        startX: point.x,
        startY: point.y,
        clientX: event.clientX,
        clientY: event.clientY,
        panX: self.state.ui.panX,
        panY: self.state.ui.panY,
        moved: false
      };
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', function (event) {
      if (!self.drag) return;
      var point = self.svgPoint(svg, event);
      if (Math.abs(point.x - self.drag.startX) + Math.abs(point.y - self.drag.startY) > 2) self.drag.moved = true;
      var current = self.modeState();
      if (self.drag.type === 'numerator') {
        current.numerator = clamp(Math.round((point.x - 70) / 620 * 40 - 20), -20, 20);
        self.makeCustom();
      } else if (self.drag.type === 'period-split') {
        var length = current.digits.length;
        var tile = Math.min(68, 500 / length);
        var start = (760 - tile * length) / 2;
        current.split = clamp(Math.round((point.x - start) / tile), 0, Math.max(0, length - 1));
        self.makeCustom();
      } else if (self.drag.type === 'radical-a' || self.drag.type === 'radical-b') {
        var field = self.drag.type === 'radical-a' ? 'a' : 'b';
        current[field] = clamp(Math.round((point.x - 380) / 35), -6, 6);
        self.makeCustom();
      } else if (self.drag.type === 'pan') {
        var bounds = svg.getBoundingClientRect();
        var scaleX = 760 / Math.max(1, bounds.width);
        var scaleY = 500 / Math.max(1, bounds.height);
        self.state.ui.panX = clamp(self.drag.panX + (event.clientX - self.drag.clientX) * scaleX, -140, 140);
        self.state.ui.panY = clamp(self.drag.panY + (event.clientY - self.drag.clientY) * scaleY, -90, 90);
      }
      self.syncControlOutputs();
      self.scheduleRender();
    });
    svg.addEventListener('pointerup', function (event) {
      if (self.drag && !self.drag.moved) {
        var stepNode = event.target.closest('[data-step]');
        var setNode = event.target.closest('[data-set-choice]');
        if (stepNode) self.modeState().step = integer(stepNode.dataset.step, 0);
        if (setNode) {
          self.state.prediction.choice = setNode.dataset.setChoice;
          self.modeState().step = 1;
        }
        if (!stepNode && !setNode && self.drag.type === 'pan' && svg === self.els.modelSvg) {
          self.handleAction('open', svg);
        }
      }
      self.drag = null;
      try { svg.releasePointerCapture(event.pointerId); } catch (_) {}
      self.scheduleRender();
    });
    svg.addEventListener('wheel', function (event) {
      event.preventDefault();
      self.state.ui.zoom = clamp(self.state.ui.zoom + (event.deltaY < 0 ? 0.05 : -0.05), 0.85, 1.5);
      self.scheduleRender();
    }, { passive: false });
    svg.addEventListener('keydown', function (event) {
      var dragNode = event.target.closest && event.target.closest('[data-drag]');
      if (dragNode && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        var direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
        var current = self.modeState();
        if (dragNode.dataset.drag === 'numerator') current.numerator = clamp(current.numerator + direction, -20, 20);
        if (dragNode.dataset.drag === 'period-split') current.split = clamp(current.split + direction, 0, Math.max(0, current.digits.length - 1));
        if (dragNode.dataset.drag === 'radical-a') current.a = clamp(current.a + direction, -6, 6);
        if (dragNode.dataset.drag === 'radical-b') current.b = clamp(current.b + direction, -6, 6);
        self.pendingFocus = { svgId: svg.id, type: dragNode.dataset.drag };
        self.makeCustom();
        self.syncControlOutputs();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        self.handleAction(event.key === 'ArrowLeft' ? 'prev' : 'next');
      }
      if ((event.key === 'Enter' || event.key === ' ') && svg === self.els.modelSvg) {
        event.preventDefault();
        self.handleAction('open', svg);
      }
    });
  };

  AnnaLab.prototype.node = function (tag, attrs, text) {
    var element = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) {
      if (attrs[name] !== null && attrs[name] !== undefined) element.setAttribute(name, String(attrs[name]));
    });
    if (text !== undefined) element.textContent = text;
    return element;
  };

  AnnaLab.prototype.add = function (parent, tag, attrs, text) {
    var element = this.node(tag, attrs, text);
    parent.appendChild(element);
    return element;
  };

  AnnaLab.prototype.text = function (parent, x, y, value, attrs) {
    var defaults = { x: x, y: y, fill: 'var(--ink)', 'font-family': 'Inter, system-ui, sans-serif', 'font-size': 14 };
    return this.add(parent, 'text', Object.assign(defaults, attrs || {}), value);
  };

  AnnaLab.prototype.panel = function (parent, x, y, width, height, attrs) {
    return this.add(parent, 'rect', Object.assign({
      x: x, y: y, width: width, height: height, rx: 18,
      fill: 'var(--surface)', stroke: 'var(--line)', 'stroke-width': 1.2
    }, attrs || {}));
  };

  AnnaLab.prototype.renderSvg = function (svg, derived) {
    if (!svg) return;
    svg.textContent = '';
    svg.setAttribute('aria-label', MODE_META[this.state.mode].title + '. ' + this.noteText(derived));
    var defs = this.add(svg, 'defs');
    var marker = this.add(defs, 'marker', { id: 'arrow-' + svg.id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
    this.add(marker, 'path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--muted)' });
    var pattern = this.add(defs, 'pattern', { id: 'grid-' + svg.id, width: 24, height: 24, patternUnits: 'userSpaceOnUse' });
    this.add(pattern, 'path', { d: 'M 24 0 L 0 0 0 24', fill: 'none', stroke: 'var(--line)', 'stroke-width': 0.55, opacity: 0.45 });
    this.add(svg, 'rect', { x: 0, y: 0, width: 760, height: 500, rx: 20, fill: 'var(--surface-strong)' });
    if (this.state.ui.guides) this.add(svg, 'rect', { x: 0, y: 0, width: 760, height: 500, rx: 20, fill: 'url(#grid-' + svg.id + ')' });
    var transform = 'translate(' + this.state.ui.panX + ' ' + this.state.ui.panY + ') scale(' + this.state.ui.zoom + ')';
    var root = this.add(svg, 'g', { transform: transform });
    if (derived.mode === 'decimal') this.drawDecimal(root, derived, svg.id);
    else if (derived.mode === 'period') this.drawPeriod(root, derived, svg.id);
    else if (derived.mode === 'sets') this.drawSets(root, derived, svg.id);
    else this.drawRadical(root, derived, svg.id);
    if (this.pendingFocus && this.pendingFocus.svgId === svg.id) {
      var focusTarget = svg.querySelector('[data-drag="' + this.pendingFocus.type + '"]');
      if (focusTarget) focusTarget.focus({ preventScroll: true });
      this.pendingFocus = null;
    }
    if (this.els.zoomRange) this.els.zoomRange.value = String(this.state.ui.zoom);
    if (this.els.zoomOutput) this.els.zoomOutput.textContent = String(Math.round(this.state.ui.zoom * 100)) + '%';
  };

  AnnaLab.prototype.header = function (parent, title, subtitle) {
    this.text(parent, 34, 34, title, { 'font-size': 19, 'font-weight': 800 });
    if (this.state.ui.labels) this.text(parent, 34, 56, subtitle, { 'font-size': 12, fill: 'var(--muted)' });
  };

  AnnaLab.prototype.drawDecimal = function (root, derived, svgId) {
    var data = derived.data;
    var step = this.modeState().step;
    this.header(root, 'Деление ' + String(data.numerator) + ' ÷ ' + String(data.denominator), 'Перетащите маркер числителя; остатки образуют точную траекторию');

    var rail = this.add(root, 'g', { 'data-layer': 'input' });
    this.add(rail, 'line', { x1: 70, y1: 86, x2: 690, y2: 86, stroke: 'var(--line-strong)', 'stroke-width': 4, 'stroke-linecap': 'round' });
    [-20, -10, 0, 10, 20].forEach(function (value) {
      var x = 70 + (value + 20) / 40 * 620;
      this.add(rail, 'line', { x1: x, y1: 78, x2: x, y2: 94, stroke: 'var(--muted)', 'stroke-width': 1.5 });
      if (this.state.ui.labels) this.text(rail, x, 110, String(value).replace('-', '−'), { 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--muted)' });
    }, this);
    var handleX = 70 + (data.numerator + 20) / 40 * 620;
    var handle = this.add(rail, 'g', {
      'data-drag': 'numerator', tabindex: 0, role: 'slider',
      'aria-label': 'Числитель ' + data.numerator,
      'aria-valuemin': -20, 'aria-valuemax': 20, 'aria-valuenow': data.numerator,
      style: 'cursor:grab'
    });
    this.add(handle, 'circle', { cx: handleX, cy: 86, r: 22, fill: 'transparent' });
    this.add(handle, 'circle', { cx: handleX, cy: 86, r: 11, fill: 'var(--teal)', stroke: 'var(--surface-strong)', 'stroke-width': 4 });
    this.text(handle, handleX, 67, String(data.numerator).replace('-', '−'), { 'text-anchor': 'middle', 'font-weight': 800, fill: 'var(--teal-strong)' });

    var orbit = this.add(root, 'g', { 'data-layer': 'process', 'data-link': 'period-cycle' });
    var centerX = 245;
    var centerY = 293;
    var radius = 126;
    this.add(orbit, 'circle', { cx: centerX, cy: centerY, r: radius + 25, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1, 'stroke-dasharray': '4 7' });
    var resultFont = clamp(300 / Math.max(6, data.decimal.length), 11, 25);
    var centerResult = this.text(orbit, centerX, centerY - 7, data.decimal, { 'text-anchor': 'middle', 'font-size': resultFont, 'font-weight': 850, fill: 'var(--ink)' });
    centerResult.setAttribute('data-link', data.finite ? 'finite' : 'periodic');
    this.text(orbit, centerX, centerY + 17, data.finite ? 'остаток → 0' : 'остаток повторился', { 'text-anchor': 'middle', 'font-size': 11, fill: data.finite ? 'var(--teal-strong)' : 'var(--coral)' });

    var count = Math.max(1, data.steps.length);
    var layoutCount = data.finite ? count + 1 : count;
    var points = data.steps.map(function (item, index) {
      var angle = -Math.PI / 2 + index / layoutCount * Math.PI * 2;
      return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius, item: item, index: index };
    });
    points.forEach(function (point, index) {
      var nextIndex = index + 1;
      var targetIndex;
      if (nextIndex < points.length) targetIndex = nextIndex;
      else if (!data.finite) targetIndex = data.repeatAt;
      else targetIndex = -1;
      var active = index < step;
      if (targetIndex >= 0 && points[targetIndex]) {
        var target = points[targetIndex];
        this.add(orbit, 'line', {
          x1: point.x, y1: point.y, x2: target.x, y2: target.y,
          stroke: active ? 'var(--teal)' : 'var(--line-strong)',
          'stroke-width': active ? 2.8 : 1.4,
          opacity: active ? 1 : 0.35,
          'marker-end': 'url(#arrow-' + svgId + ')'
        });
        if (this.state.ui.labels) this.text(orbit, (point.x + target.x) / 2, (point.y + target.y) / 2 - 5, point.item.digit, {
          'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800,
          fill: active ? 'var(--teal-strong)' : 'var(--muted)'
        });
      }
    }, this);
    if (data.finite && points.length) {
      var terminalAngle = -Math.PI / 2 + points.length / layoutCount * Math.PI * 2;
      var terminal = { x: centerX + Math.cos(terminalAngle) * radius, y: centerY + Math.sin(terminalAngle) * radius };
      var lastPoint = points[points.length - 1];
      var terminalActive = step >= data.steps.length;
      this.add(orbit, 'line', {
        x1: lastPoint.x, y1: lastPoint.y, x2: terminal.x, y2: terminal.y,
        stroke: terminalActive ? 'var(--teal)' : 'var(--line-strong)',
        'stroke-width': terminalActive ? 2.8 : 1.4,
        opacity: terminalActive ? 1 : 0.35,
        'marker-end': 'url(#arrow-' + svgId + ')'
      });
      this.add(orbit, 'circle', {
        cx: terminal.x, cy: terminal.y, r: 14,
        fill: terminalActive ? 'var(--teal)' : 'var(--surface)',
        stroke: 'var(--teal)', 'stroke-width': 2
      });
      this.text(orbit, terminal.x, terminal.y + 4, '0', {
        'text-anchor': 'middle', 'font-size': 11, 'font-weight': 900,
        fill: terminalActive ? '#fff' : 'var(--ink)'
      });
    }
    points.forEach(function (point, index) {
      var active = index < step;
      var current = index === step - 1;
      var group = this.add(orbit, 'g', { 'data-step': index + 1, style: 'cursor:pointer' });
      this.add(group, 'circle', {
        cx: point.x, cy: point.y, r: count > 12 ? 10 : 14,
        fill: current ? 'var(--coral)' : (active ? 'var(--teal-soft)' : 'var(--surface)'),
        stroke: current ? 'var(--coral)' : 'var(--line-strong)', 'stroke-width': current ? 4 : 2
      });
      this.text(group, point.x, point.y + 4, String(point.item.before), {
        'text-anchor': 'middle', 'font-size': count > 12 ? 8 : 11, 'font-weight': 800,
        fill: current ? '#fff' : 'var(--ink)'
      });
    }, this);

    var panel = this.add(root, 'g', { 'data-layer': 'result' });
    this.panel(panel, 456, 132, 274, 182);
    this.text(panel, 478, 160, 'Текущий шаг', { 'font-size': 11, 'font-weight': 800, fill: 'var(--muted)', 'letter-spacing': 1.2 });
    var activeStep = data.steps[Math.max(0, Math.min(step - 1, data.steps.length - 1))];
    if (step && activeStep) {
      this.text(panel, 478, 198, String(activeStep.before) + ' × 10', { 'font-size': 24, 'font-weight': 850 });
      this.text(panel, 478, 226, '= ' + String(activeStep.digit) + ' × ' + String(data.reducedDenominator) + ' + ' + String(activeStep.after), { 'font-size': 17, fill: 'var(--teal-strong)', 'font-weight': 750 });
      this.text(panel, 478, 265, 'Получена цифра ' + String(activeStep.digit), { 'font-size': 13, fill: 'var(--muted)' });
    } else {
      this.text(panel, 478, 207, 'Нажмите ▶', { 'font-size': 24, 'font-weight': 850 });
      this.text(panel, 478, 238, 'или выберите шаг на графике', { 'font-size': 13, fill: 'var(--muted)' });
    }
    this.text(panel, 478, 294, 'предпериод ' + data.prefixLength + ' · период ' + data.periodLength, { 'font-size': 12, fill: 'var(--coral)', 'font-weight': 750 });

    var chart = this.add(root, 'g', { 'data-layer': 'process' });
    this.panel(chart, 456, 330, 274, 140);
    this.text(chart, 478, 356, 'Остаток по шагам', { 'font-size': 12, 'font-weight': 800 });
    var chartLeft = 478;
    var chartTop = 374;
    var chartWidth = 230;
    var chartHeight = 70;
    this.add(chart, 'line', { x1: chartLeft, y1: chartTop + chartHeight, x2: chartLeft + chartWidth, y2: chartTop + chartHeight, stroke: 'var(--line-strong)' });
    if (data.steps.length) {
      var path = '';
      data.steps.forEach(function (item, index) {
        var x = chartLeft + (data.steps.length === 1 ? 0 : index / (data.steps.length - 1) * chartWidth);
        var y = chartTop + chartHeight - item.after / Math.max(1, data.reducedDenominator - 1) * chartHeight;
        path += (index ? ' L ' : 'M ') + x + ' ' + y;
      });
      this.add(chart, 'path', { d: path, fill: 'none', stroke: 'var(--teal)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
      data.steps.forEach(function (item, index) {
        var x = chartLeft + (data.steps.length === 1 ? 0 : index / (data.steps.length - 1) * chartWidth);
        var y = chartTop + chartHeight - item.after / Math.max(1, data.reducedDenominator - 1) * chartHeight;
        this.add(chart, 'circle', {
          cx: x, cy: y, r: index < step ? 5 : 3,
          fill: index === step - 1 ? 'var(--coral)' : 'var(--teal-soft)',
          stroke: 'var(--teal-strong)', 'data-step': index + 1, style: 'cursor:pointer'
        });
      }, this);
    }

    var ghost = this.state.comparison.A;
    if (ghost && ghost.mode === 'decimal') {
      var ghostData = LabMath.analyzeFraction(ghost.params.numerator, ghost.params.denominator);
      this.add(orbit, 'circle', { cx: centerX, cy: centerY, r: radius + 14 + Math.min(14, ghostData.periodLength), fill: 'none', stroke: 'var(--gold)', 'stroke-width': 2, 'stroke-dasharray': '7 6', opacity: 0.65 });
    }
  };

  AnnaLab.prototype.drawPeriod = function (root, derived) {
    var data = derived.data;
    var step = this.modeState().step;
    this.header(root, data.decimal + ' → обыкновенная дробь', 'Перетаскивайте разделитель между предпериодом и периодом');
    var group = this.add(root, 'g', { 'data-layer': 'input' });
    var tile = Math.min(68, 500 / data.digits.length);
    var start = (760 - tile * data.digits.length) / 2;
    this.text(group, start - 55, 132, String(data.whole) + ',', { 'font-size': 32, 'font-weight': 850 });
    for (var i = 0; i < data.digits.length; i += 1) {
      var prefix = i < data.split;
      this.add(group, 'rect', {
        x: start + i * tile + 3, y: 93, width: tile - 6, height: 58, rx: 12,
        fill: prefix ? 'var(--gold-soft)' : 'var(--teal-soft)',
        stroke: prefix ? 'var(--gold)' : 'var(--teal)', 'stroke-width': 2,
        'data-link': prefix ? 'period-prefix' : 'period-cycle'
      });
      this.text(group, start + i * tile + tile / 2, 132, data.digits.charAt(i), { 'text-anchor': 'middle', 'font-size': 25, 'font-weight': 850 });
      if (this.state.ui.labels) this.text(group, start + i * tile + tile / 2, 169, prefix ? 'до' : 'цикл', { 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--muted)' });
    }
    var dividerX = start + data.split * tile;
    var divider = this.add(group, 'g', {
      'data-drag': 'period-split', tabindex: 0, style: 'cursor:ew-resize', role: 'slider',
      'aria-label': 'Граница предпериода ' + data.split,
      'aria-valuemin': 0, 'aria-valuemax': Math.max(0, data.digits.length - 1), 'aria-valuenow': data.split
    });
    this.add(divider, 'line', { x1: dividerX, y1: 78, x2: dividerX, y2: 164, stroke: 'var(--coral)', 'stroke-width': 3, 'stroke-dasharray': '5 4' });
    this.add(divider, 'circle', { cx: dividerX, cy: 72, r: 11, fill: 'var(--coral)', stroke: 'var(--surface-strong)', 'stroke-width': 3 });

    var process = this.add(root, 'g', { 'data-layer': 'process', 'data-link': 'period-formula' });
    this.panel(process, 48, 202, 312, 174);
    this.text(process, 70, 230, 'Два сдвига запятой', { 'font-size': 12, 'font-weight': 800, fill: 'var(--muted)' });
    this.text(process, 70, 270, 'A = ' + String(data.A), { 'font-size': 23, 'font-weight': 850, opacity: step >= 1 ? 1 : 0.2 });
    this.text(process, 70, 301, 'B = ' + String(data.B), { 'font-size': 23, 'font-weight': 850, opacity: step >= 2 ? 1 : 0.2 });
    this.add(process, 'line', { x1: 70, y1: 315, x2: 330, y2: 315, stroke: 'var(--line-strong)', 'stroke-width': 2, opacity: step >= 3 ? 1 : 0.2 });
    this.text(process, 70, 348, 'B − A = ' + String(data.numerator), { 'font-size': 20, fill: 'var(--coral)', 'font-weight': 850, opacity: step >= 3 ? 1 : 0.2 });

    var result = this.add(root, 'g', { 'data-layer': 'result', 'data-link': data.m ? 'mixed-rule' : 'period-formula' });
    this.panel(result, 388, 202, 324, 174);
    this.text(result, 410, 230, 'Знаменатель до сокращения', { 'font-size': 12, 'font-weight': 800, fill: 'var(--muted)' });
    var cells = [];
    for (var n = 0; n < data.nines; n += 1) cells.push('9');
    for (var z = 0; z < data.zeros; z += 1) cells.push('0');
    var cellWidth = Math.min(42, 250 / Math.max(1, cells.length));
    cells.forEach(function (value, index) {
      this.add(result, 'rect', {
        x: 410 + index * cellWidth, y: 248, width: cellWidth - 4, height: 42, rx: 8,
        fill: value === '9' ? 'var(--teal-soft)' : 'var(--gold-soft)',
        stroke: value === '9' ? 'var(--teal)' : 'var(--gold)',
        opacity: step >= 3 ? 1 : 0.2
      });
      this.text(result, 410 + index * cellWidth + (cellWidth - 4) / 2, 276, value, { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 850, opacity: step >= 3 ? 1 : 0.2 });
    }, this);
    this.text(result, 410, 326, String(data.numerator) + '/' + String(data.denominator), { 'font-size': 18, fill: 'var(--muted)', opacity: step >= 3 ? 1 : 0.2 });
    this.text(result, 410, 358, '= ' + String(data.reducedNumerator) + '/' + String(data.reducedDenominator), { 'font-size': 25, fill: 'var(--coral)', 'font-weight': 900, opacity: step >= 4 ? 1 : 0.2 });

    var bars = this.add(root, 'g', { 'data-layer': 'process' });
    this.text(bars, 70, 418, 'Длины блоков', { 'font-size': 12, 'font-weight': 800 });
    this.text(bars, 70, 444, 'предпериод', { 'font-size': 11, fill: 'var(--muted)' });
    this.add(bars, 'rect', { x: 150, y: 432, width: data.m * 42, height: 14, rx: 7, fill: 'var(--gold)' });
    this.text(bars, 150 + data.m * 42 + 8, 444, String(data.m), { 'font-size': 11, 'font-weight': 800 });
    this.text(bars, 390, 444, 'период', { 'font-size': 11, fill: 'var(--muted)' });
    this.add(bars, 'rect', { x: 440, y: 432, width: data.k * 42, height: 14, rx: 7, fill: 'var(--teal)' });
    this.text(bars, 440 + data.k * 42 + 8, 444, String(data.k), { 'font-size': 11, 'font-weight': 800 });
  };

  AnnaLab.prototype.drawSets = function (root, derived) {
    var data = derived.data;
    var step = this.modeState().step;
    this.header(root, 'Где живёт число ' + data.label + '?', 'Нажмите на область для прогноза, затем откройте следующий шаг');
    var group = this.add(root, 'g', { 'data-layer': 'process', 'data-link': 'nesting' });
    var sets = [
      { key: 'I', cx: 380, cy: 276, rx: 330, ry: 180, fill: 'var(--coral-soft)', stroke: 'var(--coral)', label: 'R — действительные' },
      { key: 'Q', cx: 420, cy: 286, rx: 260, ry: 142, fill: 'var(--teal-soft)', stroke: 'var(--teal)', label: 'Q — рациональные' },
      { key: 'Z', cx: 450, cy: 296, rx: 174, ry: 96, fill: 'var(--gold-soft)', stroke: 'var(--gold)', label: 'Z — целые' },
      { key: 'N', cx: 480, cy: 306, rx: 82, ry: 48, fill: 'var(--surface)', stroke: 'var(--ink)', label: 'N — натуральные' }
    ];
    sets.forEach(function (set, index) {
      var selected = this.state.prediction.choice === set.key;
      var answer = step && data.set === set.key;
      this.add(group, 'ellipse', {
        cx: set.cx, cy: set.cy, rx: set.rx, ry: set.ry,
        fill: set.fill, 'fill-opacity': index ? 0.82 : 0.5,
        stroke: answer ? 'var(--coral)' : set.stroke,
        'stroke-width': answer ? 6 : (selected ? 4 : 2),
        'data-set-choice': set.key, style: 'cursor:pointer'
      });
      if (this.state.ui.labels) this.text(group, set.cx - set.rx + 18, set.cy - set.ry + 27, set.label, {
        'font-size': 12, 'font-weight': 800, fill: set.stroke, 'pointer-events': 'none'
      });
    }, this);
    this.text(group, 89, 178, 'I — иррациональные', { 'font-size': 12, 'font-weight': 800, fill: 'var(--coral)' });
    var positions = {
      N: { x: 480, y: 306 },
      Z: { x: 330, y: 316 },
      Q: { x: 230, y: 336 },
      I: { x: 125, y: 260 }
    };
    var target = step ? positions[data.set] : { x: 380, y: 84 };
    var marker = this.add(root, 'g', { 'data-layer': 'input' });
    this.add(marker, 'line', { x1: 380, y1: 84, x2: target.x, y2: target.y - 22, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 6', opacity: step ? 1 : 0 });
    this.add(marker, 'circle', { cx: target.x, cy: target.y, r: 27, fill: step ? 'var(--coral)' : 'var(--teal)', stroke: 'var(--surface-strong)', 'stroke-width': 5 });
    this.text(marker, target.x, target.y + 5, step ? data.set : '?', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900, fill: '#fff' });
    var result = this.add(root, 'g', { 'data-layer': 'result', 'data-link': data.set === 'I' ? 'irrational' : 'rational' });
    this.panel(result, 194, 446, 372, 38, { rx: 12, opacity: step ? 1 : 0.25 });
    this.text(result, 380, 471, step ? data.label + ' = ' + data.exact + ' ∈ ' + data.set : 'Сначала сделайте прогноз', {
      'text-anchor': 'middle', 'font-size': 15, 'font-weight': 850, fill: step ? 'var(--coral)' : 'var(--muted)'
    });
  };

  AnnaLab.prototype.drawRadical = function (root, derived) {
    var data = derived.data;
    var current = this.modeState();
    var step = current.step;
    var source = termText(current.a, current.n, true) + termText(current.b, current.m, false);
    this.header(root, source, 'Тяните коэффициенты по шкалам и наблюдайте упрощение каждого корня');
    var process = this.add(root, 'g', { 'data-layer': 'process', 'data-link': step ? 'radical-stage-1' : 'radical-stage-0' });
    this.panel(process, 48, 77, 312, 126);
    this.panel(process, 400, 77, 312, 126);
    this.text(process, 70, 105, 'Первое слагаемое', { 'font-size': 11, 'font-weight': 800, fill: 'var(--muted)' });
    this.text(process, 422, 105, 'Второе слагаемое', { 'font-size': 11, 'font-weight': 800, fill: 'var(--muted)' });
    this.text(process, 70, 145, String(current.a) + '√' + String(current.n), { 'font-size': 23, 'font-weight': 850 });
    this.text(process, 422, 145, String(current.b) + '√' + String(current.m), { 'font-size': 23, 'font-weight': 850 });
    this.text(process, 70, 179, '= ' + termText(data.left.outside, data.left.inside, true), { 'font-size': 20, fill: 'var(--teal-strong)', 'font-weight': 850, opacity: step >= 1 ? 1 : 0.2 });
    this.text(process, 422, 179, '= ' + termText(data.right.outside, data.right.inside, true), { 'font-size': 20, fill: 'var(--teal-strong)', 'font-weight': 850, opacity: step >= 1 ? 1 : 0.2 });

    var input = this.add(root, 'g', { 'data-layer': 'input' });
    var scales = [
      { y: 255, field: 'a', drag: 'radical-a', label: 'a', value: current.a },
      { y: 322, field: 'b', drag: 'radical-b', label: 'b', value: current.b }
    ];
    scales.forEach(function (scale) {
      this.text(input, 58, scale.y + 5, scale.label, { 'font-size': 15, 'font-weight': 900 });
      this.add(input, 'line', { x1: 170, y1: scale.y, x2: 590, y2: scale.y, stroke: 'var(--line-strong)', 'stroke-width': 4, 'stroke-linecap': 'round' });
      for (var tick = -6; tick <= 6; tick += 2) {
        var x = 380 + tick * 35;
        this.add(input, 'line', { x1: x, y1: scale.y - 7, x2: x, y2: scale.y + 7, stroke: 'var(--muted)' });
        if (this.state.ui.labels) this.text(input, x, scale.y + 24, String(tick).replace('-', '−'), { 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--muted)' });
      }
      var handleX = 380 + scale.value * 35;
      var handle = this.add(input, 'g', {
        'data-drag': scale.drag, tabindex: 0, style: 'cursor:grab', role: 'slider',
        'aria-label': 'Коэффициент ' + scale.label + ' равен ' + scale.value,
        'aria-valuemin': -6, 'aria-valuemax': 6, 'aria-valuenow': scale.value
      });
      this.add(handle, 'circle', { cx: handleX, cy: scale.y, r: 18, fill: 'transparent' });
      this.add(handle, 'circle', { cx: handleX, cy: scale.y, r: 10, fill: 'var(--teal)', stroke: 'var(--surface-strong)', 'stroke-width': 4 });
      this.text(handle, 618, scale.y + 5, String(scale.value).replace('-', '−'), { 'font-size': 14, 'font-weight': 900, fill: 'var(--teal-strong)' });
    }, this);

    var result = this.add(root, 'g', { 'data-layer': 'result', 'data-link': step >= 3 ? 'radical-stage-3' : 'radical-stage-2' });
    this.panel(result, 132, 380, 496, 88, { stroke: step >= 2 ? 'var(--coral)' : 'var(--line)', 'stroke-width': step >= 2 ? 2.5 : 1 });
    this.text(result, 380, 414, data.like ? 'Подобные радикалы: коэффициенты складываются' : 'Подкоренные части различаются', {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: 'var(--muted)', opacity: step >= 2 ? 1 : 0.25
    });
    this.text(result, 380, 450, data.result, {
      'text-anchor': 'middle', 'font-size': 27, 'font-weight': 900, fill: 'var(--coral)', opacity: step >= 2 ? 1 : 0.2
    });
    if (step >= 3) this.text(result, 650, 450, data.rational ? '∈ Q' : '∈ I', { 'font-size': 14, 'font-weight': 900, fill: data.rational ? 'var(--teal-strong)' : 'var(--coral)' });
  };

  AnnaLab.prototype.setActiveLink = function (link) {
    this.state.ui.activeLink = link || '';
    this.applyActiveLink(link);
  };

  AnnaLab.prototype.applyActiveLink = function (link) {
    var nodes = this.queryAll('.linked, #modelSvg [data-link], #modelSvgLarge [data-link]');
    var hasMatch = link && nodes.some(function (node) { return node.dataset.link === link; });
    nodes.forEach(function (node) {
      node.style.opacity = link && hasMatch && node.dataset.link !== link ? '0.28' : '1';
      node.classList.toggle('link-active', Boolean(link && node.dataset.link === link));
    });
  };

  global.AnnaLearningLab = {
    create: function (options) { return new AnnaLab(options).init(); },
    math: LabMath
  };
}(window));
