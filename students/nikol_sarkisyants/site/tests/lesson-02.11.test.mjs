import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { Script } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const read = name => readFileSync(join(site, name), 'utf8');
const lesson = read('02.11.26.html');
const lab = read('02.11.26-lab.html');
const metadata = JSON.parse(read('data/lessons/2026-11-02.lesson.json'));
const intent = JSON.parse(read('data/lesson-publication-intents/2026-11-02.json'));
const practice = JSON.parse(read('data/practice-publications/2026-11-02.json'));

test('required lesson sections and one exact competence evidence anchor', () => {
  for (const id of ['overview','center','frequency','variance','outlier','practice','answers','summary']) {
    assert.match(lesson, new RegExp('id="'+id+'"'));
  }
  assert.equal(metadata.date, '2026-11-02');
  assert.deepEqual(metadata.ktpRefs, []);
  assert.equal(metadata.outcomes.length, 1);
  assert.equal(metadata.outcomes[0].competencyId, 't4_frequency');
  assert.equal(metadata.outcomes[0].evidenceAnchor, 'frequency');
  assert.equal(metadata.outcomes[0].masteryClaim, null);
  assert.equal(intent.outcomes[0].confidence, 'exact');
  assert.equal(intent.outcomes[0].masteryClaim, null);
  assert.equal(practice.outcomes[0].practiceDisposition, 'manual');
});

test('all declared lesson materials exist and source tasks are present', () => {
  for (const href of Object.values(metadata.materials)) {
    assert.ok(existsSync(resolve(site, href)), 'Missing material: '+href);
  }
  assert.equal((lesson.match(/<li>/g) || []).length, 10, 'Exactly ten exercises expected');
  assert.equal((lesson.match(/<details class="answer">/g) || []).length, 10, 'Exactly ten answers expected');
  assert.ok(lesson.includes('02.11.26-lab.html#outlier'));
  assert.ok(lab.includes('id="outlier"'));
  assert.ok(lab.includes('id="spread"'));
});

test('inline scripts parse as JavaScript and controls exist', () => {
  for (const [name, source] of [['lesson', lesson], ['lab', lab]]) {
    const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1, 'Expected one self-contained script for '+name);
    assert.doesNotThrow(() => new Script(scripts[0][1]), 'Inline JS parse error in '+name);
  }
  for (const id of ['count1','count2','count3','count4','reset','mode','variance','sigma','tabOutlier']) {
    assert.match(lab, new RegExp('id="'+id+'"'), 'Missing control/result '+id);
  }
});

test('reference frequency distribution and variance are consistent', () => {
  const freq = [3,2,5,1], N=freq.reduce((a,b)=>a+b,0);
  const sum=freq.reduce((a,n,i)=>a+(i+1)*n,0);
  const squareSum=freq.reduce((a,n,i)=>a+n*(i+1)**2,0);
  assert.equal(N,11);
  assert.equal(sum,26);
  assert.equal(squareSum,72);
  assert.ok(Math.abs(squareSum/N-(sum/N)**2-116/121)<1e-12);
});

test('02.11 lesson remains in the archive as newer lessons publish; evidence stays linked', () => {
  const registry = read('lesson-registry.js');
  assert.match(registry, /"date": "2026-11-09"/);
  const latestPosition = registry.indexOf('"date": "2026-11-09"');
  const middlePosition = registry.indexOf('"date": "2026-11-05"');
  const previousPosition = registry.indexOf('"date": "2026-11-02"');
  assert.ok(middlePosition > latestPosition && previousPosition > middlePosition, '02.11 and 05.11 lessons must remain after 09.11');
  assert.match(read('index.html'), /dashboard-data-02\.11\.js/);
  assert.match(read('index.html'), /dashboard-data-05\.11\.js/);
  assert.match(read('index.html'), /dashboard-data-09\.11\.js/);
  assert.match(read('dashboard.js'), /lesson-registry\.js\?v=20\d{6}(?:-[\w-]+)?/);
  assert.match(read('dashboard-data-02.11.js'), /02\.11\.26\.html#frequency/);
});