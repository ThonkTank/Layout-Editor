import assert from "node:assert/strict";
import {
    domainConfigurationService,
    DomainConfigurationError,
    resetDomainConfigurationForTesting,
} from "../src/config/domain-source";
import {
    getDomainConfigurationSource,
    setDomainConfigurationSource,
    resetDomainConfigurationSourceForTesting,
} from "../src/settings/domain-settings";
import { ATTRIBUTE_GROUPS, getElementDefinitions } from "../src/definitions";

const CONFIG_PATH = "Layout Editor/domain-config.json";

type AdapterMock = {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
};

type AppMock = {
    vault: {
        adapter: AdapterMock;
    };
};

function createVaultAppMock(payload: unknown, exists = true): AppMock {
    return {
        vault: {
            adapter: {
                async exists(path: string) {
                    return exists && path === CONFIG_PATH;
                },
                async read(path: string) {
                    if (path !== CONFIG_PATH) {
                        throw new Error(`Unexpected path: ${path}`);
                    }
                    return JSON.stringify(payload);
                },
            },
        },
    };
}

async function resetState() {
    resetDomainConfigurationSourceForTesting();
    resetDomainConfigurationForTesting();
}

async function testDefaults() {
    await resetState();
    assert.equal(getDomainConfigurationSource(), "builtin");
    const definitions = getElementDefinitions();
    assert.ok(definitions.length > 0, "Default definitions should be registered");
    assert.equal(ATTRIBUTE_GROUPS[0]?.label, "Allgemein");
}

async function testVaultConfiguration() {
    await resetState();
    setDomainConfigurationSource("vault");
    const customConfig = {
        attributeGroups: [
            { label: "Custom", options: [{ value: "foo", label: "Foo" }] },
        ],
        elementDefinitions: [
            {
                type: "custom-element",
                buttonLabel: "Custom",
                defaultLabel: "Custom",
                width: 100,
                height: 40,
            },
        ],
        seedLayouts: [
            {
                id: "custom-layout",
                name: "Custom",
                blueprint: {
                    canvasWidth: 200,
                    canvasHeight: 200,
                    elements: [
                        {
                            id: "custom",
                            type: "custom-element",
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 40,
                            label: "Custom",
                            attributes: [],
                        },
                    ],
                },
            },
        ],
    };
    const app = createVaultAppMock(customConfig);
    const configuration = await domainConfigurationService.ensure(app as unknown as any);
    assert.equal(configuration.attributeGroups[0]?.label, "Custom");
    assert.equal(ATTRIBUTE_GROUPS[0]?.label, "Custom", "Attribute groups should sync with configuration");
    assert.ok(
        getElementDefinitions().some(def => def.type === "custom-element"),
        "Custom element definition should be registered",
    );
    assert.equal(configuration.seedLayouts[0]?.id, "custom-layout");
}

async function testInvalidConfiguration() {
    await resetState();
    setDomainConfigurationSource("vault");
    const invalidConfig = {
        elementDefinitions: [
            {
                type: "broken",
                defaultLabel: "Broken",
                width: 100,
                height: 50,
            },
        ],
    };
    const app = createVaultAppMock(invalidConfig);
    let error: unknown;
    try {
        await domainConfigurationService.ensure(app as unknown as any);
    } catch (err) {
        error = err;
    }
    assert.ok(error instanceof DomainConfigurationError, "Invalid payload should raise DomainConfigurationError");
    const details = (error as DomainConfigurationError).details.join(" ");
    assert.ok(
        details.includes("buttonLabel"),
        "Error details should reference the missing buttonLabel field",
    );
    assert.equal(ATTRIBUTE_GROUPS[0]?.label, "Allgemein", "Defaults should remain active after failure");
}

async function run() {
    try {
        await testDefaults();
        await testVaultConfiguration();
        await testInvalidConfiguration();
        console.log("domain-configuration tests passed");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
