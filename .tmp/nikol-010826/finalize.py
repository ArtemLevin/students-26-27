from pathlib import Path
import base64
import gzip
import re

root = Path('.')
payload_dir = root / '.tmp/nikol-010826'
parts = sorted(payload_dir.glob('part*.txt'))
if len(parts) != 10:
    raise SystemExit(f'Expected 10 payload parts, found {len(parts)}')
encoded = ''.join(part.read_text(encoding='utf-8').strip() for part in parts)
html = gzip.decompress(base64.b64decode(encoded))
target = root / 'students/nikol_sarkisyants/site/01.08.26.html'
target.write_bytes(html)

index = root / 'students/nikol_sarkisyants/site/index.html'
text = index.read_text(encoding='utf-8')
if 'href="01.08.26.html"' not in text:
    materials = text.find('<section id="materials"')
    routes = text.find('<div class="routes">')
    if routes < 0 or materials < 0:
        raise SystemExit('Index anchors not found')
    close = text.rfind('</div>', routes, materials)
    if close < 0:
        raise SystemExit('Routes closing tag not found')
    card = '''        <article class="lesson-card">
          <div class="lesson-number"><span>Модуль 11</span><span>01.08.26</span></div>
          <h3>Комплексное повторение: формулы и связи</h3>
          <p>Геометрия, векторы, вероятность, степени, логарифмы, задачи на работу, показательная функция и тригонометрия в едином интерактивном маршруте.</p>
          <div class="skills"><span class="chip">повторение</span><span class="chip">визуализация</span><span class="chip">самопроверка</span></div>
          <div class="lesson-actions">
            <a class="btn primary lesson-link" data-lesson="review-01-08-26" href="01.08.26.html">Открыть занятие</a>
            <a class="btn" href="../pdf_docs/01.08.26.pdf" download aria-label="Скачать пособие от 1 августа в формате PDF">PDF</a>
            <a class="btn" href="../tex_docs/01.08.26.tex" download aria-label="Скачать исходник пособия от 1 августа в формате TeX">TeX</a>
          </div>
        </article>
'''
    text = text[:close] + card + text[close:]
text = text.replace('<article class="stat"><b>10</b><span>интерактивных модулей</span></article>', '<article class="stat"><b>11</b><span>интерактивных модулей</span></article>')
text = text.replace('<h2 id="continue-title">Отбор физически значимого корня</h2>', '<h2 id="continue-title">Комплексное повторение урока</h2>')
text = text.replace('Повторите связь между графиком, областью допустимых значений и смыслом найденного ответа.', 'Соберите формулы и методы урока в единую систему и проверьте себя на интерактивных моделях.')
text = text.replace('href="rational-intervals.html">Продолжить →</a>', 'href="01.08.26.html">Продолжить →</a>', 1)
index.write_text(text, encoding='utf-8')

source = target.read_text(encoding='utf-8')
assert target.stat().st_size > 70000
assert source.count('role="tabpanel"') == 7
assert source.count('<math') >= 40
assert 'http://' not in source and 'https://' not in source
assert 'href="01.08.26.html"' in index.read_text(encoding='utf-8')
for required in [
    root / 'students/nikol_sarkisyants/pdf_docs/01.08.26.pdf',
    root / 'students/nikol_sarkisyants/tex_docs/01.08.26.tex',
    root / 'students/nikol_sarkisyants/images/01.08.26.png',
    root / 'students/nikol_sarkisyants/images/table.png',
]:
    assert required.exists(), required
script = re.search(r'<script>([\s\S]*?)</script>', source)
assert script
Path('/tmp/nikol-010826.js').write_text(script.group(1), encoding='utf-8')
print(f'Generated {target} ({target.stat().st_size} bytes)')
