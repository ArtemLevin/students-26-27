from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import ast
import gzip
import re
import subprocess
import tempfile

site = Path('students/sofya_kalney/site')
changed = []


def save(path, text, label):
    path = Path(path)
    old = path.read_text(encoding='utf-8')
    if old != text:
        path.write_text(text, encoding='utf-8')
        changed.append(f'{path.name}: {label}')


def replace_once(path, old, new, label, required=True):
    path = Path(path)
    text = path.read_text(encoding='utf-8')
    if old not in text:
        if required:
            raise SystemExit(f'Expected pattern not found in {path}: {label}')
        return False
    save(path, text.replace(old, new, 1), label)
    return True


# 1. 29.07: remove browser-side gzip bootloader and restore ordinary standalone HTML.
p29 = site / '29.07.26.html'
text = p29.read_text(encoding='utf-8')
if 'DecompressionStream("gzip")' in text:
    m_data = re.search(r'const data="([^"]+)";let buf=0,bits=0,out=\[\];', text)
    m_len = re.search(r'out\.slice\(0,(\d+)\)', text)
    if not (m_data and m_len):
        raise SystemExit('Cannot decode 29.07.26 compatibility loader')
    packed = m_data.group(1)
    expected = int(m_len.group(1))
    buf = bits = 0
    out = bytearray()
    for ch in packed:
        buf = (buf << 15) | (ord(ch) - 0x3400)
        bits += 15
        while bits >= 8:
            bits -= 8
            out.append((buf >> bits) & 255)
            buf &= (1 << bits) - 1
    src = gzip.decompress(bytes(out[:expected])).decode('utf-8')
    if '<!doctype html' not in src.lower() or '</html>' not in src.lower():
        raise SystemExit('Decoded 29.07.26 payload is not a complete HTML document')
    save(p29, src, 'decoded gzip bootloader into standalone HTML')


# 2. Early motion modules: responsive HiDPI canvas backing stores.
for name, min_h in [('motion-basic.html', '320'), ('motion-advanced.html', '340')]:
    path = site / name
    old = (
        "function setupCanvas(c){const dpr=window.devicePixelRatio||1;const rect=c.getBoundingClientRect();"
        f"c.width=Math.max(600,rect.width*dpr);c.height=Math.max({min_h},rect.height*dpr);"
        "const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return [ctx,rect.width,rect.height]}"
    )
    new = (
        "function setupCanvas(c){const dpr=Math.min(window.devicePixelRatio||1,2);const rect=c.getBoundingClientRect();"
        "const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));"
        "if(c.width!==w||c.height!==h){c.width=w;c.height=h}const ctx=c.getContext('2d');"
        "ctx.setTransform(dpr,0,0,dpr,0,0);return [ctx,rect.width,rect.height]}"
    )
    replace_once(path, old, new, 'fixed responsive canvas backing size')


# 3. Early motion modules: dragging the canvas must not open the large modal.
for name in ['motion-basic.html', 'motion-advanced.html']:
    path = site / name
    s = path.read_text(encoding='utf-8')
    pat = re.compile(r"function attachPanZoom\(canvas,state,redraw\)\{.*?\}\nfunction openModal", re.S)
    replacement = (
        "function attachPanZoom(canvas,state,redraw){let down=false,last=null,moved=false;"
        "canvas.addEventListener('pointerdown',e=>{down=true;moved=false;canvas._dragged=false;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});"
        "canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-last[0],dy=e.clientY-last[1];"
        "if(Math.abs(dx)+Math.abs(dy)>3)moved=true;state.panX+=dx;state.panY+=dy;last=[e.clientX,e.clientY];redraw()});"
        "const finish=()=>{down=false;canvas._dragged=moved};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);"
        "canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.55,Math.min(2.6,state.zoom+(e.deltaY<0?.08:-.08)));syncControls();redraw()},{passive:false})}\n"
        "function openModal"
    )
    ns, count = pat.subn(replacement, s, count=1)
    if count != 1:
        raise SystemExit(f'Cannot patch pan/zoom in {name}')
    old_click = "mainCanvas.addEventListener('click',openModal);"
    new_click = "mainCanvas.addEventListener('click',()=>{if(mainCanvas._dragged){mainCanvas._dragged=false;return}openModal()});"
    if old_click not in ns:
        raise SystemExit(f'Cannot patch modal click in {name}')
    ns = ns.replace(old_click, new_click, 1)
    save(path, ns, 'separated drag gesture from modal click')


# 4. Advanced water model: maintain a physically valid positive upstream speed.
path = site / 'motion-advanced.html'
s = path.read_text(encoding='utf-8')
old = "if(state.v2<=state.v1 && (state.mode==='circle'||state.mode==='opposite')) state.v2=state.v1+5;syncControls();drawAll()"
new = "if(state.v2<=state.v1 && (state.mode==='circle'||state.mode==='opposite'))state.v2=state.v1+5;if(state.mode==='water'&&state.v2<=state.current)state.v2=state.current+1;syncControls();drawAll()"
if old not in s:
    raise SystemExit('Cannot patch advanced input constraints')
s = s.replace(old, new, 1)
s = s.replace("против течения: ${Math.max(1,state.v2-state.current)} км/ч", "против течения: ${state.v2-state.current} км/ч", 1)
save(path, s, 'fixed invalid upstream-speed interaction')


# 5. 13.07: backing store follows the visible canvas instead of forcing 600 px width.
path = site / '13-07-26.html'
old = "function fit(){ const dpr=Math.min(devicePixelRatio||1,2), r=canvas.getBoundingClientRect(); canvas.width=Math.max(600,Math.round(r.width*dpr)); canvas.height=Math.round(canvas.width*.75); ctx.setTransform(1,0,0,1,0,0); }"
new = "function fit(){ const dpr=Math.min(devicePixelRatio||1,2), r=canvas.getBoundingClientRect(); const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr)); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h} ctx.setTransform(1,0,0,1,0,0); }"
replace_once(path, old, new, 'fixed responsive canvas backing size')


# 6. 16.07: hidden large canvas was never drawn on its first dialog opening.
path = site / '16-07-26.html'
old = "if(!state.moved&&canvas.id==='graph')$('#graphDialog').showModal()"
new = "if(!state.moved&&canvas.id==='graph'){const dialog=$('#graphDialog');dialog.showModal();requestAnimationFrame(()=>draw($('#graphLarge')))}"
replace_once(path, old, new, 'render enlarged graph after opening dialog')


# 7. 31.07: distinguish a drag from a click that opens the large graph.
path = site / '31.07.26.html'
s = path.read_text(encoding='utf-8')
if 'lastPointerUp:0' not in s:
    if 'drag:null,returnFocus:null};' not in s:
        raise SystemExit('Cannot extend 31.07 graph state')
    s = s.replace('drag:null,returnFocus:null};', 'drag:null,moved:false,lastPointerUp:0,returnFocus:null};', 1)
old_bind = "function bindPan(el){el.addEventListener('pointerdown',function(e){state.drag={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId)});el.addEventListener('pointermove',function(e){if(!state.drag)return;var v=el._view,dx=e.clientX-state.drag.x,dy=e.clientY-state.drag.y;state.panX-=dx/el.clientWidth*(v.x1-v.x0);state.panY+=dy/el.clientHeight*(v.y1-v.y0);state.drag={x:e.clientX,y:e.clientY};renderGraph()});el.addEventListener('pointerup',function(){state.drag=null});el.addEventListener('pointercancel',function(){state.drag=null});el.addEventListener('wheel',function(e){e.preventDefault();setZoom(state.zoom*(e.deltaY<0?1.1:.9))},{passive:false})}"
new_bind = "function bindPan(el){el.addEventListener('pointerdown',function(e){state.drag={x:e.clientX,y:e.clientY};state.moved=false;el.setPointerCapture(e.pointerId)});el.addEventListener('pointermove',function(e){if(!state.drag)return;var v=el._view,dx=e.clientX-state.drag.x,dy=e.clientY-state.drag.y;if(Math.abs(dx)+Math.abs(dy)>3)state.moved=true;state.panX-=dx/el.clientWidth*(v.x1-v.x0);state.panY+=dy/el.clientHeight*(v.y1-v.y0);state.drag={x:e.clientX,y:e.clientY};renderGraph()});el.addEventListener('pointerup',function(){state.lastPointerUp=performance.now();state.drag=null});el.addEventListener('pointercancel',function(){state.lastPointerUp=performance.now();state.drag=null});el.addEventListener('wheel',function(e){e.preventDefault();setZoom(state.zoom*(e.deltaY<0?1.1:.9))},{passive:false})}"
if old_bind not in s:
    raise SystemExit('Cannot patch 31.07 pan gesture')
s = s.replace(old_bind, new_bind, 1)
old_click = "$('#mainbox').onclick=function(e){if(state.drag)return;state.returnFocus=this;"
new_click = "$('#mainbox').onclick=function(e){if(performance.now()-state.lastPointerUp<120&&state.moved)return;state.returnFocus=this;"
if old_click not in s:
    raise SystemExit('Cannot patch 31.07 modal click')
s = s.replace(old_click, new_click, 1)
save(path, s, 'separated drag gesture from modal click')


# 8. 07.08: keep HiDPI backing dimensions proportional even on narrow screens.
path = site / '07.08.26.html'
old = "function prep(canvas,c){const dpr=Math.min(devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();const w=Math.max(320,Math.round(rect.width*dpr)),h=Math.max(260,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}c.setTransform(dpr,0,0,dpr,0,0);return {w:rect.width,h:rect.height}}"
new = "function prep(canvas,c){const dpr=Math.min(devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}c.setTransform(dpr,0,0,dpr,0,0);return {w:rect.width,h:rect.height}}"
replace_once(path, old, new, 'fixed responsive canvas backing size')


# 9. Navigator: remove iframe dependency, integrate recent modules and repair 09.07 TeX link.
base_path = site / 'index-base.html'
wrapper_path = site / 'index.html'
base = base_path.read_text(encoding='utf-8')
wrapper = wrapper_path.read_text(encoding='utf-8')
base = base.replace('../tex_docs/08.09.26.tex', '../tex_docs/09.07.26.tex')
base = base.replace('<article class="stat"><b>4</b><span>интерактивных модуля</span></article>', '<article class="stat"><b>8</b><span>интерактивных модулей</span></article>')

cards = '''
        <article class="lesson-card" style="border-top:5px solid var(--gold)">
          <div class="lesson-number"><span>Модуль 06</span><span>29.07.26</span></div><h3>Формула, график и множество решений</h3>
          <p>Семейства прямых, уравнение с квадратным корнем и метод интервалов через связанную интерактивную модель.</p>
          <div class="skills"><span class="chip">графическая интерпретация</span><span class="chip">проверка корней</span></div>
          <div class="lesson-actions"><a class="btn primary lesson-link" data-lesson="graphical-review" href="29.07.26.html">Открыть модуль</a><a class="btn" href="../pdf_docs/29.07.26.pdf" download>PDF</a><a class="btn" href="../tex_docs/29.07.26.tex" download>TeX</a></div>
        </article>
        <article class="lesson-card" style="border-top:5px solid var(--gold)">
          <div class="lesson-number"><span>Модуль 07</span><span>31.07.26</span></div><h3>Парабола, ключевые точки и выколы</h3>
          <p>Подробное построение параболы, работа с ограничениями алгебраической дроби и подсчёт общих точек с прямой y = m.</p>
          <div class="skills"><span class="chip">вершина и симметрия</span><span class="chip">выколотые точки</span><span class="chip">пошаговые решения</span></div>
          <div class="lesson-actions"><a class="btn primary lesson-link" data-lesson="parabola-holes" href="31.07.26.html">Открыть модуль</a><a class="btn" href="../pdf_docs/31.07.26.pdf" download>PDF</a><a class="btn" href="../tex_docs/31.07.26.tex" download>TeX</a></div>
        </article>
        <article class="lesson-card" style="border-top:5px solid var(--gold)">
          <div class="lesson-number"><span>Модуль 08</span><span>07.08.26</span></div><h3>Графики функций с модулем</h3>
          <p>Кусочная запись, сдвиги графика, сохранение ОДЗ после сокращения, выколотые точки и параметр y = kx.</p>
          <div class="skills"><span class="chip">модуль и ветви</span><span class="chip">ОДЗ</span><span class="chip">параметр k</span><span class="chip">интерактивный график</span></div>
          <div class="lesson-actions"><a class="btn primary lesson-link" data-lesson="modulus-graphs" href="07.08.26.html">Открыть модуль</a><a class="btn" href="../pdf_docs/07.08.26.pdf" download>PDF</a><a class="btn" href="../tex_docs/07.08.26.tex" download>TeX</a></div>
        </article>'''
if 'data-lesson="graphical-review"' not in base:
    m = re.search(r'(<article class="lesson-card">\s*<div class="lesson-number"><span>Модуль 05</span>.*?</article>)', base, re.S)
    if not m:
        raise SystemExit('Cannot find module 05 insertion point')
    base = base[:m.end()] + cards + base[m.end():]

resources = '''
          <div class="resource-row"><div><b>29.07.26</b><small>Формула, график и множество решений</small></div><div class="resource-links"><a href="29.07.26.html">Web</a><a href="../pdf_docs/29.07.26.pdf" download>PDF</a><a href="../tex_docs/29.07.26.tex" download>TeX</a></div></div>
          <div class="resource-row"><div><b>31.07.26</b><small>Парабола, ключевые точки и выколы</small></div><div class="resource-links"><a href="31.07.26.html">Web</a><a href="../pdf_docs/31.07.26.pdf" download>PDF</a><a href="../tex_docs/31.07.26.tex" download>TeX</a></div></div>
          <div class="resource-row"><div><b>07.08.26</b><small>Графики функций с модулем</small></div><div class="resource-links"><a href="07.08.26.html">Web</a><a href="../pdf_docs/07.08.26.pdf" download>PDF</a><a href="../tex_docs/07.08.26.tex" download>TeX</a></div></div>'''
if 'href="29.07.26.html">Web</a>' not in base:
    row16 = re.search(r'(<div class="resource-row"><div><b>16\.07\.26</b>.*?</div></div>)', base, re.S)
    if not row16:
        raise SystemExit('Cannot find 16.07 resource insertion point')
    base = base[:row16.end()] + resources + base[row16.end():]

# Integrate the already-approved heatmap revision from the wrapper into the standalone dashboard.
try:
    a = wrapper.index('const heatmapRevision=')
    b = wrapper.index('const card=', a)
    heat_decl = wrapper[a:b]
    arr = re.search(r'const heatmapUpdates=(\[.*?\]);', heat_decl, re.S)
    updates = ast.literal_eval(arr.group(1)) if arr else []
    for item_id, level in updates:
        pattern = re.compile(r'("id":\s*"' + re.escape(item_id) + r'".*?"level":\s*)\d+', re.S)
        base, n = pattern.subn(lambda m: m.group(1) + str(level), base, count=1)
        if n != 1:
            raise SystemExit(f'Heatmap id not found in base dashboard: {item_id}')
    standalone_heat = '''\n<script>\n(()=>{\n''' + heat_decl + '''\ntry{const key='sofya-competence-map-v1';if(localStorage.getItem(heatmapRevision)!=='1'){const saved=JSON.parse(localStorage.getItem(key)||'{}');heatmapUpdates.forEach(([id,level])=>saved[id]=level);localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem(heatmapRevision,'1');location.reload();return}}catch(_){}\ndocument.addEventListener('click',event=>{const id=event.target.closest?.('[data-id]')?.dataset.id;const info=heatmapEvidence[id];if(!info)return;setTimeout(()=>{const dialog=document.getElementById('competencyDialog');if(!dialog?.open)return;const evidenceNode=document.getElementById('dialogEvidence');const linkNode=document.getElementById('dialogLink');if(evidenceNode)evidenceNode.textContent=info.text;if(linkNode)linkNode.href=info.link},0)});\n})();\n</script>\n'''
    if 'const heatmapRevision=' not in base:
        base = base.replace('</body>', standalone_heat + '</body>')
except ValueError:
    raise SystemExit('Previous heatmap migration block not found in index wrapper')

save(base_path, base, 'integrated recent modules, links and heatmap defaults')
save(wrapper_path, base, 'replaced iframe wrapper with standalone dashboard')


# 10. Static audit of every HTML page: inline JavaScript syntax and local href/src targets.
html_files = sorted(site.glob('*.html'))
print('HTML files audited:', len(html_files))
for p in html_files:
    print(' -', p.name)

scripts_checked = 0
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    for p in html_files:
        src = p.read_text(encoding='utf-8')
        for i, m in enumerate(re.finditer(r'<script([^>]*)>(.*?)</script>', src, re.S | re.I)):
            attrs, js = m.group(1), m.group(2)
            if re.search(r'type\s*=\s*["\'](?:application/ld\+json|application/json)["\']', attrs, re.I):
                continue
            f = td / f'{p.stem}-{i}.js'
            f.write_text(js, encoding='utf-8')
            cp = subprocess.run(['node', '--check', str(f)], text=True, capture_output=True)
            if cp.returncode:
                raise SystemExit(f'JavaScript syntax error in {p.name} script {i}:\n{cp.stderr}')
            scripts_checked += 1
print('Inline scripts syntax-checked:', scripts_checked)


class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for key in ('href', 'src'):
            if key in d and d[key]:
                self.refs.append((tag, key, d[key]))


broken = []
for p in html_files:
    parser = Refs()
    parser.feed(p.read_text(encoding='utf-8'))
    for tag, key, ref in parser.refs:
        r = ref.strip()
        if not r or r.startswith(('#', 'data:', 'javascript:', 'mailto:', 'tel:', 'http://', 'https://')):
            continue
        pathpart = urlsplit(r).path
        if not pathpart:
            continue
        target = (p.parent / unquote(pathpart)).resolve()
        if not target.exists():
            broken.append((p.name, ref, str(target)))
if broken:
    print('Broken local references:')
    for item in broken:
        print('  ', item)
    raise SystemExit('Local link/resource audit failed')
print('Local reference audit: OK')

if 'DecompressionStream("gzip")' in p29.read_text(encoding='utf-8'):
    raise SystemExit('29.07.26 still depends on DecompressionStream')

print('Applied fixes:')
for item in changed:
    print(' *', item)
