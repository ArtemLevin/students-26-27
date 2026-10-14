import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const student = path.resolve(site, '..');
const lesson = fs.readFileSync(path.join(site, '13.10.26.html'), 'utf8');
const index = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const registry = fs.readFileSync(path.join(site, 'lesson-registry.js'), 'utf8');
const metadata = JSON.parse(fs.readFileSync(path.join(site, 'data/lessons/2026-10-13.lesson.json'), 'utf8'));
const intent = JSON.parse(fs.readFileSync(path.join(site, 'data/publication-intents/2026-10-13.json'), 'utf8'));
const ids = html => [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x => x[1]);

test('lesson follows a complete, accessible study route', () => {
  assert.match(lesson, /<html lang="ru"/);
  assert.equal((lesson.match(/<h1>/g) || []).length, 1);
  assert.equal((lesson.match(/<li class="task">/g) || []).length, 10);
  assert.equal((lesson.match(/<summary>Ответ и ключевой шаг<\/summary>/g) || []).length, 10);
  assert.equal((lesson.match(/class="lab-state"/g) || []).length, 4);
  assert.equal(ids(lesson).length, new Set(ids(lesson)).size);
  for (const anchor of ['equations','mixed','borrow','brackets','practice','materials'])
    assert.ok(ids(lesson).includes(anchor), 'missing anchor ' + anchor);
  assert.match(lesson, /prefers-reduced-motion/);
  assert.match(lesson, /aria-live="polite"/);
  assert.match(lesson, /id="themeButton"/);
  assert.match(lesson, /id="nextStep"/);
  assert.match(lesson, /id="progressText"/);
});

test('source materials and local links resolve', () => {
  for (const [name, source] of [['13.10.26.html', lesson], ['index.html', index]]) {
    for (const hit of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
      const uri = hit[1];
      if (/^(?:https?:|data:|mailto:)/i.test(uri)) continue;
      const [location, hash=''] = uri.split('#');
      const clean = location.split('?')[0];
      const target = path.resolve(site, clean || name);
      assert.ok(fs.existsSync(target), name + ': broken link ' + uri);
      if (hash && clean.endsWith('.html')) {
        const html = fs.readFileSync(target,'utf8');
        assert.ok(ids(html).includes(hash), name + ': broken anchor ' + uri);
      }
    }
  }
  assert.ok(fs.existsSync(path.join(student,'pdf_docs','13.10.26.pdf')));
  assert.ok(fs.existsSync(path.join(student,'images','13.10.26.png')));
});

test('the latest lesson is registered once and is featured on the dashboard', () => {
  assert.equal((registry.match(/"date": "2026-10-13"/g) || []).length, 1);
  assert.match(registry, /"href": "13\.10\.26\.html"/);
  assert.match(index, /href="13\.10\.26\.html"/);
  assert.match(index, /competency-map-lesson-20261013\.js/);
  assert.match(index, /href="08\.10\.26-lab\.html/);
  assert.equal(metadata.date, '2026-10-13');
  assert.equal(intent.lessonDate, metadata.date);
  assert.deepEqual(intent.topics, metadata.topics);
  assert.equal(intent.outcomes.length, metadata.outcomes.length);
  const anchors = new Set(ids(lesson));
  for (const outcome of intent.outcomes) {
    assert.ok(anchors.has(outcome.evidenceAnchor));
    assert.equal(outcome.masteryClaim, null);
    assert.equal(outcome.decision, 'apply');
    assert.equal(outcome.confidence, 'exact');
  }
});

test('inline JavaScript and evidence overlay parse', () => {
  for (const match of lesson.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
    new vm.Script(match[1], {filename:'13.10.26.inline.js'});
  const source = fs.readFileSync(path.join(site,'competency-map-lesson-20261013.js'),'utf8');
  new vm.Script(source, {filename:'competency-map-lesson-20261013.js'});
  assert.doesNotMatch(source, /\.baselineLevel\s*=/);
  assert.doesNotMatch(source, /\.level\s*=/);
});


test('all mathematical expressions use semantic native MathML', () => {
  const nodes = [...lesson.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(match => match[0]);
  assert.ok(nodes.length >= 48, 'missing MathML equations or inline fragments');
  assert.ok((lesson.match(/<mfrac>/g) || []).length >= 120, 'fractions must use mfrac');
  assert.ok((lesson.match(/<mi>x<\/mi>/g) || []).length >= 10, 'variables must use mi');
  assert.doesNotMatch(lesson, /class="(?:fraction|mixed)"/, 'legacy visual-only math spans remain');
  const allowed = new Set(['math','mrow','mi','mn','mo','mfrac','mspace','mtext']);
  for (const fragment of nodes) {
    assert.match(fragment, /^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
    const stack = [];
    for (const token of fragment.matchAll(/<(\/)?(math|mrow|mi|mn|mo|mfrac|mspace|mtext)\b[^>]*>/g)) {
      const closing = Boolean(token[1]), name = token[2];
      assert.ok(allowed.has(name));
      if (closing) assert.equal(stack.pop(), name, 'unbalanced MathML element: ' + name);
      else if (!token[0].endsWith('/>')) stack.push(name);
    }
    assert.deepEqual(stack, [], 'unclosed MathML nodes');
  }
  assert.match(lesson, /<mrow><mn>4<\/mn><mspace width="0\.16em"\/><mfrac>/,
    'mixed numbers should keep whole and fractional parts together');
  const textOutsideMath = lesson
    .replace(/<math\b[^>]*>[\s\S]*?<\/math>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(textOutsideMath, /\b(?:24\/24|d\/d|x\s*[+−=]\s*a)\b/);
});

test('worked examples and all ten answers agree arithmetically', () => {
  const {Fraction} = {Fraction: (numerator, denominator=1) => numerator/denominator};
  const near = (left,right) => assert.ok(Math.abs(left-right) < 1e-9);
  near(Fraction(5,12)+Fraction(7,18), Fraction(29,36));
  near(Fraction(3,5)+Fraction(1,4), Fraction(17,20));
  near(Fraction(9,4)-Fraction(5,6), 1+Fraction(5,12));
  near(Fraction(13,15)-Fraction(1,6), Fraction(7,10));
  near(6+Fraction(3,4)-(2+Fraction(1,6)), 4+Fraction(7,12));
  near(8+Fraction(3,10)-(2+Fraction(7,15)), 5+Fraction(5,6));
  near(5+Fraction(1,4)-(2+Fraction(5,6)), 2+Fraction(5,12));
  near(Fraction(1,4)-(1-Fraction(7,8)), Fraction(1,8));
  near(6+Fraction(2,5)-(1+Fraction(3,4)+2+Fraction(1,10)), 2+Fraction(11,20));
  near(9+Fraction(7,12)-(4+Fraction(5,18)+1+Fraction(5,8)), 3+Fraction(49,72));
});
