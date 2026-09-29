import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

const root=process.cwd();
const indexes=walk(path.join(root,'students')).filter(file=>path.basename(file)==='index.html').map(file=>path.relative(root,file).replaceAll('\\','/')).sort();
assert.ok(indexes.length>0,'No student index entry points found');

const siteIndexes=indexes.filter(file=>file.endsWith('/site/index.html'));
const sharedDashboardPaths=[];
const adapterPaths=[];
const chemistryPaths=[];
const bespokeDashboardPaths=[];

for(const file of siteIndexes){
  const absolute=path.join(root,file);
  const dir=path.dirname(absolute);
  const html=fs.readFileSync(absolute,'utf8');
  const isSharedDashboard=['dashboard.js','lesson-registry.js','competence-config.js'].every(name=>fs.existsSync(path.join(dir,name)));
  const isChemistry=file.includes('/chemistry/');
  const isPracticeAdapter=!isSharedDashboard&&[
    'id="practiceSection"',
    'id="practiceRoot"',
    'shared/practice/practice.css'
  ].every(token=>html.includes(token));

  if(isSharedDashboard)sharedDashboardPaths.push(file);
  else if(isChemistry)chemistryPaths.push(file);
  else if(isPracticeAdapter)adapterPaths.push(file);
  else bespokeDashboardPaths.push(file);
}

assert.equal(
  sharedDashboardPaths.length+adapterPaths.length+chemistryPaths.length+bespokeDashboardPaths.length,
  siteIndexes.length,
  'Every site/index.html must belong to exactly one discovered architecture'
);

for(const file of sharedDashboardPaths){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const token of ['data-filter="repeat"','data-filter="unseen"','data-filter="help"','data-filter="progress"','data-filter="confident"','data-filter="mastered"','id="levelExplanation"','aria-labelledby="radialTitle radialDescription"']){
    assert.ok(html.includes(token),`${file}: missing ${token}`);
  }
}

const ekaterina=fs.readFileSync(path.join(root,'students/ekaterina_gnedkova/site/index.html'),'utf8');
for(const token of [
  'class="skip"',
  'href="#content"',
  'id="radialMap"',
  'viewBox="0 0 800 800"',
  'aria-labelledby="radialTitle radialDescription"',
  'id="topicSearch"',
  'data-filter="all"',
  'data-filter="covered"',
  'data-filter="repeat"',
  'data-filter="upcoming"',
  'id="topicCatalog"',
  'id="competencyDialog"',
  'id="repeatToggle"',
  'id="resetMap"',
  'id="themeToggle"',
  'id="mapTooltip"',
  'competency-map-data.js',
  'competency-map.js',
  'competency-map.css'
])assert.ok(ekaterina.includes(token),`ekaterina index: missing ${token}`);

for(const file of adapterPaths){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const token of ['id="practiceSection"','id="practiceRoot"','shared/practice/practice.css'])assert.ok(html.includes(token),`${file}: missing ${token}`);
}

const redirect=fs.readFileSync(path.join(root,'students/volodia_khachaturian/index.html'),'utf8');
assert.ok(redirect.includes('url=site/index.html'));
assert.ok(redirect.includes("'#competency-map':'#map'"));
assert.ok(redirect.includes("'#practice':'#practiceSection'"));
assert.ok(redirect.includes('site/index.html#practiceSection'));
assert.ok(redirect.includes('location.replace'));

for(const file of chemistryPaths){
  const chemistry=fs.readFileSync(path.join(root,file),'utf8');
  for(const token of ['class="skip"','href="#content"','aria-labelledby="page-title"','min-height:44px','focus-visible','prefers-reduced-motion','Последнее занятие']){
    assert.ok(chemistry.includes(token),`${file}: missing ${token}`);
  }
}

console.log(`✓ index inventory: ${indexes.length} entry pages covered, ${sharedDashboardPaths.length} shared dashboards, ${bespokeDashboardPaths.length} bespoke dashboards, ${adapterPaths.length} practice adapters, ${chemistryPaths.length} chemistry dashboards`);
