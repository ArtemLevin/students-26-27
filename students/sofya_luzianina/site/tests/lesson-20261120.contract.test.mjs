import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),site=path.resolve(dir,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
test('20.11.26: lesson and lab assets exist',()=>{for(const f of ['20.11.26.html','20.11.26-lab.html','20.11.26-inclined-plane-3d.html','20.11.26-elastic-bounce-3d.html'])assert.ok(fs.statSync(path.join(site,f)).size>1000,f)});
test('20.11.26: expected stable anchors and mathml',()=>{const html=read('20.11.26.html');for(const id of ['puck-axis','puck-laws','puck-return','reflection','bounce-angles','bounce-height','practice','lab'])assert.match(html,new RegExp('id="'+id+'"'));assert.ok((html.match(/<math\b/g)||[]).length>=10);assert.match(html,/20\.11\.26-lab\.html/)});
test('20.11.26: both models reachable through the lab hub',()=>{const html=read('20.11.26-lab.html');for(const f of ['20.11.26-inclined-plane-3d.html','20.11.26-elastic-bounce-3d.html'])assert.ok(html.includes(f))});
test('20.11.26: standalone interactive models remain intact',()=>{for(const f of ['20.11.26-inclined-plane-3d.html','20.11.26-elastic-bounce-3d.html']){const html=read(f);assert.match(html,/<canvas\b/);assert.match(html,/<script\b/);assert.match(html,/<html lang="ru">/)}});
