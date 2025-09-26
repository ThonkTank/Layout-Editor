// plugins/layout-editor/src/view-registry.ts
// Verwaltet View-Bindings, sodass externe Plugins visualisierbare Features
// (z. B. Kartenrenderer) an den Layout Editor koppeln können. Komponenten wie
// der View Container greifen auf diese Registry zu, um im Inspector eine
// Auswahl anzubieten.

export interface LayoutViewBindingDefinition {
    id: string;
    label: string;
    description?: string;
    tags?: string[];
}

type Listener = (bindings: LayoutViewBindingDefinition[]) => void;

class LayoutViewBindingRegistry {
    private readonly bindings = new Map<string, LayoutViewBindingDefinition>();
    private readonly listeners = new Set<Listener>();

    register(def: LayoutViewBindingDefinition) {
        if (!def.id?.trim()) {
            throw new Error("View binding requires a non-empty id");
        }
        const id = def.id.trim();
        if (this.bindings.has(id)) {
            const existing = this.bindings.get(id);
            const existingLabel = existing?.label ? ` (currently registered as "${existing.label}")` : "";
            throw new Error(`Duplicate view binding id "${id}"${existingLabel}`);
        }
        this.bindings.set(id, { ...def, id });
        this.emit();
    }

    unregister(id: string) {
        if (this.bindings.delete(id)) {
            this.emit();
        }
    }

    replaceAll(definitions: LayoutViewBindingDefinition[]) {
        const prepared = new Map<string, LayoutViewBindingDefinition>();
        const duplicates = new Map<string, LayoutViewBindingDefinition[]>();

        for (const def of definitions) {
            if (!def.id?.trim()) {
                continue;
            }
            const id = def.id.trim();
            if (prepared.has(id)) {
                const list = duplicates.get(id) ?? [prepared.get(id)!];
                list.push(def);
                duplicates.set(id, list);
                continue;
            }
            prepared.set(id, { ...def, id });
        }

        if (duplicates.size > 0) {
            const details = Array.from(duplicates.entries())
                .map(([id, defs]) => {
                    const labels = defs
                        .map(def => def.label?.trim() || "(no label)")
                        .join(", ");
                    return `"${id}" [${labels}]`;
                })
                .join(", ");
            throw new Error(`Duplicate view binding ids detected: ${details}`);
        }

        this.bindings.clear();
        for (const [id, def] of prepared.entries()) {
            this.bindings.set(id, def);
        }
        this.emit();
    }

    getAll(): LayoutViewBindingDefinition[] {
        return Array.from(this.bindings.values());
    }

    get(id: string): LayoutViewBindingDefinition | undefined {
        return this.bindings.get(id);
    }

    has(id: string): boolean {
        const normalized = id.trim();
        if (!normalized) {
            return false;
        }
        return this.bindings.has(normalized);
    }

    getIds(): string[] {
        return Array.from(this.bindings.keys());
    }

    getByTag(tag: string): LayoutViewBindingDefinition[] {
        const normalized = tag.trim().toLowerCase();
        if (!normalized) {
            return [];
        }
        return this.getAll().filter(binding =>
            binding.tags?.some(t => t.toLowerCase() === normalized)
        );
    }

    onChange(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit() {
        const snapshot = this.getAll();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}

const registry = new LayoutViewBindingRegistry();

export function registerViewBinding(definition: LayoutViewBindingDefinition) {
    registry.register(definition);
}

export function unregisterViewBinding(id: string) {
    registry.unregister(id);
}

export function resetViewBindings(definitions: LayoutViewBindingDefinition[] = []) {
    registry.replaceAll(definitions);
}

export function getViewBindings(): LayoutViewBindingDefinition[] {
    return registry.getAll();
}

export function getViewBinding(id: string): LayoutViewBindingDefinition | undefined {
    return registry.get(id);
}

export function onViewBindingsChanged(listener: Listener): () => void {
    return registry.onChange(listener);
}

export function hasViewBinding(id: string): boolean {
    return registry.has(id);
}

export function getViewBindingIds(): string[] {
    return registry.getIds();
}

export function getViewBindingsByTag(tag: string): LayoutViewBindingDefinition[] {
    return registry.getByTag(tag);
}
