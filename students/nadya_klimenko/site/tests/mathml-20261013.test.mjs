import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('students/nadya_klimenko/site/13.10.26.html', 'utf8');
const body = source.split('<body')[1].split('\n<script>')[0];
const inlineScript = source.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
const namespace = 'http://www.w3.org/1998/Math/MathML';

test('13.10.26 uses native MathML for expressions, fractions and quantities', () => {
  const math = [...body.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m => m[0]);
  assert.ok(math.length >= 70, 'All lesson mathematics must be native MathML');
  assert.match(body, /<msub><mi>v<\/mi><mn>0<\/mn><\/msub>/);
  assert.ok((body.match(/<mfrac>/g) || []).length >= 90);
  assert.equal((body.match(/<math\b/g) || []).length, math.length, 'All MathML root nodes must close');
  assert.doesNotMatch(body, /class="(?:qfrac|mix)"/, 'CSS-only fractions are forbidden');
  assert.doesNotMatch(body, /(?:^|[\s>;,—])\d+(?:,\d+)?\s+(?:м\/мин|мин|м|т|часа|часов|ч)(?=[\s.,;!?<]|$)/u,
    'Quantities should be represented by <mn> and <mtext>');
  assert.equal((body.match(/class="practice-task"/g) || []).length, 10);
  assert.equal((body.match(/class="equation"/g) || []).length, 22);
  const displays = [...body.matchAll(/<div class="equation">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  assert.ok(displays.every(str => /^<math[^>]+display="block"/.test(str)));
  for (const node of math) {
    assert.ok(node.includes('xmlns="' + namespace + '"'));
    assert.doesNotMatch(node, /<span\b|<div\b/);
    const tags = [...node.matchAll(/<\/?(math|mrow|mfrac|mn|mi|mo|mtext|msub|mspace)\b[^>]*\/?\s*>/g)].map(m => m[0]);
    const stack = [];
    for (const tag of tags) {
      if (/\/>$/.test(tag)) continue;
      const name = tag.match(/^<\/?([\w-]+)/)[1];
      if (tag.startsWith('</')) assert.equal(stack.pop(), name, 'Unbalanced MathML tag ' + tag);
      else stack.push(name);
    }
    assert.deepEqual(stack, [], 'MathML tags must be balanced');
  }
});

function control(dataset = {}) {
  const listeners = {};
  return {
    dataset, listeners, style: {}, checked: false, textContent: '', innerHTML: '',
    classList: { toggle() {} },
    addEventListener(type, handler) { listeners[type] = handler; },
    setAttribute(name, value) { this[name] = value; },
    click() { this.listeners.click?.(); }
  };
}

test('river and trip controls render MathML after user interaction', () => {
  assert.ok(inlineScript, 'Inline lesson script must be present');
  new vm.Script(inlineScript, {filename: '13.10.26.inline.js'});
  const ids = {};
  const get = id => ids[id] ||= control();
  const river = ['still', 'with', 'against'].map(v => control({river:v}));
  const reises = ['all','12','23'].map(v => control({reis:v}));
  const trips = ['1','2','3'].map(v => control({trip:v}));
  const checks = Array.from({length:7}, (_,i) => control({check:String(i)}));
  const document = {
    documentElement: {dataset:{theme:'light'}},
    getElementById:get,
    querySelectorAll(selector) {
      return ({'[data-river]':river,'[data-reis]':reises,'[data-trip]':trips,'[data-check]':checks})[selector] ?? [];
    }
  };
  vm.runInNewContext(inlineScript, {
    document, localStorage:{getItem(){return null;},setItem(){}},
    JSON, Math
  }, {timeout:1000});
  river[1].click();
  assert.match(get('riverValue').innerHTML, /<math\b/);
  assert.match(get('riverValue').innerHTML, /<mn>437<\/mn>/);
  assert.match(get('riverReason').innerHTML, /<mfrac>/);
  river[2].click();
  assert.match(get('riverValue').innerHTML, /<mn>395<\/mn>/);
  reises[1].click();
  assert.match(get('reisCaption').innerHTML, /<math\b/);
  assert.match(get('reisCaption').innerHTML, /<mfrac>/);
  reises[2].click();
  assert.match(get('reisCaption').innerHTML, /<mn>13<\/mn>/);
  checks[0].checked = true;
  checks[0].listeners.change();
  assert.equal(get('checkStatus').textContent, '1 из 7');
});
