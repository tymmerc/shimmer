// Rendu par tranches (mémoire serrée sur le VPS) : un seul bundle, des tranches
// de N frames rendues à la suite (reprise : une tranche déjà présente est
// sautée), puis assemblage sans réencodage.
// Usage : node tools/render.mjs <compositionId> <sortie.mp4> [tranche=300] [concurrence=1]
// Concurrence 1 : à 2 onglets, le shader WebGL (ANGLE) mélange les images
// entre onglets et le logo apparaît en double une image sur deux.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [
  id = "ShimmerPOV",
  out = "out/shimmer-pov.mp4",
  chunkArg = "300",
  concArg = "1",
] = process.argv.slice(2);
const CHUNK = Number(chunkArg);
const CONC = Number(concArg);
const chromiumOptions = { gl: "angle" };
const dir = path.resolve(
  path.dirname(out),
  `chunks-${path.basename(out, ".mp4")}`,
);
mkdirSync(dir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
const total = composition.durationInFrames;
const parts = [];
for (let a = 0; a < total; a += CHUNK) {
  const b = Math.min(total - 1, a + CHUNK - 1);
  const file = path.join(dir, `c${String(a).padStart(5, "0")}.mp4`);
  parts.push(file);
  if (existsSync(file)) {
    console.log(`skip ${a}-${b}`);
    continue;
  }
  const t0 = Date.now();
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    crf: 18,
    pixelFormat: "yuv420p",
    frameRange: [a, b],
    outputLocation: file + ".part.mp4",
    concurrency: CONC,
    chromiumOptions,
    imageFormat: "jpeg",
    jpegQuality: 92,
    logLevel: "error",
    // Machine partagée et parfois en swap : une image peut mettre > 30 s.
    timeoutInMilliseconds: 180000,
  });
  execFileSync("mv", [file + ".part.mp4", file]);
  console.log(`done ${a}-${b} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const list = path.join(dir, "list.txt");
writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  list,
  "-c",
  "copy",
  "-movflags",
  "+faststart",
  path.resolve(out),
]);
console.log(`OK ${out} (${total} frames)`);
