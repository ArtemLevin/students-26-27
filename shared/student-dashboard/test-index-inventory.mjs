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
assert.deepEqual(indexes,[
  'students/kirill_zinoviev/site/index.html',
  'students/nastya_pavlova/index.html',
  'students/nastya_pavlova/site/index.html',
  'students/nikol_sarkisyants/site/index.html',
  'students/sofya_kalney/site/index.html',
  'students/timofey/site/index.html',
  'students/volodia_khachaturian/index.html',
  'students/volodia_khachaturian/site/index.html',
  'students/xenia_klykova/chemistry/site/index.html',
  'students/xenia_klykova/site/index.html'
]);

const dashboardPaths=indexes.filter(file=>file.endsWith('/site/index.html')&&!file.includes('/chemistry/')&&!file.includes('/nikol_sarkisyants/')&&!file.includes('/nastya_pavlova/'));
for(const file of dashboardPaths){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const token of ['data-filter="repeat"','data-filter="unseen"','data-filter="help"','data-filter="progress"','data-filter="confident"','data-filter="mastered"','id="levelExplanation"','aria-labelledby="radialTitle radialDescription"']){
    assert.ok(html.includes(token),`${file}: missing ${token}`);
  }
}

const adapterPaths=['students/nastya_pavlova/site/index.html','students/nikol_sarkisyants/site/index.html'];
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

const chemistry=fs.readFileSync(path.join(root,'students/xenia_klykova/chemistry/site/index.html'),'utf8');
for(const token of ['class="skip"','href="#content"','aria-labelledby="page-title"','min-height:44px','focus-visible','prefers-reduced-motion','Последнее занятие'])assert.ok(chemistry.includes(token),`chemistry index: missing ${token}`);

console.log(`✓ index inventory: ${indexes.length} entry pages covered, ${dashboardPaths.length} shared dashboards migrated, ${adapterPaths.length} practice adapters`);
