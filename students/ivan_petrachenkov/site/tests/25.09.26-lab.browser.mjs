import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const origin = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8765';
const address = origin + '/students/ivan_petrachenkov/site/25.09.26-lab.html';
const screenshots = process.env.TEST_SCREENSHOTS ?? '/tmp/ivan-lab-screens';
mkdirSync(screenshots, { recursive: true });
const browser = await chromium.launch({ headless:true });
const errors = [];
function attachErrors(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
}
async function open(page, mode='route') {
  await page.goto(address + '?mode=' + mode, { waitUntil:'networkidle' });
  await page.waitForFunction(() => document.querySelector('#routeInsight')?.textContent?.length);
}
async function noOverflow(page, width) {
  const layout = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  assert.ok(layout.scroll <= layout.client + 1, `overflow at ${width}px: ${JSON.stringify(layout)}`);
}
async function svgScreenPoint(page, selector, x, y) {
  return page.locator(selector).evaluate((element,coords) => {
    const point=element.createSVGPoint();
    point.x=coords.x;point.y=coords.y;
    const transformed=point.matrixTransform(element.getScreenCTM());
    return { x:transformed.x, y:transformed.y };
  }, { x,y });
}
const desktop=await browser.newPage({ viewport:{width:1440,height:900} });
attachErrors(desktop);
await open(desktop);
for (const width of [1440,1024,900,768,390,320]) {
  await desktop.setViewportSize({ width,height:900 });
  await noOverflow(desktop,width);
  if (width===1440 || width===390) {
    await desktop.screenshot({path:`${screenshots}/route-${width}-light.png`,fullPage:true});
    await desktop.locator('#theme').click();
    await desktop.screenshot({path:`${screenshots}/route-${width}-dark.png`,fullPage:true});
    await desktop.locator('#theme').click();
  }
}
await desktop.setViewportSize({width:1440,height:900});
await desktop.locator('[data-route-scenario=half]').click();
await desktop.waitForFunction(() => document.querySelector('#radiusValue').textContent === '20 м');
await desktop.locator('#routeNext').click();
await desktop.waitForFunction(() => document.querySelector('#angleValue').textContent === '90°');
await desktop.locator('#routeNext').click();
await desktop.waitForFunction(() => document.querySelector('#angleValue').textContent === '180°');
assert.equal(await desktop.locator('#displacementValue').textContent(),'40 м');
assert.equal(await desktop.locator('#angleValue').textContent(),'180°');
await desktop.locator('#routeSave').click();
await desktop.locator('[data-route-scenario=full]').click();
await desktop.locator('#routeNext').click();
await desktop.waitForFunction(() => !document.querySelector('#routeGhost').hasAttribute('hidden'));
assert.equal(await desktop.locator('#routeGhost').isVisible(),true);
assert.equal(await desktop.locator('#routeComparison').isVisible(),true);
await desktop.locator('#routeClear').click();
await desktop.locator('#tab-graph').click();
await desktop.locator('[data-graph-scenario=second]').click();
await desktop.locator('#graphHit').click();
await desktop.waitForFunction(() => document.querySelector('#coordinateValue').textContent === '0 м');
assert.equal(await desktop.locator('#coordinateValue').textContent(),'0 м');
await desktop.screenshot({path:`${screenshots}/graph-1440-light.png`,fullPage:true});
await desktop.locator('#theme').click();
await desktop.screenshot({path:`${screenshots}/graph-1440-dark.png`,fullPage:true});

const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
attachErrors(mobile);
await open(mobile);
await mobile.locator('[data-route-scenario=half]').click();
await mobile.locator('#routeScene').scrollIntoViewIfNeeded();
const radius=Number(await mobile.locator('#routeBase').getAttribute('r'));
const start=await svgScreenPoint(mobile,'#routeScene',300,252-radius);
const end=await svgScreenPoint(mobile,'#routeScene',300,252+radius);
const cdp=await mobile.context().newCDPSession(mobile);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id:1}]});
for(let i=1;i<=12;i++){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12,id:1}]});
}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.equal(await mobile.locator('#displacementValue').textContent(),'40 м');
await noOverflow(mobile,390);
await mobile.locator('#tab-graph').click();
await mobile.locator('[data-graph-scenario=second]').click();
await mobile.locator('#time').evaluate(input => { input.value='5'; input.dispatchEvent(new Event('input',{bubbles:true})); });
await mobile.waitForFunction(() => document.querySelector('#coordinateValue').textContent === '0 м');
assert.equal(await mobile.locator('#coordinateValue').textContent(),'0 м');
await mobile.screenshot({path:`${screenshots}/graph-390-light.png`,fullPage:true});
await mobile.locator('#theme').click();
await mobile.screenshot({path:`${screenshots}/graph-390-dark.png`,fullPage:true});
assert.deepEqual(errors,[]);
await browser.close();
console.log('Browser interactions, touch, light/dark and six responsive widths passed.');
