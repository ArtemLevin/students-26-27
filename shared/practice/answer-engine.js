const DECIMAL=/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;
const INTEGER=/^[+-]?\d+$/;
const FRACTION=/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/;

function parseNumber(raw,{allowFraction=true}={}){
  const value=String(raw??'').trim();
  if(allowFraction){const fraction=value.match(FRACTION);if(fraction){const denominator=Number(fraction[2]);if(!denominator)return {valid:false};return {valid:true,value:Number(fraction[1])/denominator,normalized:`${Number(fraction[1])}/${denominator}`};}}
  if(!DECIMAL.test(value))return {valid:false};
  const number=Number(value.replace(',','.'));return Number.isFinite(number)?{valid:true,value:number,normalized:number}:{valid:false};
}
function close(actual,expected,tolerance=0){return Math.abs(actual-expected)<=Math.max(0,Number(tolerance)||0);}
function splitComponents(raw){
  const value=String(raw??'').trim().replace(/^[\[(<{]\s*|\s*[\])>}]$/g,'');
  if(value.includes(';'))return value.split(';').map(item=>item.trim());
  const comma=value.split(',').map(item=>item.trim());
  if(comma.length===2&&comma.every(item=>INTEGER.test(item)))return comma;
  return value.split(/\s+/).filter(Boolean);
}
function normalizeChoice(value){return String(value??'').trim().toLocaleLowerCase('ru-RU');}

export function expectedAnswerDisplay(spec={}){
  if(spec.type==='fraction')return `${spec.numerator}/${spec.denominator}`;
  if(spec.type==='ordered-pair')return `(${spec.values.join('; ')})`;
  if(spec.type==='vector')return `(${spec.values.join('; ')})`;
  if(spec.type==='multi-choice')return spec.values.join(', ');
  return String(spec.value??'');
}

export function referenceAnswerForSpec(spec={}){
  if(spec.type==='fraction')return `${spec.numerator}/${spec.denominator}`;
  if(spec.type==='ordered-pair'||spec.type==='vector')return spec.values.join('; ');
  if(spec.type==='multi-choice')return spec.values.join('; ');
  return String(spec.value??'');
}

export function validateAnswer(spec,rawInput){
  if(!spec||typeof spec!=='object')throw new TypeError('Answer spec is required');
  const expectedDisplay=expectedAnswerDisplay(spec),result=(status,normalizedInput=null,diagnostics=null)=>({status,normalizedInput,expectedDisplay,diagnostics});
  if(spec.type==='number'||spec.type==='integer'||spec.type==='fraction'){
    const parsed=parseNumber(rawInput,{allowFraction:spec.type!=='integer'});if(!parsed.valid)return result('invalid',null,'Введите число в понятном формате.');
    if(spec.type==='integer'&&!Number.isInteger(parsed.value))return result('incorrect',parsed.value,'Ожидается целое число.');
    const expected=spec.type==='fraction'?Number(spec.numerator)/Number(spec.denominator):Number(spec.value);
    if(!Number.isFinite(expected)||(spec.type==='fraction'&&!Number(spec.denominator)))throw new TypeError('Invalid numeric answer spec');
    const tolerance=spec.tolerance??0,correct=close(parsed.value,expected,tolerance);
    return result(correct?'correct':'incorrect',parsed.value,correct?null:'Числовое значение пока не совпадает.');
  }
  if(spec.type==='choice'){
    const value=normalizeChoice(rawInput);if(!value)return result('invalid',null,'Выберите вариант ответа.');
    const expected=normalizeChoice(spec.value),aliases=(spec.accept||[]).map(normalizeChoice);
    return result(value===expected||aliases.includes(value)?'correct':'incorrect',value);
  }
  if(spec.type==='multi-choice'){
    const values=String(rawInput??'').split(/[;,]/).map(normalizeChoice).filter(Boolean);if(!values.length)return result('invalid',null,'Укажите выбранные варианты.');
    const expected=(spec.values||[]).map(normalizeChoice),actual=[...new Set(values)].sort(),wanted=[...new Set(expected)].sort();
    return result(actual.length===wanted.length&&actual.every((value,index)=>value===wanted[index])?'correct':'incorrect',actual);
  }
  if(spec.type==='ordered-pair'||spec.type==='vector'){
    const components=splitComponents(rawInput);if(components.length!==(spec.values||[]).length)return result('invalid',null,`Введите ${spec.values?.length||2} координаты через точку с запятой.`);
    const parsed=components.map(component=>parseNumber(component));if(parsed.some(item=>!item.valid))return result('invalid',null,'Координаты должны быть числами.');
    const values=parsed.map(item=>item.value),correct=values.every((value,index)=>close(value,Number(spec.values[index]),spec.tolerance??0));
    return result(correct?'correct':'incorrect',values);
  }
  throw new TypeError(`Unsupported answer type: ${spec.type}`);
}
