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
  assert.equal(result.lessonMetadata,3);
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
  assert.deepEqual(dates,['2026-10-09','2026-10-04','2026-10-02']);
  assert.match(lesson,/aria-controls="training"/);
  assert.match(lesson,/<math\b/,'accessible MathML for indexed radicals');
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
  function element(dataset={}){
    return {
      dataset,attributes:{},handlers:{},textContent:'',hidden:false,value:'',
      setAttribute(key,value){this.attributes[key]=String(value);},
      getAttribute(key){return this.attributes[key]??null;},
      addEventListener(event,callback){this.handlers[event]=callback;},
      replaceChildren(...nodes){this.children=nodes;}
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
  assert.equal($('currentFormula').children.length,3,'safe superscript DOM structure');
});
