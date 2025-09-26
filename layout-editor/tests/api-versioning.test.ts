import assert from "node:assert/strict";
import {
    runLayoutSchemaMigrations,
    LAYOUT_SCHEMA_VERSION,
    type VersionedSavedLayout,
} from "../src/layout-library";

async function runTests() {
    const baseLayout: VersionedSavedLayout = {
        id: "legacy",
        name: "Legacy Layout",
        canvasWidth: 800,
        canvasHeight: 600,
        elements: [
            {
                id: "el-1",
                type: "label",
                x: 0,
                y: 0,
                width: 120,
                height: 32,
                label: "Legacy",
                attributes: [],
            },
        ],
        createdAt: new Date("2020-01-01T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2020-01-02T00:00:00.000Z").toISOString(),
        schemaVersion: 0,
    };

    const migrationWarnings: string[] = [];
    const migrated = runLayoutSchemaMigrations({ ...baseLayout }, message => {
        migrationWarnings.push(message);
    });
    assert.ok(migrated, "legacy layout should migrate successfully");
    assert.equal(migrated?.schemaVersion, LAYOUT_SCHEMA_VERSION, "layout should match current schema version");
    assert.ok(
        migrationWarnings.some(message => message.includes("migriert")),
        "migration should emit a warning about the schema update",
    );

    const futureWarnings: string[] = [];
    const futureLayout: VersionedSavedLayout = {
        ...baseLayout,
        id: "future",
        schemaVersion: LAYOUT_SCHEMA_VERSION + 5,
    };
    const futureResult = runLayoutSchemaMigrations(futureLayout, message => {
        futureWarnings.push(message);
    });
    assert.equal(futureResult, null, "layouts from the future should be rejected");
    assert.ok(
        futureWarnings.length > 0 && futureWarnings[0].includes("verwendet Schema-Version"),
        "future schema rejection should emit a warning",
    );

    const stalledWarnings: string[] = [];
    const stalledResult = runLayoutSchemaMigrations(
        {
            ...baseLayout,
            schemaVersion: 0,
        },
        message => stalledWarnings.push(message),
    );
    assert.ok(stalledResult, "re-running migration should still succeed");
    assert.ok(
        stalledWarnings.filter(message => message.includes("migriert")).length >= 1,
        "repeated migrations should emit consistent warnings",
    );

    console.log("api-versioning schema tests passed");
}

runTests().catch(error => {
    console.error(error);
    process.exit(1);
});
