"""Normalisation à -16 LUFS en deux passages (gain linéaire, dynamique gardée).
Usage : python3 normalize.py <entrée.wav> <sortie.wav>"""
import json
import re
import subprocess
import sys

src, dst = sys.argv[1], sys.argv[2]
TARGET = "I=-16:TP=-1.5:LRA=11"
probe = subprocess.run(
    ["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
    capture_output=True, text=True, check=True,
)
d = json.loads(re.search(r"\{[^{}]*\}", probe.stderr, re.S).group(0))
af = (
    f"loudnorm={TARGET}:measured_I={d['input_i']}:measured_TP={d['input_tp']}:"
    f"measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true"
)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-ar", "48000", dst], check=True)
print(f"OK {dst} (entrée {d['input_i']} LUFS, sortie -16 LUFS)")
