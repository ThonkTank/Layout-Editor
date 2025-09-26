import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = join(__dirname, "dist");

mkdirSync(outDir, { recursive: true });

const testEntries = readdirSync(__dirname)
    .filter(file => file.endsWith(".test.ts"))
    .sort();

for (const entryName of testEntries) {
    const entry = join(__dirname, entryName);
    const outFile = join(outDir, entryName.replace(/\.ts$/, ".mjs"));
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
}
