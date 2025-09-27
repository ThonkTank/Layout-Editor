---
status: open
priority: medium
area:
  - testing
owner: unassigned
tags:
  - layout-editor-store
  - history
links:
  - layout-editor/tests/layout-editor-store.test.ts
  - layout-editor/tests/history-limits.test.ts
  - layout-editor/src/state/layout-editor-store.ts
---

# Store-Snapshots vor Mutation schützen

## Originalkritik
- Im Test-README ist vermerkt, dass noch kein Szenario abdeckt, ob die vom Store gelieferten Snapshots außerhalb des Stores unveränderlich bleiben. Ohne entsprechenden Regressionstest könnten unbedachte Änderungen an `cloneLayoutElement` oder den History-Flows Mutationen durchrutschen.

## Kontext
- `LayoutEditorStore.getState()` und die Telemetrie-/History-Flows erzeugen tiefe Kopien der Layout-Daten, bevor sie an Presenter oder Tests zurückgegeben werden. Damit Undo/Redo und Export konsistent bleiben, dürfen externe Mutationen diese Snapshots nicht beeinflussen. Ein automatisierter Test fehlt bislang, um diese vertragliche Zusage einzufangen.

## Betroffene Module
- `layout-editor/tests/layout-editor-store.test.ts`
- `layout-editor/tests/history-limits.test.ts`
- `layout-editor/src/state/layout-editor-store.ts`

## Lösungsideen
- Einen neuen Testfall ergänzen, der einen Snapshot aus dem Store entnimmt, Felder mutiert und anschließend prüft, dass `getState()` und Historienläufe unverändert bleiben (z. B. erneute Auswahl oder `listLayouts`).
- Ergänzend sicherstellen, dass `cloneLayoutElement` für verschachtelte Strukturen (Kinder, Attribute, View-States) unabhängig kopiert.
- Falls bestehende Tests angepasst werden müssen, die Änderungen in `tests/layout-editor-store.test.ts` und `tests/history-limits.test.ts` bündeln und die Mutationsversuche mit klaren Assertions dokumentieren.
