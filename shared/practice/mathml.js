const MATH_NS='http://www.w3.org/1998/Math/MathML';
const SUBSCRIPT_MAP={
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
  'ₐ':'a','ₑ':'e','ₒ':'o','ₓ':'x','ₕ':'h','ₖ':'k','ₗ':'l','ₘ':'m','ₙ':'n','ₚ':'p','ₛ':'s','ₜ':'t'
};
const SUPERSCRIPT_MAP={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};
const MATH_RUN=/[A-Za-zΔπ√₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ⁰-⁹\d([\]][A-Za-zΔπ√₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ⁰-⁹\d\s()[\]{}.,;:+\-−·×*/=^|<>≤≥%°]*/gu;
const TOKEN=/\d+(?:[.,]\d+)?|[A-Za-zΔπ]+[₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ]*|[⁰-⁹]+|√|≤|≥|[()[\]{};+\-−·×*/:=^|,<>%°]/gu;

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const tag=(name,body,attrs='')=>`<${name}${attrs}>${body}</${name}>`;
const row=body=>tag('mrow',body);
const op=value=>tag('mo',escapeHtml(value));
const number=value=>tag('mn',escapeHtml(value.replace(',','.')));

function identifier(value){
  const match=value.match(/^([A-Za-zΔπ]+)([₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ]+)?$/u);
  if(!match)return tag('mi',escapeHtml(value));
  const base=tag('mi',escapeHtml(match[1]));
  if(!match[2])return base;
  const sub=[...match[2]].map(char=>SUBSCRIPT_MAP[char]??char).join('');
  return tag('msub',`${base}${/^-?\d+$/.test(sub)?tag('mn',escapeHtml(sub)):tag('mi',escapeHtml(sub))}`);
}

class MathParser{
  constructor(source){this.source=source;this.tokens=source.match(TOKEN)||[];this.index=0;}
  peek(){return this.tokens[this.index]??null;}
  take(){return this.tokens[this.index++]??null;}
  parse(){
    if(!this.tokens.length)return tag('mtext',escapeHtml(this.source));
    const result=this.expression(new Set());
    if(this.index<this.tokens.length){
      const rest=this.tokens.slice(this.index).map(token=>tag('mtext',escapeHtml(token))).join('');
      return row(result+rest);
    }
    return result;
  }
  expression(stops){return this.relation(stops);}
  relation(stops){
    let left=this.additive(stops);
    while(!stops.has(this.peek())&&['=','<','>','≤','≥'].includes(this.peek())){
      const operator=this.take(),right=this.additive(stops);left=row(left+op(operator)+right);
    }
    return left;
  }
  additive(stops){
    let left=this.multiplicative(stops);
    while(!stops.has(this.peek())&&['+','-','−'].includes(this.peek())){
      const operator=this.take(),right=this.multiplicative(stops);left=row(left+op(operator==='-'?'−':operator)+right);
    }
    return left;
  }
  multiplicative(stops){
    let left=this.power(stops);
    while(!stops.has(this.peek())){
      const token=this.peek();
      if(['/','·','×','*',':'].includes(token)){
        this.take();const right=this.power(stops);
        left=token==='/'?tag('mfrac',left+right):row(left+op(token==='*'?'×':token)+right);
        continue;
      }
      if(this.startsPrimary(token)){
        const right=this.power(stops);left=row(left+right);continue;
      }
      break;
    }
    return left;
  }
  power(stops){
    let base=this.unary(stops);
    while(this.peek()==='^'){
      this.take();const exponent=this.exponent();base=tag('msup',base+exponent);
    }
    const superscript=this.peek();
    if(superscript&&/^[⁰-⁹]+$/u.test(superscript)){
      this.take();const value=[...superscript].map(char=>SUPERSCRIPT_MAP[char]??char).join('');base=tag('msup',base+number(value));
    }
    return base;
  }
  exponent(){
    if(this.peek()==='{'){
      this.take();const value=this.expression(new Set(['}']));if(this.peek()==='}')this.take();return value;
    }
    return this.unary(new Set());
  }
  unary(stops){
    if(['+','-','−'].includes(this.peek())){
      const operator=this.take(),value=this.unary(stops);return row(op(operator==='-'?'−':operator)+value);
    }
    return this.primary(stops);
  }
  primary(stops){
    const token=this.take();
    if(token===null)return tag('mtext','');
    if(/^\d/u.test(token))return number(token);
    if(/^[A-Za-zΔπ]/u.test(token))return identifier(token);
    if(token==='√')return tag('msqrt',this.primary(stops));
    if(token==='('||token==='['||token==='{'){
      const close=token==='('?')':token==='['?']':'}';
      let content='';
      while(this.peek()!==null&&this.peek()!==close){
        content+=this.expression(new Set([close,';',',']));
        if(this.peek()===';'||this.peek()===',')content+=op(this.take());
        else if(this.peek()!==close&&this.peek()!==null&&!this.startsPrimary(this.peek())&&!['+','-','−','=','<','>','≤','≥','/','·','×','*',':','^'].includes(this.peek()))content+=tag('mtext',escapeHtml(this.take()));
      }
      if(this.peek()===close)this.take();
      return row(op(token)+content+op(close));
    }
    if(token==='|'){
      const content=this.expression(new Set(['|']));if(this.peek()==='|')this.take();return row(op('|')+content+op('|'));
    }
    if(token==='%'||token==='°')return op(token);
    return tag('mtext',escapeHtml(token));
  }
  startsPrimary(token){return token!==null&&/^(?:\d|[A-Za-zΔπ]|√|\(|\[|\{|\|)/u.test(token);}
}

export function mathML(expression,{display='inline'}={}){
  const source=String(expression??'').trim();
  const body=new MathParser(source).parse();
  return `<math xmlns="${MATH_NS}" display="${display}" aria-label="${escapeHtml(source)}">${body}</math>`;
}

function qualifiesAsMath(value){
  const source=value.trim();if(!source)return false;
  if(/\d/u.test(source))return true;
  if(/[A-Za-zΔπ√₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ⁰-⁹]/u.test(source))return true;
  return /[=+\-−·×*/:^|<>≤≥%°]/u.test(source);
}

function trimRun(raw){
  const leading=raw.match(/^\s*/u)?.[0]||'';let body=raw.slice(leading.length),trailing='';
  while(/[\s.,]$/u.test(body)){
    const char=body.at(-1);trailing=char+trailing;body=body.slice(0,-1);
  }
  return {leading,body,trailing};
}

function renderMathRuns(source){
  let result='',last=0;
  for(const match of source.matchAll(MATH_RUN)){
    const start=match.index??0;result+=escapeHtml(source.slice(last,start));
    const {leading,body,trailing}=trimRun(match[0]);result+=escapeHtml(leading);
    result+=qualifiesAsMath(body)?mathML(body):escapeHtml(body);
    result+=escapeHtml(trailing);last=start+match[0].length;
  }
  result+=escapeHtml(source.slice(last));return result;
}

export function renderMathText(value){
  const source=String(value??'');let result='',last=0;
  for(const match of source.matchAll(/<[^>]*>/gu)){
    const start=match.index??0;result+=renderMathRuns(source.slice(last,start));result+=escapeHtml(match[0]);last=start+match[0].length;
  }
  result+=renderMathRuns(source.slice(last));return result;
}

export function setMathText(element,value){
  if(!element)return element;element.innerHTML=renderMathText(value);return element;
}
