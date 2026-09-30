# Musique du film POV

Composée et synthétisée par code (numpy seul), donc libre de droits. Aucun
échantillon ni morceau externe.

- `cues.py` lit la table STRETCH de `src/pov2/timeline.ts` et donne l'instant
  film (en secondes) de chaque moment clé. Si le montage change, la musique
  suit toute seule au prochain rendu audio.
- `synth.py` : les instruments (piano électrique FM, nappe, basse, batterie
  douce, clochette, souffles, réverbération par convolution).
- `compose.py` : l'arrangement. 112,3 BPM joué en demi-temps. La mesure 0
  tombe sur l'apparition de la boutique, la 17 sur « samedi, 20 h 15 », la 19
  sur « 8 jours plus tard », la 23 sur le point de « Shimmer. ». L'accord de
  Fa (tonique) n'arrive qu'à la révélation, la fin fait IV puis I.
- `analyze.py` : crête et niveau moyen de chaque piste sur le groove.
- `envelope.py` : enveloppe du mix avec les repères du film et les mesures.
- `normalize.py` : normalisation à -16 LUFS en deux passages.

## Refaire la musique et la poser sur la vidéo

```bash
cd /opt/shimmer/video
heavy python3 music/compose.py out/music/raw.wav
python3 music/normalize.py out/music/raw.wav out/music/music.wav
bash tools/mux.sh out/<video-muette>.mp4 out/music/music.wav out/shimmer-pov.mp4
```

Le rendu de l'image reste `heavy node tools/render.mjs ShimmerPOV out/<nom>.mp4 300 1`
(un seul onglet, sinon images fantômes). Toujours via `heavy` : le VPS a gelé le 30/09
quand rendu, synthèse et navigateurs tournaient en même temps.
