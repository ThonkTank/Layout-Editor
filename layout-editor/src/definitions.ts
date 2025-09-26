// src/plugins/layout-editor/definitions.ts
import {
    LayoutContainerAlign,
    LayoutContainerConfig,
    LayoutContainerType,
    LayoutElementDefinition,
    LayoutElementType,
    type AttributeGroup,
} from "./types";
import { domainConfigurationService } from "./config/domain-source";

export const MIN_ELEMENT_SIZE = 60;

export const DEFAULT_ELEMENT_DEFINITIONS: LayoutElementDefinition[] = domainConfigurationService.getCurrent()
    .elementDefinitions;

type RegistryListener = (definitions: LayoutElementDefinition[]) => void;

class LayoutElementRegistry {
    private readonly definitions = new Map<LayoutElementType, LayoutElementDefinition>();
    private readonly listeners = new Set<RegistryListener>();

    constructor(initial: LayoutElementDefinition[]) {
        for (const def of initial) {
            this.definitions.set(def.type, { ...def });
        }
    }

    register(definition: LayoutElementDefinition) {
        this.definitions.set(definition.type, { ...definition });
        this.emit();
    }

    unregister(type: LayoutElementType) {
        if (this.definitions.delete(type)) {
            this.emit();
        }
    }

    replaceAll(definitions: LayoutElementDefinition[]) {
        this.definitions.clear();
        for (const def of definitions) {
            this.definitions.set(def.type, { ...def });
        }
        this.emit();
    }

    getAll(): LayoutElementDefinition[] {
        return Array.from(this.definitions.values());
    }

    get(type: LayoutElementType): LayoutElementDefinition | undefined {
        return this.definitions.get(type);
    }

    onChange(listener: RegistryListener): () => void {
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

const registry = new LayoutElementRegistry(DEFAULT_ELEMENT_DEFINITIONS);

function cloneAttributeGroups(groups: AttributeGroup[]): AttributeGroup[] {
    return groups.map(group => ({
        label: group.label,
        options: group.options.map(option => ({ ...option })),
    }));
}

function buildAttributeLookup(groups: AttributeGroup[]): Map<string, string> {
    return new Map(groups.flatMap(group => group.options.map(opt => [opt.value, opt.label] as const)));
}

function applyAttributeGroups(groups: AttributeGroup[]): void {
    ATTRIBUTE_GROUPS = cloneAttributeGroups(groups);
    ATTRIBUTE_LABEL_LOOKUP = buildAttributeLookup(ATTRIBUTE_GROUPS);
}

export let ATTRIBUTE_GROUPS: AttributeGroup[] = cloneAttributeGroups(
    domainConfigurationService.getCurrent().attributeGroups,
);

export let ATTRIBUTE_LABEL_LOOKUP = buildAttributeLookup(ATTRIBUTE_GROUPS);

domainConfigurationService.onChange(config => {
    registry.replaceAll(config.elementDefinitions);
    applyAttributeGroups(config.attributeGroups);
});

export function getElementDefinitions(): LayoutElementDefinition[] {
    return registry.getAll();
}

export function getElementDefinition(type: LayoutElementType): LayoutElementDefinition | undefined {
    return registry.get(type);
}

export function registerLayoutElementDefinition(definition: LayoutElementDefinition) {
    registry.register(definition);
}

export function unregisterLayoutElementDefinition(type: LayoutElementType) {
    registry.unregister(type);
}

export function resetLayoutElementDefinitions(definitions: LayoutElementDefinition[]) {
    registry.replaceAll(definitions);
}

export function onLayoutElementDefinitionsChanged(listener: RegistryListener): () => void {
    return registry.onChange(listener);
}


export function isVerticalContainer(type: LayoutContainerType): boolean {
    const definition = registry.get(type);
    if (definition?.layoutOrientation) {
        return definition.layoutOrientation !== "horizontal";
    }
    return type === "box-container" || type === "vbox-container";
}

export function getContainerAlignLabel(type: LayoutContainerType, align: LayoutContainerAlign): string {
    if (isVerticalContainer(type)) {
        switch (align) {
            case "start":
                return "Links ausgerichtet";
            case "center":
                return "Zentriert";
            case "end":
                return "Rechts ausgerichtet";
            case "stretch":
                return "Breite gestreckt";
        }
    } else {
        switch (align) {
            case "start":
                return "Oben ausgerichtet";
            case "center":
                return "Vertikal zentriert";
            case "end":
                return "Unten ausgerichtet";
            case "stretch":
                return "Höhe gestreckt";
        }
    }
    return "";
}

export function getAttributeSummary(attributes: string[]): string {
    if (!attributes.length) return "Attribute wählen…";
    return attributes.map(attr => ATTRIBUTE_LABEL_LOOKUP.get(attr) ?? attr).join(", ");
}

export function getElementTypeLabel(type: LayoutElementType): string {
    return registry.get(type)?.buttonLabel ?? type;
}

export function isContainerType(type: LayoutElementType): boolean {
    const definition = registry.get(type);
    if (definition) {
        return definition.category === "container";
    }
    return type === "box-container" || type === "vbox-container" || type === "hbox-container";
}

export function ensureContainerDefaults(config: LayoutElementDefinition): LayoutContainerConfig | undefined {
    return config.defaultLayout ? { ...config.defaultLayout } : undefined;
}
