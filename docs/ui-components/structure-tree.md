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

## Ist-Analyse Fokus & ARIA

- **Fokusierbarkeit:** Einträge sind `<button>` und somit tabbar. Es existiert kein Umgang mit Pfeiltasten; Fokus verlässt den Tree nach `Tab` ohne Schleife.
- **Semantik:** Buttons tragen nur sichtbaren Text (`Label`, Typ, Elternname). Keine `aria-level`, `aria-expanded` oder `aria-setsize` Informationen für Screenreader.
- **Drag & Drop:** HTML-Drag-Events (`draggable=true`) sind für Screenreader nicht zugänglich; es existiert kein Tastatur-Pendant.
- **Drop-Zonen:** Root-Dropzone ist ein `<div>` ohne Rolle. Aktivzustände werden nur visuell (`is-active`) dargestellt.

## Accessibility-Richtlinie

| Ziel | Soll-Vorgabe |
| --- | --- |
| **Fokussteuerung** | Tree erhält `role="tree"`. Einträge verwenden `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`. `Home/End` springen zum ersten/letzten Eintrag; `ArrowLeft/Right` klappen Container ein/aus. |
| **Selektion** | `aria-selected` spiegelt `is-selected`. `Enter`/`Space` aktivieren `onSelect`. Nach Aktivierung wird der Stage-Fokus (s. Stage-Richtlinie) ausgelöst. |
| **Drag-Ersatz** | Tastaturpfad: `Ctrl+Shift+ArrowUp/Down` verschiebt Elemente innerhalb des Containers, `Ctrl+Shift+[Left|Right]` ändert den Elternknoten. Aktionen sind undo-fähig und verwenden dieselben Store-Aufrufe wie Pointer-Drag. |
| **Drop-Zonen** | Root-Dropzone erhält `role="treeitem"` plus `aria-label="An den Wurzelknoten anhängen"`. Aktivität wird via `aria-live="polite"` angekündigt („Ziel verfügbar“ / „Ziel nicht verfügbar“). |
| **Screenreader-Text** | Button-Label folgt Format „{Typ-Label}: {Benutzerlabel} (Eltern: {Name}, Kinder: {Anzahl})“. Werte werden lokalisiert und auf 80 Zeichen gekürzt. |

> 📋 **QA-Hinweis:** Bis die Tastaturpfade implementiert sind, muss die manuelle Checkliste (siehe [`layout-editor/tests/README.md`](../../layout-editor/tests/README.md#manuelle-accessibility-checkliste)) den Status „nicht erfüllt“ dokumentieren.

## Accessibility & Telemetrie

- Drag-Status liefert `onDragStateChange` an Presenter; Telemetrie-Erweiterungen bleiben Bestandteil von [`todo/ui-accessibility-and-diagrams.md`](../../todo/ui-accessibility-and-diagrams.md) für Sequenzdiagramme.
- Die Tree-Richtlinie ergänzt die Gesamtübersicht in [`docs/ui-components.md`](../ui-components.md#accessibility-richtlinie-stage-tree-shell) und ist Referenz für zukünftige Implementierungen.
