/* Mathematical graphs for the 15.10.26 lesson. Angles in radians. */
(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const PI=Math.PI;
  const schemes={
    cos:{name:'Косинус',a:1.5,b:-1,domain:[-PI/2,3*PI/2],yrange:[-3.3,0.9],
      xticks:[[-PI/2,'−π/2'],[0,'0'],[PI/2,'π/2'],[PI,'π'],[3*PI/2,'3π/2']],
      yticks:[-3,-2,-1,0],points:[{x:0,y:.5,label:'A'},{x:PI,y:-2.5,label:'B'}],
      fn:(x,a,b)=>a*Math.cos(x)+b},
    sin:{name:'Синус',a:-2,b:-1,domain:[-PI,2*PI],yrange:[-3.5,1.5],
      xticks:[[-PI,'−π'],[-PI/2,'−π/2'],[0,'0'],[PI/2,'π/2'],[PI,'π'],[3*PI/2,'3π/2'],[2*PI,'2π']],
      yticks:[-3,-2,-1,0,1],points:[{x:0,y:-1,label:'A'},{x:-PI/2,y:1,label:'B'}],
      fn:(x,a,b)=>a*Math.sin(x)+b},
    tan:{name:'Тангенс',a:2,b:-1.5,domain:[-1.72,1.72],yrange:[-6,4],
      xticks:[[-PI/2,'−π/2'],[0,'0'],[PI/4,'π/4'],[PI/2,'π/2']],
      yticks:[-6,-4,-2,0,2,4],points:[{x:0,y:-1.5,label:'A'},{x:PI/4,y:.5,label:'B'}],
      asymptotes:[-PI/2,PI/2],fn:(x,a,b)=>a*Math.tan(x)+b},
    line:{name:'Прямая',a:1.75,b:-1.25,domain:[-3.5,4.5],yrange:[-5.5,5.5],
      xticks:[[-3,'−3'],[-2,'−2'],[-1,'−1'],[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4']],
      yticks:[-5,-3,-1,0,1,3,5],points:[{x:-1,y:-3,label:'A'},{x:3,y:4,label:'B'}],
      fn:(x,a,b)=>a*x+b},
    crossing:{name:'Пересечение',domain:[-7.2,1],yrange:[-15.5,12],
      xticks:[[-7,'−7'],[-6,'−6'],[-5,'−5'],[-4,'−4'],[-3,'−3'],[-2,'−2'],[-1,'−1'],[0,'0'],[1,'1']],
      yticks:[-15,-10,-5,0,5,10],points:[{x:-5,y:-11,label:'P'}],
      fn:(x)=>4*x+9,second:(x)=>1.5*x-3.5}
  };
  const el=(tag,attr={},text)=>{
    const node=document.createElementNS(NS,tag);
    for(const [key,value] of Object.entries(attr))node.setAttribute(key,String(value));
    if(text!==undefined)node.textContent=text;
    return node;
  };
  function render(svg,kind,override){
    const s=schemes[kind];if(!svg||!s)return;
    const a=override&&Number.isFinite(override.a)?override.a:s.a;
    const b=override&&Number.isFinite(override.b)?override.b:s.b;
    const W=720,H=360,L=78,R=42,T=19,B=49,w=W-L-R,h=H-T-B;
    const X=(x)=>L+(x-s.domain[0])/(s.domain[1]-s.domain[0])*w;
    const minX=s.domain[0],maxX=s.domain[1];
    let minY=s.yrange[0],maxY=s.yrange[1];
    if(override&&!s.second&&kind!=='tan'){
      const values=kind==='line'?[s.fn(minX,a,b),s.fn(maxX,a,b)]:[b-Math.abs(a),b+Math.abs(a)];
      minY=Math.min(minY,...values.map(v=>v-.6));
      maxY=Math.max(maxY,...values.map(v=>v+.6));
    }
    const Y=(y)=>T+(maxY-y)/(maxY-minY)*h;
    svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+W+' '+H);
    svg.setAttribute('role','img');svg.setAttribute('aria-label',s.name+' — точный график функции');
    svg.append(el('title',{},s.name+' — график по координатам и формуле'));
    const defs=el('defs'),clip=el('clipPath',{id:'clip-'+svg.id});
    clip.append(el('rect',{x:L,y:T,width:w,height:h}));defs.append(clip);svg.append(defs);

    svg.append(el('rect',{x:L,y:T,width:w,height:h,fill:'var(--plot-paper)',stroke:'var(--plot-border)'}));
    // Native MathML inside SVG foreignObject: axis positions stay on the exact computed grid.
    const mathAt=(expression,x,y,width,height,align='center',cls='axis-math')=>{
      const fo=el('foreignObject',{x,y,width,height});
      const holder=document.createElementNS('http://www.w3.org/1999/xhtml','div');
      holder.setAttribute('class',cls);
      holder.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:'+
        (align==='end'?'flex-end':align==='start'?'flex-start':'center')+
        ';white-space:nowrap;color:var(--ink);font:12px system-ui,Arial,sans-serif';
      holder.innerHTML=window.JaroslavMath.markup(expression);
      fo.append(holder);svg.append(fo);
    };
    const grid=el('g',{stroke:'var(--plot-grid)','stroke-width':'1'});
    for(const [x,label] of s.xticks){
      const px=X(x);grid.append(el('line',{x1:px,y1:T,x2:px,y2:T+h}));
      mathAt(label,px-37,H-35,74,23);
    }
    for(const y of s.yticks){
      const py=Y(y);grid.append(el('line',{x1:L,y1:py,x2:W-R,y2:py}));
      mathAt(String(y).replace('-','−'),L-62,py-12,49,24,'end');
    }
    svg.append(grid);
    if(minY<0&&maxY>0)svg.append(el('line',{x1:L,y1:Y(0),x2:W-R,y2:Y(0),stroke:'var(--plot-axis)','stroke-width':'1.8'}));
    if(minX<0&&maxX>0)svg.append(el('line',{x1:X(0),y1:T,x2:X(0),y2:T+h,stroke:'var(--plot-axis)','stroke-width':'1.8'}));
    mathAt('x',W-R-20,H-18,24,18);
    mathAt('y',L-49,T-7,24,18);
    const plot=el('g',{'clip-path':'url(#clip-'+svg.id+')'});
    function trace(fn,color){
      let d='',connected=false,lastY=0;
      const n=800;
      for(let i=0;i<=n;i++){
        const x=minX+(maxX-minX)*i/n;
        if(kind==='tan'&&Math.abs(Math.cos(x))<.065){connected=false;continue;}
        const y=fn(x);
        if(!Number.isFinite(y)||y<minY-4*(maxY-minY)||y>maxY+4*(maxY-minY)){connected=false;continue;}
        if(connected&&Math.abs(y-lastY)>3*(maxY-minY)){connected=false;}
        d+=(connected?' L ':' M ')+X(x).toFixed(2)+' '+Y(y).toFixed(2);
        connected=true;lastY=y;
      }
      plot.append(el('path',{d,fill:'none',stroke:color,'stroke-width':3.5,'stroke-linecap':'round'}));
    }
    trace(x=>s.fn(x,a,b),'var(--plot-primary)');
    if(s.second)trace(s.second,'var(--plot-secondary)');
    if(s.asymptotes&&Math.abs(a)>1e-9)for(const x of s.asymptotes)
      plot.append(el('line',{x1:X(x),y1:T,x2:X(x),y2:T+h,stroke:'var(--plot-asymptote)','stroke-width':1.8,'stroke-dasharray':'8 5'}));
    svg.append(plot);
    if(!(override&&override.hidePoints)){
      for(const p of s.points){
        const val=s.second?p.y:s.fn(p.x,a,b),cx=X(p.x),cy=Y(val);
        if(val<minY||val>maxY)continue;
        svg.append(el('circle',{cx,cy,r:5.5,fill:'var(--plot-point)',stroke:'var(--plot-paper)','stroke-width':2}));
        const right=cx<W-185;
        const px=right?cx+8:cx-190;
        const py=cy<T+32?cy+8:cy-32;
        const label=p.label+' ('+formatX(p.x)+'; '+formatNumber(val)+')';
        mathAt(label,px,py,182,24,right?'start':'end','point-math');
      }
    }
  }
  function formatNumber(n){
    if(Math.abs(n)<1e-9)return '0';
    return Number(n.toFixed(3)).toString().replace('-','−').replace('.',',');
  }
  function formatX(x){
    const mapping=[[0,'0'],[PI,'π'],[PI/2,'π/2'],[-PI/2,'−π/2'],[PI/4,'π/4'],[-PI,'−π']];
    for(const [v,label] of mapping)if(Math.abs(x-v)<.000001)return label;
    return formatNumber(x);
  }
  window.JaroslavGraph={schemes,render,formatNumber};
  document.querySelectorAll('svg[data-graph]').forEach(svg=>render(svg,svg.dataset.graph));
})();