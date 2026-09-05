import vm from 'node:vm';

function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

function scanMatching(source,start,open='{',close='}'){
  let depth=0,quote=null,escape=false;
  for(let index=start;index<source.length;index+=1){
    const char=source[index];
    if(quote){
      if(escape){escape=false;continue;}
      if(char==='\\'){escape=true;continue;}
      if(char===quote)quote=null;
      continue;
    }
    if(char==='"'||char==="'"||char==='`'){quote=char;continue;}
    if(char===open)depth+=1;
    else if(char===close){depth-=1;if(depth===0)return index;}
  }
  throw new Error(`Unbalanced ${open}${close} expression`);
}

function normalizeLocator(locator='stage04Mastery'){
  if(typeof locator==='string')return {kind:'symbol',name:locator};
  if(!locator||!['symbol','property'].includes(locator.kind)||typeof locator.name!=='string'||!locator.name)throw new Error('Invalid mastery locator');
  return locator;
}

export function locateMasteryObject(source,locator='stage04Mastery'){
  const spec=normalizeLocator(locator),name=escapeRegExp(spec.name);
  const pattern=spec.kind==='symbol'
    ?new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*\\{`)
    :new RegExp(`(?:^|[,{\\n]\\s*)(?:${name}|["']${name}["'])\\s*:\\s*\\{`,'m');
  const match=pattern.exec(source);
  if(!match)throw new Error(`Mastery ${spec.kind} ${spec.name} was not found`);
  const start=match.index+match[0].lastIndexOf('{'),end=scanMatching(source,start);
  return {start,end,locator:spec};
}

function validateLevels(value,{name='mastery'}={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${name} must be an object`);
  const result={};
  for(const [id,level] of Object.entries(value)){
    if(!id)throw new Error(`${name} contains an empty competencyId`);
    if(!Number.isInteger(level)||level<0||level>4)throw new Error(`${name}.${id} must be an integer 0..4`);
    result[id]=level;
  }
  return result;
}

export function readMasteryLevels(source,locator='stage04Mastery'){
  const located=locateMasteryObject(source,locator),literal=source.slice(located.start,located.end+1);
  let value;
  try{value=vm.runInNewContext(`(${literal})`,Object.create(null),{timeout:100});}
  catch(error){throw new Error(`Cannot parse mastery ${located.locator.name}: ${error.message}`);}
  return validateLevels(value,{name:located.locator.name});
}

export function replaceMasteryLevels(source,updates={},locator='stage04Mastery'){
  const located=locateMasteryObject(source,locator),current=readMasteryLevels(source,locator);
  const merged=validateLevels({...current,...updates},{name:located.locator.name});
  const ordered=Object.fromEntries(Object.entries(merged).sort(([a],[b])=>a.localeCompare(b,'en')));
  const serialized=JSON.stringify(ordered,null,2);
  return source.slice(0,located.start)+serialized+source.slice(located.end+1);
}
