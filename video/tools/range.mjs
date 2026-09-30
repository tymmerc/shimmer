import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [a, b, conc, out] = process.argv.slice(2);
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "ShimmerPOV", chromiumOptions });
await renderMedia({ serveUrl, composition, codec: "h264", crf: 18, pixelFormat: "yuv420p", frameRange: [Number(a), Number(b)], outputLocation: out, concurrency: Number(conc), chromiumOptions, imageFormat: "jpeg", jpegQuality: 92, logLevel: "error", timeoutInMilliseconds: 180000 });
console.log("ok", out);
