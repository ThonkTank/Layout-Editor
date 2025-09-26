export interface LayoutEditorLocaleStrings {
    inspector: {
        heading: string;
        emptyState: string;
        hint: string;
        typeLabel: string;
        areaLabel: string;
        container: {
            label: string;
            noneOption: string;
            quickAdd: {
                fieldLabel: string;
                buttonLabel: string;
            };
            children: {
                fieldLabel: string;
                emptyState: string;
                selectionPlaceholder: string;
                addButtonLabel: string;
                moveUpTitle: string;
                moveDownTitle: string;
                removeTitle: string;
                withinParentTemplate: string;
            };
            layout: {
                fieldLabel: string;
                gapLabel: string;
                paddingLabel: string;
                alignLabel: string;
                alignOptions: {
                    vertical: {
                        start: string;
                        center: string;
                        end: string;
                        stretch: string;
                    };
                    horizontal: {
                        start: string;
                        center: string;
                        end: string;
                        stretch: string;
                    };
                };
            };
        };
        attributes: {
            label: string;
        };
        actions: {
            delete: string;
        };
        size: {
            label: string;
            separator: string;
        };
        position: {
            label: string;
            separator: string;
        };
        fields: {
            labelDefault: string;
            placeholderDefault: string;
        };
        optionsEditor: {
            label: string;
            emptyState: string;
            removeTitle: string;
            addButtonLabel: string;
            optionTemplate: string;
        };
    };
}

export type LayoutEditorLocaleOverrides = DeepPartial<LayoutEditorLocaleStrings>;

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const defaultLocale: LayoutEditorLocaleStrings = {
    inspector: {
        heading: "Eigenschaften",
        emptyState: "Wähle ein Element, um Details anzupassen.",
        hint: "Benennungen und Eigenschaften pflegst du hier im Inspector. Reine Textblöcke bearbeitest du direkt im Arbeitsbereich.",
        typeLabel: "Typ: {type}",
        areaLabel: "Fläche: {area} px²",
        container: {
            label: "Container",
            noneOption: "Kein Container",
            quickAdd: {
                fieldLabel: "Neues Element erstellen",
                buttonLabel: "Element hinzufügen",
            },
            children: {
                fieldLabel: "Zugeordnete Elemente",
                emptyState: "Keine Elemente verknüpft.",
                selectionPlaceholder: "Element auswählen…",
                addButtonLabel: "Hinzufügen",
                moveUpTitle: "Nach oben",
                moveDownTitle: "Nach unten",
                removeTitle: "Entfernen",
                withinParentTemplate: "{child} (in {parent})",
            },
            layout: {
                fieldLabel: "Layout",
                gapLabel: "Abstand",
                paddingLabel: "Innenabstand",
                alignLabel: "Ausrichtung",
                alignOptions: {
                    vertical: {
                        start: "Links",
                        center: "Zentriert",
                        end: "Rechts",
                        stretch: "Breite",
                    },
                    horizontal: {
                        start: "Oben",
                        center: "Zentriert",
                        end: "Unten",
                        stretch: "Höhe",
                    },
                },
            },
        },
        attributes: {
            label: "Attribute",
        },
        actions: {
            delete: "Element löschen",
        },
        size: {
            label: "Größe (px)",
            separator: "×",
        },
        position: {
            label: "Position (px)",
            separator: ",",
        },
        fields: {
            labelDefault: "Bezeichnung",
            placeholderDefault: "Platzhalter",
        },
        optionsEditor: {
            label: "Optionen",
            emptyState: "Noch keine Optionen.",
            removeTitle: "Option entfernen",
            addButtonLabel: "Option hinzufügen",
            optionTemplate: "Option {index}",
        },
    },
};

export function createLayoutEditorStrings(overrides?: LayoutEditorLocaleOverrides): LayoutEditorLocaleStrings {
    if (!overrides) {
        return clone(defaultLocale);
    }
    return mergeDeep(defaultLocale, overrides);
}

export function formatLayoutString(template: string, params: Record<string, string>): string {
    return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
        return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : `{${key}}`;
    });
}

function mergeDeep<T>(base: T, overrides: DeepPartial<T>): T {
    if (!isPlainObject(base)) {
        return overrides as T;
    }

    const result: Record<string, unknown> = {};
    const keys = new Set<string>([
        ...Object.keys(base as Record<string, unknown>),
        ...Object.keys(overrides as Record<string, unknown>),
    ]);

    for (const key of keys) {
        const baseValue = (base as Record<string, unknown>)[key];
        const overrideValue = (overrides as Record<string, unknown>)[key];

        if (overrideValue === undefined) {
            result[key] = clone(baseValue);
            continue;
        }

        if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
            result[key] = mergeDeep(baseValue, overrideValue as DeepPartial<unknown>);
            continue;
        }

        result[key] = clone(overrideValue);
    }

    return result as T;
}

function clone<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(item => clone(item)) as unknown as T;
    }
    if (isPlainObject(value)) {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>)) {
            result[key] = clone((value as Record<string, unknown>)[key]);
        }
        return result as T;
    }
    return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
