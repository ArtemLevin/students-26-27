#!/usr/bin/env python3
from pathlib import Path
import base64
import gzip

root = Path(__file__).resolve().parent
payload = "".join(
    (root / f"sofya_2907_payload_{index:02d}.txt").read_text(encoding="utf-8")
    for index in range(7)
)
source = gzip.decompress(base64.b64decode(payload))
exec(compile(source, "build_sofya_2907.py", "exec"))
