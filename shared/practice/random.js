function hashSeed(seed){
  let hash=2166136261;
  for(const char of String(seed)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
  hash+=hash<<13;hash^=hash>>>7;hash+=hash<<3;hash^=hash>>>17;hash+=hash<<5;
  return hash>>>0||0x9e3779b9;
}

export function createRandom(seed){
  let state=hashSeed(seed);
  const next=()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};
  return {
    next,
    int(min,max){if(!Number.isInteger(min)||!Number.isInteger(max)||max<min)throw new RangeError('Invalid integer range');return min+Math.floor(next()*(max-min+1));},
    pick(values){if(!Array.isArray(values)||!values.length)throw new RangeError('Cannot pick from an empty array');return values[this.int(0,values.length-1)];},
    shuffle(values){const copy=[...values];for(let index=copy.length-1;index>0;index-=1){const other=this.int(0,index);[copy[index],copy[other]]=[copy[other],copy[index]];}return copy;},
    bool(probability=.5){if(!Number.isFinite(probability)||probability<0||probability>1)throw new RangeError('Probability must be within [0, 1]');return next()<probability;}
  };
}

export function stableHash(value){return hashSeed(value);}
export function buildExerciseSeed({studentId,competencyId,date,ordinal=0,generatorVersion=1}){return `${studentId}:${competencyId}:${date}:${ordinal}:v${generatorVersion}:${stableHash(`${studentId}|${competencyId}|${date}|${ordinal}|${generatorVersion}`).toString(36)}`;}
