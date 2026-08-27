import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../27.08.26.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../27.08.26-simulator.js',import.meta.url),'utf8');
for(const id of ['labSvg','scenarioRow','primaryControls','predictionRun','snapshotBtn','timeSlider','challengeStatus']) assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
assert.ok(html.includes('type="module" src="./27.08.26-simulator.js"'));
for(const token of ['deriveTrajectory','deriveRail','derivePower','derivePowers','requestAnimationFrame','prefers-reduced-motion','data-drag']) assert.ok(js.includes(token),`missing ${token}`);
console.log('27.08.26 simulator static contract: ok');
