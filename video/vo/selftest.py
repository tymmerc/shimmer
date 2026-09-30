"""Test de la chaîne voix off sans vraie voix : fabrique une fausse prise
(syllabes simulées, retards humains, une pause au milieu d'une phrase, prise
lancée 2,3 s avant le film), la passe dans process.py et vérifie que chaque
réplique démarre à moins de 60 ms de sa fenêtre et que la vidéo est
assemblée.

Usage (depuis /opt/shimmer/video) : heavy python3 vo/selftest.py
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import process as P  # noqa: E402

SR = P.SR
rng = np.random.default_rng(7)


def fake_speech(dur: float) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    f0 = 120 + 15 * np.sin(2 * np.pi * 0.7 * t)
    buzz = np.sin(2 * np.pi * np.cumsum(f0) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f0) / SR)
    noise = P.np.convolve(rng.standard_normal(len(t)), np.ones(8) / 8, mode="same")
    syll = 0.5 + 0.5 * np.sin(2 * np.pi * 5.2 * t) ** 2
    env = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.05)
    return (0.25 * (0.7 * buzz + 0.3 * noise) * syll * env).astype(np.float32)


def main() -> None:
    lines = json.loads((HERE / "lines.json").read_text())["lines"]
    lead = 2.3
    total = lines[-1]["end_s"] + lead + 3
    take = (0.002 * rng.standard_normal(int(total * SR))).astype(np.float32)
    for k, ln in enumerate(lines):
        dur = min((ln["end_s"] - ln["start_s"]) * 0.85, len(ln["text"]) / 13 + 0.2)
        t0 = ln["start_s"] + lead + rng.uniform(-0.12, 0.2)
        s = fake_speech(dur)
        if k == 2 and dur > 1.2:  # pause au milieu d'une phrase : doit être recollée
            half = len(s) // 2
            s = np.concatenate([s[:half], np.zeros(int(0.3 * SR), np.float32), s[half:]])
        i = int(t0 * SR)
        take[i : i + len(s)] += s
    work = ROOT / "out/vo"
    work.mkdir(parents=True, exist_ok=True)
    P.write_wav(work / "selftest-take.wav", take)
    out = work / "selftest.mp4"
    subprocess.run([sys.executable, str(HERE / "process.py"), str(work / "selftest-take.wav"), "--out", str(out)], check=True)

    voice = P.decode(work / "voice.wav")
    errs = []
    for ln in lines:
        a = int((ln["start_s"] - 0.3) * SR)
        seg = voice[a : a + int(0.6 * SR)]
        env = np.convolve(np.abs(seg), np.ones(240) / 240, mode="same")
        onset = (a + int(np.argmax(env > 0.2 * env.max()))) / SR
        errs.append(abs(onset - ln["start_s"]))
    print(f"[test] écart de calage max {1000 * max(errs):.0f} ms (seuil 60 ms)")
    ok = max(errs) < 0.06 and out.exists()
    print(f"[test] vidéo assemblée : {out.exists()}")
    print("[test] OK" if ok else "[test] ÉCHEC")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
