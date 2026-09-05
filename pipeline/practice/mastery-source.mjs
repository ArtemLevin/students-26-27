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

export function locateMasteryObject(source,symbol='stage04Mastery'){
  const pattern=new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(symbol)}\\s*=\\s*\\{`);
  const match=pattern.exec(source);
  if(!match)throw new Error(`Mastery contract ${symbol} was not found`);
  const start=source.indexOf('{',match.index),end=scanMatching(source,start);
  return {start,end};
}

function validateLevels(value,{symbol='stage04Mastery'}={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${symbol} must be an object`);
  const result={};
  for(const [id,level] of Object.entries(value)){
    if(!id)throw new Error(`${symbol} contains an empty competencyId`);
    if(!Number.isInteger(level)||level<0||level>4)throw new Error(`${symbol}.${id} must be an integer 0..4`);
    result[id]=level;
  }
  return result;
}

export function readMasteryLevels(source,symbol='stage04Mastery'){
  const {start,end}=locateMasteryObject(source,symbol),literal=source.slice(start,end+1);
  let value;
  try{value=vm.runInNewContext(`(${literal})`,Object.create(null),{timeout:100});}
  catch(error){throw new Error(`Cannot parse ${symbol}: ${error.message}`);}
  return validateLevels(value,{symbol});
}

export function replaceMasteryLevels(source,updates={},symbol='stage04Mastery'){
  const {start,end}=locateMasteryObject(source,symbol),current=readMasteryLevels(source,symbol);
  const merged=validateLevels({...current,...updates},{symbol});
  const ordered=Object.fromEntries(Object.entries(merged).sort(([a],[b])=>a.localeCompare(b,'en')));
  const serialized=JSON.stringify(ordered,null,2);
  return source.slice(0,start)+serialized+source.slice(end+1);
}
