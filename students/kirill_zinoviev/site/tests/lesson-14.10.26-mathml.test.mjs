import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const site='students/kirill_zinoviev/site/';
const lesson=readFileSync(site+'14.10.26.html','utf8');
const lab=readFileSync(site+'14.10.26-lab.html','utf8');
const NS='http://www.w3.org/1998/Math/MathML';

function staticMathAudit(html,label){
  assert.ok(!/<mtext\b/i.test(html),label+': raw text-only MathML is prohibited');
  assert.ok(!/\\\(|\\\[|<script[^>]*src=["']https?:/i.test(html),label+': unexpected fallback or remote math renderer');
  const fragments=[...html.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(x=>x[0]);
  assert.ok(fragments.length>=10,label+': missing maths');
  for(const markup of fragments){
    assert.ok(markup.includes('xmlns="'+NS+'"'),label+': wrong MathML namespace');
    assert.match(markup,/<mrow>/,label+': MathML needs a structured row');
    assert.match(markup,/<(?:mi|mn|mo)(?:\s[^>]*)?>/,label+': MathML has no semantic tokens');
    assert.ok(!/<(?:span|b|i|div|svg|text)\b/i.test(markup),label+': HTML or SVG inside MathML');
  }
  assert.ok(!/<text\b/i.test(html),label+': number line text labels must be real MathML in foreignObject');
  assert.ok((html.match(/<foreignObject\b/g)||[]).length>=3,label+': mathematical tick labels missing');
  return fragments;
}
const staticLesson=staticMathAudit(lesson,'14.10 lesson');
const staticLab=staticMathAudit(lab,'14.10 lab');
assert.ok(staticLesson.length>90,'lesson must cover text, exercises, labels and formulas');
assert.ok(staticLab.some(tag=>tag.includes('id="ineq"')),'missing reactive inequality MathML');
assert.ok(staticLab.some(tag=>tag.includes('id="interval"')),'missing reactive interval MathML');
assert.match(lesson,/<mi>∞<\/mi>/,'infinity must be encoded as a mathematical identifier');
assert.match(lesson,/<mo separator="true">;<\/mo>/,'interval separators must remain mathematical');
assert.match(lesson,/<mn>2,5<\/mn>/,'decimal commas must be encoded as numbers');
assert.match(lesson,/<mi>x<\/mi>/,'variable x must be an identifier');
assert.match(lesson,/<mo fence="true">\[<\/mo>/,'included endpoints must be encoded as a fence');

const main=lesson.slice(lesson.indexOf('<main id="main">'),lesson.indexOf('</main>')+7);
const plain=main.replace(/<math\b[\s\S]*?<\/math>/g,'MATH').replace(/<svg\b[\s\S]*?<\/svg>/g,'SVG').replace(/<[^>]*>/g,' ');
assert.ok(!/\bx\s*(?:=|≤|≥|∈|&lt;|&gt;)|\s=\s|\s−\s/.test(plain),'mathematical relation leaked outside MathML');
assert.equal((lesson.match(/<li><p>/g)||[]).length,10,'all 10 exercises remain present');
for(const id of ['one-sided','bounded','algorithm','word-problem','training']){
  assert.ok(lesson.includes('id="'+id+'"'),'lesson anchor disappeared: '+id);
}

const js=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'interactive script is missing');
assert.doesNotThrow(()=>new vm.Script(js,{filename:'kirill-141026-lab.js'}));
const fns=js.slice(js.indexOf('const MATH_NS='),js.indexOf("const state={kind:"));
assert.ok(fns.startsWith('const MATH_NS='));
const make=(ns,name)=>({
  namespaceURI:ns,localName:name,childNodes:[],attributes:{},textContent:'',
  append(...nodes){this.childNodes.push(...nodes)},
  replaceChildren(...nodes){this.childNodes=nodes},
  setAttribute(key,value){this.attributes[key]=value}
});
const document={
  createElementNS:make,
  createTextNode:text=>({localName:'#text',textContent:text}),
};
const ctx={document};
vm.runInNewContext(fns+'\nthis.mathOps={createMath,setMathExpression,setMathProse};',ctx);
const ops=ctx.mathOps;
function leaves(node){return node.childNodes?.length?node.childNodes.flatMap(leaves):[node]}
const cases=[
  'x < 5','x ≤ 5','x > 5','x ≥ 5',
  'x ∈ (−∞; 5)','x ∈ (−∞; 5]','x ∈ (5; +∞)','x ∈ [5; +∞)',
  '4 < x < 12','4 ≤ x < 12','4 < x ≤ 12','4 ≤ x ≤ 12',
  'x ∈ (4; 12)','x ∈ [4; 12)','x ∈ (4; 12]','x ∈ [4; 12]'
];
for(const expression of cases){
  const math=make(NS,'math');
  ops.setMathExpression(math,expression);
  assert.equal(math.namespaceURI,NS);
  assert.equal(math.attributes['aria-label'],expression);
  assert.equal(leaves(math).map(n=>n.textContent).join(''),expression.replace(/\s+/g,''),'different maths: '+expression);
  assert.ok(leaves(math).every(n=>['mi','mn','mo'].includes(n.localName)),expression+': non-semantic token');
  assert.ok(leaves(math).filter(n=>n.textContent==='∞').every(n=>n.localName==='mi'),'infinity semantic token');
}
const explanation=make('','p');
ops.setMathProse(explanation,'Числа левее 5, но 5 не входит.');
assert.equal(explanation.childNodes.filter(x=>x.localName==='math').length,2,'dynamic prose numerals need MathML');
assert.ok(!/innerHTML\s*=/.test(js),'never interpolate HTML strings for dynamic mathematical markup');
console.log('Kirill 14.10 MathML: static markup, all interactive states and exercises verified');
