#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.env.REPO_ROOT || '.');
const outputFile = path.resolve(repoRoot, process.env.STUDENT_URL_MAP_FILE || '.student-url-map.local.json');
const requested = process.argv.slice(2);

async function exists(filePath) {
  try { await stat(filePath); return true; } catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

async function discoverAll() {
  const studentsDir = path.join(repoRoot, 'students');
  const names = [];
  for (const entry of await readdir(studentsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && await exists(path.join(studentsDir, entry.name, 'site', 'index.html'))) names.push(entry.name);
  }
  return names.sort();
}

let students;
if (requested.length === 1 && requested[0] === '--all') students = await discoverAll();
else if (requested.length > 0) students = [...new Set(requested)].sort();
else throw new Error('Pass student slugs, or use --all');

let mapping = {};
if (await exists(outputFile)) {
  mapping = JSON.parse(await readFile(outputFile, 'utf8'));
}

for (const student of students) {
  if (!(await exists(path.join(repoRoot, 'students', student, 'site', 'index.html')))) {
    throw new Error(`Unknown student site: ${student}`);
  }
  if (!mapping[student]) mapping[student] = randomBytes(24).toString('base64url');
}

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(mapping, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(`URL map updated for ${students.length} student(s): ${path.relative(repoRoot, outputFile)}`);
