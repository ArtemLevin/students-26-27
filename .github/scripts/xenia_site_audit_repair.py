from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import base64
import collections
import gzip
import json
import re
import subprocess
import tempfile

root = Path.cwd()
site = root / 'students/xenia_klykova/site'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


# 1. Expand the two browser-dependent packed lesson loaders to their exact embedded HTML.
p = site / '20-07-26.html'
s = read(p)
if "DecompressionStream('gzip')" in s or 'DecompressionStream("gzip")' in s:
    m = re.search(r"const encoded=\[(.*?)\]\.join\(''\);", s, re.S)
    if not m:
        raise SystemExit('20-07-26: compressed payload not found')
    chunks = re.findall(r"'([A-Za-z0-9+/=]+)'", m.group(1))
    if not chunks:
        raise SystemExit('20-07-26: compressed chunks not found')
    direct = gzip.decompress(base64.b64decode(''.join(chunks))).decode('utf-8')
    if '<!doctype html' not in direct.lower():
        raise SystemExit('20-07-26: decoded payload is not HTML')
    write(p, direct)

p = site / '31.07.26.html'
s = read(p)
if 'DecompressionStream' in s:
    m = re.search(r'const data="(.*?)",size=(\d+);', s, re.S)
    if not m:
        raise SystemExit('31.07.26: compressed payload not found')
    data, size = m.group(1), int(m.group(2))
    buf = bits = 0
    out = []
    for ch in data:
        value = ord(ch) - 0x3400
        if value < 0 or value >= (1 << 15):
            raise SystemExit('31.07.26: invalid packed symbol')
        buf = (buf << 15) | value
        bits += 15
        while bits >= 8:
            bits -= 8
            out.append((buf >> bits) & 255)
            buf &= (1 << bits) - 1
    direct = gzip.decompress(bytes(out[:size])).decode('utf-8')
    if '<!doctype html' not in direct.lower():
        raise SystemExit('31.07.26: decoded payload is not HTML')
    write(p, direct)


# 2. Legacy download cards were appended after the footer. Put them back into the main lesson column.
for name in ('applied-formulas.html', 'ege-models.html', 'powers-physics.html'):
    p = site / name
    s = read(p)
    block = re.search(
        r'<section class="layout"><section class="content">(?P<article><article class="card download-panel">.*?</article>)</section></section>',
        s,
        re.S,
    )
    if block and '</section><aside class="visual">' in s:
        article = block.group('article')
        s = s[:block.start()] + s[block.end():]
        s = s.replace('</section><aside class="visual">', article + '</section><aside class="visual">', 1)
        write(p, s)


# 3. Read the detailed heatmap catalogue so old quiz keys can be migrated to current rubric IDs.
def extract_js_array(src, marker):
    start = src.index(marker) + len(marker)
    while start < len(src) and src[start].isspace():
        start += 1
    if src[start] != '[':
        raise ValueError('array marker does not point to [')
    depth = 0
    quote = None
    escape = False
    for i in range(start, len(src)):
        ch = src[i]
        if quote:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote:
                quote = None
            continue
        if ch in ('"', "'"):
            quote = ch
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return src[start:i + 1]
    raise ValueError('unterminated array')


base_path = site / 'index-base-2026-07-29.html'
base_text = read(base_path)
groups = json.loads(extract_js_array(base_text, 'const groups = '))
used_legacy = {
    'formula', 'units', 'transform', 'verification', 'graph',
    'root_selection', 'constraints', 'quadratic', 'powers', 'scientific',
}
legacy_map = collections.defaultdict(list)
for group in groups:
    for item in group.get('items', []):
        keys = []
        if item.get('legacyId'):
            keys.append(item['legacyId'])
        keys.extend(item.get('legacyIds') or [])
        for key in dict.fromkeys(keys):
            if key in used_legacy and item['id'] not in legacy_map[key]:
                legacy_map[key].append(item['id'])

index_path = site / 'index.html'
idx = read(index_path)
if 'xenia-legacy-competency-migration' not in idx:
    migration = '''\n<script id="xenia-legacy-competency-migration">\n(()=>{\n  const key='xenia-competence-map-v1';\n  const map=__MAP__;\n  try{\n    const state=JSON.parse(localStorage.getItem(key)||'{}')||{};\n    let changed=false;\n    Object.entries(map).forEach(([legacy,ids])=>{\n      if(state[legacy]===undefined)return;\n      const value=Math.max(0,Math.min(4,Number(state[legacy])));\n      ids.forEach(id=>{state[id]=value});\n      delete state[legacy];\n      changed=true;\n    });\n    if(changed)localStorage.setItem(key,JSON.stringify(state));\n  }catch(_){ }\n})();\n</script>\n'''.replace('__MAP__', json.dumps(dict(legacy_map), ensure_ascii=False, separators=(',', ':')))
    idx = idx.replace('<iframe id="base"', migration + '<iframe id="base"', 1)

# Repair iframe navigation. Relative lesson links must leave the wrapper iframe;
# “index.html#lessons” stays in the base document and scrolls its lesson section.
if 'xeniaIframeNavigationRepair' not in idx:
    marker = "      const evidence=window.__xeniaCompetenceEvidence||{};"
    repair = '''      // xeniaIframeNavigationRepair: keep lesson navigation out of the wrapper iframe.\n      d.addEventListener('click',event=>{\n        const a=event.target.closest&&event.target.closest('a[href]');\n        if(!a)return;\n        const raw=a.getAttribute('href')||'';\n        if(raw==='index.html#lessons'||raw.endsWith('/index.html#lessons')){\n          event.preventDefault();\n          d.getElementById('lessons')?.scrollIntoView({behavior:'smooth',block:'start'});\n          return;\n        }\n        if(raw&&!raw.startsWith('#')&&!/^(?:https?:|mailto:|tel:|data:)/i.test(raw)){\n          a.setAttribute('target','_top');\n        }\n      },true);\n'''
    if marker not in idx:
        raise SystemExit('index.html: iframe repair insertion marker not found')
    idx = idx.replace(marker, repair + marker, 1)

# Evidence enrichment originally ran on pointer clicks. Add the equivalent keyboard path.
if 'xeniaEvidenceKeyboardRepair' not in idx:
    insertion = '''\n      // xeniaEvidenceKeyboardRepair\n      d.addEventListener('keydown',event=>{\n        if(event.key!=='Enter'&&event.key!==' ')return;\n        const target=event.target.closest&&event.target.closest('[data-id]');\n        if(!target)return;\n        const item=evidence[target.dataset.id];\n        if(!item)return;\n        setTimeout(()=>{\n          const note=d.getElementById('dialogEvidence');\n          const link=d.getElementById('dialogLink');\n          if(note)note.textContent=item.evidence;\n          if(link){\n            link.setAttribute('href',item.link==='index.html#lessons'?'#lessons':item.link);\n            if(item.link==='index.html#lessons')link.removeAttribute('target');else link.setAttribute('target','_top');\n          }\n        },0);\n      },true);\n'''
    needle = "      const reset=d.getElementById('resetMap');"
    if needle not in idx:
        raise SystemExit('index.html: keyboard repair insertion marker not found')
    idx = idx.replace(needle, insertion + needle, 1)

idx = idx.replace(
    "if(link)link.href=item.link;",
    "if(link){link.setAttribute('href',item.link==='index.html#lessons'?'#lessons':item.link);if(item.link==='index.html#lessons')link.removeAttribute('target');else link.setAttribute('target','_top');}",
)
write(index_path, idx)


# 4. Storage can be blocked for file:// or privacy settings. Guard it so one denied call cannot kill the whole lesson runtime.
shim = '''<script id="xenia-storage-guard">(()=>{if(window.__xeniaStorage)return;window.__xeniaStorage={get:(area,key)=>{try{return window[area].getItem(key)}catch(_){return null}},set:(area,key,value)=>{try{window[area].setItem(key,value)}catch(_){}},remove:(area,key)=>{try{window[area].removeItem(key)}catch(_){}}};})();</script>'''
for p in sorted(site.glob('*.html')):
    s = read(p)
    changed = False
    for area in ('localStorage', 'sessionStorage'):
        replacements = {
            f'{area}.getItem(': f"__xeniaStorage.get('{area}',",
            f'{area}.setItem(': f"__xeniaStorage.set('{area}',",
            f'{area}.removeItem(': f"__xeniaStorage.remove('{area}',",
        }
        for old, new in replacements.items():
            if old in s:
                s = s.replace(old, new)
                changed = True
    if changed and 'id="xenia-storage-guard"' not in s:
        if '</head>' not in s:
            raise SystemExit(f'{p.name}: no </head> for storage shim')
        s = s.replace('</head>', shim + '</head>', 1)
    if changed:
        write(p, s)


# 5. Static integrity audit for every HTML file.
class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.refs = []
        self.scripts = []
        self._script = False
        self._script_buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
        if tag in ('a', 'img', 'script', 'link', 'iframe', 'source'):
            key = 'href' if tag in ('a', 'link') else 'src'
            if a.get(key):
                self.refs.append((tag, key, a[key]))
        if tag == 'script' and not a.get('src'):
            self._script = True
            self._script_buf = []

    def handle_endtag(self, tag):
        if tag == 'script' and self._script:
            self.scripts.append(''.join(self._script_buf))
            self._script = False
            self._script_buf = []

    def handle_data(self, data):
        if self._script:
            self._script_buf.append(data)


htmls = sorted(site.glob('*.html'))
parsed = {}
errors = []
for p in htmls:
    parser = AuditParser()
    parser.feed(read(p))
    parsed[p.resolve()] = parser
    dup = [key for key, count in collections.Counter(parser.ids).items() if count > 1]
    if dup:
        errors.append(f'{p.name}: duplicate ids: {dup}')

for p in htmls:
    parser = parsed[p.resolve()]
    own_ids = set(parser.ids)
    for tag, key, ref in parser.refs:
        raw = ref.strip()
        if not raw or raw.startswith(('data:', 'http://', 'https://', 'mailto:', 'tel:', 'javascript:')):
            continue
        if raw.startswith('#'):
            target = raw[1:]
            if target and target not in own_ids:
                if not (p.name == 'index.html' and target in {'lessons', 'materials', 'competencies'}):
                    errors.append(f'{p.name}: missing in-page target #{target}')
            continue
        parts = urlsplit(raw)
        target_path = (p.parent / unquote(parts.path)).resolve()
        if not target_path.exists():
            errors.append(f'{p.name}: missing local resource {raw}')
            continue
        if parts.fragment and target_path.suffix.lower() == '.html' and target_path in parsed:
            if parts.fragment not in set(parsed[target_path].ids):
                if not (target_path.name == 'index.html' and parts.fragment in {'lessons', 'materials', 'competencies'}):
                    errors.append(f'{p.name}: missing target {raw}')

for p in htmls:
    s = read(p)
    if 'DecompressionStream' in s or re.search(r'\batob\s*\(', s):
        errors.append(f'{p.name}: browser-dependent packed loader remains')

# Parse all inline JS with Node. This catches the most common reason all buttons on a page stop responding.
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    for p in htmls:
        parser = parsed[p.resolve()]
        for i, script in enumerate(parser.scripts):
            if not script.strip():
                continue
            js = td / f'{p.stem}-{i}.js'
            js.write_text(script, encoding='utf-8')
            cp = subprocess.run(['node', '--check', str(js)], text=True, capture_output=True)
            if cp.returncode:
                errors.append(f'{p.name}: script {i} syntax error: {cp.stderr.strip()}')

# Literal DOM references should point to elements that actually exist.
for p in htmls:
    parser = parsed[p.resolve()]
    ids = set(parser.ids)
    text = '\n'.join(parser.scripts)
    refs = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", text))
    refs.update(re.findall(r"\$\(['\"]#([A-Za-z][\w:-]*)['\"]\)", text))
    missing = sorted(x for x in refs if x not in ids)
    if missing:
        errors.append(f'{p.name}: script references missing ids: {missing}')

print(f'Audited {len(htmls)} HTML files:')
for p in htmls:
    print(' -', p.relative_to(root))

if errors:
    print('\nAUDIT ERRORS:')
    for error in errors:
        print(' *', error)
    raise SystemExit(1)

print('\nAUDIT OK: structure, local refs, JS syntax, DOM IDs and packed-loader checks passed.')
