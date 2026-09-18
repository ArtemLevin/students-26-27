#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TOKEN_RE = /^[A-Za-z0-9_-]{24,}$/;
const STUDENT_RE = /^[a-z0-9_]+$/;
const PUBLIC_DIRS = ['site', 'pdf_docs', 'tex_docs', 'review_docs', 'images'];
const ROOT_ASSET_RE = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export function parseStudentUrlMap(raw) {
  if (!raw?.trim()) throw new Error('STUDENT_URL_MAP is empty');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('STUDENT_URL_MAP must be valid JSON');
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('STUDENT_URL_MAP must be a JSON object: {"student_slug":"secret-token"}');
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) throw new Error('STUDENT_URL_MAP contains no students');

  const tokens = new Set();
  for (const [student, token] of entries) {
    if (!STUDENT_RE.test(student)) throw new Error(`Invalid student slug: ${student}`);
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
      throw new Error(`Token for ${student} must contain at least 24 URL-safe random characters`);
    }
    if (tokens.has(token)) throw new Error('Every student must have a unique token');
    tokens.add(token);
  }

  return Object.fromEntries(entries);
}

async function copyIfPresent(source, destination) {
  if (!(await exists(source))) return false;
  await cp(source, destination, { recursive: true, force: true });
  return true;
}

async function copyChemistry(studentDir, destinationRoot) {
  const chemistryDir = path.join(studentDir, 'chemistry');
  if (!(await exists(chemistryDir))) return;

  const chemistryDestination = path.join(destinationRoot, 'chemistry');
  await mkdir(chemistryDestination, { recursive: true });

  for (const dir of PUBLIC_DIRS) {
    await copyIfPresent(path.join(chemistryDir, dir), path.join(chemistryDestination, dir));
  }

  for (const entry of await readdir(chemistryDir, { withFileTypes: true })) {
    if (entry.isFile() && ROOT_ASSET_RE.test(entry.name)) {
      await cp(path.join(chemistryDir, entry.name), path.join(chemistryDestination, entry.name));
    }
  }
}

function redirectDocument() {
  return `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow,noarchive">\n<meta name="referrer" content="no-referrer">\n<meta http-equiv="refresh" content="0;url=./site/">\n<title>Учебный кабинет</title>\n<script>location.replace('./site/');</script>\n</head>\n<body></body>\n</html>\n`;
}

export async function buildStatic({ repoRoot, outputDir, studentUrlMap }) {
  const studentsRoot = path.join(repoRoot, 'students');
  const sharedRoot = path.join(repoRoot, 'shared');

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const sharedDir of ['student-dashboard', 'practice']) {
    const source = path.join(sharedRoot, sharedDir);
    if (await exists(source)) {
      await cp(source, path.join(outputDir, 'shared', sharedDir), { recursive: true, force: true });
    }
  }

  let deployed = 0;
  for (const [student, token] of Object.entries(studentUrlMap)) {
    const studentDir = path.join(studentsRoot, student);
    const entryPoint = path.join(studentDir, 'site', 'index.html');
    if (!(await exists(entryPoint))) {
      throw new Error(`Student ${student} has no students/${student}/site/index.html`);
    }

    const destinationRoot = path.join(outputDir, token);
    await mkdir(destinationRoot, { recursive: true });

    for (const dir of PUBLIC_DIRS) {
      await copyIfPresent(path.join(studentDir, dir), path.join(destinationRoot, dir));
    }

    await copyChemistry(studentDir, destinationRoot);

    for (const entry of await readdir(studentDir, { withFileTypes: true })) {
      if (entry.isFile() && ROOT_ASSET_RE.test(entry.name)) {
        await cp(path.join(studentDir, entry.name), path.join(destinationRoot, entry.name));
      }
    }

    await writeFile(path.join(destinationRoot, 'index.html'), redirectDocument(), 'utf8');
    deployed += 1;
  }

  await writeFile(path.join(outputDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  await writeFile(path.join(outputDir, '404.html'), '<!doctype html><meta name="robots" content="noindex"><title>404</title>\n', 'utf8');

  return { deployed };
}

async function main() {
  const repoRoot = path.resolve(process.env.REPO_ROOT || '.');
  const outputDir = path.resolve(repoRoot, process.env.DEPLOY_BUILD_DIR || '.deploy-dist');
  const studentUrlMap = parseStudentUrlMap(process.env.STUDENT_URL_MAP || '');
  const { deployed } = await buildStatic({ repoRoot, outputDir, studentUrlMap });
  console.log(`Static deployment bundle built for ${deployed} student(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
