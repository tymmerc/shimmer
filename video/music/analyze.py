"""Équilibre des pistes : crête et RMS sur la section groove (mesures 4 à 12)."""
import numpy as np
import compose as C

mx = C.build_mix()
a, b = int(C.at(4) * C.SR), int(C.at(12) * C.SR)
for k, v in mx.bus.items():
    x = v[a:b] * C.GAIN[k]
    pk = 20 * np.log10(np.max(np.abs(x)) + 1e-12)
    rms = 20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-12)
    print(f"{k:6s} crête {pk:6.1f} dB   rms {rms:6.1f} dB")
