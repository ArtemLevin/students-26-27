import {validateActivationMapping} from './activation-policy.js';

const KEY=/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

export function validateGenerator(generator){
  if(!generator||typeof generator!=='object')throw new TypeError('Generator must be an object');
  if(!KEY.test(generator.key||''))throw new Error(`Invalid generator key: ${generator.key}`);
  if(!Number.isInteger(generator.version)||generator.version<1)throw new Error(`Invalid generator version: ${generator.key}`);
  if(!Array.isArray(generator.competencyIds)||!generator.competencyIds.length)throw new Error(`Generator ${generator.key} has no competencyIds`);
  if(typeof generator.generate!=='function')throw new Error(`Generator ${generator.key} has no generate function`);
  return true;
}

export function validateExercise(exercise,generator=null){
  if(!exercise||typeof exercise!=='object')throw new TypeError('Exercise must be an object');
  for(const key of ['exerciseId','competencyId','generatorKey','seed','prompt'])if(typeof exercise[key]!=='string'||!exercise[key])throw new Error(`Exercise field ${key} is required`);
  if(!Number.isInteger(exercise.generatorVersion)||exercise.generatorVersion<1)throw new Error('Invalid exercise generatorVersion');
  if(!Number.isInteger(exercise.difficulty)||exercise.difficulty<1||exercise.difficulty>3)throw new Error('Invalid exercise difficulty');
  if(!exercise.answerSpec||typeof exercise.answerSpec!=='object'||!exercise.answerSpec.type)throw new Error('Exercise answerSpec is required');
  if(!Array.isArray(exercise.hints)||!exercise.hints.length||!Array.isArray(exercise.solution)||!exercise.solution.length)throw new Error('Exercise hints and solution are required');
  if(generator&&(exercise.generatorKey!==generator.key||exercise.generatorVersion!==generator.version))throw new Error('Exercise identity does not match generator');
  return true;
}

export class GeneratorRegistry{
  constructor(generators=[]){this.generators=new Map();for(const generator of generators)this.register(generator);}
  register(generator){validateGenerator(generator);if(this.generators.has(generator.key))throw new Error(`Duplicate generator key: ${generator.key}`);this.generators.set(generator.key,generator);return this;}
  get(key){const generator=this.generators.get(key);if(!generator)throw new Error(`Unknown generator: ${key}`);return generator;}
  has(key){return this.generators.has(key);}
  list(){return [...this.generators.values()];}
  validate(){for(const generator of this.generators.values())validateGenerator(generator);return true;}
  generate(key,args){const generator=this.get(key),exercise=generator.generate(args);validateExercise(exercise,generator);return exercise;}
}

export function validatePracticeConfig(config,registry,{competencyIds=null}={}){
  const errors=[];
  if(!config?.studentId)errors.push('studentId is required');
  if(!config?.storageKey)errors.push('storageKey is required');
  if(typeof config?.enabled!=='boolean')errors.push('enabled must be boolean');
  const ids=new Set(competencyIds||[]);
  for(const [id,mapping] of Object.entries(config?.competencies||{})){
    if(ids.size&&!ids.has(id))errors.push(`Unknown competencyId: ${id}`);
    if(!registry.has(mapping.generator))errors.push(`Unknown generator key for ${id}: ${mapping.generator}`);
    else if(!registry.get(mapping.generator).competencyIds.includes(id))errors.push(`Generator ${mapping.generator} does not declare ${id}`);
    if(!Array.isArray(mapping.difficulty)||mapping.difficulty.some(value=>!Number.isInteger(value)||value<1||value>3))errors.push(`Invalid difficulty for ${id}`);
    try{validateActivationMapping(mapping,id);}catch(error){errors.push(error.message);}
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return true;
}
