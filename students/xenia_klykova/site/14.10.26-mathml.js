/* MathML expression builder for the October 14 lesson.
 * Accepts only lesson-authored algebraic expressions, never arbitrary HTML.
 * Builds semantic presentation MathML (msup, mfrac, mn, mi, mo, mrow).
 */
(function(root){
'use strict';
const NS='http://www.w3.org/1998/Math/MathML';
const sup={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const row=parts=>'<mrow>'+parts.join('')+'</mrow>';
const op=s=>'<mo>'+esc(s)+'</mo>';
const num=s=>'<mn>'+esc(s)+'</mn>';
const id=s=>'<mi'+(s==='deg'?' mathvariant="normal"':'')+'>'+esc(s)+'</mi>';
function tokenize(src){
 const input=String(src).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/−/g,'−').replace(/-/g,'−');
 const tokens=[];
 let i=0;
 while(i<input.length){
  let c=input[i];
  if(/\s/.test(c)){i++;continue;}
  const supMatch=input.slice(i).match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/u);
  if(supMatch){tokens.push({type:'sup',value:[...supMatch[0]].map(z=>sup[z]).join('')});i+=supMatch[0].length;continue;}
  const digit=input.slice(i).match(/^\d+(?:[.,]\d+)?/u);
  if(digit){tokens.push({type:'n',value:digit[0]});i+=digit[0].length;continue;}
  const name=input.slice(i).match(/^(?:deg|[A-Za-zα-ωΑ-Ω])/u);
  if(name){tokens.push({type:'i',value:name[0]});i+=name[0].length;continue;}
  if('()+−=·:;/<>≤≥⇔∈∪{}[]∞,^'.includes(c)){
   tokens.push({type:'o',value:c});i++;continue;
  }
  throw Error('Unsupported math token '+JSON.stringify(c)+' in '+src);
 }
 return tokens;
}
function expression(source){
 const tokens=tokenize(source);let p=0;
 const peek=()=>tokens[p]?.value;
 const close=()=>[')',']','}'].includes(peek());
 const stop=()=>p>=tokens.length||close();
 function atom(){
  let t=tokens[p++];if(!t)throw Error('Missing math atom: '+source);
  if(t.value==='+'||t.value==='−')return row([op(t.value),atom()]);
  let base;
  if(t.value==='('||t.value==='['||t.value==='{'){
   const inner=parse();
   const closer=peek();
   if(![')',']','}'].includes(closer))throw Error('Unclosed math group: '+source);
   p++;base=row([op(t.value),inner,op(closer)]);
  } else if(t.type==='n')base=num(t.value);
  else if(t.type==='i')base=id(t.value);
  else if(t.value==='∞')base=id('∞');
  else throw Error('Unexpected math atom '+t.value+' in '+source);
  if(peek()==='^'){p++;const e=atom();base='<msup>'+base+e+'</msup>';}
  while(tokens[p]?.type==='sup'){base='<msup>'+base+num(tokens[p++].value)+'</msup>';}
  return base;
 }
 function prod(){
  let chunks=[];
  while(!stop()&&!['+','−','=','<','>','≤','≥','⇔','∈','∪',';',','].includes(peek())){
   const cur=peek();
   if(cur===':'||cur==='·'){chunks.push(op(tokens[p++].value));continue;}
   if(cur==='/'){
    p++;
    const numerator=row(chunks);chunks=[];
    const denominator=[];
    while(!stop()&&!['+','−','=','<','>','≤','≥','⇔','∈','∪',';',',','/'].includes(peek())){
      if(peek()==='·'||peek()===':')denominator.push(op(tokens[p++].value));
      else denominator.push(atom());
    }
    chunks.push('<mfrac>'+numerator+row(denominator)+'</mfrac>');continue;
   }
   chunks.push(atom());
  }
  return row(chunks);
 }
 function parse(){
  let chunks=[];
  while(!stop()){
   if(['+','−','=','<','>','≤','≥','⇔','∈','∪',';',','].includes(peek())){chunks.push(op(tokens[p++].value));continue;}
   const previous=p;chunks.push(prod());if(previous===p)throw Error('Stuck on '+peek());
  }
  return row(chunks);
 }
 const result=parse();
 if(p!==tokens.length)throw Error('Trailing token in '+source+': '+peek());
 return result;
}
function markup(source,display='inline'){
 return '<math xmlns="'+NS+'" display="'+(display==='block'?'block':'inline')+'" aria-label="'+esc(String(source).replace(/&lt;/g,'<').replace(/&gt;/g,'>'))+'">'+expression(source)+'</math>';
}
function mount(element,source,display='inline'){
 if(!element)throw Error('Missing MathML mount');
 // Only literal lesson formulas or bounded slider numbers reach this code.
 element.innerHTML=markup(source,display);
}
root.XeniaMathML={markup,mount,expression,NS};
})(typeof window==='undefined'?globalThis:window);
