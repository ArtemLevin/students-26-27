import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../09.11.26.html',import.meta.url),'utf8');
const items=[...html.matchAll(/<li data-number="(\d{2})" data-level="(basic|middle|hard)">([\s\S]*?)<\/li>/g)];

test('09.11: numbering stays stable after difficulty filtering',()=>{
  assert.equal(items.length,10);
  assert.deepEqual(items.map(m=>m[1]),Array.from({length:10},(_,i)=>String(i+1).padStart(2,'0')));
  assert.deepEqual(items.map(m=>m[2]),['basic','basic','basic','middle','middle','middle','middle','hard','hard','hard']);
  assert.match(html,/\.tasks li::before\{content:attr\(data-number\)/);
});

test('09.11: exercises expose accessible answer relationships and completion labels',()=>{
  assert.match(html,/id="task-list" role="list"/);
  assert.match(html,/id="filter-summary" role="status" aria-live="polite"/);
  for(let i=1;i<=10;i++){
    const n=String(i).padStart(2,'0');
    assert.ok(items[i-1][3].includes('aria-controls="answer-'+n+'"'));
    assert.ok(items[i-1][3].includes('id="answer-'+n+'"'));
    assert.ok(items[i-1][3].includes('aria-label="Отметить задание №'+i+' как решённое"'));
  }
});

test('09.11: printed A4 version restores all filtered tasks and answers',()=>{
  assert.match(html,/@media print\{/);
  assert.match(html,/\.tasks>li\[hidden\]\{display:list-item!important\}/);
  assert.match(html,/\.answer\[hidden\],\.answer\{display:block!important/);
  assert.match(html,/@page\{size:A4;margin:15mm\}/);
});

test('09.11: physics answer key agrees with independent calculations',()=>{
  const r=Math.sqrt(3),g=10;
  const calc=[
    [8*r,8],
    3*g-10/2,
    .25*(2*g-8/2),
    [4*g-12/2,.3*(4*g-12/2)],
    (4.2/.2+18/2)/g,
    (20*r/2-.25*(5*g-20/2))/5,
    (12*r/2-.4*(3*g-12/2))/3,
    6.6/(4*g-14/2),
    2*2*(2+.2*g)/(r+.2),
    (10*r/2-.6*(4*g-10/2))/4
  ];
  const near=(a,b)=>assert.ok(Math.abs(a-b)<.015,String(a)+' != '+String(b));
  near(calc[0][0],8*r);near(calc[0][1],8);
  near(calc[1],25);near(calc[2],4);near(calc[3][0],34);near(calc[3][1],10.2);
  near(calc[4],3);near(calc[5],1.46);near(calc[6],.26);near(calc[7],.2);
  near(calc[8],8.28);near(calc[9],-3.08);
  assert.equal(items.filter(x=>x[3].includes('class="answer"')).length,10);
});
