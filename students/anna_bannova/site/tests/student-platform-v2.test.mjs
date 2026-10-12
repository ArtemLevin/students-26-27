import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

const root=process.cwd();
const site=path.join(root,'students','anna_bannova','site');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const readJson=name=>JSON.parse(read(name));

test('Anna Bannova satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root,studentId:'anna_bannova'});
  assert.equal(result.contractVersion,2);
  assert.equal(result.planningMode,'fixed');
  assert.equal(result.ktpLessons,174);
  const metadataFiles=fs.readdirSync(path.join(site,'data','lessons')).filter(name=>name.endsWith('.lesson.json'));
  assert.equal(result.lessonMetadata,metadataFiles.length);
  assert.ok(metadataFiles.includes('2026-10-11.lesson.json'));
});

test('Anna dashboard inline module is syntactically valid JavaScript',()=>{
  const html=read('index.html');
  const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,'module script not found');
  const temp=path.join(os.tmpdir(),'anna-dashboard-'+process.pid+'.mjs');
  fs.writeFileSync(temp,source);
  const result=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});
  fs.rmSync(temp,{force:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Anna dashboard keeps canonical learning state outside index.html',()=>{
  const html=read('index.html');
  const contract=JSON.parse(fs.readFileSync(path.join(root,'students','anna_bannova','student-contract.json'),'utf8'));
  const mastery=readJson('data/mastery-state.json');
  assert.equal(contract.competencies.mastery,'site/data/mastery-state.json');
  assert.equal(mastery.updated,'2026-10-04');
  assert.equal(mastery.levels.calc_09.level,2);
  assert.equal(mastery.levels.calc_10.level,3);
  assert.equal(mastery.levels.expr_12.level,3);
  assert.equal(mastery.levels.calc_10.sourceKind,'lesson-assessment');
  assert.match(html,/student-contract\.json/);
  assert.match(html,/contract\.competencies\.mastery/);
  assert.doesNotMatch(html,/baselineLevels\s*=/);
  assert.doesNotMatch(html,/mastery[^\n]{0,80}localStorage\.setItem/i);
});

test('Anna dashboard student-facing shell contains no architecture jargon',()=>{
  const html=read('index.html');
  const visibleShell=html.split('<script type="module">')[0];
  assert.doesNotMatch(visibleShell,/canonical|mastery|lesson registry|Student Platform|\bheatmap\b|\bcompetency\b|\bevidence\b/i);
  assert.match(visibleShell,/Круговая карта компетенций/);
  assert.match(visibleShell,/Лёвин Артём Александрович эксклюзивно для Анны Банновой/);
});

test('Anna dashboard preserves map accessibility and mobile map priority',()=>{
  const html=read('index.html');
  assert.match(html,/id="radialMap"[^>]+role="group"/);
  assert.match(html,/path\.setAttribute\('tabindex','-1'\)/);
  assert.match(html,/ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1/);
  assert.match(html,/\.map-panel\{order:1\}\.catalog\{order:2\}/);
  assert.match(html,/@media print/);
});

test('Anna KTP plan remains complete and calendar-consistent',()=>{
  const plan=readJson('data/ktp-plan.json');
  assert.equal(plan.lessons.length,174);
  assert.equal(plan.lessons[0].plannedDate,'2026-10-02');
  assert.equal(plan.lessons.at(-1).plannedDate,'2028-05-28');
  for(const [index,lesson] of plan.lessons.entries()){
    assert.equal(lesson.order,index+1);
    assert.equal(lesson.id,'ktp-'+String(index+1).padStart(3,'0'));
    const day=new Date(lesson.plannedDate+'T00:00:00Z').getUTCDay();
    assert.ok(day===0||day===5,lesson.id+' must be Friday or Sunday');
  }
});


test('09.10.26 lesson and laboratory retain exact source exercise coverage and links',()=>{
  const lesson=read('09.10.26.html');
  const lab=read('09.10.26-lab.html');
  const tex=fs.readFileSync(path.join(root,'students','anna_bannova','tex_docs','09.10.26.tex'),'utf8');
  const metadata=readJson('data/lessons/2026-10-09.lesson.json');
  assert.equal([...lesson.matchAll(/class="task"/g)].length,10,'10 practice problems');
  assert.equal([...lesson.matchAll(/class="answer"/g)].length,10,'10 answer keys');
  assert.equal([...tex.matchAll(/\\item (?:Упростите выражение|Найдите значение выражения|Если \$f|Решите уравнение)/g)].length,10,'10 source problems');
  const ids=[...lesson.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'duplicate IDs');
  for(const outcome of metadata.outcomes){
    assert.ok(ids.includes(outcome.evidenceAnchor),'missing competency anchor '+outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null,'review should not elevate mastery without independent assessment');
  }
  for(const [html,file] of [[lesson,'09.10.26.html'],[lab,'09.10.26-lab.html']]){
    const dirname=path.join(site,path.dirname(file));
    for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
      const href=match[1];
      if(href.startsWith('#')){
        assert.ok(html.includes('id="'+href.slice(1)+'"'),'broken local anchor '+href);
      }else if(!/^(?:https?:|data:|mailto:)/.test(href)){
        const target=path.resolve(dirname,href.split(/[?#]/,1)[0]);
        assert.ok(fs.existsSync(target),'broken local resource '+href);
      }
    }
  }
  const registry=read('lesson-registry.js');
  const dates=[...registry.matchAll(/"date": "(\d{4}-\d{2}-\d{2})"/g)].map(x=>x[1]);
  const canonicalDates=fs.readdirSync(path.join(site,'data','lessons')).filter(name=>name.endsWith('.lesson.json')).map(name=>name.slice(0,10)).sort().reverse();
  assert.deepEqual(dates,canonicalDates);
  assert.equal(dates[0],'2026-10-11');
  assert.match(lesson,/aria-controls="training"/);
  assert.match(lesson,/<mroot>/,'indexed radicals use mroot');
  assert.match(lesson,/<msqrt>/,'square roots use msqrt');
  assert.match(lesson,/<mfrac>/,'fractions use mfrac');
  assert.match(lesson,/<msup>/,'exponents use msup');
  assert.doesNotMatch(lesson,/<sup\b|class="frac"/,'no HTML superscripts or pseudo-fractions remain');
  assert.doesNotMatch(lab,/<sup\b/,'laboratory uses MathML exclusively');
  assert.match(lab,/createElementNS\(MATH_NS/,'dynamic math nodes are namespace aware');
  assert.match(lab,/<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
  for(const expr of lesson.matchAll(/<div class="math">([\s\S]*?)<\/div>/g)){
    assert.match(expr[1],/<math\b[^>]*display="block"/);
  }
  for(const answer of lesson.matchAll(/<span class="answer" hidden>([\s\S]*?)<\/span>/g)){
    assert.match(answer[1],/<math\b/);
  }
  assert.match(lab,/\brole="status" aria-live="polite"/);
  assert.doesNotMatch(lab,/\$\('currentFormula'\)\.innerHTML/,'no dynamic HTML for slider-generated formula');
});

test('09.10.26 lesson and laboratory inline scripts parse as JavaScript',()=>{
  for(const file of ['09.10.26.html','09.10.26-lab.html']){
    const html=read(file);
    const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,1,file+': expected one inline script');
    assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:file}),file+': syntax error');
  }
});

test('09.10.26 laboratory: slider endpoints, reset, prediction and contextual return',()=>{
  function element(dataset={},tagName=null,namespaceURI=null){
    return {
      dataset,tagName,namespaceURI,attributes:{},handlers:{},textContent:'',hidden:false,value:'',
      setAttribute(key,value){this.attributes[key]=String(value);},
      getAttribute(key){return this.attributes[key]??null;},
      addEventListener(event,callback){this.handlers[event]=callback;},
      replaceChildren(...nodes){this.children=nodes;this.textContent=nodes.map(node=>node.textContent).join('');}
    };
  }
  const keys=['theme','variable','variableValue','variableLabel','figureTitle',
    'firstLabel','firstValue','secondLabel','secondValue','result','resultLabel',
    'reason','prompt','predictionFeedback','currentFormula','backExplanation','reset'];
  const items=new Map(keys.map(key=>[key,element()]));
  const modes=[element({mode:'function'}),element({mode:'fraction'})];
  const choices=[element({prediction:'constant'}),element({prediction:'changing'})];
  let hash='';
  const location={get hash(){return hash;},set hash(value){hash=value.startsWith('#')?value:'#'+value;}};
  const doc={
    documentElement:{dataset:{theme:'light'}},
    getElementById(key){assert.ok(items.has(key),'missing mock '+key);return items.get(key);},
    querySelectorAll(query){
      if(query==='.mode')return modes;
      if(query==='[data-prediction]')return choices;
      throw new Error('unexpected selector '+query);
    },
    createElement(){return element();},
    createElementNS(namespace,tag){return element({},tag,namespace);},
    createTextNode(text){return {textContent:text};}
  };
  const events={};
  const window={addEventListener(event,handler){events[event]=handler;}};
  const source=read('09.10.26-lab.html').match(/<script>([\s\S]*?)<\/script>/)?.[1];
  new vm.Script(source,{filename:'09.10.26-lab.html'}).runInNewContext({
    document:doc,window,location,Math,Number,Intl
  },{timeout:2000});
  const $=id=>items.get(id);
  assert.equal($('result').textContent,'64','initial function ratio');
  assert.equal(location.hash,'#function');
  for(const x of ['-4','0','4']){
    $('variable').value=x;
    $('variable').handlers.input();
    assert.equal($('result').textContent,'64','function ratio at '+x);
  }
  modes[1].handlers.click();
  assert.equal(location.hash,'#fraction');
  assert.equal($('backExplanation').href,'09.10.26.html#fractional');
  for(const x of ['0.25','1','4']){
    $('variable').value=x;
    $('variable').handlers.input();
    assert.equal($('result').textContent,'6','fraction expression at '+x);
  }
  choices[0].handlers.click();
  assert.match($('predictionFeedback').textContent,/Верно/);
  $('reset').handlers.click();
  assert.equal($('variable').value,'1','fraction reset value');
  assert.equal($('result').textContent,'6');
  modes[0].handlers.click();
  assert.equal($('backExplanation').href,'09.10.26.html#functions');
  assert.equal($('result').textContent,'64');
  assert.equal($('currentFormula').children.length,1,'one MathML root per formula');
  assert.equal($('currentFormula').children[0].tagName,'math');
  assert.equal($('currentFormula').children[0].namespaceURI,'http://www.w3.org/1998/Math/MathML');
  assert.equal($('result').children[0].tagName,'math','live result is MathML');
  assert.equal($('firstValue').children[0].tagName,'math','live numerator is MathML');
  assert.equal($('secondValue').children[0].tagName,'math','live denominator is MathML');
  assert.equal($('variableValue').children[0].tagName,'math','slider readout is MathML');
});

test('11.10.26 lesson and laboratory integrate with canonical publication and original exercises',()=>{
  const lesson=read('11.10.26.html'),lab=read('11.10.26-lab.html');
  const metadata=readJson('data/lessons/2026-10-11.lesson.json');
  const intent=readJson('data/lessons/2026-10-11.intent.json');
  const state=readJson('data/ktp-state.json');
  assert.equal(metadata.materials.html,'11.10.26.html');
  assert.equal(metadata.materials.lab,'11.10.26-lab.html');
  assert.equal(metadata.date,'2026-10-11');
  assert.equal(intent.lessonDate,metadata.date);
  assert.equal(intent.ktpMatches.filter(x=>x.decision==='apply').length,3);
  assert.equal(metadata.outcomes.length,5);
  for(const outcome of metadata.outcomes){
    assert.match(lesson,new RegExp('\\bid="'+outcome.evidenceAnchor+'"'),'evidence anchor');
    assert.equal(outcome.masteryClaim,null,'no ungrounded mastery promotion');
  }
  for(const id of metadata.ktpRefs)assert.ok(state.records[id].lessonRefs.includes('2026-10-11'));
  assert.match(lesson,/grid\.className='graph-tasks'/,'eight source graph tasks are generated as a group');
  for(let n=3;n<=10;n++)assert.match(lesson,new RegExp('\\{n:'+n+',q:'),'source exercise '+n+' exists');
  assert.match(lesson,/<msup><mn>16<\/mn>/,'exercise 1 is a MathML power');
  assert.match(lesson,/<mfrac><mn>1<\/mn><mn>2<\/mn><\/mfrac>/,'exercise 1 uses a true MathML fraction');
  assert.match(lesson,/<msup><mn>4<\/mn>/,'exercise 2 is a MathML power');
  assert.doesNotMatch(lesson,/<sup\b|[ˣᵇ⁽⁾¹]/,'no visual-only HTML powers or Unicode exponent lookalikes');
  assert.doesNotMatch(lab,/<sup\b|[ˣᵇ⁽⁾¹]/,'lab does not use HTML or Unicode superscript hacks');
  assert.doesNotMatch(lab,/\.innerHTML\s*=/,'math is assembled as namespace-aware DOM nodes');
  assert.match(lesson,/\.\.\/images\/11\.10\.26\.png/);
  assert.match(lesson,/\.\.\/pdf_docs\/11\.10\.26\.pdf/);
  assert.match(lesson,/\.\.\/tex_docs\/11\.10\.26\.tex/);
  assert.match(lab,/data-case="half"/);
  assert.match(lab,/data-case="shift"/);
  for(const [file,html,expected] of [['11.10.26.html',lesson,2],['11.10.26-lab.html',lab,1]]){
    const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,expected,file+' script count');
    for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script[1],{filename:file}),file+' has syntax error');
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(ids).size,ids.length,file+' duplicate ids');
  }
});

test('11.10.26 renders static mathematical objects using semantic MathML throughout',()=>{
 const lesson=read('11.10.26.html'),lab=read('11.10.26-lab.html');
 const beforeScript=file=>file.slice(0,file.indexOf('<script>'));
 for(const [name,html] of [['lesson',lesson],['lab',lab]]){
   const source=beforeScript(html),maths=[...source.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)];
   assert.ok(maths.length>=30,name+' mathematical expressions are MathML');
   for(const [index,expression] of maths.entries()){
     assert.match(expression[0],/xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/,name+' expression '+index+' has MathML namespace');
     assert.match(expression[0],/<(?:mi|mn|msup|mfrac|msqrt|mroot|mrow)>/,name+' expression '+index+' contains semantic content');
   }
   assert.doesNotMatch(source,/<sup\b|ⁿ√a|[ˣᵇ⁽⁾¹]/,name+' contains no HTML/unicode faux mathematics');
 }
 assert.match(lesson,/<mroot>/,'nth root uses a proper MathML node');
 assert.match(lesson,/<mfrac>/,'fractions use MathML fraction nodes');
 assert.match(lesson,/<msup>/,'powers use proper superscript elements');
 assert.match(lab,/<msup>/);
 assert.match(lab,/function fillMath\(el,expr\)/);
 assert.match(lab,/function fillMixed\(el,source\)/);
 assert.doesNotMatch(lab,/\.innerHTML\s*=/,'no string-to-HTML assignment');
});

test('11.10.26 live mathematical formula builders create namespaced MathML',()=>{
 for(const name of ['11.10.26.html','11.10.26-lab.html']){
  const html=read(name),src=html.match(/const MATH_NS='http:\/\/www\.w3\.org\/1998\/Math\/MathML';[\s\S]*?function fillMath\(el,expr\)\{[^\n]*\}/)?.[0];
  assert.ok(src,name+' math builder source exists');
  const doc={
   createElementNS(namespaceURI,tagName){return {namespaceURI,tagName,children:[],attrs:{},append(...parts){this.children.push(...parts)},setAttribute(k,v){this.attrs[k]=v},replaceChildren(...nodes){this.children=nodes}}},
   createTextNode(textContent){return {tagName:'#text',textContent}}
  };
  const make=new vm.Script(src+';mathNode');
  const build=make.runInNewContext({document:doc,Math,Number}, {timeout:1000});
  function tags(root){return [root.tagName,...(root.children||[]).flatMap(tags)]}
  for(const [expr,expected] of [
   ['f(x)=a^(x+b)','msup'],['16^(1/2)+8^(2/3)-2^(-2)','mfrac'],
   ['f(x)=2^((x+3)/2)','mfrac'],['a=sqrt(2);b=3','msqrt'],
   ['(-3;1)','mn'],['0,5^(-1,25)-4=0','msup']
  ]){
   const root=build(expr);
   assert.equal(root.tagName,'math',name+': '+expr);
   assert.equal(root.namespaceURI,'http://www.w3.org/1998/Math/MathML');
   assert.ok(tags(root).includes(expected),name+': '+expr+' lacks '+expected);
  }
 }
});
