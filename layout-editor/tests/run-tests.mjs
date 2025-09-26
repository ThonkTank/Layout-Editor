import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const entry = join(__dirname, "layout-editor-store.test.ts");
const outDir = join(__dirname, "dist");
const outFile = join(outDir, "layout-editor-store.test.mjs");

mkdirSync(outDir, { recursive: true });

await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    sourcemap: false,
    outfile: outFile,
    logLevel: "error",
});

const result = spawnSync(process.execPath, [outFile], { stdio: "inherit" });
if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
