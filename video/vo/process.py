"""Voix off du film POV : découpe la prise, la nettoie, cale chaque réplique
sur sa fenêtre (lines.json), baisse la musique sous la voix, puis assemble la
vidéo sans sous-titres.

Usage (depuis /opt/shimmer/video, toujours via heavy) :
  heavy python3 vo/process.py vo/in/prise.m4a
  heavy python3 vo/process.py vo/in/          # un fichier par réplique, dans l'ordre

Options : --video out/shimmer-pov-vo-silent.mp4  --out out/shimmer-pov-vo.mp4
          --music out/music/music.wav  --lines vo/lines.json
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 48000
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FRAME = int(0.02 * SR)
PRE, POST = 0.08, 0.14  # air gardé avant et après la parole (s)
MAX_STRETCH = 1.10  # accélération maximale tolérée pour tenir dans une fenêtre
TOLERANCE = 0.4  # dépassement toléré après la fin de fenêtre (s)
CLEAN = "highpass=f=80,afftdn=nf=-28,deesser=i=0.4,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2"


def decode(path: Path, filt: str = "") -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR)]
    if filt:
        cmd += ["-af", filt]
    cmd += ["-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float32)


def write_wav(path: Path, x: np.ndarray, channels: int = 1) -> None:
    data = np.repeat(x[:, None], channels, axis=1) if channels > 1 else x
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(channels), "-i", "-", "-c:a", "pcm_s16le", str(path)],
        input=np.ascontiguousarray(data, dtype="<f4").tobytes(), check=True,
    )


def speech_segments(x: np.ndarray) -> list[tuple[float, float]]:
    """Segments de parole par énergie : seuil au-dessus du bruit de fond,
    trous de moins de 0,35 s refermés, bouts de moins de 0,25 s ignorés."""
    n = len(x) // FRAME
    rms = np.sqrt(np.mean(x[: n * FRAME].reshape(n, FRAME) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    floor, peak = np.percentile(db, 10), np.percentile(db, 99.5)
    on = db > max(floor + 10, peak - 38)
    segs, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        if not v and start is not None:
            segs.append([start, i])
            start = None
    if start is not None:
        segs.append([start, n])
    merged = []
    for s in segs:
        if merged and (s[0] - merged[-1][1]) * FRAME / SR < 0.35:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [(a * FRAME / SR, b * FRAME / SR) for a, b in merged if (b - a) * FRAME / SR >= 0.25]


def fit_count(segs: list[tuple[float, float]], want: int) -> list[tuple[float, float]]:
    """Trop de segments (pause au milieu d'une phrase) : on fusionne les
    voisins les plus proches jusqu'au bon nombre."""
    segs = list(segs)
    while len(segs) > want:
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        i = int(np.argmin(gaps))
        segs[i : i + 2] = [(segs[i][0], segs[i + 1][1])]
    return segs


def cut(x: np.ndarray, a: float, b: float) -> np.ndarray:
    i, j = max(0, int((a - PRE) * SR)), min(len(x), int((b + POST) * SR))
    seg = x[i:j].copy()
    k = int(0.01 * SR)
    seg[:k] *= np.linspace(0, 1, k)
    seg[-k:] *= np.linspace(1, 0, k)
    return seg


def stretch(seg: np.ndarray, factor: float) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={factor:.4f}", "-f", "f32le", "-"],
        input=np.ascontiguousarray(seg, dtype="<f4").tobytes(), capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float32)


def level(seg: np.ndarray, target_db: float = -20.0) -> np.ndarray:
    """Même niveau pour toutes les répliques (RMS des passages parlés)."""
    n = len(seg) // FRAME
    rms = np.sqrt(np.mean(seg[: n * FRAME].reshape(n, FRAME) ** 2, axis=1) + 1e-12)
    loud = rms[rms > np.percentile(rms, 40)]
    g = 10 ** ((target_db - 20 * np.log10(np.sqrt(np.mean(loud**2)) + 1e-12)) / 20)
    out = seg * g
    peak = np.max(np.abs(out))
    return out * (0.9 / peak) if peak > 0.9 else out


def takes(src: Path, lines: list[dict]) -> list[np.ndarray]:
    if src.is_dir():
        files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".wav", ".m4a", ".mp3", ".aac", ".ogg", ".flac", ".caf", ".mp4"})
        if len(files) != len(lines):
            sys.exit(f"[vo] {len(files)} fichiers pour {len(lines)} répliques : il en faut un par réplique, dans l'ordre.")
        out = []
        for f in files:
            x = decode(f, CLEAN)
            segs = speech_segments(x)
            if not segs:
                sys.exit(f"[vo] pas de parole détectée dans {f.name}")
            out.append(cut(x, segs[0][0], segs[-1][1]))
        return out
    x = decode(src, CLEAN)
    segs = speech_segments(x)
    print(f"[vo] {len(segs)} passages parlés détectés pour {len(lines)} répliques")
    if len(segs) < len(lines):
        for i, (a, b) in enumerate(segs):
            print(f"  passage {i + 1} : {a:6.2f} s à {b:6.2f} s ({b - a:.2f} s)")
        sys.exit("[vo] il manque des répliques (ou deux répliques collées sans pause). Refaire la prise en laissant une seconde de silence entre chaque, ou envoyer un fichier par réplique.")
    return [cut(x, a, b) for a, b in fit_count(segs, len(lines))]


def build_track(parts: list[np.ndarray], lines: list[dict], total: float) -> np.ndarray:
    track = np.zeros(int(total * SR), dtype=np.float32)
    for seg, ln in zip(parts, lines):
        window = ln["end_s"] - ln["start_s"] + TOLERANCE
        length = len(seg) / SR - PRE - POST
        factor = length / window
        if factor > 1:
            if factor > MAX_STRETCH:
                print(f"[vo] {ln['id']} : {length:.2f} s pour {window:.2f} s, trop long même accéléré de 10 % : à redire plus vite ou plus court.")
            seg = stretch(seg, min(factor, MAX_STRETCH))
        seg = level(seg)
        i = int((ln["start_s"] - PRE) * SR)
        n = min(len(seg), len(track) - i)
        track[i : i + n] += seg[:n]
        print(f"[vo] {ln['id']:4s} posé à {ln['start_s']:6.2f} s, {len(seg) / SR - PRE - POST:.2f} s de parole (fenêtre {ln['end_s'] - ln['start_s']:.2f} s)")
    return track


def mix(music: Path, vo: Path, out: Path) -> None:
    """Musique baissée de 3 dB, puis compressée par la voix (elle descend
    pendant qu’on parle, environ 10 dB en tout, et remonte en 0,5 s)."""
    graph = (
        "[1:a]aformat=channel_layouts=stereo,asplit=2[k][v];"
        "[0:a]volume=-3dB[m];"
        "[m][k]sidechaincompress=threshold=0.03:ratio=3.5:attack=20:release=500[d];"
        "[d][v]amix=inputs=2:normalize=0:duration=first[out]"
    )
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(music), "-i", str(vo), "-filter_complex", graph, "-map", "[out]", "-ar", str(SR), str(out)], check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("--lines", type=Path, default=HERE / "lines.json")
    ap.add_argument("--music", type=Path, default=ROOT / "out/music/music.wav")
    ap.add_argument("--video", type=Path, default=ROOT / "out/shimmer-pov-vo-silent.mp4")
    ap.add_argument("--out", type=Path, default=ROOT / "out/shimmer-pov-vo.mp4")
    a = ap.parse_args()
    lines = json.loads(a.lines.read_text())["lines"]
    total = float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", str(a.video)], capture_output=True, text=True, check=True).stdout)
    work = ROOT / "out/vo"
    work.mkdir(parents=True, exist_ok=True)
    track = build_track(takes(a.src, lines), lines, total)
    write_wav(work / "voice.wav", track)
    mix(a.music, work / "voice.wav", work / "mix-raw.wav")
    subprocess.run([sys.executable, str(ROOT / "music/normalize.py"), str(work / "mix-raw.wav"), str(work / "mix.wav")], check=True)
    subprocess.run(["bash", str(ROOT / "tools/mux.sh"), str(a.video), str(work / "mix.wav"), str(a.out)], check=True)


if __name__ == "__main__":
    main()
