import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('students/sofya_luzianina/site/ktp.html','utf8');
test('KTP interaction module parses and all control targets exist',()=>{
 const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js,'embedded module missing');
 assert.doesNotThrow(()=>new vm.Script(js));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate id');
 for(const name of ['viewOverview','viewCalendar','viewToday','query','stageSelect','statusSelect','clearFilters','months','lessonDialog','closeDialog','metricTotal','metricDone','metricActive','metricPending'])assert.ok(ids.includes(name),name+' missing');
});
