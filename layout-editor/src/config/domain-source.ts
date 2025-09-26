import type { App } from "obsidian";
import { createDefaultElementDefinitions } from "../elements/registry";
import type {
    AttributeGroup,
    LayoutBlueprint,
    LayoutElement,
    LayoutElementDefinition,
} from "../types";
import {
    getDomainConfigurationSource,
    onDomainConfigurationSourceChange,
    type DomainConfigurationSource,
} from "../settings/domain-settings";

export interface DomainSeedLayout {
    id: string;
    name: string;
    blueprint: LayoutBlueprint;
}

export interface DomainConfiguration {
    attributeGroups: AttributeGroup[];
    elementDefinitions: LayoutElementDefinition[];
    seedLayouts: DomainSeedLayout[];
}

interface RawDomainConfiguration {
    attributeGroups?: unknown;
    elementDefinitions?: unknown;
    seedLayouts?: unknown;
}

class ValidationCollector {
    readonly errors: string[] = [];

    push(path: string, message: string) {
        this.errors.push(`${path}: ${message}`);
    }

    throwIfAny(message: string): void {
        if (this.errors.length) {
            throw new DomainConfigurationError(message, this.errors);
        }
    }
}

export class DomainConfigurationError extends Error {
    readonly details: string[];

    constructor(message: string, details: string[]) {
        super(`${message}. Details: ${details.join("; ")}`);
        this.name = "DomainConfigurationError";
        this.details = details;
    }
}

const CONFIG_PATH = "Layout Editor/domain-config.json";

const DEFAULT_ATTRIBUTE_GROUPS: AttributeGroup[] = [
    {
        label: "Allgemein",
        options: [
            { value: "name", label: "Name" },
            { value: "type", label: "Typ" },
            { value: "size", label: "Größe" },
            { value: "alignmentLawChaos", label: "Gesinnung (Gesetz/Chaos)" },
            { value: "alignmentGoodEvil", label: "Gesinnung (Gut/Böse)" },
            { value: "cr", label: "Herausforderungsgrad" },
            { value: "xp", label: "Erfahrungspunkte" },
        ],
    },
    {
        label: "Kampfwerte",
        options: [
            { value: "ac", label: "Rüstungsklasse" },
            { value: "initiative", label: "Initiative" },
            { value: "hp", label: "Trefferpunkte" },
            { value: "hitDice", label: "Trefferwürfel" },
            { value: "pb", label: "Proficiency Bonus" },
        ],
    },
    {
        label: "Bewegung",
        options: [
            { value: "speedWalk", label: "Geschwindigkeit (Laufen)" },
            { value: "speedFly", label: "Geschwindigkeit (Fliegen)" },
            { value: "speedSwim", label: "Geschwindigkeit (Schwimmen)" },
            { value: "speedBurrow", label: "Geschwindigkeit (Graben)" },
            { value: "speedList", label: "Geschwindigkeiten (Liste)" },
        ],
    },
    {
        label: "Attribute",
        options: [
            { value: "str", label: "Stärke" },
            { value: "dex", label: "Geschicklichkeit" },
            { value: "con", label: "Konstitution" },
            { value: "int", label: "Intelligenz" },
            { value: "wis", label: "Weisheit" },
            { value: "cha", label: "Charisma" },
        ],
    },
    {
        label: "Rettungswürfe & Fertigkeiten",
        options: [
            { value: "saveProf.str", label: "Rettungswurf: Stärke" },
            { value: "saveProf.dex", label: "Rettungswurf: Geschicklichkeit" },
            { value: "saveProf.con", label: "Rettungswurf: Konstitution" },
            { value: "saveProf.int", label: "Rettungswurf: Intelligenz" },
            { value: "saveProf.wis", label: "Rettungswurf: Weisheit" },
            { value: "saveProf.cha", label: "Rettungswurf: Charisma" },
            { value: "skillsProf", label: "Fertigkeiten (Proficiencies)" },
            { value: "skillsExpertise", label: "Fertigkeiten (Expertise)" },
        ],
    },
    {
        label: "Sinne & Sprache",
        options: [
            { value: "sensesList", label: "Sinne" },
            { value: "languagesList", label: "Sprachen" },
        ],
    },
    {
        label: "Resistenzen & Immunitäten",
        options: [
            { value: "damageVulnerabilitiesList", label: "Verwundbarkeiten" },
            { value: "damageResistancesList", label: "Resistenzen" },
            { value: "damageImmunitiesList", label: "Schadensimmunitäten" },
            { value: "conditionImmunitiesList", label: "Zustandsimmunitäten" },
        ],
    },
    {
        label: "Ausrüstung & Ressourcen",
        options: [
            { value: "gearList", label: "Ausrüstung" },
            { value: "passivesList", label: "Passive Werte" },
        ],
    },
    {
        label: "Texte & Abschnitte",
        options: [
            { value: "traits", label: "Traits (Text)" },
            { value: "actions", label: "Actions (Text)" },
            { value: "legendary", label: "Legendary Actions (Text)" },
            { value: "entries", label: "Strukturierte Einträge" },
            { value: "actionsList", label: "Strukturierte Actions" },
            { value: "spellsKnown", label: "Bekannte Zauber" },
        ],
    },
];

const DEFAULT_SEED_ELEMENTS: LayoutElement[] = [
    {
        id: "el-title",
        type: "label",
        x: 48,
        y: 48,
        width: 864,
        height: 120,
        label: "Kreaturenübersicht",
        description: "",
        attributes: [],
    },
    {
        id: "el-meta",
        type: "hbox-container",
        x: 48,
        y: 200,
        width: 864,
        height: 200,
        label: "Grunddaten",
        description: "",
        attributes: [],
        layout: { gap: 16, padding: 16, align: "stretch" },
        children: ["el-name", "el-size", "el-type", "el-alignment"],
    },
    {
        id: "el-name",
        type: "text-input",
        x: 64,
        y: 216,
        width: 196,
        height: 168,
        label: "Name",
        placeholder: "Kreaturennamen eingeben…",
        attributes: ["name"],
        parentId: "el-meta",
    },
    {
        id: "el-size",
        type: "dropdown",
        x: 276,
        y: 216,
        width: 196,
        height: 168,
        label: "Größe",
        placeholder: "Größe wählen…",
        options: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"],
        attributes: ["size"],
        parentId: "el-meta",
    },
    {
        id: "el-type",
        type: "dropdown",
        x: 488,
        y: 216,
        width: 196,
        height: 168,
        label: "Typ",
        placeholder: "Typ wählen…",
        options: [
            "Aberration",
            "Beast",
            "Celestial",
            "Construct",
            "Dragon",
            "Elemental",
            "Fey",
            "Fiend",
            "Giant",
            "Humanoid",
            "Monstrosity",
            "Ooze",
            "Plant",
            "Undead",
        ],
        attributes: ["type"],
        parentId: "el-meta",
    },
    {
        id: "el-alignment",
        type: "dropdown",
        x: 700,
        y: 216,
        width: 196,
        height: 168,
        label: "Gesinnung",
        placeholder: "Gesinnung wählen…",
        options: [
            "Lawful Good",
            "Neutral Good",
            "Chaotic Good",
            "Lawful Neutral",
            "True Neutral",
            "Chaotic Neutral",
            "Lawful Evil",
            "Neutral Evil",
            "Chaotic Evil",
        ],
        attributes: ["alignment"],
        parentId: "el-meta",
    },
    {
        id: "el-ability-heading",
        type: "label",
        x: 48,
        y: 420,
        width: 864,
        height: 80,
        label: "Attribute",
        description: "",
        attributes: [],
    },
    {
        id: "el-abilities",
        type: "hbox-container",
        x: 48,
        y: 520,
        width: 864,
        height: 180,
        label: "Ability Scores",
        description: "",
        attributes: [],
        layout: { gap: 16, padding: 16, align: "stretch" },
        children: ["el-str", "el-dex", "el-con", "el-int", "el-wis", "el-cha"],
    },
    {
        id: "el-str",
        type: "text-input",
        x: 64,
        y: 536,
        width: 125,
        height: 148,
        label: "STR",
        placeholder: "10",
        attributes: ["str"],
        parentId: "el-abilities",
    },
    {
        id: "el-dex",
        type: "text-input",
        x: 205,
        y: 536,
        width: 125,
        height: 148,
        label: "DEX",
        placeholder: "10",
        attributes: ["dex"],
        parentId: "el-abilities",
    },
    {
        id: "el-con",
        type: "text-input",
        x: 346,
        y: 536,
        width: 125,
        height: 148,
        label: "CON",
        placeholder: "10",
        attributes: ["con"],
        parentId: "el-abilities",
    },
    {
        id: "el-int",
        type: "text-input",
        x: 487,
        y: 536,
        width: 125,
        height: 148,
        label: "INT",
        placeholder: "10",
        attributes: ["int"],
        parentId: "el-abilities",
    },
    {
        id: "el-wis",
        type: "text-input",
        x: 628,
        y: 536,
        width: 125,
        height: 148,
        label: "WIS",
        placeholder: "10",
        attributes: ["wis"],
        parentId: "el-abilities",
    },
    {
        id: "el-cha",
        type: "text-input",
        x: 769,
        y: 536,
        width: 125,
        height: 148,
        label: "CHA",
        placeholder: "10",
        attributes: ["cha"],
        parentId: "el-abilities",
    },
    {
        id: "el-stats-heading",
        type: "label",
        x: 48,
        y: 720,
        width: 864,
        height: 80,
        label: "Kampfwerte",
        description: "",
        attributes: [],
    },
    {
        id: "el-stats",
        type: "hbox-container",
        x: 48,
        y: 820,
        width: 864,
        height: 180,
        label: "Statistiken",
        description: "",
        attributes: [],
        layout: { gap: 16, padding: 16, align: "stretch" },
        children: ["el-ac", "el-hp", "el-speed", "el-initiative"],
    },
    {
        id: "el-ac",
        type: "text-input",
        x: 64,
        y: 836,
        width: 196,
        height: 148,
        label: "Rüstungsklasse",
        placeholder: "AC",
        attributes: ["ac"],
        parentId: "el-stats",
    },
    {
        id: "el-hp",
        type: "text-input",
        x: 276,
        y: 836,
        width: 196,
        height: 148,
        label: "Trefferpunkte",
        placeholder: "HP",
        attributes: ["hp"],
        parentId: "el-stats",
    },
    {
        id: "el-speed",
        type: "text-input",
        x: 488,
        y: 836,
        width: 196,
        height: 148,
        label: "Geschwindigkeit",
        placeholder: "30 ft.",
        attributes: ["speed"],
        parentId: "el-stats",
    },
    {
        id: "el-initiative",
        type: "text-input",
        x: 700,
        y: 836,
        width: 196,
        height: 148,
        label: "Initiative",
        placeholder: "+2",
        attributes: ["initiative"],
        parentId: "el-stats",
    },
    {
        id: "el-senses",
        type: "search-dropdown",
        x: 48,
        y: 1020,
        width: 420,
        height: 120,
        label: "Sinne",
        placeholder: "Sinn hinzufügen…",
        options: ["Darkvision", "Blindsight", "Tremorsense", "Truesight", "Passive Perception"],
        attributes: ["senses"],
    },
    {
        id: "el-languages",
        type: "search-dropdown",
        x: 492,
        y: 1020,
        width: 420,
        height: 120,
        label: "Sprachen",
        placeholder: "Sprache hinzufügen…",
        options: [
            "Common",
            "Dwarvish",
            "Elvish",
            "Giant",
            "Goblin",
            "Draconic",
            "Infernal",
            "Sylvan",
        ],
        attributes: ["languages"],
    },
    {
        id: "el-divider",
        type: "separator",
        x: 48,
        y: 1168,
        width: 864,
        height: 24,
        label: "",
        attributes: [],
    },
    {
        id: "el-traits-heading",
        type: "label",
        x: 48,
        y: 1210,
        width: 864,
        height: 80,
        label: "Eigenschaften",
        description: "",
        attributes: [],
    },
    {
        id: "el-traits",
        type: "textarea",
        x: 48,
        y: 1290,
        width: 864,
        height: 220,
        label: "Traits",
        placeholder: "Sonderfähigkeiten und Besonderheiten beschreiben…",
        attributes: ["traits"],
    },
    {
        id: "el-actions-heading",
        type: "label",
        x: 48,
        y: 1530,
        width: 864,
        height: 80,
        label: "Aktionen",
        description: "",
        attributes: [],
    },
    {
        id: "el-actions",
        type: "textarea",
        x: 48,
        y: 1610,
        width: 864,
        height: 220,
        label: "Actions",
        placeholder: "Angriffe und Aktionen dokumentieren…",
        attributes: ["actions"],
    },
];

const DEFAULT_SEED_LAYOUT: DomainSeedLayout = {
    id: "layout-editor-default",
    name: "Layout Editor – Kreaturenvorlage",
    blueprint: {
        canvasWidth: 960,
        canvasHeight: 1880,
        elements: DEFAULT_SEED_ELEMENTS,
    },
};

const DEFAULT_CONFIGURATION: DomainConfiguration = {
    attributeGroups: DEFAULT_ATTRIBUTE_GROUPS,
    elementDefinitions: createDefaultElementDefinitions(),
    seedLayouts: [DEFAULT_SEED_LAYOUT],
};

function cloneConfiguration(config: DomainConfiguration): DomainConfiguration {
    return {
        attributeGroups: config.attributeGroups.map(group => ({
            label: group.label,
            options: group.options.map(option => ({ ...option })),
        })),
        elementDefinitions: config.elementDefinitions.map(def => ({ ...def })),
        seedLayouts: config.seedLayouts.map(layout => ({
            id: layout.id,
            name: layout.name,
            blueprint: {
                canvasWidth: layout.blueprint.canvasWidth,
                canvasHeight: layout.blueprint.canvasHeight,
                elements: layout.blueprint.elements.map(element => ({ ...element })),
            },
        })),
    };
}

function validateAttributeGroups(raw: unknown, collector: ValidationCollector): AttributeGroup[] | undefined {
    if (raw == null) {
        return undefined;
    }
    if (!Array.isArray(raw)) {
        collector.push("attributeGroups", "muss ein Array sein");
        return undefined;
    }
    return raw
        .map((group, groupIndex) => {
            if (typeof group !== "object" || group === null) {
                collector.push(`attributeGroups[${groupIndex}]`, "muss ein Objekt sein");
                return null;
            }
            const label = (group as { label?: unknown }).label;
            if (typeof label !== "string" || !label.trim()) {
                collector.push(`attributeGroups[${groupIndex}].label`, "muss ein nicht-leerer String sein");
            }
            const options = (group as { options?: unknown }).options;
            if (!Array.isArray(options) || !options.length) {
                collector.push(`attributeGroups[${groupIndex}].options`, "muss ein nicht-leeres Array sein");
                return null;
            }
            const validatedOptions = options.map((option, optionIndex) => {
                if (typeof option !== "object" || option === null) {
                    collector.push(
                        `attributeGroups[${groupIndex}].options[${optionIndex}]`,
                        "muss ein Objekt sein",
                    );
                    return null;
                }
                const value = (option as { value?: unknown }).value;
                const optionLabel = (option as { label?: unknown }).label;
                if (typeof value !== "string" || !value.trim()) {
                    collector.push(
                        `attributeGroups[${groupIndex}].options[${optionIndex}].value`,
                        "muss ein nicht-leerer String sein",
                    );
                }
                if (typeof optionLabel !== "string" || !optionLabel.trim()) {
                    collector.push(
                        `attributeGroups[${groupIndex}].options[${optionIndex}].label`,
                        "muss ein nicht-leerer String sein",
                    );
                }
                return value && optionLabel ? { value, label: optionLabel } : null;
            });
            if (validatedOptions.some(option => option === null)) {
                return null;
            }
            return label ? { label, options: validatedOptions as Array<{ value: string; label: string }> } : null;
        })
        .filter((group): group is AttributeGroup => group !== null);
}

function validateElementDefinitions(raw: unknown, collector: ValidationCollector): LayoutElementDefinition[] | undefined {
    if (raw == null) {
        return undefined;
    }
    if (!Array.isArray(raw)) {
        collector.push("elementDefinitions", "muss ein Array sein");
        return undefined;
    }
    return raw
        .map((definition, index) => {
            if (typeof definition !== "object" || definition === null) {
                collector.push(`elementDefinitions[${index}]`, "muss ein Objekt sein");
                return null;
            }
            const record = definition as Record<string, unknown>;
            const type = record.type;
            const buttonLabel = record.buttonLabel;
            const defaultLabel = record.defaultLabel;
            const width = record.width;
            const height = record.height;
            if (typeof type !== "string" || !type.trim()) {
                collector.push(`elementDefinitions[${index}].type`, "muss ein nicht-leerer String sein");
            }
            if (typeof buttonLabel !== "string" || !buttonLabel.trim()) {
                collector.push(
                    `elementDefinitions[${index}].buttonLabel`,
                    "muss ein nicht-leerer String sein",
                );
            }
            if (typeof defaultLabel !== "string" || !defaultLabel.trim()) {
                collector.push(
                    `elementDefinitions[${index}].defaultLabel`,
                    "muss ein nicht-leerer String sein",
                );
            }
            if (typeof width !== "number" || Number.isNaN(width) || width <= 0) {
                collector.push(`elementDefinitions[${index}].width`, "muss eine positive Zahl sein");
            }
            if (typeof height !== "number" || Number.isNaN(height) || height <= 0) {
                collector.push(`elementDefinitions[${index}].height`, "muss eine positive Zahl sein");
            }
            if (
                typeof type === "string" &&
                typeof buttonLabel === "string" &&
                typeof defaultLabel === "string" &&
                typeof width === "number" &&
                typeof height === "number" &&
                !Number.isNaN(width) &&
                !Number.isNaN(height) &&
                width > 0 &&
                height > 0
            ) {
                const sanitized: LayoutElementDefinition = {
                    type: type.trim(),
                    buttonLabel: buttonLabel.trim(),
                    defaultLabel: defaultLabel.trim(),
                    width,
                    height,
                } as LayoutElementDefinition;
                if (record.category === "element" || record.category === "container") {
                    sanitized.category = record.category;
                }
                if (record.layoutOrientation === "vertical" || record.layoutOrientation === "horizontal") {
                    sanitized.layoutOrientation = record.layoutOrientation;
                }
                if (
                    record.paletteGroup === "element" ||
                    record.paletteGroup === "input" ||
                    record.paletteGroup === "container"
                ) {
                    sanitized.paletteGroup = record.paletteGroup;
                }
                if (typeof record.defaultPlaceholder === "string") {
                    sanitized.defaultPlaceholder = record.defaultPlaceholder;
                }
                if (typeof record.defaultValue === "string") {
                    sanitized.defaultValue = record.defaultValue;
                }
                if (typeof record.defaultDescription === "string") {
                    sanitized.defaultDescription = record.defaultDescription;
                }
                if (Array.isArray(record.options)) {
                    const invalid = record.options.some(option => typeof option !== "string");
                    if (invalid) {
                        collector.push(
                            `elementDefinitions[${index}].options`,
                            "darf nur Strings enthalten",
                        );
                    } else {
                        sanitized.options = [...(record.options as string[])];
                    }
                }
                if (typeof record.defaultLayout === "object" && record.defaultLayout !== null) {
                    const layout = record.defaultLayout as Record<string, unknown>;
                    const gap = layout.gap;
                    const padding = layout.padding;
                    const align = layout.align;
                    if (
                        typeof gap === "number" &&
                        typeof padding === "number" &&
                        (align === "start" || align === "center" || align === "end" || align === "stretch")
                    ) {
                        sanitized.defaultLayout = { gap, padding, align };
                    } else {
                        collector.push(
                            `elementDefinitions[${index}].defaultLayout`,
                            "muss gap/padding (Zahl) und align (start|center|end|stretch) enthalten",
                        );
                    }
                }
                return sanitized;
            }
            return null;
        })
        .filter((definition): definition is LayoutElementDefinition => definition !== null);
}

function validateLayoutElements(
    raw: unknown,
    collector: ValidationCollector,
    path: string,
): LayoutElement[] | undefined {
    if (raw == null) {
        return undefined;
    }
    if (!Array.isArray(raw)) {
        collector.push(path, "muss ein Array sein");
        return undefined;
    }
    return raw
        .map((element, index) => {
            if (typeof element !== "object" || element === null) {
                collector.push(`${path}[${index}]`, "muss ein Objekt sein");
                return null;
            }
            const record = element as Record<string, unknown>;
            const id = record.id;
            const type = record.type;
            const x = record.x;
            const y = record.y;
            const width = record.width;
            const height = record.height;
            const label = record.label;
            if (typeof id !== "string" || !id.trim()) {
                collector.push(`${path}[${index}].id`, "muss ein nicht-leerer String sein");
            }
            if (typeof type !== "string" || !type.trim()) {
                collector.push(`${path}[${index}].type`, "muss ein nicht-leerer String sein");
            }
            if (typeof x !== "number" || Number.isNaN(x)) {
                collector.push(`${path}[${index}].x`, "muss eine Zahl sein");
            }
            if (typeof y !== "number" || Number.isNaN(y)) {
                collector.push(`${path}[${index}].y`, "muss eine Zahl sein");
            }
            if (typeof width !== "number" || Number.isNaN(width) || width <= 0) {
                collector.push(`${path}[${index}].width`, "muss eine positive Zahl sein");
            }
            if (typeof height !== "number" || Number.isNaN(height) || height <= 0) {
                collector.push(`${path}[${index}].height`, "muss eine positive Zahl sein");
            }
            if (typeof label !== "string") {
                collector.push(`${path}[${index}].label`, "muss ein String sein");
            }
            if (
                typeof id === "string" &&
                typeof type === "string" &&
                typeof x === "number" &&
                typeof y === "number" &&
                typeof width === "number" &&
                typeof height === "number" &&
                typeof label === "string" &&
                !Number.isNaN(x) &&
                !Number.isNaN(y) &&
                !Number.isNaN(width) &&
                !Number.isNaN(height) &&
                width > 0 &&
                height > 0
            ) {
                const sanitized: LayoutElement = {
                    id: id.trim(),
                    type: type.trim(),
                    x,
                    y,
                    width,
                    height,
                    label,
                    attributes: Array.isArray(record.attributes)
                        ? (record.attributes.filter(value => typeof value === "string") as string[])
                        : [],
                };
                if (typeof record.description === "string") {
                    sanitized.description = record.description;
                }
                if (typeof record.placeholder === "string") {
                    sanitized.placeholder = record.placeholder;
                }
                if (typeof record.defaultValue === "string") {
                    sanitized.defaultValue = record.defaultValue;
                }
                if (Array.isArray(record.options)) {
                    const invalid = record.options.some(option => typeof option !== "string");
                    if (invalid) {
                        collector.push(`${path}[${index}].options`, "darf nur Strings enthalten");
                    } else {
                        sanitized.options = [...(record.options as string[])];
                    }
                }
                if (typeof record.parentId === "string" && record.parentId.trim()) {
                    sanitized.parentId = record.parentId.trim();
                }
                if (typeof record.layout === "object" && record.layout !== null) {
                    const layout = record.layout as Record<string, unknown>;
                    const gap = layout.gap;
                    const padding = layout.padding;
                    const align = layout.align;
                    if (
                        typeof gap === "number" &&
                        typeof padding === "number" &&
                        (align === "start" || align === "center" || align === "end" || align === "stretch")
                    ) {
                        sanitized.layout = { gap, padding, align };
                    } else {
                        collector.push(
                            `${path}[${index}].layout`,
                            "muss gap/padding (Zahl) und align (start|center|end|stretch) enthalten",
                        );
                    }
                }
                if (Array.isArray(record.children)) {
                    const invalid = record.children.some(child => typeof child !== "string");
                    if (invalid) {
                        collector.push(`${path}[${index}].children`, "darf nur Strings enthalten");
                    } else {
                        sanitized.children = [...(record.children as string[])];
                    }
                }
                if (typeof record.viewBindingId === "string") {
                    sanitized.viewBindingId = record.viewBindingId;
                }
                if (typeof record.viewState === "object" && record.viewState !== null) {
                    sanitized.viewState = { ...(record.viewState as Record<string, unknown>) };
                }
                return sanitized;
            }
            return null;
        })
        .filter((element): element is LayoutElement => element !== null);
}

function validateSeedLayouts(raw: unknown, collector: ValidationCollector): DomainSeedLayout[] | undefined {
    if (raw == null) {
        return undefined;
    }
    if (!Array.isArray(raw)) {
        collector.push("seedLayouts", "muss ein Array sein");
        return undefined;
    }
    return raw
        .map((layout, layoutIndex) => {
            if (typeof layout !== "object" || layout === null) {
                collector.push(`seedLayouts[${layoutIndex}]`, "muss ein Objekt sein");
                return null;
            }
            const record = layout as Record<string, unknown>;
            const id = record.id;
            const name = record.name;
            const blueprint = record.blueprint;
            if (typeof id !== "string" || !id.trim()) {
                collector.push(`seedLayouts[${layoutIndex}].id`, "muss ein nicht-leerer String sein");
            }
            if (typeof name !== "string" || !name.trim()) {
                collector.push(`seedLayouts[${layoutIndex}].name`, "muss ein nicht-leerer String sein");
            }
            if (typeof blueprint !== "object" || blueprint === null) {
                collector.push(`seedLayouts[${layoutIndex}].blueprint`, "muss ein Objekt sein");
                return null;
            }
            const blueprintRecord = blueprint as Record<string, unknown>;
            const canvasWidth = blueprintRecord.canvasWidth;
            const canvasHeight = blueprintRecord.canvasHeight;
            const elements = blueprintRecord.elements;
            if (typeof canvasWidth !== "number" || Number.isNaN(canvasWidth) || canvasWidth <= 0) {
                collector.push(`seedLayouts[${layoutIndex}].blueprint.canvasWidth`, "muss eine positive Zahl sein");
            }
            if (typeof canvasHeight !== "number" || Number.isNaN(canvasHeight) || canvasHeight <= 0) {
                collector.push(`seedLayouts[${layoutIndex}].blueprint.canvasHeight`, "muss eine positive Zahl sein");
            }
            const validatedElements = validateLayoutElements(
                elements,
                collector,
                `seedLayouts[${layoutIndex}].blueprint.elements`,
            );
            if (
                typeof id === "string" &&
                typeof name === "string" &&
                typeof canvasWidth === "number" &&
                typeof canvasHeight === "number" &&
                validatedElements &&
                validatedElements.length
            ) {
                return {
                    id: id.trim(),
                    name: name.trim(),
                    blueprint: {
                        canvasWidth,
                        canvasHeight,
                        elements: validatedElements,
                    },
                } satisfies DomainSeedLayout;
            }
            return null;
        })
        .filter((layout): layout is DomainSeedLayout => layout !== null);
}

function parseDomainConfiguration(raw: RawDomainConfiguration): Partial<DomainConfiguration> {
    const collector = new ValidationCollector();
    const attributeGroups = validateAttributeGroups(raw.attributeGroups, collector);
    const elementDefinitions = validateElementDefinitions(raw.elementDefinitions, collector);
    const seedLayouts = validateSeedLayouts(raw.seedLayouts, collector);
    collector.throwIfAny("Ungültige Domänenkonfiguration");
    return {
        attributeGroups,
        elementDefinitions,
        seedLayouts,
    };
}

class DomainConfigurationService {
    private current: DomainConfiguration = cloneConfiguration(DEFAULT_CONFIGURATION);
    private app: App | null = null;
    private listeners = new Set<(config: DomainConfiguration) => void>();
    private lastLoadedSource: DomainConfigurationSource | null = null;

    constructor() {
        onDomainConfigurationSourceChange(source => {
            void this.reload(source).catch(error => {
                console.error("Layout Editor: Domänenkonfiguration konnte nicht aktualisiert werden", error);
            });
        });
    }

    getCurrent(): DomainConfiguration {
        return cloneConfiguration(this.current);
    }

    onChange(listener: (config: DomainConfiguration) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    async ensure(app?: App | null): Promise<DomainConfiguration> {
        if (app) {
            this.app = app;
        }
        const source = getDomainConfigurationSource();
        if (this.lastLoadedSource === source && (source !== "vault" || !this.app)) {
            return this.getCurrent();
        }
        return this.reload(source, this.app ?? app ?? null);
    }

    async reload(source: DomainConfigurationSource, app?: App | null): Promise<DomainConfiguration> {
        if (app) {
            this.app = app;
        }
        this.lastLoadedSource = source;
        if (source === "vault") {
            if (!this.app) {
                throw new DomainConfigurationError("Vault-Konfiguration angefordert", [
                    "Es wurde keine Obsidian-App-Instanz übergeben, die den Vault lesen kann.",
                ]);
            }
            const data = await this.readVaultConfiguration(this.app);
            if (!data) {
                this.applyConfiguration(cloneConfiguration(DEFAULT_CONFIGURATION));
                return this.getCurrent();
            }
            const parsed = parseDomainConfiguration(data);
            const defaults = cloneConfiguration(DEFAULT_CONFIGURATION);
            const configuration: DomainConfiguration = {
                attributeGroups: parsed.attributeGroups ?? defaults.attributeGroups,
                elementDefinitions: parsed.elementDefinitions ?? defaults.elementDefinitions,
                seedLayouts:
                    parsed.seedLayouts && parsed.seedLayouts.length ? parsed.seedLayouts : defaults.seedLayouts,
            };
            this.applyConfiguration(configuration);
            return this.getCurrent();
        }
        this.applyConfiguration(cloneConfiguration(DEFAULT_CONFIGURATION));
        return this.getCurrent();
    }

    useDefaults(): void {
        this.applyConfiguration(cloneConfiguration(DEFAULT_CONFIGURATION));
        this.lastLoadedSource = "builtin";
    }

    resetForTests(): void {
        this.app = null;
        this.lastLoadedSource = null;
        this.applyConfiguration(cloneConfiguration(DEFAULT_CONFIGURATION));
    }

    private applyConfiguration(configuration: DomainConfiguration) {
        this.current = cloneConfiguration(configuration);
        for (const listener of this.listeners) {
            listener(this.getCurrent());
        }
    }

    private async readVaultConfiguration(app: App): Promise<RawDomainConfiguration | null> {
        const adapter = app.vault?.adapter as unknown;
        if (!adapter || typeof (adapter as { exists?: unknown }).exists !== "function") {
            throw new DomainConfigurationError("Vault-Adapter unterstützt das Lesen nicht", [
                "Adapter muss Methoden exists(path) und read(path) bereitstellen.",
            ]);
        }
        const exists = await (adapter as { exists(path: string): Promise<boolean> }).exists(CONFIG_PATH);
        if (!exists) {
            return null;
        }
        if (typeof (adapter as { read?: unknown }).read !== "function") {
            throw new DomainConfigurationError("Vault-Adapter unterstützt das Lesen nicht", [
                "Adapter muss eine read(path)-Methode besitzen.",
            ]);
        }
        try {
            const raw = await (adapter as { read(path: string): Promise<string> }).read(CONFIG_PATH);
            return JSON.parse(raw) as RawDomainConfiguration;
        } catch (error) {
            throw new DomainConfigurationError("Domänenkonfiguration konnte nicht gelesen werden", [
                error instanceof Error ? error.message : String(error),
            ]);
        }
    }
}

export const domainConfigurationService = new DomainConfigurationService();

export function getDefaultDomainConfiguration(): DomainConfiguration {
    return cloneConfiguration(DEFAULT_CONFIGURATION);
}

export function resetDomainConfigurationForTesting(): void {
    domainConfigurationService.resetForTests();
}
