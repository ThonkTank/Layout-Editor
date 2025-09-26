import type { App } from "obsidian";
import { loadSavedLayout, saveLayoutToLibrary } from "./layout-library";
import {
    domainConfigurationService,
    DomainConfigurationError,
    type DomainSeedLayout,
} from "./config/domain-source";

async function ensureSeedLayout(app: App, layout: DomainSeedLayout): Promise<void> {
    try {
        const existing = await loadSavedLayout(app, layout.id);
        if (existing) {
            return;
        }
    } catch (error) {
        console.warn(`Layout Editor: konnte Seed-Layout '${layout.id}' nicht prüfen`, error);
    }

    try {
        await saveLayoutToLibrary(app, {
            ...layout.blueprint,
            name: layout.name,
            id: layout.id,
        });
    } catch (error) {
        console.error(`Layout Editor: Seed-Layout '${layout.id}' konnte nicht gespeichert werden`, error);
    }
}

export async function ensureSeedLayouts(app: App): Promise<void> {
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

    for (const layout of configuration.seedLayouts) {
        await ensureSeedLayout(app, layout);
    }
}
