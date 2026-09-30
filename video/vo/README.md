# Voix off du film POV

La version voix off remplace la bande de sous-titres (composition
`ShimmerPOV-VO`, rendue dans `out/shimmer-pov-vo-silent.mp4`). La version
sous-titrée reste la version de référence pour les réseaux, où les vidéos se
lancent sans le son.

## Enregistrer (Tym)

1. Ouvre `out/vo/guide.mp4` (aussi sur https://dev.tymmerc.eu/shimmer/film/guide.mp4)
   sur l'ordinateur, **avec des écouteurs** : le micro ne doit entendre que ta voix.
2. Lance l'enregistrement sur le téléphone (Dictaphone, Mémos vocaux), posé à
   20-30 cm de la bouche, un peu de côté. Pièce calme, avec des tissus si possible
   (une pièce vide résonne).
3. Lance la vidéo guide. Chaque réplique s'affiche en gris 2,5 s avant son tour,
   trois bips et un compte à rebours 3, 2, 1, puis elle passe en **vert** :
   c'est à toi. Dis-la pendant qu'elle est verte.
4. Laisse au moins une seconde de silence entre deux répliques (le guide les
   espace déjà). Une réplique ratée : redis-la tout de suite après, une seule fois,
   et dis-le-moi, ou refais toute la prise.
5. Dépose le fichier tel quel (m4a, wav, mp3) dans `/opt/shimmer/video/vo/in/`
   (glisser dans l'explorateur de VS Code).

Variante : un fichier par réplique, nommés dans l'ordre (`01.m4a`, `02.m4a`...),
dans un dossier `vo/in/lignes/`.

## Monter (automatique)

```bash
cd /opt/shimmer/video
heavy python3 vo/process.py vo/in/<ta-prise>.m4a
```

La chaîne : débruitage, coupure des graves, dé-essage, compression légère,
découpe des répliques sur les silences (une pause au milieu d'une phrase est
recollée), calage de chaque réplique au début de sa fenêtre (`lines.json`),
accélération de 10 % au plus si une réplique déborde, même niveau pour toutes,
musique baissée sous la voix, normalisation à -16 LUFS, assemblage sur l'image
sans sous-titres : `out/shimmer-pov-vo.mp4`.

- `lines.json` : les répliques, leurs fenêtres et la direction de jeu.
- `guide.py` : refait la vidéo guide (`heavy python3 vo/guide.py`).
- `selftest.py` : teste toute la chaîne avec une fausse prise.
