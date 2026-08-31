import {createRandom} from '../random.js';

export function gcd(a,b){a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b)[a,b]=[b,a%b];return a||1;}
export function fraction(numerator,denominator){
  if(!denominator)throw new RangeError('Denominator cannot be zero');
  const sign=denominator<0?-1:1,divisor=gcd(numerator,denominator);return {numerator:sign*numerator/divisor,denominator:Math.abs(denominator)/divisor};
}
export function combination(n,k){
  const safe=Math.min(k,n-k);let result=1;for(let index=1;index<=safe;index+=1)result=result*(n-safe+index)/index;return Math.round(result);
}
export function makeExercise(generator,{seed,difficulty=1,competencyId,options={}},payload){
  const level=Math.max(1,Math.min(3,Math.round(Number(difficulty)||1))),id=competencyId||generator.competencyIds[0];
  return {exerciseId:`${generator.key}:v${generator.version}:${seed}`,competencyId:id,generatorKey:generator.key,generatorVersion:generator.version,seed:String(seed),difficulty:level,
    prompt:payload.prompt,answerSpec:payload.answerSpec,hints:payload.hints.map((text,index)=>({level:index+1,text})),solution:payload.solution,
    metadata:{topic:payload.topic||generator.title,expectedSeconds:payload.expectedSeconds||60,...(payload.metadata||{})},parameters:payload.parameters||null,options};
}
export function context(generator,args,build){const random=createRandom(args.seed),difficulty=Math.max(1,Math.min(3,Math.round(Number(args.difficulty)||1)));return makeExercise(generator,{...args,difficulty},build(random,difficulty,args.options||{}));}
export function numberSpec(value,tolerance=0){return {type:Number.isInteger(value)?'integer':'number',value,tolerance};}
export function fractionSpec(numerator,denominator,{acceptDecimal=true,tolerance=1e-9}={}){const reduced=fraction(numerator,denominator);return {type:'fraction',...reduced,acceptDecimal,tolerance};}
export function signed(value){return value<0?`− ${Math.abs(value)}`:`+ ${value}`;}
