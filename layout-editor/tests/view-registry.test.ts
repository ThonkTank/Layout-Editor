import assert from "node:assert/strict";

import {
    getViewBinding,
    getViewBindingIds,
    getViewBindings,
    getViewBindingsByTag,
    hasViewBinding,
    registerViewBinding,
    resetViewBindings,
} from "../src/view-registry";

async function runTests() {
    resetViewBindings();

    registerViewBinding({ id: "map", label: "Interactive Map" });

    assert.equal(getViewBinding("map")?.label, "Interactive Map");
    assert.ok(hasViewBinding("map"), "expected registry to contain the registered binding");
    assert.deepEqual(getViewBindingIds(), ["map"], "ids helper should expose registered id");

    assert.throws(
        () => registerViewBinding({ id: " map ", label: "Duplicate Map" }),
        /Duplicate view binding id "map"/,
        "duplicate registration should provide descriptive message",
    );

    resetViewBindings([
        { id: "map", label: "Interactive Map", tags: ["Utility"] },
        { id: "stat-block", label: "Stat Block", tags: ["utility", "character"] },
    ]);

    assert.equal(
        getViewBindings().length,
        2,
        "reset should register all unique bindings",
    );
    assert.deepEqual(
        getViewBindingsByTag(" Utility ").map(binding => binding.id),
        ["map", "stat-block"],
        "tag query helper should be case-insensitive and trimmed",
    );

    const beforeIds = getViewBindingIds();
    assert.throws(
        () =>
            resetViewBindings([
                { id: "map", label: "Duplicate Map" },
                { id: "map", label: "Map Duplicate" },
                { id: "stat-block", label: "Stat Block" },
            ]),
        /Duplicate view binding ids detected: "map"/,
        "duplicate detection during reset should report conflicting id",
    );
    assert.deepEqual(
        getViewBindingIds(),
        beforeIds,
        "registry state should remain unchanged when duplicates are rejected",
    );
}

async function run() {
    try {
        await runTests();
        console.log("view-registry tests passed");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
