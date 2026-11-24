
from pathlib import Path
import pymupdf

# ==================== НАСТРОЙКИ ====================

PDF_PATH = Path(__file__).resolve().parent / "Kas1.pdf"
OUTPUT_DIR = PDF_PATH.parent / "Kas1_batches"

BATCH_SIZE = 10
DPI = 250
JPEG_QUALITY = 90
GRAYSCALE = True

# ===================================================


def convert_pdf_to_batches():
    if not PDF_PATH.is_file():
        raise FileNotFoundError(f"Файл не найден: {PDF_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    colorspace = (
        pymupdf.csGRAY if GRAYSCALE else pymupdf.csRGB
    )

    with pymupdf.open(PDF_PATH) as document:
        total_pages = len(document)
        total_batches = (
                                total_pages + BATCH_SIZE - 1
                        ) // BATCH_SIZE

        print(f"Всего страниц: {total_pages}")
        print(f"Количество батчей: {total_batches}")
        print(f"Папка сохранения: {OUTPUT_DIR}\n")

        for start in range(0, total_pages, BATCH_SIZE):
            end = min(start + BATCH_SIZE, total_pages)
            batch_number = start // BATCH_SIZE + 1

            batch_dir = OUTPUT_DIR / (
                f"batch_{batch_number:03d}"
                f"_pages_{start + 1:04d}-{end:04d}"
            )

            batch_dir.mkdir(parents=True, exist_ok=True)

            for page_index in range(start, end):
                output_file = batch_dir / (
                    f"page_{page_index + 1:04d}.jpg"
                )

                # Пропускаем уже обработанные страницы
                if output_file.exists():
                    print(f"Пропуск: {output_file.name}")
                    continue

                page = document.load_page(page_index)

                pixmap = page.get_pixmap(
                    dpi=DPI,
                    colorspace=colorspace,
                    alpha=False,
                )

                pixmap.save(
                    str(output_file),
                    jpg_quality=JPEG_QUALITY,
                )

                del pixmap

                progress = (page_index + 1) / total_pages * 100

                print(
                    f"[{progress:6.2f}%] "
                    f"Батч {batch_number:03d}/{total_batches:03d} | "
                    f"Страница {page_index + 1}/{total_pages}"
                )

    print("\nКонвертация завершена!")


if __name__ == "__main__":
    convert_pdf_to_batches()
