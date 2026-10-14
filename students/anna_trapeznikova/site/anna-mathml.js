(function(){
  'use strict';
  const markup = function mathMarkup(expression){
  const raw=String(expression).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim();
  const esc=x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const tokens=raw.match(/\d+(?:[.,]\d+)?|[A-Za-zА-Яа-яЁё]+|[⁰¹²³⁴⁵⁶⁷⁸⁹]|[^\s]/gu)||[];
  const limits=new Set(["+","−","-","=","<",">","≤","≥","≠","∈","∪","⇔","→",",",";",":","?"]);
  const power={"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9"};
  const opening=new Set(["(","[","{"]),closing=new Set([")","]","}"]);
  let currentTokens=tokens,currentIndex=0;
  function atom(){
    const v=currentTokens[currentIndex++];
    if(v===undefined)return {html:"<mrow/>",raw:""};
    if(opening.has(v)){
      const children=[];let nesting=1;
      while(currentIndex<currentTokens.length&&nesting){
        const part=currentTokens[currentIndex++];
        if(opening.has(part))nesting++;
        if(closing.has(part))nesting--;
        if(!nesting)return {html:"<mrow><mo>"+esc(v)+"</mo>"+renderNested(children)+"<mo>"+esc(part)+"</mo></mrow>",raw:v+children.join("")+part};
        children.push(part);
      }
      return {html:"<mrow><mo>"+esc(v)+"</mo>"+renderNested(children)+"</mrow>",raw:v+children.join("")};
    }
    if(v==="√"){const value=atom();return {html:"<msqrt>"+value.html+"</msqrt>",raw:v+value.raw};}
    if(/^\d+(?:[.,]\d+)?$/.test(v))return {html:"<mn>"+esc(v)+"</mn>",raw:v};
    if(/^[A-Za-zА-Яа-яЁё]+$/.test(v)||v==="∞")return {html:"<mi>"+esc(v)+"</mi>",raw:v};
    return {html:"<mo>"+esc(v)+"</mo>",raw:v};
  }
  function renderNested(children){
    const saveTokens=currentTokens,saveIndex=currentIndex;
    currentTokens=children;currentIndex=0;
    const value=sequence();
    currentTokens=saveTokens;currentIndex=saveIndex;
    return value;
  }
  function sequence(){
    const parts=[];
    while(currentIndex<currentTokens.length){
      const v=currentTokens[currentIndex];
      if(power[v]&&parts.length){
        currentIndex++;
        const base=parts.pop();
        parts.push({html:"<msup>"+base.html+"<mn>"+power[v]+"</mn></msup>",raw:base.raw+v});
        continue;
      }
      if(v==="/"&&parts.length){
        currentIndex++;
        let start=parts.length-1;
        while(start>0&&!limits.has(parts[start-1].raw))start--;
        const numerator=parts.splice(start);
        const denominator=atom();
        parts.push({html:"<mfrac><mrow>"+numerator.map(p=>p.html).join("")+"</mrow>"+denominator.html+"</mfrac>",raw:numerator.map(p=>p.raw).join("")+"/"+denominator.raw});
        continue;
      }
      parts.push(atom());
    }
    return parts.map(p=>p.html).join("");
  }
  return '<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="'+esc(raw)+'"><mrow>'+sequence()+'</mrow></math>';
};
  window.AnnaMathML=Object.freeze({markup,set(node,expression){if(node)node.innerHTML=markup(expression);}});
})();
