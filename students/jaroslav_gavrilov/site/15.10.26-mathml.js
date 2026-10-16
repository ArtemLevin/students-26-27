(function(){'use strict';const NS='http://www.w3.org/1998/Math/MathML';function toMathBody(source) {
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function token(t) {
    if(/^(?:\d+π|π|√\d+|\d+(?:,\d+)?|\d+\/√\d+)\/\d+(?:,\d+)?$/.test(t)){
      const [num,den]=t.split('/');
      return '<mfrac>'+toMathBody(num) +toMathBody(den)+'</mfrac>';
    }
    if(/^\d+\/√\d+$/.test(t)){const [num,den]=t.split('/');return '<mfrac>'+toMathBody(num)+toMathBody(den)+'</mfrac>';}
    if(/^√\d+$/.test(t))return '<msqrt>'+toMathBody(t.slice(1))+'</msqrt>';
    if(/^[A-Za-z][₀₁₂]$/.test(t))return '<msub><mi>'+esc(t[0])+'</mi><mn>'+({'₀':'0','₁':'1','₂':'2'}[t[1]])+'</mn></msub>';
    if(t==='sin²')return '<msup><mi mathvariant="normal">sin</mi><mn>2</mn></msup>';
    if(/^[A-Za-z]²$/.test(t))return '<msup><mi>'+esc(t[0])+'</mi><mn>2</mn></msup>';
    if(/^\d+(?:,\d+)?$/.test(t))return '<mn>'+esc(t)+'</mn>';
    if(t==='π'||t==='φ'||t==='λ'||t==='α')return '<mi>'+t+'</mi>';
    if(t==='ℤ')return '<mi mathvariant="double-struck">Z</mi>';
    if(/^[A-Za-z]+$/.test(t))return '<mi'+(/^(sin|cos|tg)$/.test(t)?' mathvariant="normal"':'')+'>'+esc(t)+'</mi>';
    if(/^\s+$/.test(t))return '<mspace width="0.16em"/>';
    if(t==='−'||t==='-'||t==='='||t==='+'||t==='≠'||t==='→'||t==='·'||t==='×'||t===';'||t===','||t==='('||t===')'||t==='['||t===']'||t==='∈'||t===':')return '<mo>'+esc(t==='-'?'−':t)+'</mo>';
    throw Error('Cannot parse math token: '+t);
  }
  const pattern=/\d+π\/\d+|π\/\d+|√\d+\/\d+|\d+\/√\d+|\d+(?:,\d+)?\/\d+(?:,\d+)?|sin²|[A-Za-z][₀₁₂²]|√\d+|\d+(?:,\d+)?|sin|cos|tg|[A-Za-z]|[πφλαℤ]|[−\-+=≠→·×();,:∈\[\]]|\s+/gu;
  let pos=0,out='';
  for(const match of source.matchAll(pattern)){
    if(match.index!==pos)throw Error('Unparsed math '+JSON.stringify(source.slice(pos,match.index))+' in '+source);
    out+=token(match[0]); pos+=match[0].length;
  }
  if(pos!==source.length)throw Error('Unparsed math at end '+JSON.stringify(source.slice(pos))+' in '+source);
  return '<mrow>'+out+'</mrow>';
};const markup=(s,display=false)=>'<math xmlns="'+NS+'" display="'+(display?'block':'inline')+'" aria-label="'+String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'+toMathBody(s)+'</math>';const set=(node,s,display=false)=>{node.innerHTML=markup(s,display);};window.JaroslavMath={markup,set};})();