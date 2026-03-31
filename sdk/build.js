const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

// ── Widget builds (TypeScript, UI components) ────────────────────────────
const widgetShared = {
  entryPoints: [path.join(__dirname, 'src/shimmer.ts')],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2020'],
};

// ── SDK builds (JavaScript, API client only) ─────────────────────────────
const sdkShared = {
  entryPoints: [path.join(__dirname, 'src/shimmer.js')],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2017'],
};

async function build() {
  // Widget: IIFE build (for <script> tags) — exposes window.Shimmer
  await esbuild.build({
    ...widgetShared,
    outfile: 'dist/shimmer.js',
    format: 'iife',
    globalName: 'ShimmerSDK',
    footer: { js: 'if(typeof window!=="undefined"){window.Shimmer=ShimmerSDK.Shimmer;}' },
  });

  // Widget: ESM build (for import)
  await esbuild.build({
    ...widgetShared,
    outfile: 'dist/shimmer.esm.js',
    format: 'esm',
  });

  // SDK: Minified standalone (IIFE — exposes window.Shimmer)
  await esbuild.build({
    ...sdkShared,
    outfile: 'dist/shimmer-sdk.min.js',
    format: 'iife',
    globalName: 'ShimmerSDK',
    footer: { js: 'if(typeof window!=="undefined"){window.Shimmer=ShimmerSDK;}' },
  });

  // SDK: CommonJS build (for require())
  await esbuild.build({
    ...sdkShared,
    outfile: 'dist/shimmer-sdk.cjs.js',
    format: 'cjs',
  });

  // SDK: ESM build (for import)
  await esbuild.build({
    ...sdkShared,
    outfile: 'dist/shimmer-sdk.esm.js',
    format: 'esm',
  });

  console.log('Widget + SDK built successfully');
}

build().catch((e) => { console.error(e); process.exit(1); });
