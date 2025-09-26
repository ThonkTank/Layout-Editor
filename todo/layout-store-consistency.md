# Layout-Store garantiert keine Seiteneffekte

## Kontext
- Die aktuelle Store-Implementierung gibt in `LayoutEditorStore.getState()` direkte Referenzen auf interne `LayoutElement`-Objekte zurück.
- UI-Schichten wie die Stage mutieren diese Referenzen außerhalb des Stores, wodurch Undo/Redo und History-Snapshots inkonsistent werden können.
- Pointer-Handler durchsuchen bei jeder Bewegung die Elementliste linear und mutieren gleichzeitig Kinderknoten, was bei großen Layouts zu Performance-Problemen führt.

## Betroffene Module
- [`layout-editor/src/state/layout-editor-store.ts`](../layout-editor/src/state/layout-editor-store.ts)
- [`layout-editor/src/ui/components/stage.ts`](../layout-editor/src/ui/components/stage.ts)
- [`layout-editor/src/ui/components/structure-tree.ts`](../layout-editor/src/ui/components/structure-tree.ts) (indirekte Auswirkungen)

## Lösungsideen
- Store-API auf unveränderliche Snapshots oder Proxy-Objekte umstellen, damit externe Konsumenten nicht direkt auf den Mutations-State zugreifen können.
- Cursor- oder Cache-Objekte einführen, um Element-Lookups ohne `O(n)`-Vollscans pro Frame zu ermöglichen.
- History- und Undo/Redo-Fluss auf neue Snapshots ausrichten und Regressionstests in `layout-editor/tests/history-limits.test.ts` ergänzen.
- Performance-Messungen in `layout-editor/tests/ui-diff-renderer.test.ts` erweitern, sobald der Cursor-Ansatz implementiert ist.
