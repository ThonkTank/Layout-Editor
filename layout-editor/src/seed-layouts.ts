import type { App } from "obsidian";
import {
    listLayoutVaultFiles,
    loadSavedLayout,
    saveLayoutToLibrary,
    type LayoutVaultFileInfo,
} from "./layout-library";
import {
    domainConfigurationService,
    DomainConfigurationError,
    type DomainSeedLayout,
} from "./config/domain-source";
import { getDomainConfigurationSource, type DomainConfigurationSource } from "./settings/domain-settings";

export type SeedLayoutDiagnosticsEvent =
    | {
          type: "ensure-start";
          domainSource: DomainConfigurationSource;
          seedIds: string[];
          existingVaultFiles: LayoutVaultFileInfo[];
      }
    | {
          type: "legacy-conflict";
          domainSource: DomainConfigurationSource;
          seedId: string;
          existingVaultFiles: LayoutVaultFileInfo[];
          conflictingFiles: LayoutVaultFileInfo[];
      }
    | {
          type: "seed-check";
          domainSource: DomainConfigurationSource;
          seedId: string;
          existingVaultFiles: LayoutVaultFileInfo[];
      }
    | {
          type: "seed-skipped";
          domainSource: DomainConfigurationSource;
          seedId: string;
          reason: "already-exists";
          existingVaultFiles: LayoutVaultFileInfo[];
      }
    | {
          type: "seed-created";
          domainSource: DomainConfigurationSource;
          seedId: string;
          existingVaultFiles: LayoutVaultFileInfo[];
      }
    | {
          type: "seed-error";
          domainSource: DomainConfigurationSource;
          seedId: string;
          stage: "check" | "save";
          existingVaultFiles: LayoutVaultFileInfo[];
          error: unknown;
      };

type SeedLayoutDiagnosticsHook = (event: SeedLayoutDiagnosticsEvent) => void;

const SEED_LOG_SCOPE = "[LayoutEditor][SeedLayouts]";

let diagnosticsHook: SeedLayoutDiagnosticsHook | null = null;

export function setSeedLayoutDiagnosticsHook(hook: SeedLayoutDiagnosticsHook | null): void {
    diagnosticsHook = hook;
}

function emitDiagnostics(event: SeedLayoutDiagnosticsEvent, level: "debug" | "warn" = "debug") {
    diagnosticsHook?.(event);
    const message = `${SEED_LOG_SCOPE} ${event.type}`;
    if (level === "warn") {
        console.warn(message, event);
    } else {
        console.debug(message, event);
    }
}

interface SeedLayoutEnsureContext {
    domainSource: DomainConfigurationSource;
    getExistingVaultFiles(): LayoutVaultFileInfo[];
    refreshExistingVaultFiles(): Promise<LayoutVaultFileInfo[]>;
}

async function ensureSeedLayout(app: App, layout: DomainSeedLayout, context: SeedLayoutEnsureContext): Promise<void> {
    const seedId = layout.id;
    emitDiagnostics({
        type: "seed-check",
        domainSource: context.domainSource,
        seedId,
        existingVaultFiles: context.getExistingVaultFiles(),
    });
    try {
        const existing = await loadSavedLayout(app, layout.id);
        if (existing) {
            emitDiagnostics(
                {
                    type: "seed-skipped",
                    domainSource: context.domainSource,
                    seedId,
                    reason: "already-exists",
                    existingVaultFiles: context.getExistingVaultFiles(),
                },
                "debug",
            );
            return;
        }
    } catch (error) {
        emitDiagnostics(
            {
                type: "seed-error",
                domainSource: context.domainSource,
                seedId,
                stage: "check",
                existingVaultFiles: context.getExistingVaultFiles(),
                error,
            },
            "warn",
        );
        console.warn(`Layout Editor: konnte Seed-Layout '${layout.id}' nicht prüfen`, error);
    }

    try {
        await saveLayoutToLibrary(app, {
            ...layout.blueprint,
            name: layout.name,
            id: layout.id,
        });
        const refreshed = await context.refreshExistingVaultFiles();
        emitDiagnostics({
            type: "seed-created",
            domainSource: context.domainSource,
            seedId,
            existingVaultFiles: refreshed,
        });
    } catch (error) {
        emitDiagnostics(
            {
                type: "seed-error",
                domainSource: context.domainSource,
                seedId,
                stage: "save",
                existingVaultFiles: context.getExistingVaultFiles(),
                error,
            },
            "warn",
        );
        console.error(`Layout Editor: Seed-Layout '${layout.id}' konnte nicht gespeichert werden`, error);
    }
}

// Serialise seed synchronisation runs so toggle storms do not launch overlapping writes.
let ensureQueue: Promise<void> = Promise.resolve();

export function ensureSeedLayouts(app: App): Promise<void> {
    const run = ensureQueue.then(() => performEnsureSeedLayouts(app));
    ensureQueue = run.catch(error => {
        ensureQueue = Promise.resolve();
        throw error;
    });
    return run;
}

async function performEnsureSeedLayouts(app: App): Promise<void> {
    let configuration = domainConfigurationService.getCurrent();
    try {
        configuration = await domainConfigurationService.ensure(app);
    } catch (error) {
        if (error instanceof DomainConfigurationError) {
            console.error(
                "Layout Editor: Domänenkonfiguration aus Vault konnte nicht geladen werden – verwende Defaults",
                error,
            );
        } else {
            console.error("Layout Editor: Unerwarteter Fehler beim Laden der Domänenkonfiguration", error);
        }
        domainConfigurationService.useDefaults();
        configuration = domainConfigurationService.getCurrent();
    }

    const domainSource = getDomainConfigurationSource();
    let existingVaultFiles = await listLayoutVaultFiles(app);
    emitDiagnostics({
        type: "ensure-start",
        domainSource,
        seedIds: configuration.seedLayouts.map(layout => layout.id),
        existingVaultFiles: existingVaultFiles.map(file => ({ ...file })),
    });

    const duplicates = new Map<string, LayoutVaultFileInfo[]>();
    for (const file of existingVaultFiles) {
        const list = duplicates.get(file.basename) ?? [];
        list.push(file);
        duplicates.set(file.basename, list);
    }
    for (const [basename, entries] of duplicates) {
        if (entries.length <= 1) {
            continue;
        }
        emitDiagnostics(
            {
                type: "legacy-conflict",
                domainSource,
                seedId: basename,
                existingVaultFiles: existingVaultFiles.map(file => ({ ...file })),
                conflictingFiles: entries.map(file => ({ ...file })),
            },
            "warn",
        );
    }

    const context: SeedLayoutEnsureContext = {
        domainSource,
        getExistingVaultFiles: () => existingVaultFiles.map(file => ({ ...file })),
        async refreshExistingVaultFiles() {
            existingVaultFiles = await listLayoutVaultFiles(app);
            return existingVaultFiles.map(file => ({ ...file }));
        },
    };

    for (const layout of configuration.seedLayouts) {
        await ensureSeedLayout(app, layout, context);
    }
}
