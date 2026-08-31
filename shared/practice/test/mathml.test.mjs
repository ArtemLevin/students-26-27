import test from 'node:test';
import assert from 'node:assert/strict';
import {mathML,renderMathText} from '../mathml.js';

test('renders powers and products with native MathML structure',()=>{
  const html=renderMathText('Вычислите 4^3·2^2.');
  assert.match(html,/<math[^>]*aria-label="4\^3·2\^2"/u);
  assert.equal((html.match(/<msup>/g)||[]).length,2);
  assert.match(html,/<mo>·<\/mo>/u);
  assert.doesNotMatch(html,/>4\^3·2\^2</u);
});

test('renders fractions, negative exponents and roots semantically',()=>{
  const fraction=mathML('2^{-3}=1/2^3=1/8');
  assert.match(fraction,/<msup><mn>2<\/mn><mrow><mo>−<\/mo><mn>3<\/mn><\/mrow><\/msup>/u);
  assert.equal((fraction.match(/<mfrac>/g)||[]).length,2);
  const root=renderMathText('Вычислите √25.');
  assert.match(root,/<msqrt><mn>25<\/mn><\/msqrt>/u);
});

test('renders variables, unicode subscripts and coordinate pairs',()=>{
  const formula=mathML('x=x₀+vₓt');
  assert.match(formula,/<msub><mi>x<\/mi><mn>0<\/mn><\/msub>/u);
  assert.match(formula,/<msub><mi>v<\/mi><mi>x<\/mi><\/msub>/u);
  const coordinates=renderMathText('Даны точки A(-1; 3) и B(2; -5).');
  assert.equal((coordinates.match(/<math /g)||[]).length,2);
  assert.match(coordinates,/<mo>;<\/mo>/u);
});

test('renders standalone numerical answers as MathML',()=>{
  const html=renderMathText('Ответ пока не совпал. Верный ответ: 5.');
  assert.match(html,/<math[^>]*aria-label="5"><mn>5<\/mn><\/math>/u);
});

test('keeps prose outside MathML and escapes HTML-sensitive input',()=>{
  const html=renderMathText('Подсказка <b>важно</b>: x=2.');
  assert.match(html,/Подсказка &lt;b&gt;важно&lt;\/b&gt;:/u);
  assert.doesNotMatch(html,/<b>/u);
  assert.match(html,/<math[^>]*aria-label="x=2"/u);
});
