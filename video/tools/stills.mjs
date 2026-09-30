// Rend une liste d'images d'une composition avec UN seul bundle, puis une
// planche contact. Usage :
//   node tools/stills.mjs <compositionId> <outDir> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [
  id = "ShimmerPOV",
  outDir = "/tmp/stills",
  framesArg = "0",
  scaleArg = "0.5",
] = process.argv.slice(2);
const frames = framesArg
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));
const scale = Number(scaleArg);
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id,
  chromiumOptions: { gl: "angle" },
});
const files = [];
for (const frame of frames) {
  const output = path.join(outDir, `f${String(frame).padStart(4, "0")}.png`);
  await renderStill({
    serveUrl,
    composition,
    frame,
    output,
    scale,
    chromiumOptions: { gl: "angle" },
    logLevel: "error",
  });
  files.push(output);
  process.stdout.write(`${frame} `);
}
process.stdout.write("\n");
// Planche contact : 3 colonnes, numéro de frame incrusté.
if (files.length > 1) {
  const cols = 3;
  const args = [];
  files.forEach((f) => args.push("-i", f));
  const labeled = files
    .map(
      (f, i) =>
        `[${i}:v]drawtext=text='f${frames[i]}':x=12:y=12:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`,
    )
    .join(";");
  const rows = [];
  for (let r = 0; r < Math.ceil(files.length / cols); r++) {
    const idx = [];
    for (let c = 0; c < cols; c++) idx.push(r * cols + c);
    const present = idx.filter((i) => i < files.length);
    if (present.length < cols) {
      // Complète la dernière rangée avec des cases noires.
      for (let i = present.length; i < cols; i++) rows.push(null);
    }
    rows.push(present);
  }
  const realRows = rows.filter(Boolean);
  let fc = labeled + ";";
  const rowLabels = [];
  realRows.forEach((row, ri) => {
    const ins = row.map((i) => `[v${i}]`).join("");
    if (row.length === cols) fc += `${ins}hstack=${cols}[r${ri}];`;
    else
      fc += `${ins}${row.length > 1 ? `hstack=${row.length}` : "null"},pad=iw*${cols}/${row.length}:ih:0:0:black[r${ri}];`;
    rowLabels.push(`[r${ri}]`);
  });
  fc +=
    realRows.length > 1
      ? `${rowLabels.join("")}vstack=${realRows.length}[out]`
      : `${rowLabels[0]}null[out]`;
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    ...args,
    "-filter_complex",
    fc,
    "-map",
    "[out]",
    path.join(outDir, "sheet.jpg"),
  ]);
  console.log(path.join(outDir, "sheet.jpg"));
}
