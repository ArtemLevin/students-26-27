from pathlib import Path
import base64, gzip, hashlib, runpy

root = Path(__file__).resolve().parent
parts = sorted(root.glob("generator.*.b64"))
expected_hashes = [
    "1a40e10cfae7c8a5f2621dce27062ce8c5060fb984cb12f792cbfc932c7f94b1",
    "471a88f732bd6f9ecf3d5e8a12df24781ea5a538d06834bebcd4a2922642855e",
    "e1e78bc6ecf292adbb1af5b945b3b2ef997b0b834ac0f053600383023810f890",
    "88af6f3757a7a13800c897ceae025ffc26869333e203024cdd9fb0112af04d36",
    "a19329a42956b98c843f6d800de2ee2cfe252986dc0b60d218073f4e7e32870f",
    "1bcf450b6caa7f2bacf32e7dcb172622e64520f908abb6bba0f929a8e75817c9",
    "b58e8778d3c6cd9cf5cb25b788ceb17af31c25ca7f9f771d58df9c96d897c26f",
    "d465a232a710fcfef149858fe766bb1318a779ed4344c3813b500ca397e0b793",
    "dc21aac0b14cd6676f08c6f8d7be2f9c2417652fae0cfafee91bea44c8aba7a2",
]
chunks = []
errors = []
for index, part in enumerate(parts, start=1):
    expected_length = 3320 if index == len(parts) else 4000
    corrections = sorted(root.glob(f"fix.{index:02d}.*.b64"))
    if corrections:
        text = "".join(item.read_text(encoding="ascii") for item in corrections)
    else:
        text = part.read_text(encoding="ascii")
    text = text[:expected_length]
    digest = hashlib.sha256(text.encode("ascii")).hexdigest()
    if len(text) != expected_length or digest != expected_hashes[index - 1]:
        errors.append(f"block {index:02d}: length={len(text)}, sha256={digest}")
    chunks.append(text)
if errors:
    raise RuntimeError("Повреждены блоки:\n" + "\n".join(errors))

data = "".join(chunks)
target = root / "generate.py"
target.write_bytes(gzip.decompress(base64.b64decode(data, validate=True)))
runpy.run_path(str(target), run_name="__main__")
