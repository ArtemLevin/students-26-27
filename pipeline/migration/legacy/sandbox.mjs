import fs from 'node:fs';
import vm from 'node:vm';

function makeStorage(){
  const store=new Map();
  return {
    getItem:key=>store.has(String(key))?store.get(String(key)):null,
    setItem:(key,value)=>{store.set(String(key),String(value));},
    removeItem:key=>{store.delete(String(key));},
    clear:()=>store.clear(),
    key:index=>[...store.keys()][index]??null,
    get length(){return store.size;}
  };
}

function makeElement(){
  return {
    style:{},
    dataset:{},
    classList:{add(){},remove(){},toggle(){return false;},contains(){return false;}},
    children:[],
    firstChild:null,
    hidden:false,
    disabled:false,
    value:'',
    textContent:'',
    innerHTML:'',
    setAttribute(){},
    removeAttribute(){},
    addEventListener(){},
    removeEventListener(){},
    append(){},
    appendChild(){},
    replaceChildren(){},
    querySelector(){return null;},
    querySelectorAll(){return [];}
  };
}

export function createLegacySandbox(){
  const localStorage=makeStorage();
  const document={
    readyState:'complete',
    body:makeElement(),
    documentElement:makeElement(),
    addEventListener(){},
    removeEventListener(){},
    getElementById(){return null;},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    createElement(){return makeElement();}
  };
  class BlobStub{
    constructor(parts=[],options={}){this.parts=parts;this.type=options.type||'';}
  }
  const URLStub={
    createObjectURL(){return 'blob:migration-sandbox';},
    revokeObjectURL(){}
  };
  const FIXED_NOW=Date.parse('2026-10-01T00:00:00Z');
  class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:[FIXED_NOW]));}
    static now(){return FIXED_NOW;}
  }
  const deterministicMath=Object.create(Math);
  deterministicMath.random=()=>0.5;
  const window={
    document,
    localStorage,
    URL:URLStub,
    Blob:BlobStub,
    Date:FixedDate,
    Math:deterministicMath,
    addEventListener(){},
    removeEventListener(){},
    dispatchEvent(){return true;},
    setTimeout(){return 0;},
    clearTimeout(){},
    setInterval(){return 0;},
    clearInterval(){}
  };
  window.window=window;
  window.self=window;
  window.globalThis=window;
  const context=vm.createContext(window,{
    name:'student-migration-legacy-sandbox',
    codeGeneration:{strings:false,wasm:false}
  });
  return {context,window,localStorage};
}

const CAPTURES=[
  ['teacherMastery','__MIGRATION_TEACHER_MASTERY'],
  ['teacherSeed','__MIGRATION_TEACHER_SEED'],
  ['baselineLevels','__MIGRATION_BASELINE_LEVELS'],
  ['teacherLevels','__MIGRATION_TEACHER_LEVELS'],
  ['levels','__MIGRATION_LEVELS'],
  ['groups','__MIGRATION_GROUPS'],
  ['GROUPS','__MIGRATION_GROUPS_UPPER']
];

export function instrumentLegacySource(source,{module=false}={}){
  let output=String(source);
  for(const [name,capture] of CAPTURES){
    const pattern=new RegExp('\\b(const|let|var)\\s+'+name+'\\s*=','g');
    output=output.replace(pattern,(_match,kind)=>kind+' '+name+'=window.'+capture+'=');
  }
  if(module){
    output=output
      .replace(/\bexport\s+const\s+stage04Mastery\s*=/g,'window.__MIGRATION_STAGE04_MASTERY=')
      .replace(/\bexport\s+default\s+/g,'window.__MIGRATION_DEFAULT_EXPORT=')
      .replace(/\bexport\s+\{[^}]*\}\s*;?/g,'');
  }
  return output;
}

function snapshotCaptures(sandbox){
  return {
    teacherMastery:sandbox.window.__MIGRATION_TEACHER_MASTERY??null,
    teacherSeed:sandbox.window.__MIGRATION_TEACHER_SEED??null,
    baselineLevels:sandbox.window.__MIGRATION_BASELINE_LEVELS??null,
    teacherLevels:sandbox.window.__MIGRATION_TEACHER_LEVELS??null,
    levels:sandbox.window.__MIGRATION_LEVELS??null,
    stage04Mastery:sandbox.window.__MIGRATION_STAGE04_MASTERY??null,
    groups:sandbox.window.__MIGRATION_GROUPS??null,
    GROUPS:sandbox.window.__MIGRATION_GROUPS_UPPER??null
  };
}

export function executeLegacySource({sandbox,source,label='legacy-source',module=false,timeout=1000,allowPartial=false}){
  for(const [,capture] of CAPTURES)delete sandbox.window[capture];
  delete sandbox.window.__MIGRATION_STAGE04_MASTERY;
  delete sandbox.window.__MIGRATION_DEFAULT_EXPORT;
  const instrumented=instrumentLegacySource(source,{module});
  try{
    vm.runInContext(instrumented,sandbox.context,{
      filename:label,
      timeout,
      displayErrors:true
    });
    return {source,captures:snapshotCaptures(sandbox),error:null};
  }catch(error){
    if(allowPartial){
      return {source,captures:snapshotCaptures(sandbox),error};
    }
    const wrapped=new Error('legacy sandbox failed for '+label+': '+error.message);
    wrapped.cause=error;
    throw wrapped;
  }
}

export function executeLegacyFile({sandbox,filePath,relativePath=null,module=false,timeout=1000}){
  const source=fs.readFileSync(filePath,'utf8');
  return executeLegacySource({
    sandbox,
    source,
    label:relativePath||filePath,
    module,
    timeout
  });
}
