import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../15.10.26.html', import.meta.url), 'utf8');
const mathTag = /<math\s+xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/g;
const evidenceAnchors = ['percent','change','inverse','sequential','system','solution','training'];

test('every displayed formula is represented by native MathML', () => {
  const formulaBlocks = [...html.matchAll(/<(?:div|p)[^>]*class="(?:math|smallmath)"[^>]*>([\s\S]*?)<\/(?:div|p)>/g)];
  assert.ok(formulaBlocks.length >= 15);
  for (const block of formulaBlocks) {
    assert.match(block[1], /^<math\s+xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
  }
  assert.ok([...html.matchAll(mathTag)].length >= 140);
  assert.ok((html.match(/<mfrac>/g) || []).length >= 5);
  assert.ok((html.match(/<msub>/g) || []).length >= 2);
});

test('native MathML has correctly nested math containers', () => {
  const count = (text) => (html.match(new RegExp(text, 'g')) || []).length;
  for (const tag of ['math','mrow','mn','mi','mo','mfrac','msub','mtext','mtable','mtr','mtd']) {
    assert.equal(count('<'+tag+'(?:\\s|>)'),count('</'+tag+'>'),tag+' is unbalanced');
  }
});

test('all seven interactive formula templates contain MathML', () => {
  const ids = ['priceEq0','priceEq1','priceEq2','priceEq3','yearEq0','yearEq1','yearEq2'];
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
    const re = new RegExp('<template id="'+escaped+'"><math\\s+xmlns="http:\/\/www\\.w3\\.org\/1998\/Math\/MathML"');
    assert.match(html,re,id);
  }
});

test('interactive updates render MathML elements, not plain formula strings', () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script,/createElementNS\(MATH_NS,'math'\)/);
  assert.match(script,/replaceChildren\(content\.cloneNode\(true\)\)/);
  assert.doesNotMatch(script,/(priceEquation|yearEquation)'\)\.textContent\s*=/);
  for (const name of evidenceAnchors) assert.ok(html.includes('id="'+name+'"'),name);
});

test('exercise material keeps the ten-task learning route', () => {
  assert.equal((html.match(/<li><div>/g) || []).length,10);
  assert.ok(html.includes('href="../pdf_docs/15.10.26.pdf"'));
  assert.ok(html.includes('href="../images/15.10.26.png"'));
});
