import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const testsRoot = join(projectRoot, "tests");
const cacheDir = join(projectRoot, "node_modules", ".cache", "layout-editor-tests");

async function collectTests(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.name.startsWith(".")) {
            continue;
        }
        const absolutePath = join(dir, entry.name);
        if (entry.isDirectory()) {
            const nested = await collectTests(absolutePath);
            files.push(...nested);
            continue;
        }
        if (entry.isFile() && entry.name.endsWith(".test.ts")) {
            files.push(absolutePath);
        }
    }
    files.sort((a, b) => a.localeCompare(b));
    return files;
}

async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}

async function runTestFile(testFile, index, total) {
    const relativePath = relative(projectRoot, testFile);
    const outFile = join(cacheDir, relativePath).replace(extname(testFile), ".mjs");
    await ensureDir(dirname(outFile));

    console.log(`\n[${index}/${total}] Building ${relativePath}`);
    await build({
        entryPoints: [testFile],
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node18",
        sourcemap: "inline",
        outfile: outFile,
        logLevel: "silent",
    });

    console.log(`[${index}/${total}] Running ${relativePath}`);
    await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [outFile], { stdio: "inherit" });
        child.on("error", reject);
        child.on("exit", code => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`${relativePath} exited with status ${code ?? "unknown"}`));
        });
    });
}

async function main() {
    const testFiles = await collectTests(testsRoot);
    if (testFiles.length === 0) {
        console.log("No test files found. Add *.test.ts files under tests/ to enable coverage.");
        return;
    }

    console.log(`Discovered ${testFiles.length} test file${testFiles.length === 1 ? "" : "s"}.`);

    for (let index = 0; index < testFiles.length; index += 1) {
        const ordinal = index + 1;
        await runTestFile(testFiles[index], ordinal, testFiles.length);
    }

    console.log(`\nAll ${testFiles.length} test file${testFiles.length === 1 ? "" : "s"} passed.`);
}

main().catch(error => {
    console.error("\nTest runner failed:\n", error);
    process.exit(1);
});
