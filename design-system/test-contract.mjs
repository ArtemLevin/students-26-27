import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const STUDENTS_ROOT=path.join(ROOT,'students');
const SCHEMA_PATH=path.join(ROOT,'design-system','fingerprint.schema.json');
const schema=JSON.parse(fs.readFileSync(SCHEMA_PATH,'utf8'));

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}
function rel(file){
  return path.relative(ROOT,file).replaceAll('\\','/');
}
function bodyAttributes(source,file){
  const body=source.match(/<body\b([^>]*)>/i);
  assert.ok(body,file+': <body> is missing');
  return body[1];
}
function attr(attributes,name){
  const match=attributes.match(new RegExp('\\b'+name+'="([^"]+)"'));
  return match?match[1]:null;
}
function validateFingerprint(data,file){
  assert.ok(data&&typeof data==='object'&&!Array.isArray(data),file+': fingerprint must be an object');
  for(const key of schema.required||[]){
    assert.ok(Object.prototype.hasOwnProperty.call(data,key),file+': missing required '+key);
  }
  if(schema.additionalProperties===false){
    const allowed=new Set(Object.keys(schema.properties||{}));
    for(const key of Object.keys(data)){
      assert.ok(allowed.has(key),file+': unexpected property '+key);
    }
  }
  for(const [key,rule] of Object.entries(schema.properties||{})){
    const value=data[key];
    if(rule.const!==undefined)assert.equal(value,rule.const,file+': '+key);
    if(rule.enum)assert.ok(rule.enum.includes(value),file+': invalid '+key+'='+String(value));
    if(rule.type==='string')assert.equal(typeof value,'string',file+': '+key+' must be a string');
    if(rule.pattern)assert.match(value,new RegExp(rule.pattern),file+': '+key+' pattern');
    if(rule.type==='array'){
      assert.ok(Array.isArray(value),file+': '+key+' must be an array');
      if(rule.minItems!==undefined)assert.ok(value.length>=rule.minItems,file+': '+key+' minItems');
      if(rule.maxItems!==undefined)assert.ok(value.length<=rule.maxItems,file+': '+key+' maxItems');
      if(rule.uniqueItems)assert.equal(new Set(value).size,value.length,file+': '+key+' items must be unique');
      for(const item of value){
        if(rule.items&&rule.items.type==='string')assert.equal(typeof item,'string',file+': '+key+' item must be string');
        if(rule.items&&rule.items.minLength!==undefined)assert.ok(item.length>=rule.items.minLength,file+': '+key+' item is too short');
      }
    }
  }
}

const suffix=path.sep+'site'+path.sep+'index.html';
const indexes=walk(STUDENTS_ROOT).filter(file=>file.endsWith(suffix)).sort();
assert.ok(indexes.length>0,'No student site/index.html entry cabinets found');

const fingerprints=new Map();

for(const indexPath of indexes){
  const indexRel=rel(indexPath);
  const dir=path.dirname(indexPath);
  const designPath=path.join(dir,'design.json');
  assert.ok(fs.existsSync(designPath),indexRel+': adjacent design.json is required');

  let design;
  try{
    design=JSON.parse(fs.readFileSync(designPath,'utf8'));
  }catch(error){
    throw new Error(rel(designPath)+': invalid JSON — '+error.message);
  }
  validateFingerprint(design,rel(designPath));

  const tuple=[
    design.composition,
    design.accent,
    design.density,
    design.geometry,
    design.typography,
    design.motion,
    ...design.signature
  ].join('|');
  assert.ok(!fingerprints.has(tuple),rel(designPath)+': duplicate fingerprint with '+fingerprints.get(tuple));
  fingerprints.set(tuple,rel(designPath));

  const html=fs.readFileSync(indexPath,'utf8');
  const attrs=bodyAttributes(html,indexRel);
  assert.match(attrs,/\bdata-atlas(?:\s|=|$)/i,indexRel+': body must opt into LEVIN / ATLAS');

  for(const [field,attribute] of [
    ['composition','data-atlas-composition'],
    ['accent','data-atlas-accent'],
    ['density','data-atlas-density'],
    ['motion','data-atlas-motion']
  ]){
    assert.equal(attr(attrs,attribute),design[field],indexRel+': '+attribute+' must match design.json '+field);
  }

  for(const layer of ['tokens.css','foundations.css','archetypes.css']){
    assert.ok(html.includes('design-system/'+layer),indexRel+': missing shared '+layer);
  }

  const hasSharedAdapter=html.includes('design-system/student-sites.css');
  const hasLocalAdapter=/href=["'][^"']*(?:levin-atlas|atlas)[^"']*\.css(?:\?[^"']*)?["']/i.test(html);
  assert.ok(hasSharedAdapter||hasLocalAdapter,indexRel+': missing student-sites.css or local LEVIN / ATLAS adapter');
}

console.log('✓ LEVIN / ATLAS contract: '+indexes.length+' entry cabinets, '+fingerprints.size+' unique fingerprints');
