from pathlib import Path
import base64,gzip,runpy
root=Path(__file__).resolve().parent
data="".join(p.read_text(encoding="ascii") for p in sorted(root.glob("generator.*.b64")))
target=root/"generate.py"
target.write_bytes(gzip.decompress(base64.b64decode(data)))
runpy.run_path(str(target),run_name="__main__")
