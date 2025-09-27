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

## Contract Summary

1. `LayoutTree` ist die einzige Quelle für Eltern-/Kind-Beziehungen und Elementreihenfolgen.
2. Store-Konsumenten interagieren ausschließlich über `LayoutEditorStore`-APIs – direkte Mutationen an Snapshots werden verworfen.
3. Container ohne Kinder liefern ein leeres `children`-Array; Nicht-Container setzen `children` auf `undefined`.
4. History- und Export-Flows verlassen sich auf `cloneLayoutElement`; Änderungen daran müssen Tests (`layout-editor-store.instrumentation.test.ts`, `history-limits.test.ts`) berücksichtigen.
5. Persistenz-JSON bleibt stabil, weil alle Felder JSON-kompatibel sind und ViewStates tief geklont werden.

## Navigation

- [Documentation index](./README.md)
- [Layout History Design](./history-design.md)
- [State Layer](../src/state/README.md)
- [Model Layer](../src/model/README.md)

## Offene Aufgaben

- Lückenanalyse und Glossar-Abgleich: [`documentation-audit-state-model.md`](../todo/documentation-audit-state-model.md).
