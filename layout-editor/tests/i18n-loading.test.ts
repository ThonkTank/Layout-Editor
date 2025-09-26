import assert from "node:assert/strict";
import { createLayoutEditorStrings, formatLayoutString } from "../src/i18n/strings";

async function runTests() {
    const defaults = createLayoutEditorStrings();
    assert.equal(defaults.inspector.heading, "Eigenschaften");
    assert.equal(defaults.inspector.container.children.emptyState, "Keine Elemente verknüpft.");

    const overrides = createLayoutEditorStrings({
        inspector: {
            heading: "Properties",
            container: {
                noneOption: "No container",
                children: {
                    emptyState: "No linked items.",
                },
            },
        },
    });

    assert.equal(overrides.inspector.heading, "Properties");
    assert.equal(overrides.inspector.container.children.emptyState, "No linked items.");
    assert.equal(overrides.inspector.container.noneOption, "No container");
    assert.equal(overrides.inspector.size.separator, "×", "fallback should preserve defaults");

    const defaultsAfterOverride = createLayoutEditorStrings();
    assert.equal(
        defaultsAfterOverride.inspector.container.children.emptyState,
        "Keine Elemente verknüpft.",
        "default bundle must remain immutable",
    );

    const template = defaults.inspector.container.children.withinParentTemplate;
    const formatted = formatLayoutString(template, { child: "Element", parent: "Group" });
    assert.equal(formatted, "Element (in Group)");

    const partial = formatLayoutString("Value: {value} {unit}", { value: "12" });
    assert.equal(partial, "Value: 12 {unit}");

    console.log("i18n loading tests passed");
}

async function run() {
    try {
        await runTests();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
