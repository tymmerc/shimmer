"""Instruments synthétisés (numpy seul, 48 kHz). Chaque fonction rend une note
ou un coup en stéréo (tableau n x 2) ; le mixage les pose dans le morceau."""
import numpy as np

SR = 48000
RNG = np.random.default_rng(42)


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def _t(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def _pan(mono: np.ndarray, pan: float) -> np.ndarray:
    """pan -1 (gauche) .. 1 (droite), loi à puissance constante."""
    a = (pan + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def _delay(x: np.ndarray, d: int) -> np.ndarray:
    """Retard sans bouclage (np.roll renverrait la fin, la plus forte, au début)."""
    return np.concatenate([np.zeros(d), x[:-d]])


def _release(env: np.ndarray, t: np.ndarray, off: float, rel: float) -> np.ndarray:
    tail = np.where(t > off, np.exp(-(t - off) / rel), 1.0)
    return env * tail


def _fade_end(x: np.ndarray, ms: float = 15) -> np.ndarray:
    k = min(len(x), int(ms / 1000 * SR))
    out = x.copy()
    out[-k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return out


def fft_filter(x: np.ndarray, gain_of_hz) -> np.ndarray:
    """Filtre statique dans le domaine fréquentiel (x mono)."""
    X = np.fft.rfft(x)
    hz = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * gain_of_hz(hz), n=len(x))


def lowpass_gain(fc: float, order: int = 2):
    return lambda hz: 1 / np.sqrt(1 + (hz / fc) ** (2 * order))


def highpass_gain(fc: float, order: int = 2):
    return lambda hz: 1 / np.sqrt(1 + (fc / np.maximum(hz, 1e-3)) ** (2 * order))


# ── Piano électrique (FM, rapport 1:1 + « tine ») ───────────────────────────
def ep(m: float, dur: float, vel: float = 0.8, bright: float = 1.0, pan: float = 0.0) -> np.ndarray:
    f = midi_hz(m)
    tau = 1.5 * (261.6 / f) ** 0.35
    t = _t(dur + 1.6)
    env = np.minimum(t / 0.004, 1.0) * np.exp(-t / tau)
    env = _release(env, t, dur, 0.14)
    idx = bright * vel * (1.5 * np.exp(-t / 0.22) + 0.22)
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine_f = min(f * 14.0, 15000)
    tine = 0.16 * vel * bright * np.exp(-t / 0.035) * np.sin(2 * np.pi * tine_f * t)
    mono = env * (car + tine) * vel
    trem = 0.12 * np.sin(2 * np.pi * 4.6 * t)
    st = _pan(mono, pan)
    st[:, 0] *= 1 + trem
    st[:, 1] *= 1 - trem
    return st


def pluck(m: float, dur: float, vel: float = 0.6, pan: float = 0.0) -> np.ndarray:
    """Timbre de mélodie : FM harmonique (rapport 2), attaque nette, sans cloche."""
    f = midi_hz(m)
    t = _t(dur + 0.9)
    env = np.minimum(t / 0.003, 1.0) * np.exp(-t / 0.45)
    env = _release(env, t, dur, 0.1)
    idx = 1.1 * np.exp(-t / 0.08) + 0.15
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 2 * f * t))
    return _pan(x * env * vel, pan)


# ── Nappe : dents de scie additives, trois voix désaccordées ────────────────
def pad(m: float, dur: float, fc: float = 1800, att: float = 0.9, rel: float = 0.5, vel: float = 0.5) -> np.ndarray:
    f0 = midi_hz(m)
    t = _t(dur + rel * 6)
    env = np.minimum(t / att, 1.0)
    env = _release(env, t, dur, rel)
    out = np.zeros((len(t), 2))
    for cents, pan in ((-9, -0.6), (0, 0.0), (8, 0.6)):
        f = f0 * 2 ** (cents / 1200)
        voice = np.zeros(len(t))
        k = 1
        while k * f < min(fc * 4, 12000):
            g = (1 / k) / np.sqrt(1 + (k * f / fc) ** 4)
            voice += g * np.sin(2 * np.pi * k * f * t + RNG.uniform(0, 2 * np.pi))
            k += 1
        out += _pan(voice, pan)
    return out * env[:, None] * vel * 0.33


# ── Basse ronde, avec une couche de présence pour les petits haut-parleurs ──
def bass(m: float, dur: float, vel: float = 0.9) -> np.ndarray:
    f = midi_hz(m)
    t = _t(dur + 0.25)
    env = np.minimum(t / 0.006, 1.0) * (0.62 + 0.38 * np.exp(-t / 0.25))
    env = _release(env, t, dur, 0.07)
    x = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(4 * np.pi * f * t) + 0.06 * np.sin(6 * np.pi * f * t)
    x = np.tanh(1.4 * x) / np.tanh(1.4)
    # Présence : octave saturée, gardée entre 250 et 900 Hz, 12 dB sous la basse.
    octave = np.tanh(3 * np.sin(4 * np.pi * f * t))
    octave = fft_filter(octave, lambda hz: highpass_gain(250)(hz) * lowpass_gain(900)(hz))
    x = x + 0.25 * octave
    return _pan(_fade_end(x * env * vel), 0.0)


# ── Batterie douce ──────────────────────────────────────────────────────────
_NOISE = RNG.standard_normal(SR * 4)
_SNARE_N = fft_filter(_NOISE, lambda hz: highpass_gain(900)(hz) * lowpass_gain(6500)(hz))
_HAT_N = fft_filter(_NOISE, lambda hz: highpass_gain(7000, 3)(hz) * lowpass_gain(14000)(hz))
_SHAKER_N = fft_filter(_NOISE, lambda hz: highpass_gain(4200)(hz) * lowpass_gain(9500)(hz))
_WASH_N = fft_filter(_NOISE, highpass_gain(3000))
_CLICK_N = fft_filter(_NOISE, lambda hz: highpass_gain(1500)(hz) * lowpass_gain(7000)(hz))


def _norm(x: np.ndarray) -> np.ndarray:
    return x / (np.max(np.abs(x)) + 1e-9)


_SNARE_N, _HAT_N, _SHAKER_N, _WASH_N, _CLICK_N = map(_norm, (_SNARE_N, _HAT_N, _SHAKER_N, _WASH_N, _CLICK_N))


def kick(vel: float = 1.0) -> np.ndarray:
    # 1,2 s : l'enveloppe est retombée à 2 % (avant, coupure à 0,55 s = clic).
    t = _t(1.2)
    freq = 46 + 74 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t / 0.3)
    click = _CLICK_N[: len(t)] * np.exp(-t / 0.006) * 0.35
    knock = 0.25 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.025)
    x = np.tanh(1.6 * (body + click + knock))
    return _pan(_fade_end(x) * vel, 0.0)


def snare(vel: float = 1.0) -> np.ndarray:
    t = _t(0.6)
    noise = _SNARE_N[: len(t)] * np.exp(-t / 0.11)
    tone = 0.45 * np.sin(2 * np.pi * 186 * t) * np.exp(-t / 0.05)
    return _pan(_fade_end(noise * 0.8 + tone) * vel, 0.05)


def hat(vel: float = 1.0, open_: bool = False) -> np.ndarray:
    t = _t(0.5 if open_ else 0.15)
    x = _HAT_N[1000 : 1000 + len(t)] * np.exp(-t / (0.14 if open_ else 0.022))
    return _pan(_fade_end(x) * vel, 0.3)


def shaker(vel: float = 1.0) -> np.ndarray:
    t = _t(0.15)
    env = np.minimum(t / 0.012, 1.0) * np.exp(-t / 0.035)
    return _pan(_fade_end(_SHAKER_N[5000 : 5000 + len(t)] * env) * vel, -0.35)


def swell(dur: float, vel: float = 1.0) -> np.ndarray:
    """Souffle inversé qui monte jusqu'au coup suivant."""
    t = _t(dur)
    env = (t / dur) ** 3
    x = _WASH_N[: len(t)] * env
    x = fft_filter(x, lowpass_gain(7000))
    return np.stack([x, _delay(x, 211)], axis=1) * vel


def wash(dur: float = 2.2, vel: float = 1.0) -> np.ndarray:
    """Cymbale douce après un coup."""
    t = _t(dur)
    env = np.minimum(t / 0.004, 1.0) * np.exp(-t / 0.6)
    x = _fade_end(_WASH_N[: len(t)] * env)
    return np.stack([x, _delay(x, 173)], axis=1) * vel


def riser(dur: float, vel: float = 1.0) -> np.ndarray:
    """Bruit filtré dont la coupure monte (passe-bas à un pôle variable)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = RNG.standard_normal(n)
    fc = 250 * (9000 / 250) ** (t / dur)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty(n)
    acc = 0.0
    for i in range(n):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    y *= (t / dur) ** 2
    return np.stack([y, _delay(y, 97)], axis=1) * vel


# ── Clochette (FM inharmonique) : réservée aux notifications ───────────────
def bell(m: float, vel: float = 0.8, pan: float = 0.0, dur: float = 0.8, tau: float = 0.25) -> np.ndarray:
    f = midi_hz(m)
    t = _t(dur)
    idx = 2.2 * np.exp(-t / 0.12) + 0.35
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t))
    x += 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.2)
    env = np.minimum(t / 0.002, 1.0) * np.exp(-t / tau)
    return _pan(_fade_end(x * env) * vel, pan)


def send_whoop(vel: float = 1.0) -> np.ndarray:
    """Envoi du message : glissando Fa5 vers Fa6, dans la tonalité."""
    t = _t(0.16)
    freq = 698.5 * 2 ** np.minimum(t / 0.09, 1.0)
    x = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    env = np.minimum(t / 0.008, 1.0) * np.exp(-t / 0.045)
    return _pan(_fade_end(x * env) * vel, 0.1)


# ── Réverbération (convolution par une réponse synthétique) ─────────────────
def reverb_ir(seconds: float = 2.4, predelay: float = 0.018) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    chans = []
    for seed in (7, 11):
        rng = np.random.default_rng(seed)
        bright = rng.standard_normal(n) * np.exp(-t / 0.22)
        dark = fft_filter(rng.standard_normal(n), lowpass_gain(2200)) * np.exp(-t / 0.35)
        ir = 0.45 * bright + dark
        ir = np.concatenate([np.zeros(int(predelay * SR)), ir])[:n]
        chans.append(ir / np.sqrt(np.sum(ir**2)))
    return np.stack(chans, axis=1)


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    out = np.zeros((len(x), 2))
    for c in range(2):
        y = np.fft.irfft(np.fft.rfft(x[:, c], size) * np.fft.rfft(ir[:, c], size), size)
        out[:, c] = y[: len(x)]
    return out
