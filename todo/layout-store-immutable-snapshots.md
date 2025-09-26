# Layout-Store liefert mutierbare Snapshots

## Originalkritik
- **Mutierbarer Store-Snapshot:** `LayoutEditorStore.getState()` gibt die interne `state`-Instanz mit direkten Verweisen auf die `LayoutElement`-Objekte aus (`src/state/layout-editor-store.ts`, Zeilen 79–137, 326–360). UI-Schichten mutieren diese Objekte außerhalb des Stores (z. B. `StageComponent.beginMove` aktualisiert Kinderkoordinaten direkt), wodurch Undo/Redo und History-Snapshots inkonsistent werden können. Der Store benötigt unveränderliche Snapshots oder Proxies, damit externe Konsumenten keine Seiteneffekte einführen.

## Kontext
- Der Store reicht aktuell Referenzen in Presenter- und Komponentenebenen durch, wodurch Pointer-Handler Änderungen vornehmen, bevor History-/Undo-Routinen greifen.
- Undo/Redo-Tests decken nur den bisherigen Snapshot-Mechanismus ab; sobald externe Mutationen passieren, verliert die Historie ihre deterministische Reihenfolge.
- Mehrere Module (Stage, Strukturbaum, Inspector) greifen zeitgleich auf dieselben Objekte zu, was race conditions begünstigt.

## Betroffene Module
- [`layout-editor/src/state/layout-editor-store.ts`](../layout-editor/src/state/layout-editor-store.ts)
- [`layout-editor/src/ui/components/stage.ts`](../layout-editor/src/ui/components/stage.ts)
- [`layout-editor/src/ui/components/structure-tree.ts`](../layout-editor/src/ui/components/structure-tree.ts)
- [`layout-editor/tests/history-limits.test.ts`](../layout-editor/tests/history-limits.test.ts) (History-Erwartungen anpassen)

## Lösungsideen
- Store-API auf unveränderliche Snapshots, strukturierte Clones oder Proxy-Wrapper umstellen, bevor der Zustand nach außen gegeben wird.
- Mutationseinträge zentral über Commands/Cursors leiten, damit Pointer-Handler keine direkten Objektzugriffe mehr benötigen.
- History- und Undo/Redo-Tests um Szenarien mit simultanen Pointer- und Inspector-Änderungen erweitern.
- Dokumentation der neuen Snapshot-Garantien in `docs/api-migrations.md` und im Root-README ergänzen, sobald umgesetzt.
