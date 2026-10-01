import fs from 'node:fs';
import path from 'node:path';

function validDate(year,month,day){
  const value=new Date(Date.UTC(year,month-1,day));
  return value.getUTCFullYear()===year&&value.getUTCMonth()===month-1&&value.getUTCDate()===day;
}
export function normalizeLessonDate(value){
  let year,month,day;
  let match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(match){year=+match[1];month=+match[2];day=+match[3];}
  else{
    match=String(value||'').match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if(!match)throw new Error('lesson artifact: date must use YYYY-MM-DD or DD.MM.YY');
    day=+match[1];month=+match[2];year=2000+(+match[3]);
  }
  if(!validDate(year,month,day))throw new Error('lesson artifact: invalid lesson date '+value);
  const mm=String(month).padStart(2,'0');
  const dd=String(day).padStart(2,'0');
  const yy=String(year).slice(-2);
  return {iso:year+'-'+mm+'-'+dd,base:dd+'.'+mm+'.'+yy};
}
function strip(value){
  return String(value||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function pageMeta(source){
  const title=strip(
    source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||
    source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||
    ''
  );
  const metaTags=[...source.matchAll(/<meta\b[^>]*>/gi)].map(item=>item[0]);
  const descriptionTag=metaTags.find(tag=>/\bname=["']description["']/i.test(tag));
  const summary=descriptionTag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim()||'';
  return {title,summary};
}

export function discoverLessonArtifact({root=process.cwd(),studentId,lessonDate}={}){
  if(!studentId)throw new Error('lesson artifact: studentId is required');
  const {iso,base}=normalizeLessonDate(lessonDate);
  const studentRoot=path.join(root,'students',studentId);
  const siteRoot=path.join(studentRoot,'site');
  const htmlPath=path.join(siteRoot,base+'.html');
  if(!fs.existsSync(htmlPath))throw new Error('lesson artifact: missing HTML '+path.relative(root,htmlPath));
  const htmlSource=fs.readFileSync(htmlPath,'utf8');
  const meta=pageMeta(htmlSource);

  const materials={html:base+'.html'};
  const pdfPath=path.join(studentRoot,'pdf_docs',base+'.pdf');
  const texPath=path.join(studentRoot,'tex_docs',base+'.tex');
  const labPath=path.join(siteRoot,base+'-lab.html');
  if(fs.existsSync(pdfPath))materials.pdf='../pdf_docs/'+base+'.pdf';
  if(fs.existsSync(texPath))materials.tex='../tex_docs/'+base+'.tex';
  if(fs.existsSync(labPath))materials.lab=base+'-lab.html';

  return {
    studentId,
    date:iso,
    base,
    title:meta.title||'Занятие '+base,
    summary:meta.summary,
    htmlPath,
    htmlSource,
    materials
  };
}
