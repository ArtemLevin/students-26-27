from pathlib import Path
import base64, gzip, runpy

root = Path(__file__).resolve().parent
parts = sorted(root.glob("generator.*.b64"))
chunks = []
for index, part in enumerate(parts, start=1):
    expected = 3320 if index == len(parts) else 4000
    text = part.read_text(encoding="ascii")
    if len(text) < expected:
        raise RuntimeError(f"Повреждён блок {part.name}: {len(text)} < {expected}")
    chunks.append(text[:expected])

data = "".join(chunks)
target = root / "generate.py"
target.write_bytes(gzip.decompress(base64.b64decode(data, validate=True)))
runpy.run_path(str(target), run_name="__main__")
