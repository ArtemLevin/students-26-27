import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const indexHtml=readFileSync(join(siteDir,'index.html'),'utf8');
const dashboardSource=readFileSync(join(siteDir,'dashboard.js'),'utf8');
const dashboardCss=readFileSync(join(siteDir,'dashboard.css'),'utf8');
const registry=await import(pathToFileURL(join(siteDir,'lesson-registry.js')).href);

const dateLessonPattern=/^(?:\d{2}\.\d{2}\.\d{2}|\d{2}-\d{2}-\d{2})\.html$/;
const lessonFiles=readdirSync(siteDir).filter(name=>dateLessonPattern.test(name)).sort();
const registryHrefs=registry.LESSONS.map(lesson=>lesson.href).sort();

test('lesson registry contains all 13 current lessons newest-first',()=>{
  assert.equal(registry.LESSONS.length,13);
  registry.validateLessonRegistry(registry.LESSONS);
  for(let index=1;index<registry.LESSONS.length;index+=1){
    assert.ok(registry.LESSONS[index-1].date>registry.LESSONS[index].date,'registry must be newest-first');
  }
  assert.equal(registry.LESSONS[0].href,'23.08.26.html');
});

test('registry hrefs exactly match dated lesson HTML files in site directory',()=>{
  assert.deepEqual(registryHrefs,lessonFiles);
  assert.equal(new Set(registryHrefs).size,registryHrefs.length);
});

test('latest lesson has complete dashboard detail and real material files',()=>{
  const latest=registry.getLatestLesson();
  assert.ok(latest.summary);
  assert.ok(latest.topics.length>=3);
  assert.ok(latest.outcomes.length>=1);
  assert.ok(latest.materials.pdf);
  assert.ok(latest.materials.tex);
  assert.ok(latest.materials.review);

  for(const href of [latest.href,latest.materials.pdf,latest.materials.tex,latest.materials.review]){
    assert.equal(existsSync(resolve(siteDir,href)),true,`missing file referenced by latest lesson: ${href}`);
  }
});

test('recent and archive partitions cover registry once without loss',()=>{
  const recent=registry.getRecentLessons();
  const archive=registry.getArchiveLessons();
  assert.equal(recent.length,registry.RECENT_LIMIT);
  assert.equal(archive.length,registry.LESSONS.length-registry.RECENT_LIMIT);
  assert.equal(new Set([...recent,...archive].map(lesson=>lesson.href)).size,registry.LESSONS.length);
  assert.deepEqual([...recent,...archive].map(lesson=>lesson.href),registry.LESSONS.map(lesson=>lesson.href));
});

test('archive pagination is data-driven and uses pages of ten',()=>{
  assert.equal(registry.ARCHIVE_PAGE_SIZE,10);
  const first=registry.paginateArchive(registry.LESSONS,0,registry.ARCHIVE_PAGE_SIZE);
  assert.equal(first.total,10);
  assert.equal(first.items.length,10);
  assert.equal(first.pageCount,1);
  assert.equal(first.pageIndex,0);
});

test('date labels are derived from ISO date instead of duplicated strings',()=>{
  assert.equal(registry.formatShortDate('2026-08-23'),'23.08');
  assert.equal(registry.formatLongDateRu('2026-08-23'),'23 августа 2026');
});

test('active HTML exposes data-driven lesson shells and an explicit latest-lesson CTA',()=>{
  assert.match(indexHtml,/id="recentLessons"/);
  assert.match(indexHtml,/id="latestLessonCta"/);
  assert.match(indexHtml,/id="lessonTopics"/);
  assert.match(indexHtml,/id="latestLessonStatus"/);
  assert.match(indexHtml,/type="module" src="dashboard\.js"/);
  assert.doesNotMatch(indexHtml,/href="23\.08\.26\.html"/);
  assert.doesNotMatch(indexHtml,/href="18\.08\.26\.html"/);
  assert.doesNotMatch(indexHtml,/href="15\.08\.26\.html"/);
});

test('dashboard imports lesson registry and has no independent hardcoded archive array',()=>{
  assert.match(dashboardSource,/from '\.\/lesson-registry\.js'/);
  assert.match(dashboardSource,/getRecentLessons/);
  assert.match(dashboardSource,/paginateArchive/);
  assert.doesNotMatch(dashboardSource,/const\s+archiveLessons\s*=\s*\[/);
  assert.doesNotMatch(dashboardSource,/23\.08\.26\.html|18\.08\.26\.html|15\.08\.26\.html/);
});

test('mobile drawer uses inert isolation, focus trap, restore focus and viewport normalization',()=>{
  assert.match(dashboardSource,/FOCUSABLE_SELECTOR/);
  assert.match(dashboardSource,/\.inert=Boolean\(value\)/);
  assert.match(dashboardSource,/event\.key!==\s*'Tab'/);
  assert.match(dashboardSource,/event\.key==='Escape'/);
  assert.match(dashboardSource,/opener=document\.activeElement/);
  assert.match(dashboardSource,/target\.focus\(\)/);
  assert.match(dashboardSource,/matchMedia\(MOBILE_QUERY\)/);
  assert.match(dashboardSource,/addEventListener\('change',normalizeViewport\)/);
  assert.match(dashboardSource,/setInert\(content,true\)/);
  assert.match(dashboardSource,/setInert\(mobileBar,true\)/);
});

test('dashboard CSS contains mobile scroll lock and CTA styles with no dead iframe selectors',()=>{
  assert.match(dashboardCss,/body\.sidebar-open\{overflow:hidden\}/);
  assert.match(dashboardCss,/\.lesson-cta\{/);
  assert.match(dashboardCss,/\.lesson-cta\{width:100%;min-height:48px\}/);
  assert.doesNotMatch(dashboardCss,/\biframe\b/);
  assert.doesNotMatch(dashboardCss,/#base\b/);
  assert.doesNotMatch(dashboardCss,/\.map-frame\b/);
});
