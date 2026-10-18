/* Native MathML renderer for the 17.10.26 function lab.
 * Math is inserted as elements in the MathML namespace; labels used by form
 * controls remain ordinary text because HTML <option> cannot contain MathML.
 */
(() => {
  'use strict';
  const NS='http://www.w3.org/1998/Math/MathML';
  const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const node=(name,content,attrs='')=>'<'+name+attrs+'>'+content+'</'+name+'>';
  const mo=x=>node('mo',escape(x));
  const mi=x=>x==='ℝ'?node('mi','R',' mathvariant="double-struck"'):node('mi',escape(x));
  const mn=x=>node('mn',escape(x));
  const row=s=>node('mrow',s);
  const tokenize=input=>{
    const source=String(input).replace(/\u2212/g,'-').replace(/\u00a0/g,' ');
    const tokens=[];
    for(let i=0;i<source.length;){
      const tail=source.slice(i);
      if(/^\s/.test(tail)){i++;continue}
      const number=/^\d+(?:,\d+)?/.exec(tail);
      if(number){tokens.push({kind:'number',value:number[0]});i+=number[0].length;continue}
      const identifier=/^[A-Za-zА-Яа-яЁёℝ]+/.exec(tail);
      if(identifier){tokens.push({kind:'identifier',value:identifier[0]});i+=identifier[0].length;continue}
      const char=source[i];
      const allowed='+-*/²^=≠≤≥<>∈→·();,:—';
      if(!allowed.includes(char))throw new Error('Unknown math token '+JSON.stringify(char));
      tokens.push({kind:'operator',value:char});
      i++;
    }
    return tokens;
  };
  function inner(text){
    const tokens=tokenize(text);
    let pos=0;
    const peek=()=>tokens[pos]?.value;
    const precedence={';':5,',':6,':':9,'→':12,'=':15,'≠':15,'≤':15,'≥':15,'<':15,'>':15,'∈':15,'+':30,'-':30,'·':60,'*':60,'/':60};
    function expression(min=0){
      let left;
      const tok=tokens[pos++];
      if(!tok)throw new Error('Empty math operand in '+JSON.stringify(text));
      if(tok.kind==='number')left={markup:mn(tok.value)};
      else if(tok.kind==='identifier')left={markup:mi(tok.value),name:tok.value};
      else if(tok.value==='('){
        const inside=expression(0);
        if(peek()!==')')throw new Error('Unmatched parenthesis in '+JSON.stringify(text));
        pos++;left={markup:row(mo('(')+inside.markup+mo(')')),inside:inside.markup};
      }
      else if(tok.value==='-'||tok.value==='+'){
        const right=expression(70);
        left={markup:row(mo(tok.value==='-'?'−':'+')+right.markup)};
      }
      else if(tok.value==='—')left={markup:node('mtext','—')};
      else throw new Error('Unexpected math token '+JSON.stringify(tok.value)+' in '+JSON.stringify(text));
      while(pos<tokens.length){
        const next=peek();
        if(next===')')break;
        if(next==='²'||next==='^'){
          if(90<min)break;
          pos++;let pow;if(next==='²')pow=mn('2');else pow=expression(90).markup;
          left={markup:node('msup',left.markup+pow)};continue;
        }
        if(next==='('){
          if(80<min)break;
          pos++;const arg=expression(0);
          if(peek()!==')')throw new Error('Unclosed function parentheses in '+JSON.stringify(text));
          pos++;
          left={markup:row(left.markup+(left.name==='y'||left.name==='f'?'<mo>&#x2061;</mo>':'<mo>&#x2062;</mo>')+mo('(')+arg.markup+mo(')'))};continue;
        }
        // Juxtaposition 4x and xy denotes multiplication.
        const adjacent=(tokens[pos].kind==='number'||tokens[pos].kind==='identifier');
        const op=adjacent?'implicit':next,prec=adjacent?60:precedence[op];
        if(prec===undefined||prec<min)break;
        if(!adjacent)pos++;
        const right=expression(prec+1);
        if(op==='/')left={markup:node('mfrac',left.markup+(right.inside||right.markup))};
        else left={markup:row(left.markup+(op==='implicit'?'<mo>&#x2062;</mo>':op==='*'||op==='·'?mo('·'):op==='-'?mo('−'):op===';'?mo(';'):'<mo>'+escape(op)+'</mo>')+right.markup)};
      }
      return left;
    }
    if(!tokens.length)return node('mtext','—');
    const result=expression(0);
    if(pos!==tokens.length)throw new Error('Unconsumed math '+JSON.stringify(text)+' at '+pos);
    return result.markup;
  }
  const markup=(expression,display=false)=>'<math xmlns="'+NS+'"'+(display?' display="block"':'')+'>'+inner(expression)+'</math>';
  const element=(expression,display=false)=>{
    const xml=new DOMParser().parseFromString(markup(expression,display),'application/xml');
    if(xml.querySelector('parsererror'))throw new Error('Invalid MathML for '+expression);
    return document.importNode(xml.documentElement,true);
  };
  const set=(target,expression,display=false)=>target.replaceChildren(element(expression,display));
  window.KirillMathML=Object.freeze({markup,element,set,namespace:NS});
})();
