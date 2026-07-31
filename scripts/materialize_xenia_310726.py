from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
STUDENT = ROOT / "students" / "xenia_klykova"
IMAGES = STUDENT / "images"
PDFS = STUDENT / "pdf_docs"
IMAGES.mkdir(parents=True, exist_ok=True)
PDFS.mkdir(parents=True, exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BG = (248, 245, 238)
INK = (42, 48, 56)
BURG = (122, 43, 57)
TEAL = (29, 111, 111)
LINE = (190, 182, 169)
PALE = (238, 232, 220)


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def save_palette(image, path):
    image.quantize(colors=16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(
        path, optimize=True, compress_level=9
    )


def mindmap():
    width, height = 1200, 720
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)
    draw.text((width // 2, 24), "ПРИКЛАДНЫЕ МОДЕЛИ, СТЕПЕНИ И ЛИНЕЙНАЯ ФУНКЦИЯ", font=font(30, True), fill=INK, anchor="ma")
    draw.text((width // 2, 62), "ключевые идеи урока", font=font(22, True), fill=BURG, anchor="ma")
    center_x, center_y = 600, 326
    for end_x, end_y in [(420, 172), (420, 345), (420, 540), (780, 180), (780, 350), (780, 535), (600, 465)]:
        draw.line((center_x, center_y, end_x, end_y), fill=BURG, width=3)
    draw.rounded_rectangle((465, 252, 735, 404), radius=34, fill=(255, 253, 248), outline=BURG, width=4)
    draw.text((600, 295), "ПОВТОРЕНИЕ", font=font(26, True), fill=BURG, anchor="ma")
    draw.text((600, 338), "текст → модель → решение", font=font(18, True), fill=INK, anchor="ma")
    draw.text((600, 370), "→ проверка смысла", font=font(18, True), fill=TEAL, anchor="ma")
    boxes = [
        (30, 100, 390, 250, "1. Главная идея", ["Подпишите величины", "Составьте формулу", "Оставьте одну неизвестную", "Проверьте ограничения"]),
        (30, 270, 390, 430, "2. Обозначения", ["p — цена; Q — объём", "v — затраты; F — расходы", "Π — прибыль; R — выручка", "T — температура"]),
        (30, 450, 390, 630, "3. Прибыль", ["Π = Q(p − v) − F", "p − v — доход с единицы", "200Q = 1 000 000", "Q = 5 000"]),
        (810, 100, 1170, 260, "4. Спрос и выручка", ["Q = a − bp; R = pQ", "не менее → ≥; не более → ≤", "(p−4)(p−6) ≤ 0", "p ∈ [4; 6]"]),
        (810, 280, 1170, 440, "5. Степени", ["a·10ⁿ, 1 ≤ a < 10", "10ᵐ·10ⁿ = 10ᵐ⁺ⁿ", "10ᵐ/10ⁿ = 10ᵐ⁻ⁿ", "сдвиг вправо: n уменьшается"]),
        (810, 460, 1170, 630, "6. Линейная функция", ["f(x) = kx + b", "k = (y₂−y₁)/(x₂−x₁)", "b = y₁ − kx₁", "две точки → одна прямая"]),
        (430, 475, 770, 630, "7. Проверка", ["скобки и знаки", "общий знаменатель", "ограничения p, Q, t, T", "отбор корней по смыслу"]),
    ]
    for x1, y1, x2, y2, title, items in boxes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill=(255, 253, 248), outline=LINE, width=2)
        draw.rounded_rectangle((x1 + 12, y1 + 10, x2 - 12, y1 + 46), radius=10, fill=PALE)
        draw.text((x1 + 24, y1 + 18), title, font=font(18, True), fill=BURG)
        y = y1 + 58
        for item in items:
            draw.ellipse((x1 + 22, y + 7, x1 + 29, y + 14), fill=TEAL)
            draw.text((x1 + 39, y), item, font=font(14), fill=INK)
            y += 25
    draw.line((120, 680, 1080, 680), fill=BURG, width=2)
    draw.text((600, 696), "Артём Александрович Лёвин эксклюзивно для Ксении Клыковой", font=font(16), fill=INK, anchor="ma")
    save_palette(image, IMAGES / "31.07.26.png")


def summary_table():
    width, height = 1200, 760
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)
    draw.text((width // 2, 30), "СВОДНАЯ ТАБЛИЦА: ФОРМУЛА → ГРАФИК → ПРОВЕРКА", font=font(27, True), fill=INK, anchor="ma")
    columns = [30, 255, 520, 825, 1170]
    headers = ["Блок", "Модель", "Графический смысл", "Контроль"]
    for index, header in enumerate(headers):
        draw.rectangle((columns[index], 75, columns[index + 1], 125), fill=BURG)
        draw.text(((columns[index] + columns[index + 1]) // 2, 100), header, font=font(17, True), fill=(255, 255, 255), anchor="mm")
    rows = [
        ("Прибыль", "Π = Q(p−v)−F", "прямая по Q", "Q > 0; подстановка"),
        ("Выручка", "R = p(a−bp)", "парабола ветвями вниз", "p ≥ 0; Q ≥ 0"),
        ("Неравенство", "R ≥ R₀", "участок выше уровня R₀", "знак при делении"),
        ("Степени", "10ᵐ·10ⁿ=10ᵐ⁺ⁿ", "шаги преобразования", "коэффициенты и показатели"),
        ("Температура", "T⁴=P/(σS)", "обратный ход формулы", "T > 0"),
        ("Прямая", "f(x)=kx+b", "две точки задают график", "x₁ ≠ x₂"),
        ("Дроби", "a/b ± c/d", "единый знаменатель", "знаки сокращений"),
    ]
    y = 125
    for row_index, row in enumerate(rows):
        row_height = 78
        fill = (255, 253, 248) if row_index % 2 == 0 else PALE
        for index, cell in enumerate(row):
            draw.rectangle((columns[index], y, columns[index + 1], y + row_height), fill=fill, outline=LINE, width=1)
            draw.text((columns[index] + 12, y + 20), cell, font=font(16, index == 0), fill=INK)
        y += row_height
    draw.rounded_rectangle((30, y + 20, 1170, y + 128), radius=16, fill=(255, 253, 248), outline=TEAL, width=3)
    draw.text((55, y + 38), "Финальная самопроверка", font=font(20, True), fill=TEAL)
    checks = ["□ величины подписаны", "□ одна неизвестная", "□ знаки проверены", "□ ограничения учтены", "□ ответ соответствует вопросу"]
    x = 55
    for item in checks:
        draw.text((x, y + 78), item, font=font(15), fill=INK)
        x += 220
    save_palette(image, IMAGES / "table.png")


def pdf_document():
    pdfmetrics.registerFont(TTFont("DejaVu", FONT))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", BOLD))
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleRU", parent=styles["Title"], fontName="DejaVu-Bold", textColor=colors.HexColor("#7A2B39"), alignment=TA_CENTER, fontSize=23, leading=29, spaceAfter=10)
    heading = ParagraphStyle("HeadingRU", parent=styles["Heading2"], fontName="DejaVu-Bold", textColor=colors.HexColor("#1D6F6F"), fontSize=15, leading=19, spaceBefore=8, spaceAfter=6)
    body = ParagraphStyle("BodyRU", parent=styles["BodyText"], fontName="DejaVu", fontSize=10.5, leading=15, spaceAfter=6)
    small = ParagraphStyle("SmallRU", parent=body, fontSize=9.2, leading=13)
    document = SimpleDocTemplate(str(PDFS / "31.07.26.pdf"), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=17 * mm, title="Прикладные модели, степени и линейная функция", author="Лёвин Артём Александрович")
    story = [Spacer(1, 22 * mm), Paragraph("ЧЕК-ЛИСТ", heading), Paragraph("Прикладные модели, степени<br/>и линейная функция", title), Spacer(1, 10 * mm), Paragraph("Повторение ключевых методов решения задач", body), Spacer(1, 65 * mm), Paragraph("Лёвин Артём Александрович<br/>эксклюзивно для Ксении Клыковой<br/><br/>31 июля 2026 года", ParagraphStyle("Center", parent=body, alignment=TA_CENTER)), PageBreak()]
    sections = [
        ("1. Универсальный маршрут", "1) Подпишите величины. 2) Запишите формулу, уравнение или неравенство. 3) Оставьте одну искомую величину. 4) Проверьте знаки, дроби и степени. 5) Проверьте ограничения и смысл ответа."),
        ("2. Прибыль", "Основная модель: <b>Π = Q(p − v) − F</b>. Разность p − v показывает доход с одной единицы до учёта постоянных расходов. Пример: 300 000 = Q(500 − 300) − 700 000, поэтому 200Q = 1 000 000 и Q = 5 000."),
        ("3. Спрос и выручка", "Пусть <b>Q = a − bp</b>, тогда <b>R = pQ</b>. Слова «не менее» дают знак ≥, слова «не более» дают знак ≤. Для Q = 100 − 10p и R ≥ 240 получаем (p − 4)(p − 6) ≤ 0, поэтому p ∈ [4; 6]. Наибольшая цена равна 6."),
        ("4. Степени и стандартный вид", "Стандартный вид: a·10ⁿ, где 1 ≤ a &lt; 10. Правила: 10ᵐ·10ⁿ = 10ᵐ⁺ⁿ; 10ᵐ/10ⁿ = 10ᵐ⁻ⁿ; (10ᵐ)ʳ = 10ᵐʳ. В формуле P = σST⁴ сначала выразите T⁴ = P/(σS), затем сократите коэффициенты и извлеките корень четвёртой степени с учётом T &gt; 0."),
        ("5. Линейная функция", "Для f(x) = kx + b и точек A(x₁; y₁), B(x₂; y₂): k = (y₂ − y₁)/(x₂ − x₁), b = y₁ − kx₁. Для A(3; 4), B(−1; −3) получаем k = 7/4, b = −5/4 и f(−5) = −10."),
        ("6. Типичные ошибки", "Скобки пропущены при подстановке; знак неравенства сохранён после деления на отрицательное число; дроби сложены до общего знаменателя; показатели степеней обработаны неверно; корень выбран без проверки условий; координаты x и y переставлены."),
    ]
    for name, text in sections:
        story.extend([Paragraph(name, heading), Paragraph(text, body)])
    story.append(PageBreak())
    story.extend([Paragraph("Тренировочный блок", title)])
    exercises = [
        "Цена равна 750 рублей, затраты равны 430 рублей, постоянные расходы составляют 960 000 рублей. Какой объём обеспечит прибыль 640 000 рублей?",
        "Спрос задан формулой Q = 120 − 8p. Выручка должна быть не менее 400. Найдите наибольшую цену.",
        "Высота воды задаётся формулой h(t) = −t² + 12t + 13, t ≥ 0. Через сколько единиц времени бак опустеет?",
        "В формуле P = σST⁴ даны σ = 5,7·10⁻⁸, S = 10¹⁴, P = 9,12·10¹⁹. Найдите T.",
        "Прямая проходит через A(2; 5) и B(−2; −3). Найдите f(6).",
        "Прямая проходит через A(4; 1) и B(−4; −2). Найдите f(−10).",
        "Цена равна 900 рублей, затраты равны 540 рублей, постоянные расходы составляют 1 260 000 рублей. Найдите наименьший целый объём, при котором прибыль будет не менее 900 000 рублей.",
        "Спрос задан формулой Q = 180 − 6p. Выручка должна быть не менее 1 200. Найдите наибольшую цену.",
        "Известно, что f(3) = 7, f(−5) = −9. Найдите x, при котором f(x) = 25.",
        "Спрос проходит через точки (5; 150) и (20; 60). Прибыль Π = (p − 5)Q − 300. Найдите наибольшую целую цену, при которой прибыль не меньше 300, и соответствующий спрос.",
    ]
    for number, exercise in enumerate(exercises, 1):
        story.append(Paragraph(f"<b>{number}.</b> {exercise}", body))
    story.append(PageBreak())
    story.append(Paragraph("Ответы", title))
    answer_data = [["№", "Ответ"]] + [[str(i), answer] for i, answer in enumerate(["5 000", "10", "13", "2 000", "13", "−17/4", "6 000", "20", "12", "p = 25, Q = 30"], 1)]
    table = Table(answer_data, colWidths=[22 * mm, 130 * mm])
    table.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "DejaVu"), ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7A2B39")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BEB6A9")), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EEE8DC")]), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(table)
    document.build(story)


if __name__ == "__main__":
    mindmap()
    summary_table()
    pdf_document()
