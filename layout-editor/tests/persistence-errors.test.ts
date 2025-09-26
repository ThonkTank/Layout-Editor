import assert from "node:assert/strict";
import { describeLayoutPersistenceError } from "../src/presenters/header-controls";
import {
    ensureSeedLayouts,
    setSeedLayoutDiagnosticsHook,
    type SeedLayoutDiagnosticsEvent,
} from "../src/seed-layouts";
import { resetDomainConfigurationForTesting } from "../src/config/domain-source";

interface MockFile {
    path: string;
    basename: string;
    extension: string;
    stat: { ctime: number; mtime: number };
    data: string;
}

interface MockFolder {
    path: string;
    children: Array<MockFolder | MockFile>;
}

class MockVault {
    private readonly files = new Map<string, MockFile>();
    private readonly folders = new Map<string, MockFolder>();

    constructor(initialFiles: Record<string, string> = {}) {
        for (const [path, data] of Object.entries(initialFiles)) {
            this.addFile(path, data);
        }
    }

    private normalize(path: string): string {
        return path.replace(/\\+/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");
    }

    private ensureFolder(path: string): MockFolder {
        const normalized = this.normalize(path);
        if (!normalized) {
            if (!this.folders.has("")) {
                this.folders.set("", { path: "", children: [] });
            }
            return this.folders.get("")!;
        }
        if (!this.folders.has(normalized)) {
            const folder: MockFolder = { path: normalized, children: [] };
            this.folders.set(normalized, folder);
            const parentPath = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
            const parent = this.ensureFolder(parentPath);
            if (!parent.children.includes(folder)) {
                parent.children.push(folder);
            }
        }
        return this.folders.get(normalized)!;
    }

    private addFile(path: string, data: string): MockFile {
        const normalized = this.normalize(path);
        const fileName = normalized.substring(normalized.lastIndexOf("/") + 1);
        const extIndex = fileName.lastIndexOf(".");
        const basename = extIndex >= 0 ? fileName.slice(0, extIndex) : fileName;
        const extension = extIndex >= 0 ? fileName.slice(extIndex + 1) : "";
        const folderPath = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
        const folder = this.ensureFolder(folderPath);
        const existingIndex = folder.children.findIndex(
            child => typeof child === "object" && "path" in child && (child as MockFile).path === normalized,
        );
        if (existingIndex >= 0) {
            folder.children.splice(existingIndex, 1);
        }
        const now = Date.now();
        const file: MockFile = {
            path: normalized,
            basename,
            extension,
            stat: { ctime: now, mtime: now },
            data,
        };
        this.files.set(normalized, file);
        folder.children.push(file);
        return file;
    }

    getAbstractFileByPath(path: string): MockFile | MockFolder | null {
        const normalized = this.normalize(path);
        return this.files.get(normalized) ?? this.folders.get(normalized) ?? null;
    }

    async createFolder(path: string): Promise<void> {
        this.ensureFolder(path);
    }

    async create(path: string, data: string): Promise<MockFile> {
        return this.addFile(path, data);
    }

    async read(file: MockFile): Promise<string> {
        return file.data;
    }

    async modify(file: MockFile, data: string): Promise<void> {
        file.data = data;
        file.stat.mtime = Date.now();
    }
}

function createMockApp(initialFiles: Record<string, string> = {}) {
    const vault = new MockVault(initialFiles);
    return { vault } as unknown;
}

function createLayoutFile(id: string): string {
    return JSON.stringify({
        id,
        name: `Seed ${id}`,
        canvasWidth: 960,
        canvasHeight: 960,
        elements: [
            {
                id: "element-1",
                type: "label",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                label: "Demo",
                attributes: [],
            },
        ],
        schemaVersion: 1,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
    });
}

async function run() {
    const errorWithCode = Object.assign(new Error("Layout-ID darf keine Pfadtrenner enthalten."), {
        code: "layout/id-invalid-characters",
    });
    const describedCode = describeLayoutPersistenceError(errorWithCode);
    assert.equal(describedCode.code, "layout/id-invalid-characters");
    assert.equal(describedCode.title, "Layout-ID enthält unerlaubte Zeichen");
    assert.ok(
        describedCode.details?.some(detail => detail.label === "Fehlercode" && detail.text === "layout/id-invalid-characters"),
        "should expose the error code in the detail list",
    );
    assert.ok(!describedCode.details?.some(detail => detail.label === "Empfehlung"), "should not add help if unavailable");

    const describedMessage = describeLayoutPersistenceError(new Error("Ungültige Breite für das Layout."));
    assert.equal(describedMessage.code, "layout/canvas-width-invalid");
    const recommendation = describedMessage.details?.find(detail => detail.label === "Empfehlung");
    assert.ok(recommendation, "should include recommendation for width issues");
    assert.match(recommendation!.text, /200–2000 px/);

    const describedUnknown = describeLayoutPersistenceError(new Error("mysterious failure"));
    assert.equal(describedUnknown.code, "layout/unknown");
    assert.equal(describedUnknown.noticeMessage, "Layout konnte nicht gespeichert werden");
    const rawMessage = describedUnknown.details?.find(detail => detail.label === "Rohmeldung");
    assert.ok(rawMessage, "should capture raw message for unknown errors");
    assert.equal(rawMessage!.text, "mysterious failure");

    await testSeedDiagnosticsForLegacyVault();
    await testSeedDiagnosticsForConflictingLayouts();

    console.log("persistence error mapping tests passed");
}

async function testSeedDiagnosticsForLegacyVault() {
    resetDomainConfigurationForTesting();
    const mockApp = createMockApp({
        "Layout Editor/Layouts/layout-editor-default.json": createLayoutFile("layout-editor-default"),
    });
    const events: SeedLayoutDiagnosticsEvent[] = [];
    setSeedLayoutDiagnosticsHook(event => {
        events.push(event);
    });
    try {
        await ensureSeedLayouts(mockApp as any);
    } finally {
        setSeedLayoutDiagnosticsHook(null);
    }

    const startEvent = events.find(event => event.type === "ensure-start");
    assert.ok(startEvent, "should emit ensure-start event");
    assert.equal(startEvent!.domainSource, "builtin");
    assert.ok(
        startEvent!.existingVaultFiles.some(
            file => file.basename === "layout-editor-default" && file.folder === "Layout Editor/Layouts",
        ),
        "ensure-start should list legacy vault file",
    );

    const skipEvent = events.find(
        event => event.type === "seed-skipped" && event.seedId === "layout-editor-default" && event.reason === "already-exists",
    );
    assert.ok(skipEvent, "should skip existing legacy seed");
}

async function testSeedDiagnosticsForConflictingLayouts() {
    resetDomainConfigurationForTesting();
    const mockApp = createMockApp({
        "LayoutEditor/Layouts/layout-editor-default.json": createLayoutFile("layout-editor-default"),
        "Layout Editor/Layouts/layout-editor-default.json": createLayoutFile("layout-editor-default"),
    });
    const events: SeedLayoutDiagnosticsEvent[] = [];
    setSeedLayoutDiagnosticsHook(event => {
        events.push(event);
    });
    try {
        await ensureSeedLayouts(mockApp as any);
    } finally {
        setSeedLayoutDiagnosticsHook(null);
    }

    const conflictEvent = events.find(
        event => event.type === "legacy-conflict" && event.seedId === "layout-editor-default",
    );
    assert.ok(conflictEvent, "should flag conflicts between layout folders");
    assert.equal(conflictEvent!.conflictingFiles.length, 2);
    assert.ok(
        conflictEvent!.conflictingFiles.some(file => file.folder === "LayoutEditor/Layouts"),
        "conflict should include modern layout folder entry",
    );
    assert.ok(
        conflictEvent!.conflictingFiles.some(file => file.folder === "Layout Editor/Layouts"),
        "conflict should include legacy layout folder entry",
    );

    const skipEvent = events.find(
        event => event.type === "seed-skipped" && event.seedId === "layout-editor-default",
    );
    assert.ok(skipEvent, "should still skip seeding when duplicates exist");
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
