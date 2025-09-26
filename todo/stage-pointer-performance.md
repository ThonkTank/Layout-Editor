# Stage-Pointer-Interaktionen verursachen O(n)-Scans

## Originalkritik
- **Stage-Interaktionen mit O(n)-Scans pro Frame:** Die Pointer-Handler der Stage greifen bei jedem Move/Resize-Event per `store.getState().elements.find(...)` auf Eltern- und Kindknoten zu (`src/ui/components/stage.ts`, Zeilen 151–206, 213–273). Diese linearen Suchen laufen pro Frame und werden zusätzlich durch direkte Kindmutationen in den gleichen Loops verstärkt. Für große Layouts führt das zu Jank und zu mehrfachen Re-Layouts. Benötigt wird ein lokaler Cache (z. B. Map auf `LayoutTree`) oder Cursor-Objekte, die ohne Vollscans und Nebenwirkungen arbeiten.

## Kontext
- Pointer-Events triggern mehrfach pro Frame und rufen jedes Mal `find` auf dem kompletten Element-Array auf.
- Die gleiche Routine mutiert gleichzeitig Kinderkoordinaten, was Re-Renders auslöst, bevor das Event vollständig verarbeitet wurde.
- Die Performance-Probleme sind eng mit der Store-Snapshot-Problematik verknüpft, benötigen aber dedizierte Stage-Optimierungen.

## Betroffene Module
- [`layout-editor/src/ui/components/stage.ts`](../layout-editor/src/ui/components/stage.ts)
- [`layout-editor/src/presenters/stage-controller.ts`](../layout-editor/src/presenters/stage-controller.ts)
- [`layout-editor/src/ui/components/structure-tree.ts`](../layout-editor/src/ui/components/structure-tree.ts) (Synchronisationsfolgen)
- [`layout-editor/tests/ui-diff-renderer.test.ts`](../layout-editor/tests/ui-diff-renderer.test.ts) & [`layout-editor/tests/ui-component.test.ts`](../layout-editor/tests/ui-component.test.ts) (Performance- und Lifecycle-Aspekte)

## Lösungsideen
- Stage-Interaktionen über Caches oder Cursor-Objekte abwickeln, die nur betroffene Branches neu berechnen.
- Mutation von Kindern über Store-Kommandos leiten, um Mehrfach-Layouts im selben Frame zu verhindern.
- Performance-Metriken in den UI-Tests ergänzen (z. B. Counting-Helpers für Pointer-Events), um Regressionen abzufangen.
- Dokumentation der neuen Cursor-/Cache-Strategie in `layout-editor/docs/ui-performance.md` und dem UI-README nachziehen.
