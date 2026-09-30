"""Vidéo guide pour enregistrer la voix off en une prise.

Chaque réplique s'affiche en gris 2,5 s avant son tour, trois bips et un
compte à rebours la précèdent, elle passe en vert quand il faut parler et
reste affichée jusqu'à la fin de sa fenêtre. Musique très basse.

Usage (depuis /opt/shimmer/video, via heavy) :
  heavy python3 vo/guide.py            -> out/vo/guide.mp4 (720p)
"""
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SR = 48000
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
LEAD = 2.5  # la réplique s'affiche en avance (s)
BEEPS = (1.5, 1.0, 0.5)  # bips avant le début (s)


def schedule(lines: list[dict]) -> list[dict]:
    """Pour chaque réplique : fenêtre d'annonce (jamais pendant la réplique
    précédente) et bips gardés seulement quand on ne parle plus."""
    out, prev_end = [], 0.0
    for ln in lines:
        a = ln["start_s"]
        free = prev_end + 0.15
        beeps = [d for d in BEEPS if a - d >= free] or [BEEPS[-1]]
        out.append({**ln, "show": max(free, a - LEAD), "beeps": beeps})
        prev_end = ln["end_s"]
    return out


def beeps_track(plan: list[dict], total: float) -> np.ndarray:
    x = np.zeros(int(total * SR), dtype=np.float32)
    t = np.arange(int(0.07 * SR)) / SR
    tone = (0.35 * np.sin(2 * np.pi * 880 * t) * np.minimum(1, (0.07 - t) / 0.01)).astype(np.float32)
    for ln in plan:
        for d in ln["beeps"]:
            i = int((ln["start_s"] - d) * SR)
            if 0 <= i < len(x) - len(tone):
                x[i : i + len(tone)] += tone
    return x


def esc(p: Path) -> str:
    return str(p).replace(":", r"\:")


def wrap(text: str, width: int = 70) -> str:
    words, rows, row = text.split(), [], ""
    for w in words:
        if len(row) + len(w) + 1 > width and row:
            rows.append(row)
            row = w
        else:
            row = f"{row} {w}".strip()
    rows.append(row)
    return "\n".join(rows[:2])


def overlays(plan: list[dict], txt: Path) -> str:
    f = []
    n = len(plan)
    for k, ln in enumerate(plan):
        a, b, show = ln["start_s"], ln["end_s"], ln["show"]
        nxt = txt / f"{k:02d}-next.txt"
        nxt.write_text(f"Ensuite ({k + 1}/{n}) : {ln['text']}")
        cur = txt / f"{k:02d}-now.txt"
        cur.write_text(ln["text"])
        how = txt / f"{k:02d}-how.txt"
        how.write_text(wrap(ln.get("direction", "")))
        f.append(
            f"drawtext=fontfile={FONT}:textfile={esc(nxt)}:expansion=none:fontsize=32:fontcolor=0xBBBBBB:"
            f"x=(w-text_w)/2:y=h-190:box=1:boxcolor=black@0.72:boxborderw=14:enable='between(t,{show:.3f},{a:.3f})'"
        )
        f.append(
            f"drawtext=fontfile={FONT_REG}:textfile={esc(how)}:expansion=none:fontsize=20:line_spacing=6:fontcolor=white@0.8:"
            f"x=(w-text_w)/2:y=h-128:box=1:boxcolor=black@0.6:boxborderw=8:enable='between(t,{show:.3f},{a:.3f})'"
        )
        f.append(
            f"drawtext=fontfile={FONT}:textfile={esc(cur)}:expansion=none:fontsize=42:fontcolor=0xD4FF3A:"
            f"x=(w-text_w)/2:y=h-160:box=1:boxcolor=black@0.75:boxborderw=18:enable='between(t,{a:.3f},{b:.3f})'"
        )
        for d in ln["beeps"]:
            label = {1.5: "3", 1.0: "2", 0.5: "1"}[d]
            f.append(
                f"drawtext=fontfile={FONT}:text={label}:fontsize=90:fontcolor=0xD4FF3A:x=w-150:y=40:"
                f"box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,{a - d:.3f},{a - d + 0.45:.3f})'"
            )
    f.append(f"drawtext=fontfile={FONT_REG}:text='%{{pts\\:hms}}':fontsize=24:fontcolor=white@0.8:x=24:y=24:box=1:boxcolor=black@0.5:boxborderw=8")
    return ",".join(f)


def main() -> None:
    lines = json.loads((HERE / "lines.json").read_text())["lines"]
    video = ROOT / "out/shimmer-pov-vo-silent.mp4"
    music = ROOT / "out/music/music.wav"
    work = ROOT / "out/vo"
    txt = work / "guide-text"
    txt.mkdir(parents=True, exist_ok=True)
    total = float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", str(video)], capture_output=True, text=True, check=True).stdout)
    plan = schedule(lines)
    beeps = beeps_track(plan, total)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", str(work / "beeps.wav")],
        input=beeps.tobytes(), check=True,
    )
    vf = "scale=1280:720," + overlays(plan, txt)
    graph = f"[0:v]{vf}[v];[1:a]volume=-14dB[m];[2:a]aformat=channel_layouts=stereo[b];[m][b]amix=inputs=2:normalize=0:duration=first[a]"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(music), "-i", str(work / "beeps.wav"),
         "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
         "-c:a", "aac", "-b:a", "128k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(work / "guide.mp4")],
        check=True,
    )
    print(f"OK {work / 'guide.mp4'} ({len(lines)} répliques)")


if __name__ == "__main__":
    main()
