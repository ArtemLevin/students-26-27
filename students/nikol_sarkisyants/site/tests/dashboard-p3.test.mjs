import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const indexHtml=readFileSync(join(siteDir,'index.html'),'utf8');
const dashboardCss=readFileSync(join(siteDir,'dashboard.css'),'utf8');
const mapCss=readFileSync(join(siteDir,'competence-map.css'),'utf8');
const mapSource=readFileSync(join(siteDir,'competence-map.js'),'utf8');
const mapModule=await import(pathToFileURL(join(siteDir,'competence-map.js')).href);

function luminance(hex){
  const channels=[1,3,5].map(index=>Number.parseInt(hex.slice(index,index+2),16)/255)
    .map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}

function contrastRatio(foreground,background){
  const values=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
  return (values[0]+.05)/(values[1]+.05);
}

test('radial keyboard navigation wraps and supports Home and End',()=>{
  assert.equal(mapModule.getNextRovingIndex(0,4,'ArrowRight'),1);
  assert.equal(mapModule.getNextRovingIndex(3,4,'ArrowRight'),0);
  assert.equal(mapModule.getNextRovingIndex(0,4,'ArrowLeft'),3);
  assert.equal(mapModule.getNextRovingIndex(2,4,'ArrowUp'),1);
  assert.equal(mapModule.getNextRovingIndex(2,4,'ArrowDown'),3);
  assert.equal(mapModule.getNextRovingIndex(2,4,'Home'),0);
  assert.equal(mapModule.getNextRovingIndex(1,4,'End'),3);
  assert.equal(mapModule.getNextRovingIndex(0,0,'ArrowRight'),-1);
});

test('radial map exposes one roving entry point and keyboard instructions',()=>{
  assert.match(indexHtml,/id="radialMap"[^>]*role="group"[^>]*aria-labelledby="radialTitle"[^>]*aria-describedby="radialDescription radialKeyboardHelp"/);
  assert.match(indexHtml,/id="radialKeyboardHelp"[^>]*>Клавиатура:/);
  assert.match(mapSource,/const tabIndex=matches&&item\.id===this\.radialFocusId\?'0':'-1'/);
  assert.match(mapSource,/aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Space"/);
  assert.match(mapSource,/class="radial-group-arc\$\{groupMuted\}"[^>]*tabindex="-1"[^>]*aria-hidden="true"/);
  assert.match(mapSource,/moveRadialFocus\(id,key\)/);
});

test('dialog has an accessible name, description and focus restoration',()=>{
  assert.match(indexHtml,/id="competencyDialog"[^>]*aria-labelledby="dialogTitle"[^>]*aria-describedby="dialogDescription levelExplanation"/);
  assert.match(mapSource,/this\.dialogTrigger=document\.activeElement/);
  assert.match(mapSource,/this\.dialog\.addEventListener\('close',\(\)=>this\.restoreDialogFocus\(\)\)/);
  assert.match(mapSource,/this\.dialog\.querySelector\('#closeDialog'\)\?\.focus\(\)/);
});

test('focus indicators and touch targets meet the stage-three baseline',()=>{
  assert.match(dashboardCss,/--focus:#ffd166/);
  assert.match(dashboardCss,/:where\(a,button,summary,\[tabindex\]\):focus-visible\{outline:3px solid var\(--focus\);outline-offset:3px\}/);
  assert.match(mapCss,/\.radial-cell:focus-visible\{stroke:var\(--focus\);stroke-width:6/);
  assert.match(mapCss,/\.filter\{[\s\S]*?min-height:44px/);
  assert.match(mapCss,/\.topic-row\{[\s\S]*?min-height:44px/);
  assert.match(mapCss,/\.dialog-action\{[\s\S]*?min-height:44px/);
  assert.match(dashboardCss,/\.archive-page-btn\{width:44px;height:44px/);
});

test('revised text colors maintain WCAG AA contrast for small text',()=>{
  const pairs=[
    ['#52667a','#f3ede4'],
    ['#edf7fb','#344258'],
    ['#ffffff','#8f5147'],
    ['#ffffff','#846c35'],
    ['#ffffff','#39756e'],
    ['#173047','#e8e3dc'],
    ['#173047','#f4b5a4'],
    ['#173047','#f1cf7c'],
    ['#173047','#9dd8ca'],
    ['#ffffff','#267f7a']
  ];
  for(const [foreground,background] of pairs){
    assert.ok(contrastRatio(foreground,background)>=4.5,`${foreground} on ${background} must be at least 4.5:1`);
  }
  assert.match(dashboardCss,/--muted:#52667a/);
  assert.match(mapCss,/--heat-text-mid:#fff/);
});
