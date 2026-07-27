// Copies maplibre-gl's module worker script into public/ so it's served as
// a plain static file with a stable URL. maplibre-gl normally resolves this
// worker via `new URL('./maplibre-gl-worker.mjs', import.meta.url)`, which
// Turbopack's production build does not reliably bundle — the request 404s
// and the browser gets an HTML error page back instead of JS ("Failed to
// load module script"). Pointing maplibregl.setWorkerUrl() at this static
// copy sidesteps that bundler-specific resolution entirely.
import { copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(rootDir, "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
const destDir = join(rootDir, "public");
const dest = join(destDir, "maplibre-gl-worker.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copied maplibre-gl worker script to ${dest}`);
