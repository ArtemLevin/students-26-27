from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
STUDENT = ROOT / "students" / "nikol_sarkisyants"


def generate_poster() -> None:
    target = STUDENT / "images" / "21.07.26.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    base = Image.new("RGBA", (1800, 1200), "#fbf5e9")
    paint = Image.new("RGBA", base.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(paint)
    for box, color in [
        ((150, 120, 620, 420), (127, 201, 190, 65)),
        ((1040, 80, 1680, 430), (237, 159, 137, 58)),
        ((80, 650, 720, 1120), (241, 206, 122, 55)),
        ((1020, 610, 1740, 1120), (139, 176, 210, 50)),
    ]:
        pd.ellipse(box, fill=color)
    base.alpha_composite(paint.filter(ImageFilter.GaussianBlur(34)))
    draw = ImageDraw.Draw(base)
    title_font = ImageFont.truetype(bold, 68)
    subtitle_font = ImageFont.truetype(bold, 34)
    card_title = ImageFont.truetype(bold, 30)
    body_font = ImageFont.truetype(regular, 23)
    footer_font = ImageFont.truetype(bold, 24)
    check_title = ImageFont.truetype(bold, 31)
    check_font = ImageFont.truetype(regular, 25)

    def rounded(box, fill, outline="#1c3151", width=4, radius=30):
        draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

    def wrap(text, font, width):
        words, lines, current = text.split(), [], ""
        for word in words:
            candidate = word if not current else current + " " + word
            if draw.textlength(candidate, font=font) <= width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines

    draw.text((90, 55), "Комплексное повторение ЕГЭ", font=title_font, fill="#1c3151")
    draw.text((95, 145), "Ключевые идеи урока · 21 июля 2026", font=subtitle_font, fill="#287f7a")
    draw.line((95, 205, 1705, 205), fill="#e77b5e", width=7)
    cards = [
        ((80, 240, 580, 545), "Финансы", ["Снятие → знак «−»", "Процент — от текущей суммы", "S₃ = 1,1²S(1 + x/100)"], "#e4f3ef"),
        ((650, 240, 1170, 545), "Векторы", ["a·b = aₓbₓ + aᵧbᵧ", "|a| = √(aₓ² + aᵧ²)", "Вниз по оси y → минус"], "#e8eef6"),
        ((1240, 240, 1720, 545), "Вероятность", ["Ровно k — разность вероятностей", "Только для вложенных событий", "0,86 − 0,73 = 0,13"], "#fbe4dc"),
        ((80, 585, 580, 890), "Геометрия", ["Внешний + внутренний = 180°", "В равнобедренном треугольнике", "углы при основании равны"], "#f8edcf"),
        ((650, 585, 1170, 890), "Степени и логарифмы", ["Сводите к одному основанию", "logₐu − logₐv = logₐ(u/v)", "Всегда проверяйте условия"], "#e4f3ef"),
        ((1240, 585, 1720, 890), "Движение и корни", ["Таблица: скорость · время · путь", "Ограничение x > 9", "Корень: интервал → последняя цифра"], "#e8eef6"),
    ]
    for box, heading, bullets, fill in cards:
        rounded(box, fill)
        draw.text((box[0] + 25, box[1] + 18), heading, font=card_title, fill="#1c3151")
        y = box[1] + 78
        for bullet in bullets:
            lines = wrap(bullet, body_font, box[2] - box[0] - 95)
            draw.ellipse((box[0] + 28, y + 8, box[0] + 41, y + 21), fill="#e77b5e")
            for index, line in enumerate(lines):
                draw.text((box[0] + 58, y + index * 31), line, font=body_font, fill="#333333")
            y += max(48, len(lines) * 31 + 14)
    rounded((210, 930, 1590, 1085), "#fffdf8", outline="#287f7a", width=5, radius=28)
    draw.text((255, 955), "Проверка перед ответом", font=check_title, fill="#287f7a")
    draw.text((255, 1012), "знак  •  база процента  •  границы  •  единицы  •  смысл", font=check_font, fill="#1c3151")
    draw.text((410, 1135), "Артём Александрович Лёвин эксклюзивно для Николь Саркисьянц", font=footer_font, fill="#1c3151")
    base.convert("RGB").save(target, quality=95)


def update_index() -> None:
    path = STUDENT / "site" / "index.html"
    text = path.read_text(encoding="utf-8")
    lesson = "\n".join([
        '        <article class="lesson-card">',
        '          <div class="lesson-number"><span>Модуль 09</span><span>21.07.26</span></div>',
        '          <h3>Комплексное повторение тестовой части</h3>',
        '          <p>Финансовые модели, планиметрия, векторы, вероятность, степени, логарифмы, движение и квадратные корни.</p>',
        '          <div class="skills"><span class="chip">повторение</span><span class="chip">тестовая часть</span><span class="chip">ЕГЭ</span></div>',
        '          <div class="lesson-actions">',
        '            <a class="btn primary lesson-link" data-lesson="review-21-07-26" href="21-07-26.html">Открыть занятие</a>',
        '            <a class="btn" href="../pdf_docs/21.07.26.pdf" download aria-label="Скачать пособие от 21 июля в формате PDF">PDF</a>',
        '            <a class="btn" href="../tex_docs/21.07.26.tex" download aria-label="Скачать исходник пособия от 21 июля в формате TeX">TeX</a>',
        '          </div>',
        '        </article>',
        '',
    ])
    if 'data-lesson="review-21-07-26"' not in text:
        marker = '      </div>\n    </section>\n\n    <section id="materials"'
        if marker not in text:
            raise RuntimeError("Lesson insertion marker not found")
        text = text.replace(marker, lesson + marker, 1)
    row = '          <div class="resource-row"><div><b>21.07.26</b><small>Комплексное повторение тестовой части</small></div><div class="resource-links"><a href="21-07-26.html">Web</a><a href="../pdf_docs/21.07.26.pdf" download>PDF</a><a href="../tex_docs/21.07.26.tex" download>TeX</a></div></div>\n'
    if '<b>21.07.26</b>' not in text:
        anchor = '          <div class="resource-row"><div><b>18.07.26</b><small>Сравнение вкладов и поиск ставки</small></div><div class="resource-links"><a href="18-07-26.html">Web</a><a href="../pdf_docs/18.07.26.pdf" download>PDF</a><a href="../tex_docs/18.07.26.tex" download>TeX</a></div></div>\n'
        if anchor not in text:
            raise RuntimeError("Materials insertion anchor not found")
        text = text.replace(anchor, anchor + row, 1)
    path.write_text(text, encoding="utf-8")


def validate() -> None:
    html = (STUDENT / "site" / "21-07-26.html").read_text(encoding="utf-8")
    index = (STUDENT / "site" / "index.html").read_text(encoding="utf-8")
    required = [
        STUDENT / "images" / "21.07.26.png",
        STUDENT / "tex_docs" / "21.07.26.tex",
    ]
    assert all(item.exists() and item.stat().st_size > 1000 for item in required)
    assert html.count('class="exercise"') == 10
    assert "../images/21.07.26.png" in html and "../table.png" in html
    assert "../pdf_docs/21.07.26.pdf" in html and "../tex_docs/21.07.26.tex" in html
    assert "cdn." not in html.lower()
    assert 'data-lesson="review-21-07-26"' in index and '<b>21.07.26</b>' in index


if __name__ == "__main__":
    generate_poster()
    update_index()
    validate()
