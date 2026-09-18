import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildStatic, parseStudentUrlMap } from './build.mjs';

const TOKEN = 'A'.repeat(32);

test('rejects weak and duplicate URL tokens', () => {
  assert.throws(() => parseStudentUrlMap('{"alice":"short"}'), /at least 24/);
  assert.throws(() => parseStudentUrlMap(JSON.stringify({ alice: TOKEN, bob: TOKEN })), /unique token/);
});

test('builds a token-scoped student tree and shared runtime', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'student-static-'));
  await mkdir(path.join(root, 'students', 'alice', 'site'), { recursive: true });
  await mkdir(path.join(root, 'students', 'alice', 'pdf_docs'), { recursive: true });
  await mkdir(path.join(root, 'shared', 'student-dashboard'), { recursive: true });
  await mkdir(path.join(root, 'shared', 'practice'), { recursive: true });
  await writeFile(path.join(root, 'students', 'alice', 'site', 'index.html'), '<a href="../pdf_docs/a.pdf">PDF</a>');
  await writeFile(path.join(root, 'students', 'alice', 'pdf_docs', 'a.pdf'), 'fixture');
  await writeFile(path.join(root, 'shared', 'student-dashboard', 'dashboard.js'), 'export {};');
  await writeFile(path.join(root, 'shared', 'practice', 'practice.js'), 'export {};');

  const outputDir = path.join(root, 'dist');
  const result = await buildStatic({ repoRoot: root, outputDir, studentUrlMap: { alice: TOKEN } });

  assert.equal(result.deployed, 1);
  assert.match(await readFile(path.join(outputDir, TOKEN, 'index.html'), 'utf8'), /\.\/site\//);
  assert.match(await readFile(path.join(outputDir, TOKEN, 'site', 'index.html'), 'utf8'), /\.\.\/pdf_docs\/a\.pdf/);
  assert.equal(await readFile(path.join(outputDir, TOKEN, 'pdf_docs', 'a.pdf'), 'utf8'), 'fixture');
  assert.equal(await readFile(path.join(outputDir, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
});
