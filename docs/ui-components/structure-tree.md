# Strukturbaum

**Zweck:** Visualisiert die Layout-Hierarchie, synchronisiert Selektion zwischen Tree und Stage und erlaubt Reparenting sowie Reordering. Implementiert durch [`StructureTreeComponent`](../../layout-editor/src/ui/components/structure-tree.ts).

## Primäre Interaktionen

1. **Auswahlübernahme**
   - Klick auf `button.sm-le-structure__entry` ruft `onSelect` und aktualisiert Store, Stage und Inspector.
   - Fokus-Weiterleitung zur Stage erfolgt über den Handshake in [`layout-editor/src/ui/README.md`](../../layout-editor/src/ui/README.md#fokus-handshake-tree--stage).
2. **Drag & Drop**
   - Root-Dropzone aktiviert sich beim Start eines Drags, erlaubt Ablösen (`onReparent` mit `nextParentId: null`).
   - Einträge mit Container-Metadaten zeigen Kinderlisten gemäß Modellreihenfolge (`LayoutElement.children`).
   - Reorder löst `onReorder` mit Ziel-ID und Position (`before`/`after`) aus.
   - Während des Drags meldet `onDragStateChange` Quelle und Zielzonen für Presenter/Overlays.
3. **Leerer Zustand**
   - Ohne Elemente blendet der Baum `sm-le-empty` ein; Dropzone und Listen bleiben verborgen.

## Zustandsmodell

| Zustand | Auslöser | Darstellung |
| --- | --- | --- |
| Leer | `elements.length === 0` | Hinweis „Noch keine Elemente.“, keine Dropzones. |
| Standard | Mindestens ein Element | Root-Liste sichtbar, Container zeigen geordnete Kinder. |
| Selektion | `selectedId` gesetzt | Eintrag markiert `is-selected`, Stage hebt Element hervor. |
| Dragging | `draggedElementId` gesetzt | Quell-Eintrag markiert, Dropzonen zeigen Aktivitätszustand. |
| Drop verfügbar | Ziel erlaubt Einfügen | Dropzone trägt `is-active`, Presenter können Aktionen prüfen. |

## Abhängigkeiten & Integrationen

- **Utils & Constraints:** Nutzt `isContainerElement`, `collectDescendantIds` und Typ-Labels (`getElementTypeLabel`) aus [`layout-editor/src/ui/utils`](../../layout-editor/src/ui/utils/).
- **Renderer:** Kinderlisten verwenden [`DiffRenderer`](diff-renderer.md) mit eigenen Scopes, damit Listener pro Eintrag bereinigt werden.
- **Tests & Reviews:** Drag-/Render-Verhalten gesichert in [`layout-editor/tests/ui-component.test.ts`](../../layout-editor/tests/ui-component.test.ts) und [`layout-editor/tests/ui-diff-renderer.test.ts`](../../layout-editor/tests/ui-diff-renderer.test.ts).
- **Workflows:** Nutzerperspektive siehe [`docs/ui-components/stage.md`](stage.md) (Fokus-Kopplung) und [`docs/stage-instrumentation.md`](../stage-instrumentation.md#tests--qualit%C3%A4tssicherung) für QA-Checks.

## Accessibility & Telemetrie

- Tastaturnavigation und Screenreader-Rollen sind als offene Aufgabe in [`todo/ui-component-accessibility-spec.md`](../../todo/ui-component-accessibility-spec.md) dokumentiert.
- Drag-Status liefert `onDragStateChange` an Presenter; Telemetrie-Erweiterungen folgen dem To-Do [`todo/ui-accessibility-and-diagrams.md`](../../todo/ui-accessibility-and-diagrams.md) für Sequenzdiagramme.
