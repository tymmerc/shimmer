"""Enveloppe du mix (RMS 50 ms) avec les repères du film et les mesures."""
import sys, wave
import numpy as np
from PIL import Image, ImageDraw
from cues import TIMES, TOTAL
import compose as C

path, out = sys.argv[1], sys.argv[2]
with wave.open(path) as w:
    x = np.frombuffer(w.readframes(w.getnframes()), "<i2").reshape(-1, 2).astype(float) / 32768
    sr = w.getframerate()
hop = int(0.05 * sr)
rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(rms + 1e-6)
W, H = 2400, 520
img = Image.new("RGB", (W, H), (13, 11, 20))
d = ImageDraw.Draw(img)
px = lambda t: int(40 + (W - 80) * t / TOTAL)
py = lambda v: int(H - 60 - (H - 120) * (v + 50) / 50)
for bar in range(-2, 27):
    t = C.at(bar)
    if 0 <= t <= TOTAL:
        d.line([(px(t), 40), (px(t), H - 60)], fill=(45, 40, 60))
        d.text((px(t) + 2, H - 55), str(bar), fill=(120, 110, 140))
pts = [(px(i * 0.05), py(v)) for i, v in enumerate(db)]
d.line(pts, fill=(212, 255, 58), width=2)
for k, t in TIMES.items():
    d.line([(px(t), 40), (px(t), H - 60)], fill=(232, 74, 255))
    d.text((px(t) + 3, 42 + (hash(k) % 6) * 12), k, fill=(232, 74, 255))
for v in (-10, -20, -30, -40):
    d.text((2, py(v) - 6), str(v), fill=(120, 110, 140))
img.save(out)
print("ok", out)
