# Layout History Design

## Struktur

```
docs/
├─ data-model-overview.md
├─ history-design.md
└─ README.md
```

## Overview

`LayoutHistory` verfolgt Mutationen des Layout-Editors über differenzbasierte Patches. Die öffentliche API (`push`, `undo`, `redo`, `reset`, `canUndo`, `canRedo`) bleibt kompatibel, während intern keine vollständigen Snapshots mehr gespeichert werden.

## Terminologie

- **Baseline** – erster gespeicherter Snapshot nach `reset()`. Dient als Ausgangspunkt für alle weiteren Patches.
- **Cursor** – aktueller Index innerhalb des Patch-Fensters. `cursor = entries.length` entspricht dem neuesten Zustand.
- **Patch** – `LayoutPatch` mit `canvas`, `elements`, `order`. Wird immer paarweise (`redo`/`undo`) gespeichert.
- **Window** – begrenzter Ringpuffer aus maximal 50 Einträgen (`MAX_HISTORY_ENTRIES`).
- **Restoring** – interner Guard (`isRestoring`), der Undo/Redo-Side-Effects vom erneuten `push()` ausschließt.

## Patch-based Storage

Jeder History-Eintrag enthält ein Vorwärts- (`redo`) und ein Rückwärts-Patch (`undo`):

- **Canvas** – `canvasWidth`, `canvasHeight` und `selectedElementId` werden nur gespeichert, wenn sie sich ändern. Drag-spezifische Zustände gehören nicht in die History.
- **Elemente** – Hinzufügungen, Entfernungen und Updates tragen ausschließlich betroffene `LayoutElement`-Kopien oder IDs. `cloneLayoutElement` stellt Tiefenkopien inklusive `layout`, `children`, `viewState` sicher.
- **Reihenfolge** – Änderungen an der Elementsequenz (z. B. Reparenting, Reorder) sichern die Ziel-ID-Liste sowie die inverse Reihenfolge.

Das Anwenden eines Patches baut den nächsten Snapshot durch gezielte Operationen auf dem vorherigen Zustand auf. Undo nutzt den inverse Patch. Da beide Richtungen materialisiert sind, erhalten Konsumenten weiterhin vollständige Snapshot-Klone.

## Lifecycle & Reset

- Der Konstruktor erwartet zwei Callbacks: `capture` (liefert aktuelle Snapshots) und `restore` (setzt einen Snapshot zurück in den Store).
- `push(snapshot?)` akzeptiert optional einen extern geklonten Snapshot; andernfalls wird der aktuelle Stand via Callback erfasst. Identische Snapshots erzeugen keinen Eintrag.
- `reset(initial?)` setzt die History zurück und verwendet einen geklonten Baseline-Snapshot als Ausgangspunkt.
- `isRestoring` kennzeichnet Undo/Redo-Replays, sodass aufrufende Stores (`LayoutEditorStore.commitHistory()`) keine neuen Einträge während eines Replays erzeugen.

## Sequenzen

1. **Initialisierung** – `new LayoutHistory(capture, restore)` → `reset()` legt Baseline und `currentSnapshot` fest.
2. **Mutation → push** – Nach einer Mutation erfasst der Store per `captureSnapshot()` den neuen Zustand und ruft `commitHistory()`/`push()`. Identische Snapshots werden verworfen (`layout-editor-store.test.ts`).
3. **Undo** – `undo()` dekrementiert den Cursor, wendet das gespeicherte `undo`-Patch auf den aktuellen Snapshot an und ruft den `restore`-Callback mit einer Kopie (`history-limits.test.ts`).
4. **Redo** – `redo()` erhöht den Cursor, spielt das `redo`-Patch ein und synchronisiert `currentSnapshot`. Tests prüfen Idempotenz auch nach Überschreitung des History-Limits (`history-limits.test.ts`).
5. **Overflow** – Beim Überschreiten des Fensters verschiebt `enforceLimit()` den ältesten Patch in die Baseline, reduziert ggf. den Cursor und bewahrt Konsistenz (`history-limits.test.ts`).

## Bounded History Window

`LayoutHistory` hält maximal 50 Einträge. Bei Überlauf wird der älteste Eintrag entfernt und sein Vorwärtspatch in die Baseline eingearbeitet. Der Cursor reduziert sich entsprechend, sodass Undo/Redo weiterhin innerhalb des verbleibenden Fensters funktionieren.

## Replay Guarantees

- `undo()` und `redo()` arbeiten stets auf dem aktuell gespeicherten Snapshot (`currentSnapshot`).
- Beim Wiederherstellen ruft `restoreSnapshot()` den übergebenen Callback mit einem weiteren Klon auf, um externe Mutationen zu vermeiden.
- Tests in `tests/history-limits.test.ts` sichern Limit- und Replay-Verhalten ab; Instrumentation-Tests überwachen Telemetrie während History-Flows.

## Edge Cases & Tests

- **Snapshot-Immutabilität** – `cloneSnapshot()` stellt sicher, dass externe Mutationen (auch an Undo-Basiszuständen) keine Effekte haben (`history-limits.test.ts`).
- **Cursor-Trim** – Nach einem `undo()` gefolgt von neuem `push()` werden alle Redo-Patches verworfen. Das Verhalten wird implizit über `layout-editor-store.test.ts` validiert.
- **No-Op Push** – Identische Snapshots erzeugen keine History-Einträge. Regressionen werden durch `layout-editor-store.test.ts` aufgefangen.
- **Re-Entrancy** – `isRestoring` schützt vor `push()` während Undo/Redo; der Store prüft das Flag (siehe [`src/state/layout-editor-store.ts`](../src/state/layout-editor-store.ts)).
- **Canvas/Order Sync** – Canvas- und Ordnungs-Patches decken Auswahlwechsel, Canvas-Resizes sowie Reparenting ab (`history-limits.test.ts`, `layout-tree.test.ts`).

## Navigation

- [Documentation index](./README.md)
- [Data Model Overview](./data-model-overview.md)
- [State Layer](../src/state/README.md)
- [State- & History-Sollzustand](../../docs/layout-editor-state-history.md)

## Offene Aufgaben

- Keine – History-Anpassungen erfordern ergänzende Tests sowie Updates in Data-Model- und State-Dokumentation.
