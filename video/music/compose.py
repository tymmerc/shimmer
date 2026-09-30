"""Musique du film POV Shimmer, composée et synthétisée par code (libre de
droits). Tempo 112,3 BPM joué en demi-temps : la mesure 0 tombe sur
l'apparition de la boutique, la 17 sur « samedi, 20 h 15 », la 19 sur
« 8 jours plus tard », la 23 sur le point de « Shimmer. ». L'accord de tonique
(Fa) n'arrive qu'à la révélation ; la fin fait IV puis I.

Usage : python3 compose.py <sortie.wav>
"""
import sys
import wave

import numpy as np

import synth as S
from cues import TIMES, TOTAL

SR = S.SR
BPM = 112.3
BEAT = 60 / BPM
T0 = TIMES["shop"]
N = int((TOTAL + 0.5) * SR)


def at(bar: int, beat: float = 0.0) -> float:
    return T0 + (bar * 4 + beat) * BEAT


# Voicings (basse, voix). « b » et « lo » : Sib renversé pour lier les voix
# après C13 (mesures 4, 8, 12) et dans la cadence finale (mesure 24).
CH = {
    "Bbmaj9": (46, [62, 65, 69, 72]),
    "Bbmaj9b": (46, [60, 62, 65, 69]),
    "Bbmaj9lo": (46, [57, 60, 62, 65]),
    "Am9": (45, [60, 64, 67, 71]),
    "Gm9": (43, [58, 62, 65, 69]),
    "C13": (36, [58, 62, 64, 69]),
    "Bbm6": (46, [61, 65, 67, 70]),
    "C69": (36, [64, 67, 69, 74]),
    "Dm9": (38, [53, 57, 60, 64]),
    "C7sus": (36, [58, 60, 65, 67]),
    "C7b9": (36, [58, 61, 64, 67]),
    "Fmaj9": (41, [57, 60, 64, 67]),
}


class Mix:
    """Pistes du morceau. place() ajoute un son à un instant donné."""

    BUSES = ("ep", "lead", "pad", "bass", "kick", "snare", "hats", "fx", "bell")

    def __init__(self):
        self.bus = {k: np.zeros((N, 2)) for k in self.BUSES}
        self.kicks: list[float] = []

    def place(self, bus: str, sig: np.ndarray, t: float, gain: float = 1.0) -> None:
        i = int(round(t * SR))
        if i >= N:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        n = min(len(sig), N - i)
        part = sig[:n].copy()
        k = min(n, int(0.01 * SR))
        part[-k:] *= (np.cos(np.linspace(0, np.pi / 2, k)) ** 2)[:, None]
        self.bus[bus][i : i + n] += part * gain


# ── Écriture ────────────────────────────────────────────────────────────────
def strum(mx: Mix, chord: str, t: float, beats: float, vel: float, bright: float = 1.0, gain: float = 0.3) -> None:
    for j, m in enumerate(CH[chord][1]):
        pan = -0.35 + 0.7 * j / 3
        mx.place("ep", S.ep(m, beats * BEAT, vel, bright, pan), t + 0.011 * j, gain)


def pad_chord(mx: Mix, chord: str, t: float, dur: float, fc: float, vel: float, att: float = 0.35, rel: float = 0.5) -> None:
    for m in CH[chord][1]:
        mx.place("pad", S.pad(m, dur, fc=fc, att=att, rel=rel, vel=vel), t)


def approach_note(chord: str, nxt: str) -> int:
    """Note de passage vers la fondamentale suivante : chromatique si elle est
    à un ou deux demi-tons, sinon la note de l'accord en cours la plus proche."""
    root, tgt = CH[chord][0], CH[nxt][0]
    step = tgt - root
    if step == 0:
        return root + 7
    if abs(step) <= 2:
        return root + (1 if step > 0 else -1)
    pcs = {root % 12} | {m % 12 for m in CH[chord][1]}
    near = [n for n in range(tgt - 2, tgt + 3) if n != tgt and n % 12 in pcs]
    return min(near, key=lambda n: abs(n - tgt)) if near else tgt


def bass_line(mx: Mix, chord: str, nxt: str, bar: int, vel: float = 0.85) -> None:
    root = CH[chord][0]
    for beat, m, beats, v in ((0, root, 1.6, vel), (2.5, root, 0.6, vel * 0.7), (3.5, approach_note(chord, nxt), 0.45, vel * 0.6)):
        mx.place("bass", S.bass(m, beats * BEAT, v), at(bar, beat))


def kick(mx: Mix, t: float, vel: float = 1.0) -> None:
    mx.kicks.append(t)
    mx.place("kick", S.kick(vel), t)


SWING = 0.05  # une seule grille : doubles croches impaires retardées


def hats(mx: Mix, bar: int, vel: float = 1.0) -> None:
    for k in range(8):
        v = (0.5 if k % 2 == 0 else 0.3) * vel * (0.9 + 0.2 * S.RNG.random())
        mx.place("hats", S.hat(v, open_=(k == 7 and bar % 4 == 3)), at(bar, k * 0.5))


def shakers(mx: Mix, bar: int, vel: float = 1.0) -> None:
    for k in range(16):
        off = k * 0.25 + (SWING if k % 2 else 0)
        mx.place("hats", S.shaker(vel * (0.14 if k % 4 == 0 else 0.09)), at(bar, off))


def groove(mx: Mix, bar: int, hat_vel: float = 1.0, snare: bool = True, shaker: bool = False, down: float = 0.95) -> None:
    kick(mx, at(bar, 0), down)
    kick(mx, at(bar, 1.75 + SWING), 0.7)
    if bar % 2:
        kick(mx, at(bar, 2.5), 0.55)
    if snare:
        mx.place("snare", S.snare(0.7), at(bar, 2))
        if bar % 4 == 3:
            mx.place("snare", S.snare(0.22), at(bar, 3.75 + SWING))
    if hat_vel > 0:
        hats(mx, bar, hat_vel)
    if shaker:
        shakers(mx, bar)


def comp(mx: Mix, chord: str, bar: int, bright: float = 1.0, gain: float = 0.26) -> None:
    for beat, beats, vel in ((0, 1.4, 0.75), (1.5, 0.45, 0.45), (2.75, 1.0, 0.55)):
        strum(mx, chord, at(bar, beat), beats, vel, bright, gain)


def chime(mx: Mix, t: float, vel: float = 0.35, notes: tuple = (84, 89)) -> None:
    """Notification : une quarte montante de clochette (texto, puis e-mail)."""
    mx.place("bell", S.bell(notes[0], vel, -0.25), t)
    mx.place("bell", S.bell(notes[1], vel * 0.9, 0.25), t + 0.09)


def melody(mx: Mix, bar: int, notes, vel: float = 0.55) -> None:
    for beat, m, beats in notes:
        mx.place("lead", S.pluck(m, beats * BEAT, vel, 0.1), at(bar, beat))


# ── Le morceau ──────────────────────────────────────────────────────────────
def intro(mx: Mix) -> None:
    th = TIMES["thought"]
    pad_chord(mx, "Bbmaj9", 0.0, th - 0.35, fc=1300, vel=0.5, att=1.6, rel=0.3)
    strum(mx, "Bbmaj9", TIMES["message"], 4, 0.6, gain=0.36)
    chime(mx, TIMES["message"])
    mx.place("fx", S.send_whoop(0.14), TIMES["reply_sent"])
    strum(mx, "Bbm6", th, 3, 0.62, 0.8, 0.36)
    pad_chord(mx, "Bbm6", th - 0.1, T0 - th - 0.3, fc=1100, vel=0.46, att=0.5, rel=0.3)
    mx.place("fx", S.swell(0.6, 0.12), T0 - 0.6)


def verse(mx: Mix) -> None:
    loop = ["Bbmaj9", "Am9", "Gm9", "C13"]
    for bar in range(16):
        chord = loop[bar % 4]
        if chord == "Bbmaj9" and bar > 0:
            chord = "Bbmaj9b"
        nxt = loop[(bar + 1) % 4] if bar < 15 else "Gm9"
        if bar == 13:
            # « épuisé » : rappel du Sib mineur de « je n'y connais rien », sans batterie.
            comp(mx, "Bbm6", bar, 0.8, 0.24)
            pad_chord(mx, "Bbm6", at(bar), 4 * BEAT, fc=900, vel=0.24)
            mx.place("bass", S.bass(46, 3.5 * BEAT, 0.6), at(bar))
            hats(mx, bar, 0.45)
            continue
        comp(mx, chord, bar)
        pad_chord(mx, chord, at(bar), 4 * BEAT, fc=1500, vel=0.2)
        bass_line(mx, chord, nxt, bar)
        hat_vel = 0 if bar < 2 else (0.6 if bar < 4 else 1.0)
        groove(mx, bar, hat_vel=hat_vel, snare=bar >= 2, shaker=bar >= 8)
    mx.place("lead", S.pluck(81, 0.4, 0.35, 0.3), TIMES["ouf"])


def turnaround(mx: Mix) -> None:
    bar = 16
    strum(mx, "Gm9", at(bar, 0), 2, 0.7)
    strum(mx, "C13", at(bar, 2), 2, 0.65)
    pad_chord(mx, "Gm9", at(bar), 2 * BEAT, fc=1500, vel=0.2)
    pad_chord(mx, "C13", at(bar, 2), 2 * BEAT, fc=1700, vel=0.2)
    mx.place("bass", S.bass(43, 1.8 * BEAT, 0.8), at(bar, 0))
    mx.place("bass", S.bass(36, 1.8 * BEAT, 0.8), at(bar, 2))
    kick(mx, at(bar, 0), 0.8)
    hats(mx, bar, 0.8)
    for k, v in enumerate((0.18, 0.28, 0.4, 0.55)):
        mx.place("snare", S.snare(v), at(bar, 3 + k * 0.25))
    mx.place("fx", S.swell(0.7, 0.16), at(17) - 0.7)


def lift(mx: Mix) -> None:
    for bar, chord, nxt in ((17, "Bbmaj9", "C69"), (18, "C69", "Am9")):
        comp(mx, chord, bar, 1.15, 0.48)
        pad_chord(mx, chord, at(bar), 4 * BEAT, fc=2600, vel=0.42)
        bass_line(mx, chord, nxt, bar, 0.95)
        groove(mx, bar, shaker=True, down=1.0)
    mx.place("fx", S.wash(2.4, 0.16), at(17))
    melody(mx, 17, [(0, 77, 0.9), (1, 81, 0.5), (1.5, 84, 1.0), (2.75, 81, 0.5), (3.25, 79, 0.7)])
    melody(mx, 18, [(0, 76, 0.9), (1, 79, 0.5), (1.5, 81, 1.0), (2.75, 86, 1.2)])


def breakdown(mx: Mix) -> None:
    for bar, chord in ((19, "Am9"), (20, "Dm9")):
        strum(mx, chord, at(bar, 0), 3.5, 0.45, 0.5, 0.18)
        strum(mx, chord, at(bar, 2.5), 1.2, 0.28, 0.5, 0.18)
        pad_chord(mx, chord, at(bar), 4 * BEAT, fc=800, vel=0.2, att=0.6)
        mx.place("bass", S.bass(CH[chord][0], 3.6 * BEAT, 0.4), at(bar))
    # Rappel de la notification, sur deux notes de La mineur (Do6 commun).
    chime(mx, TIMES["mail_tile"], 0.3, (79, 84))


def build(mx: Mix) -> None:
    halves = {21: ("Gm9", "Gm9"), 22: ("C7sus", "C7b9")}
    for bar, (a, b) in halves.items():
        for half, chord in enumerate((a, b)):
            strum(mx, chord, at(bar, 2 * half), 1.8, 0.6 + 0.1 * half)
            pad_chord(mx, chord, at(bar, 2 * half), 2 * BEAT, fc=1000 if bar == 21 else 2400, vel=0.26)
            mx.place("bass", S.bass(CH[chord][0], 1.8 * BEAT, 0.8), at(bar, 2 * half))
        for q in range(4):
            kick(mx, at(bar, q), 0.5 + 0.1 * q + (0.15 if bar == 22 else 0))
        hats(mx, bar, 0.9)
    mx.place("snare", S.snare(0.6), at(21, 2))
    rolls = [2 + 0.5 * k for k in range(2)] + [3 + 0.25 * k for k in range(4)]
    for k, beat in enumerate(rolls):
        mx.place("snare", S.snare(0.2 + 0.08 * k), at(22, beat))
    mx.place("fx", S.riser(at(23) - at(21), 0.05), at(21))
    mx.place("fx", S.swell(0.8, 0.2), at(23) - 0.8)


def reveal(mx: Mix) -> None:
    t = at(23)
    kick(mx, t, 1.0)
    mx.place("fx", S.wash(3.0, 0.28), t)
    strum(mx, "Fmaj9", t, 3.5, 0.9, 1.1, 0.42)
    pad_chord(mx, "Fmaj9", t, 4 * BEAT, fc=2600, vel=0.42, att=0.25)
    mx.place("bass", S.bass(41, 3.5 * BEAT, 0.95), t)
    mx.place("bell", S.bell(89, 0.4, 0.0, 1.4, 0.45), TIMES["dot"])
    for beat, m in ((2, 81), (2.5, 84), (3, 88)):
        mx.place("lead", S.pluck(m, 0.4 * BEAT, 0.3, 0.2), at(23, beat))
    hats(mx, 23, 0.55)
    # Accroche : IV (Sib renversé, voix liées) puis I, et la fin tient.
    strum(mx, "Bbmaj9lo", at(24), 3.5, 0.66, 0.9, 0.36)
    pad_chord(mx, "Bbmaj9lo", at(24), 4 * BEAT, fc=2200, vel=0.36, att=0.25)
    mx.place("bass", S.bass(46, 3.5 * BEAT, 0.7), at(24))
    kick(mx, at(24), 0.6)
    hats(mx, 24, 0.4)
    melody(mx, 24, [(0.5, 86, 0.5), (1, 84, 1.0), (2, 81, 1.8)], 0.45)
    end = TOTAL - at(25)
    strum(mx, "Fmaj9", at(25), end / BEAT, 0.7, 0.8)
    pad_chord(mx, "Fmaj9", at(25), end, fc=1800, vel=0.3, att=0.4)
    mx.place("bass", S.bass(41, end, 0.6), at(25))
    mx.place("lead", S.pluck(84, 1.5, 0.2, -0.2), at(25, 0.5))


# ── Mixage et mastering ─────────────────────────────────────────────────────
GAIN = {"ep": 0.9, "lead": 0.5, "pad": 0.26, "bass": 0.5, "kick": 0.72, "snare": 0.72, "hats": 0.5, "fx": 0.8, "bell": 0.55}
SEND = {"ep": 0.22, "lead": 0.3, "pad": 0.3, "bell": 0.25, "snare": 0.2, "hats": 0.08, "fx": 0.15}
DUCK = {"pad": 0.15, "bass": 0.28, "ep": 0.12}
SECTIONS = [
    ("intro", 0.0, T0), ("couplet", at(0), at(13)), ("épuisé", at(13), at(14)),
    ("couplet fin", at(14), at(17)), ("samedi", at(17), at(19)), ("8 jours", at(19), at(21)),
    ("montée", at(21), at(23)), ("révélation", at(23), at(25)), ("fin", at(25), TOTAL - 1.3),
]


def duck_curve(kicks: list[float]) -> np.ndarray:
    t = np.arange(N) / SR
    env = np.zeros(N)
    for tk in kicks:
        i = int(tk * SR)
        n = min(int(0.5 * SR), N - i)
        if n > 0:
            env[i : i + n] = np.maximum(env[i : i + n], np.exp(-t[:n] / 0.11))
    return env


def glue(x: np.ndarray, thresh_db: float, ratio: float) -> np.ndarray:
    """Compresseur de bus sur la crête (attaque 10 ms, relâchement 180 ms)."""
    lvl = np.max(np.abs(x), axis=1)
    a_att, a_rel = np.exp(-1 / (0.010 * SR)), np.exp(-1 / (0.180 * SR))
    env = np.empty(N)
    e = 0.0
    for i in range(N):
        v = lvl[i]
        e = a_att * e + (1 - a_att) * v if v > e else a_rel * e + (1 - a_rel) * v
        env[i] = e
    db = 20 * np.log10(env + 1e-9)
    over = np.maximum(db - thresh_db, 0)
    gain = 10 ** (-over * (1 - 1 / ratio) / 20)
    return x * gain[:, None]


def _hp(x: np.ndarray, fc: float) -> np.ndarray:
    return np.stack([S.fft_filter(x[:, c], S.highpass_gain(fc)) for c in range(2)], axis=1)


def master(mx: Mix) -> np.ndarray:
    duck = duck_curve(mx.kicks)
    bus = {k: v * GAIN[k] for k, v in mx.bus.items()}
    bus["pad"] = _hp(bus["pad"], 200)
    for k, d in DUCK.items():
        bus[k] = bus[k] * (1 - d * duck)[:, None]
    send = _hp(sum(bus[k] * s for k, s in SEND.items()), 300)
    wet = S.convolve(send, S.reverb_ir()) * 0.4
    mixd = _hp(sum(bus.values()) + wet, 32)
    # Niveau calibré avant la compression et la saturation (rendu reproductible).
    mixd = mixd * (0.5 / np.max(np.abs(mixd)))
    mixd = glue(mixd, thresh_db=-10, ratio=1.5)
    t = np.arange(N) / SR
    fade = np.clip((TOTAL - t) / 1.3, 0, 1) ** 1.5
    mixd = mixd * fade[:, None]
    mixd = mixd * (0.7 / np.max(np.abs(mixd)))
    mixd = np.tanh(mixd * 1.2) / 1.2
    return mixd / (np.max(np.abs(mixd)) + 1e-9) * 0.89


def section_levels(x: np.ndarray) -> dict:
    return {
        name: round(20 * np.log10(np.sqrt(np.mean(x[int(a * SR) : int(b * SR)] ** 2)) + 1e-12), 1)
        for name, a, b in SECTIONS
    }


def write_wav(path: str, x: np.ndarray) -> None:
    dither = (S.RNG.random(x.shape) - S.RNG.random(x.shape)) / 32768
    pcm = np.clip((x + dither) * 32767, -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def build_mix() -> Mix:
    mx = Mix()
    for section in (intro, verse, turnaround, lift, breakdown, build, reveal):
        section(mx)
    return mx


def main(out: str) -> None:
    out_mix = master(build_mix())
    print("Niveau par section (dB RMS) :", section_levels(out_mix))
    write_wav(out, out_mix)
    print(f"OK {out} ({TOTAL:.3f} s)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
