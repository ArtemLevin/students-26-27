import {createRandom} from './random.js';

export function validateCuratedBank(bank){
  if(!bank||typeof bank!=='object')throw new TypeError('Curated bank must be an object');
  if(!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(bank.bankKey||''))throw new Error('Invalid curated bank key');
  if(!Number.isInteger(bank.version)||bank.version<1)throw new Error('Invalid curated bank version');
  if(!Array.isArray(bank.competencyIds)||!bank.competencyIds.length)throw new Error('Curated bank needs competencyIds');
  if(!Array.isArray(bank.items)||!bank.items.length)throw new Error('Curated bank is empty');
  const ids=new Set();
  for(const item of bank.items){
    if(!item?.id||ids.has(item.id))throw new Error(`Invalid or duplicate bank item: ${item?.id}`);ids.add(item.id);
    if(!item.prompt||!item.answerSpec||!Array.isArray(item.hints)||!item.hints.length||!Array.isArray(item.solution)||!item.solution.length)throw new Error(`Incomplete bank item: ${item.id}`);
    if(!Number.isInteger(item.difficulty)||item.difficulty<1||item.difficulty>3)throw new Error(`Invalid bank difficulty: ${item.id}`);
  }
  return true;
}

export function selectCuratedItem(bank,{seed,difficulty=null,recentIds=[]}={}){
  validateCuratedBank(bank);const recent=new Set(recentIds),byDifficulty=difficulty?bank.items.filter(item=>item.difficulty===difficulty):bank.items,candidates=byDifficulty.filter(item=>!recent.has(item.id)),pool=candidates.length?candidates:byDifficulty.length?byDifficulty:bank.items;
  return structuredClone(createRandom(seed).pick(pool));
}
