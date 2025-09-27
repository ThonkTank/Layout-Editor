# Layout Editor – Data Model Overview

## Struktur

```
docs/
├─ data-model-overview.md
├─ history-design.md
└─ README.md
```

## Layout Tree Service

Der Editor verwaltet Layout-Elemente nicht mehr in einer flachen Liste. Ein dedizierter `LayoutTree` (siehe `src/model/layout-tree.ts`) verantwortet:

- O(1)-Lookups per `Map` und das Halten einer globalen Ordnungssequenz für Wurzel-Elemente.
- Validierung von Elternwechseln (keine Selbstreferenzen, keine Zyklen, Ziel muss Container sein).
- Synchronisation von `parentId` und abgeleiteten `children`-Arrays inklusive Bereinigung fehlender Referenzen.
- Sanitisierung persistierter Strukturen: fehlende Eltern setzen `parentId` auf `undefined`, Container ohne gültige Kinder liefern ein leeres Array.

Intern bleiben Nodes mutierbar, doch jede öffentliche Abgabe (z. B. für den Store) erfolgt via `cloneLayoutElement`, um unbeabsichtigte Fremdmutationen zu vermeiden.

## Terminologie

- **Layout-Node** – interne, mutierbare Repräsentation eines Layout-Elements im `LayoutTree`.
- **Snapshot-Element** – Ergebnis von `cloneLayoutElement`; Grundlage für `LayoutEditorState`, `LayoutEditorSnapshot`, `LayoutBlueprint` und `SavedLayout`.
- **LayoutEditorState** – UI-orientierter State (siehe `src/state/layout-editor-store.ts`) mit zusätzlichen Metadaten (`canUndo`, `isSavingLayout`, …).
- **LayoutEditorSnapshot** – History- und Export-Basiszustand bestehend aus Canvas-Daten und geklonten Elementen.
- **LayoutBlueprint** – Serialisierte Form für Exporte ohne Persistenzmetadaten.
- **Patch** – Differenzstruktur (`redo`/`undo`) innerhalb von `LayoutHistory`, bestehend aus Canvas-, Element- und Ordnungsanteilen.

## Store Integration

`LayoutEditorStore` delegiert alle strukturellen Mutationen an den `LayoutTree`:

- Einfügen (`insert`), Entfernen (`remove`) und Aktualisieren (`update`) von Elementen.
- Elternwechsel (`setParent`) und Sortierung (`moveChild`).
- Container-Layouting (`applyContainerLayout`) basiert auf den vom Tree gelieferten Kinderschnappschüssen.

Nach jeder Mutation synchronisiert der Store seinen öffentlichen Zustand über `getElementsSnapshot()` und erzeugt daraus geklonte `LayoutElement`-Instanzen.

### Snapshot-Semantik

- `LayoutEditorStore` nutzt `cloneLayoutElement`, das `attributes`, `options`, `children`, `layout`, `viewState` und alle elementaren Felder tief kopiert (JSON-Klon für `viewState`).
- History-Patches basieren auf `captureSnapshot()`/`restoreSnapshot()` und vergleichen Elemente mit `elementsAreEqual`, wodurch Layout-, Eltern- und ViewState-Änderungen erkannt werden.
- Undo/Redo und alle `state`-Events geben kopierte Snapshots zurück – Änderungen daran müssen über Store-Befehle zurückgespielt werden.

## LayoutElement Datenvertrag

`LayoutElementType` wird aus dem Component-Manifest generiert und erzwingt gültige Typ-Strings. Ein `LayoutElement` umfasst:

- **Geometrie:** `x`, `y`, `width`, `height` (ganzzahlig, beim Export gerundet).
- **Inhalt:** `label`, optionale `description`, `placeholder`, `defaultValue`.
- **Konfiguration:** optionale `options` (Array), `attributes` (Array), `layout` (`gap`, `padding`, `align`) für Container.
- **Beziehungen:** `parentId` (oder `undefined`), abgeleitetes `children`-Array (nur Container → ggf. leeres Array, sonst `undefined`).
- **Integrationen:** `viewBindingId` und `viewState` (JSON-serialisierbar), die für Preview/Runtime genutzt werden.

Der Tree hält interne Mutationsobjekte ohne `children`-Arrays; diese werden erst beim Snapshot hinzugefügt, damit Exporte deterministisch bleiben.

## Snapshot- und Persistenzformate

- **`LayoutEditorSnapshot`** enthält `canvasWidth`, `canvasHeight`, `selectedElementId` und die geklonten `elements`.
- **`LayoutBlueprint`** entspricht dem Export-Schema ohne Persistenz-Metadaten.
- **`SavedLayout`** ergänzt `LayoutBlueprint` um `id`, `name`, `createdAt`, `updatedAt`.
- `serializeState()` erstellt JSON mit gerundeten Canvas-/Element-Werten und trägt die zuletzt gespeicherten Metadaten (`lastSavedLayout*`) in zusätzliche Felder ein (`id`, `name`, `createdAt`, `updatedAt`).

## Sequenzübersichten

1. **Subscription & Export** – `subscribe()` liefert direkt `LayoutEditorState` und den aktuell gecachten Export-Payload, anschließend folgen Events erst nach `runInteraction()` oder manuellen Mutationen (`layout-editor-store.test.ts`).
2. **Mutation → History** – Store-Operationen schreiben in den `LayoutTree`, erzeugen via `getElementsSnapshot()` neue Snapshots und registrieren Patches über `commitHistory()` (`layout-editor-store.test.ts`, `layout-tree.test.ts`).
3. **Undo/Redo** – `LayoutHistory.undo/redo` spielen `undo`-/`redo`-Patches auf Basis des aktuellen Snapshots ein. Die Tests in `history-limits.test.ts` verifizieren Bounded-History, Baseline-Replay und Idempotenz.
4. **Import/Reset** – `applySavedLayout()` lädt persistierte Elemente in den Tree, setzt Canvas-Größen und aktualisiert Export/History-Baseline. Daraus entstehen sofort neue `state`-/`export`-Events für Integratoren.

## Contract Summary

1. `LayoutTree` ist die einzige Quelle für Eltern-/Kind-Beziehungen und Elementreihenfolgen.
2. Store-Konsumenten interagieren ausschließlich über `LayoutEditorStore`-APIs – direkte Mutationen an Snapshots werden verworfen.
3. Container ohne Kinder liefern ein leeres `children`-Array; Nicht-Container setzen `children` auf `undefined`.
4. History- und Export-Flows verlassen sich auf `cloneLayoutElement`; Änderungen daran müssen Tests (`layout-editor-store.instrumentation.test.ts`, `history-limits.test.ts`) berücksichtigen.
5. Persistenz-JSON bleibt stabil, weil alle Felder JSON-kompatibel sind und ViewStates tief geklont werden.

## Edge Cases

- **Snapshot-Immutabilität** – Alle Snapshots werden via `cloneLayoutElement` erzeugt; Tests (`layout-editor-store.test.ts`, `history-limits.test.ts`) stellen sicher, dass externe Mutationen wirkungslos bleiben.
- **ID-Kohärenz** – `LayoutTree.load()` entfernt duplizierte IDs und invalidierte Eltern, damit `collectDescendantIds` deterministisch bleibt (`layout-tree.test.ts`).
- **Canvas-Clamping** – `setCanvasSize()` begrenzt Werte auf 200–2000 px und protokolliert Anpassungen über `canvas:size`/`clamp:step` (siehe `layout-editor-store.instrumentation.test.ts`).
- **History-Limit** – `MAX_HISTORY_ENTRIES = 50`; Überläufe werden in die Baseline eingepflegt und Tests sichern Undo/Redo-Integrität (`history-limits.test.ts`).
- **Rundung beim Export** – `serializeState()` rundet Geometrien auf ganze Zahlen, damit persistierte Layouts deterministisch bleiben.

## Navigation

- [Documentation index](./README.md)
- [Layout History Design](./history-design.md)
- [State Layer](../src/state/README.md)
- [Model Layer](../src/model/README.md)
- [State- & History-Sollzustand](../../docs/layout-editor-state-history.md)

## Offene Aufgaben

- Keine – Änderungen an Modell oder State müssen mit Tests und den referenzierten Dokumenten abgestimmt werden.
