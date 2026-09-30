"""Minutage du film : frames HISTOIRE -> secondes FILM (même table que timeline.ts)."""
import re, pathlib

TL = pathlib.Path(__file__).resolve().parent.parent / "src/pov2/timeline.ts"
src = TL.read_text()
body = src[src.index("const STRETCH"):src.index("const END_HOLD")]
STRETCH = [tuple(int(x) for x in m) for m in re.findall(r"\[(-?\d+),\s*(-?\d+),\s*(-?\d+)\]", body)]
DURATION = int(re.search(r"export const DURATION = (\d+)", src).group(1))
END_HOLD = int(re.search(r"const END_HOLD = (\d+)", src).group(1))
FPS = 30

PHONE = TL.parent / "Phone.tsx"
_ph = PHONE.read_text()
_pt = _ph[_ph.index("export const PHONE_T"):]
PHONE_T = {k: int(re.search(rf"\b{k}:\s*(\d+)", _pt).group(1)) for k in ("typingIn", "message", "send", "thought")}
FILM_FRAMES = DURATION + sum(e for _, _, e in STRETCH) + END_HOLD

def film_frame(story: float) -> float:
    film = 0.0
    prev = 0
    for a, b, extra in STRETCH:
        if story < a:
            return film + (story - prev)
        film += a - prev
        if story < b:
            return film + (story - a) * (b - a + extra) / (b - a)
        film += b - a + extra
        prev = b
    return film + (story - prev)

def t(story: float) -> float:
    return film_frame(story) / FPS

CUES = {
    "typing": PHONE_T["typingIn"], "message": PHONE_T["message"],
    "reply_sent": PHONE_T["send"], "thought": PHONE_T["thought"],
    "shop": 132, "L2": 166, "enter1": 297, "chip": 404, "reply1": 444,
    "enter2": 636, "reply2": 672, "ouf": 780, "enter3": 890, "soldout": 926,
    "email_btn": 1036, "done": 1048, "samedi": 1100, "later": 1185,
    "mail_tile": 1191,  # la tuile commence à se voir (Life.tsx S09) "recap": 1300, "L8": 1312, "shrink": 1415,
    "cetait": 1435, "dot": 1443, "corner": 1461, "tagline": 1486,
}
TIMES = {k: t(v) for k, v in CUES.items()}
TOTAL = FILM_FRAMES / FPS

if __name__ == "__main__":
    print(f"film {FILM_FRAMES} frames = {TOTAL:.3f} s")
    for k, v in TIMES.items():
        print(f"{k:10s} {v:7.3f}")
