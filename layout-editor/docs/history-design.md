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

## Bounded History Window

`LayoutHistory` hält maximal 50 Einträge. Bei Überlauf wird der älteste Eintrag entfernt und sein Vorwärtspatch in die Baseline eingearbeitet. Der Cursor reduziert sich entsprechend, sodass Undo/Redo weiterhin innerhalb des verbleibenden Fensters funktionieren.

## Replay Guarantees

- `undo()` und `redo()` arbeiten stets auf dem aktuell gespeicherten Snapshot (`currentSnapshot`).
- Beim Wiederherstellen ruft `restoreSnapshot()` den übergebenen Callback mit einem weiteren Klon auf, um externe Mutationen zu vermeiden.
- Tests in `tests/history-limits.test.ts` sichern Limit- und Replay-Verhalten ab; Instrumentation-Tests überwachen Telemetrie während History-Flows.

## Navigation

- [Documentation index](./README.md)
- [Data Model Overview](./data-model-overview.md)
- [State Layer](../src/state/README.md)

## Offene Aufgaben

- Konsistenzcheck und Ergänzungen siehe [`documentation-audit-state-model.md`](../todo/documentation-audit-state-model.md).
