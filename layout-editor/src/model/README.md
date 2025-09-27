# Model

Das Modell bildet die kanonische Baumstruktur aller Layout-Elemente ab. Es konzentriert Validierung, Eltern-Kind-Beziehungen und Ordnungsverwaltung an einer Stelle.

## Struktur

```
model/
├─ README.md
└─ layout-tree.ts
```

## LayoutTree

`layout-tree.ts` implementiert den `LayoutTree`, der alle `LayoutElement`-Instanzen als mutierbare Nodes hält und die externe Welt ausschließlich über geklonte Snapshots versorgt.

### Terminologie

- **Layout-Node** – interne, mutierbare Repräsentation eines `LayoutElement` ohne garantierte `children`-Arrays. Wird nur über `LayoutTree`-Methoden verändert.
- **Snapshot-Element** – durch `cloneLayoutElement` erzeugte Kopie eines Nodes. Dient als Grundlage für `LayoutEditorState`, `LayoutEditorSnapshot` und Exporte.
- **Globale Reihenfolge** – vom Tree verwaltete `order`-Liste aller Element-IDs, die Export- und History-Sequenzen bestimmt.
- **Container-Kinder** – abgeleitete Arrays (`children`) für Container-Elemente. Nicht-Container besitzen `children: undefined`.

### Kernaufgaben

- **Initialisierung (`load`)** – importiert persistierte Elemente, entfernt ungültige Elternreferenzen, synchronisiert `parentId`/`children` und stellt eindeutige IDs sicher.
- **Lookups** – `getElement`, `getChildIds`, `getChildElements` und `getParentId` liefern referenzierte Nodes für Store-Operationen. Vor jeder Rückgabe werden `children`-Arrays aktualisiert.
- **Mutation** – `insert`, `update`, `remove`, `setParent` und `moveChild` kapseln alle Schreibzugriffe. Der Baum verhindert Zyklen, Mehrfach-Einträge und sorgt für konsistente Reihenfolgen.
- **Snapshot-Erzeugung** – `getElementsSnapshot()` liefert die globale Reihenfolge aus `order` und stellt Container-Kinder ebenfalls bereit. Der Store klont diese Elemente vor der weiteren Verteilung.

### Wichtige Garantien

- `children` ist eine abgeleitete Struktur: Container ohne Kinder liefern ein leeres Array, Nicht-Container setzen `children` auf `undefined`.
- Elternwechsel über `setParent` validieren Zielcontainer (`isContainerType`), verhindern Selbstreferenzen und prüfen zyklische Beziehungen.
- Beim Entfernen eines Elements werden Kinder automatisch entkoppelt und bleiben in der globalen Reihenfolge erhalten, bis der Store weitere Maßnahmen ergreift.
- `moveChild` verschiebt Kinder innerhalb eines Containers, clamped auf gültige Indizes.

### Sequenzen

1. **Load/Reset** – `new LayoutTree(elements)` bzw. `load()` validiert Daten, setzt ungültige `parentId` auf `undefined` und erzeugt konsistente `children`-Arrays.
2. **Mutation → Snapshot** – Nach `insert`/`update`/`remove`/`setParent`/`moveChild` erzeugt der Store via `getElementsSnapshot()` eine geordnete Liste geklonter Elemente für State, History und Export.
3. **Reparenting** – `setParent` prüft Zielcontainer (`isContainerType`), entfernt das Element aus dem vorherigen Container und fügt es sortiert im Ziel ein. Tests (`layout-tree.test.ts`) verifizieren Reihenfolge sowie History-Interaktion.
4. **Reorder** – `moveChild` akzeptiert relative Offsets, clampet auf `0…children.length` und aktualisiert die globale Reihenfolge, damit Export und History übereinstimmen.

### Edge-Cases & Tests

- **Ungültige Referenzen** – `load()` entfernt tote `parentId`-Beziehungen und reduziert Mehrfacheinträge. Abgesichert durch `layout-tree.test.ts`.
- **Snapshot-Immutabilität** – `getElementsSnapshot()` liefert Kopien; History- und Store-Tests (`history-limits.test.ts`, `layout-editor-store.test.ts`) stellen sicher, dass externe Mutationen nicht zurück in den Tree laufen.
- **Container-Wechsel** – Kombination aus `setParent` und History-Replays hält Kinderlisten synchron (`layout-tree.test.ts`).
- **Order-Divergenzen** – Der Tree synchronisiert globale und Container-Reihenfolge; Export-Serialisierung prüft identische Sequenzen (`layout-tree.test.ts`).
- **Baseline-Replay** – Beim History-Reset arbeitet der Tree mit unveränderten Snapshots, damit `LayoutHistory` Patch-Paare korrekt anwenden kann (`history-limits.test.ts`).

## Konventionen & Erweiterungspunkte

- Interne Node-Objekte bleiben mutierbar, dürfen aber nur über `LayoutTree`-APIs verändert werden. Konsumenten erhalten Kopien via `cloneLayoutElement` (siehe [State-Layer](../state/README.md)).
- Neue Traversal-/Analysefunktionen sollten Hilfsfunktionen aus [`../utils`](../utils/README.md) nutzen, um z. B. Zyklen frühzeitig zu erkennen.
- Schema-Erweiterungen (zusätzliche Felder auf `LayoutElement`) erfordern Anpassungen an `load`, `cloneLayoutElement` und der Dokumentation im [Data Model Overview](../../docs/data-model-overview.md).
- Regressionstests für neue Operationen gehören nach `layout-tree.test.ts` und – falls History betroffen ist – nach `history-limits.test.ts`.

## Navigation

- [Data Model Overview](../../docs/data-model-overview.md)
- [State Layer](../state/README.md)
- [State- & History-Sollzustand](../../../docs/layout-editor-state-history.md)

## Offene Punkte

- Keine – Tree-Änderungen immer mit State-/History-Dokumentation und passenden Regressionstests abstimmen.
