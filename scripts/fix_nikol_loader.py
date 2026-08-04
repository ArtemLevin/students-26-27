from pathlib import Path
import re

TARGET = Path("students/nikol_sarkisyants/site/04.08.26.html")
WORKFLOW = Path(".github/workflows/fix-nikol-loader.yml")
SELF = Path("scripts/fix_nikol_loader.py")

old = TARGET.read_text(encoding="utf-8")
chunks = [value for value in re.findall(r"'([A-Za-z0-9+/=]{100,})'", old)]
if not chunks:
    raise SystemExit("Embedded payload was not found")

inflater = r'''function gunzip(u){
 let p=0;if(u[p++]!==31||u[p++]!==139||u[p++]!==8)throw Error('gzip');let f=u[p++];p+=6;
 if(f&4){let n=u[p]|u[p+1]<<8;p+=2+n}if(f&8)while(u[p++]);if(f&16)while(u[p++]);if(f&2)p+=2;
 let cur=0,nb=0;
 const rb=n=>{while(nb<n){cur|=u[p++]<<nb;nb+=8}let v=cur&((1<<n)-1);cur>>>=n;nb-=n;return v};
 const rev=(x,n)=>{let r=0;while(n--)r=r<<1|x&1,x>>>=1;return r};
 const tree=l=>{let c=Array(16).fill(0),next=Array(16).fill(0),t=Array.from({length:16},()=>Object.create(null));for(const n of l)c[n]++;let code=0;for(let n=1;n<16;n++)code=(code+c[n-1])<<1,next[n]=code;for(let s=0;s<l.length;s++){let n=l[s];if(n)t[n][rev(next[n]++,n)]=s}return t};
 const dec=t=>{let c=0;for(let n=1;n<16;n++){c|=rb(1)<<(n-1);if(t[n][c]!==undefined)return t[n][c]}throw Error('huffman')};
 const fixed=()=>[tree([...Array(144).fill(8),...Array(112).fill(9),...Array(24).fill(7),...Array(8).fill(8)]),tree(Array(32).fill(5))];
 const dyn=()=>{let nl=rb(5)+257,nd=rb(5)+1,nc=rb(4)+4,o=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],cl=Array(19).fill(0);for(let i=0;i<nc;i++)cl[o[i]]=rb(3);let ct=tree(cl),ls=[];while(ls.length<nl+nd){let s=dec(ct);if(s<16)ls.push(s);else{let q=s===16?rb(2)+3:s===17?rb(3)+3:rb(7)+11,v=s===16?ls[ls.length-1]:0;while(q--)ls.push(v)}}return[tree(ls.slice(0,nl)),tree(ls.slice(nl,nl+nd))]};
 const LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],out=[];
 let last=0;while(!last){last=rb(1);let typ=rb(2);if(!typ){cur=nb=0;let n=u[p]|u[p+1]<<8;p+=4;for(let i=0;i<n;i++)out.push(u[p++]);continue}let pair=typ===1?fixed():dyn(),lt=pair[0],dt=pair[1];for(;;){let s=dec(lt);if(s<256){out.push(s);continue}if(s===256)break;let i=s-257,len=LB[i]+(LE[i]?rb(LE[i]):0),ds=dec(dt),dist=DB[ds]+(DE[ds]?rb(DE[ds]):0);for(let j=0;j<len;j++)out.push(out[out.length-dist])}}
 return new Uint8Array(out)
}'''

payload = "[" + ",".join(repr(chunk) for chunk in chunks) + "]"
page = f"""<!doctype html><html lang='ru'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Дифференцированная схема кредитования — Николь Саркисьянц</title><link rel='icon' href='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%238b3038%22/%3E%3Ctext x=%2232%22 y=%2243%22 text-anchor=%22middle%22 font-size=%2232%22 fill=%22white%22%3E%E2%82%BD%3C/text%3E%3C/svg%3E'></head><body><main id='boot' style='max-width:760px;margin:12vh auto;padding:24px;font:16px/1.6 system-ui;color:#272423'><h1>Открываем учебное пособие…</h1><p>Страница полностью автономна и готовит интерактивную модель.</p></main><script>(()=>{{try{{{inflater};const b={payload}.join(''),u=Uint8Array.from(atob(b),c=>c.charCodeAt(0)),t=new TextDecoder('utf-8').decode(gunzip(u));document.open();document.write(t);document.close()}}catch(e){{document.getElementById('boot').innerHTML='<h1>Не удалось открыть пособие</h1><p>Ошибка загрузки: '+String(e&&e.message||e)+'</p>'}}}})();</script></body></html>"""

if "DecompressionStream" in page:
    raise SystemExit("Unsupported browser API is still present")
TARGET.write_text(page, encoding="utf-8")
SELF.unlink(missing_ok=True)
WORKFLOW.unlink(missing_ok=True)
