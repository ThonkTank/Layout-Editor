import assert from "node:assert/strict";
import { describeLayoutPersistenceError } from "../src/presenters/header-controls";

async function run() {
    const errorWithCode = Object.assign(new Error("Layout-ID darf keine Pfadtrenner enthalten."), {
        code: "layout/id-invalid-characters",
    });
    const describedCode = describeLayoutPersistenceError(errorWithCode);
    assert.equal(describedCode.code, "layout/id-invalid-characters");
    assert.equal(describedCode.title, "Layout-ID enthält unerlaubte Zeichen");
    assert.ok(
        describedCode.details?.some(detail => detail.label === "Fehlercode" && detail.text === "layout/id-invalid-characters"),
        "should expose the error code in the detail list",
    );
    assert.ok(!describedCode.details?.some(detail => detail.label === "Empfehlung"), "should not add help if unavailable");

    const describedMessage = describeLayoutPersistenceError(new Error("Ungültige Breite für das Layout."));
    assert.equal(describedMessage.code, "layout/canvas-width-invalid");
    const recommendation = describedMessage.details?.find(detail => detail.label === "Empfehlung");
    assert.ok(recommendation, "should include recommendation for width issues");
    assert.match(recommendation!.text, /200–2000 px/);

    const describedUnknown = describeLayoutPersistenceError(new Error("mysterious failure"));
    assert.equal(describedUnknown.code, "layout/unknown");
    assert.equal(describedUnknown.noticeMessage, "Layout konnte nicht gespeichert werden");
    const rawMessage = describedUnknown.details?.find(detail => detail.label === "Rohmeldung");
    assert.ok(rawMessage, "should capture raw message for unknown errors");
    assert.equal(rawMessage!.text, "mysterious failure");

    console.log("persistence error mapping tests passed");
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
