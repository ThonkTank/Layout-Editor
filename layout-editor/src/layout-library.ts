// src/plugins/layout-editor/layout-library.ts
import type { App, TFile, TFolder } from "obsidian";
import { LayoutBlueprint, LayoutElement, SavedLayout } from "./types";

export const LAYOUT_SCHEMA_VERSION = 1;
export const MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION = 0;

export interface VersionedSavedLayout extends SavedLayout {
    schemaVersion: number;
}

type LayoutSchemaMigration = (layout: VersionedSavedLayout) => VersionedSavedLayout;

const LAYOUT_SCHEMA_MIGRATIONS = new Map<number, LayoutSchemaMigration>([
    [
        0,
        layout => ({
            ...layout,
            schemaVersion: 1,
            elements: layout.elements.map(element => ({
                ...element,
                attributes: Array.isArray(element.attributes) ? element.attributes : [],
            })),
        }),
    ],
]);

const LAYOUT_FOLDER = "LayoutEditor/Layouts";
const LEGACY_LAYOUT_FOLDERS = ["Layout Editor/Layouts"] as const;
const LAYOUT_FOLDER_CANDIDATES = [LAYOUT_FOLDER, ...LEGACY_LAYOUT_FOLDERS];

const FORBIDDEN_ID_CHARS = /[\\/]/;

type FileStatLike = { ctime?: number; mtime?: number };

function isFile(value: unknown): value is TFile & { extension: string; basename: string; stat: FileStatLike; path: string } {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<TFile> & { extension?: unknown; basename?: unknown; stat?: unknown; path?: unknown };
    return (
        typeof candidate.extension === "string" &&
        typeof candidate.basename === "string" &&
        typeof candidate.path === "string" &&
        !!candidate.stat &&
        typeof (candidate.stat as FileStatLike).ctime !== "undefined" &&
        typeof (candidate.stat as FileStatLike).mtime !== "undefined"
    );
}

function isFolder(value: unknown): value is TFolder & { children: unknown[]; path: string } {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<TFolder> & { children?: unknown; path?: unknown };
    return Array.isArray(candidate.children) && typeof candidate.path === "string";
}

function normalizePath(input: string): string {
    if (!input) {
        return "";
    }
    const replaced = input.replace(/\\+/g, "/");
    const compacted = replaced.replace(/\/+/g, "/");
    return compacted.replace(/^\/+/, "");
}

function normalizeSchemaVersion(value: unknown): number {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
        return value;
    }
    return 0;
}

export function runLayoutSchemaMigrations(
    layout: VersionedSavedLayout,
    warn: (message: string) => void = message => console.warn(message),
): VersionedSavedLayout | null {
    let currentVersion = normalizeSchemaVersion(layout.schemaVersion);
    let migrated: VersionedSavedLayout = { ...layout, schemaVersion: currentVersion };

    if (currentVersion > LAYOUT_SCHEMA_VERSION) {
        warn(
            `Layout '${layout.id}' verwendet Schema-Version ${currentVersion}, unterstützt wird maximal ${LAYOUT_SCHEMA_VERSION}.`,
        );
        return null;
    }

    while (currentVersion < LAYOUT_SCHEMA_VERSION) {
        const migration = LAYOUT_SCHEMA_MIGRATIONS.get(currentVersion);
        if (!migration) {
            warn(
                `Es fehlt eine Migration von Schema v${currentVersion} auf v${currentVersion + 1} für Layout '${layout.id}'.`,
            );
            return null;
        }
        const next = migration(migrated);
        const nextVersion = normalizeSchemaVersion(next.schemaVersion);
        if (nextVersion <= currentVersion) {
            warn(
                `Migration von Schema v${currentVersion} lieferte keine höhere Version für Layout '${layout.id}'. Vorgang abgebrochen.`,
            );
            return null;
        }
        warn(`Layout '${layout.id}' wurde von Schema v${currentVersion} auf v${nextVersion} migriert.`);
        migrated = { ...next, schemaVersion: nextVersion };
        currentVersion = nextVersion;
    }

    if (currentVersion < MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION) {
        warn(
            `Layout '${layout.id}' nutzt eine nicht unterstützte Schema-Version ${currentVersion}. Erwartet wird mindestens ${MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION}.`,
        );
        return null;
    }

    return migrated;
}

async function ensureFolderPath(app: App, folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    const segments = normalized.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments) {
        current = current ? `${current}/${segment}` : segment;
        const path = normalizePath(current);
        const existing = app.vault.getAbstractFileByPath(path);
        if (existing) continue;
        await app.vault.createFolder(path).catch(() => {});
    }
}

async function ensureLayoutFolder(app: App): Promise<void> {
    await ensureFolderPath(app, LAYOUT_FOLDER);
}

function findLayoutFile(app: App, fileName: string): TFile | null {
    for (const folder of LAYOUT_FOLDER_CANDIDATES) {
        const path = normalizePath(`${folder}/${fileName}`);
        const file = app.vault.getAbstractFileByPath(path);
        if (isFile(file)) {
            return file;
        }
    }
    return null;
}

function collectLayoutFiles(app: App): TFile[] {
    const seen = new Set<string>();
    const files: TFile[] = [];
    for (const folder of LAYOUT_FOLDER_CANDIDATES) {
        const abstract = app.vault.getAbstractFileByPath(normalizePath(folder));
        if (!isFolder(abstract)) continue;
        for (const child of abstract.children) {
            if (!isFile(child) || child.extension !== "json") continue;
            if (seen.has(child.basename)) continue;
            seen.add(child.basename);
            files.push(child);
        }
    }
    return files;
}

function createFileName(id: string): string {
    return `${id}.json`;
}

function sanitizeName(name: string): string {
    return name.trim() || "Unbenanntes Layout";
}

function createId(): string {
    const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (globalCrypto?.randomUUID) {
        return globalCrypto.randomUUID();
    }
    return `layout-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function resolveLayoutId(candidate?: string): string {
    if (!candidate) {
        return createId();
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
        return createId();
    }
    if (FORBIDDEN_ID_CHARS.test(trimmed)) {
        throw new Error("Layout-ID darf keine Pfadtrenner enthalten.");
    }
    if (trimmed === "." || trimmed === "..") {
        throw new Error("Layout-ID ist ungültig.");
    }
    return trimmed;
}

export async function saveLayoutToLibrary(
    app: App,
    payload: LayoutBlueprint & { name: string; id?: string },
): Promise<VersionedSavedLayout> {
    const id = resolveLayoutId(payload.id);
    const fileName = createFileName(id);
    let existing = findLayoutFile(app, fileName);
    const targetPath = normalizePath(`${LAYOUT_FOLDER}/${fileName}`);
    if (!existing) {
        await ensureLayoutFolder(app);
    }
    const now = new Date().toISOString();
    const canvasWidth = ensureCanvasDimension(payload.canvasWidth, "Breite");
    const canvasHeight = ensureCanvasDimension(payload.canvasHeight, "Höhe");
    const elements = normalizeElementsStrict(payload.elements);
    const entry: VersionedSavedLayout = {
        id,
        name: sanitizeName(payload.name),
        canvasWidth,
        canvasHeight,
        elements,
        createdAt: isFile(existing) ? (await readLayoutMeta(app, existing))?.createdAt ?? now : now,
        updatedAt: now,
        schemaVersion: LAYOUT_SCHEMA_VERSION,
    };
    const body = JSON.stringify(entry, null, 2);
    if (isFile(existing)) {
        await app.vault.modify(existing, body);
    } else {
        await app.vault.create(targetPath, body);
        existing = findLayoutFile(app, fileName);
    }
    return entry;
}

function ensureCanvasDimension(value: number, label: "Breite" | "Höhe"): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Ungültige ${label} für das Layout.`);
    }
    return Math.round(value);
}

function parseDimension(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}

function normalizeStringArray(value: unknown): string[] | undefined {
    let source: unknown[];
    if (Array.isArray(value)) {
        source = value;
    } else if (value && typeof value === "object") {
        source = Object.values(value as Record<string, unknown>);
    } else {
        return undefined;
    }
    const filtered = source.filter((item): item is string => typeof item === "string");
    return filtered.length ? filtered : [];
}

function normalizeLayoutConfig(value: unknown): LayoutElement["layout"] | undefined {
    if (!value || typeof value !== "object") return undefined;
    const layout = value as Partial<LayoutElement["layout"]> & Record<string, unknown>;
    const gap = parseDimension(layout.gap) ?? 0;
    const padding = parseDimension(layout.padding) ?? 0;
    const align = normalizeAlign(layout.align);
    return { gap, padding, align };
}

function normalizeElements(value: unknown): LayoutElement[] | null {
    const source: unknown[] | null = Array.isArray(value)
        ? value
        : value && typeof value === "object"
          ? Object.values(value as Record<string, unknown>)
          : null;
    if (!source) return null;

    const elements: LayoutElement[] = [];
    for (const entry of source) {
        if (!entry || typeof entry !== "object") continue;
        const raw = entry as Record<string, unknown>;
        const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : null;
        const type = typeof raw.type === "string" && raw.type.trim() ? raw.type : null;
        const x = parseDimension(raw.x);
        const y = parseDimension(raw.y);
        const width = parseDimension(raw.width);
        const height = parseDimension(raw.height);
        const label = typeof raw.label === "string" ? raw.label : "";
        if (!id || !type || x === null || y === null || width === null || height === null) continue;
        const element: LayoutElement = {
            id,
            type,
            x,
            y,
            width,
            height,
            label,
            description: typeof raw.description === "string" ? raw.description : undefined,
            placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
            defaultValue: typeof raw.defaultValue === "string" ? raw.defaultValue : undefined,
            options: normalizeStringArray(raw.options),
            attributes: normalizeStringArray(raw.attributes) ?? [],
            parentId: typeof raw.parentId === "string" ? raw.parentId : undefined,
            layout: normalizeLayoutConfig(raw.layout),
            children: normalizeStringArray(raw.children),
        };
        elements.push(element);
    }
    return elements;
}

function normalizeElementsStrict(value: unknown): LayoutElement[] {
    const normalized = normalizeElements(value);
    if (!normalized) {
        throw new Error("Layout enthält keine gültigen Elemente.");
    }
    const expectedLength = Array.isArray(value)
        ? value.length
        : value && typeof value === "object"
          ? Object.keys(value as Record<string, unknown>).length
          : normalized.length;
    if (expectedLength !== normalized.length) {
        throw new Error("Mindestens ein Layout-Element enthält ungültige Werte und konnte nicht gespeichert werden.");
    }
    return normalized;
}

function normalizeAlign(value: unknown): LayoutElement["layout"]["align"] {
    if (typeof value !== "string") {
        return "stretch";
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "start" || normalized === "flex-start") return "start";
    if (normalized === "center") return "center";
    if (normalized === "end" || normalized === "flex-end") return "end";
    if (normalized === "stretch" || normalized === "space-between") return "stretch";
    return "stretch";
}

async function readLayoutMeta(app: App, file: TFile): Promise<VersionedSavedLayout | null> {
    try {
        const raw = await app.vault.read(file);
        const parsed = JSON.parse(raw) as Partial<VersionedSavedLayout> & Record<string, unknown>;
        if (!parsed || typeof parsed !== "object") return null;
        const canvasWidth = parseDimension(parsed.canvasWidth);
        const canvasHeight = parseDimension(parsed.canvasHeight);
        const elements = normalizeElements(parsed.elements);
        if (canvasWidth === null || canvasHeight === null || !elements) {
            return null;
        }
        const fallbackCreated = new Date(file.stat.ctime || Date.now()).toISOString();
        const fallbackUpdated = new Date(file.stat.mtime || Date.now()).toISOString();
        const fileId = file.basename;
        const resolvedName = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : fileId;
        const base: VersionedSavedLayout = {
            id: fileId,
            name: resolvedName,
            canvasWidth,
            canvasHeight,
            elements,
            createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : fallbackCreated,
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallbackUpdated,
            schemaVersion: normalizeSchemaVersion(parsed.schemaVersion),
        };
        const warn = (message: string) => console.warn(`[LayoutEditor] ${message} (${file.path})`);
        const migrated = runLayoutSchemaMigrations(base, warn);
        if (!migrated) {
            return null;
        }
        return migrated;
    } catch (error) {
        console.error("Failed to read layout file", error);
        return null;
    }
}

export async function listSavedLayouts(app: App): Promise<VersionedSavedLayout[]> {
    await ensureLayoutFolder(app);
    const files = collectLayoutFiles(app);
    const out: VersionedSavedLayout[] = [];
    for (const file of files) {
        const meta = await readLayoutMeta(app, file);
        if (meta) out.push(meta);
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
}

export async function loadSavedLayout(app: App, id: string): Promise<VersionedSavedLayout | null> {
    await ensureLayoutFolder(app);
    const fileName = createFileName(id);
    const file = findLayoutFile(app, fileName);
    if (!isFile(file)) return null;
    return await readLayoutMeta(app, file);
}
