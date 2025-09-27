# Editor-Shell & Resizer

**Zweck:** `EditorShellComponent` arrangiert Strukturbaum, Stage und Inspector, verwaltet Panelgrößen und stellt Mount-Punkte für Header, Banner und Toolbars bereit. Implementierung siehe [`layout-editor/src/ui/components/editor-shell.ts`](../../layout-editor/src/ui/components/editor-shell.ts).

## Primäre Interaktionen

1. **Panel-Initialisierung**
   - `setPanelSizes` überträgt gespeicherte Layouts; `applyPanelSizes` setzt `flex-basis` und stellt Mindestbreiten sicher.
   - `getHeaderHost()` liefert einen persistenten Mount-Container für Header/Toolbars.
2. **Resizing**
   - Drag auf `sm-le-resizer` nutzt Pointer-Capture, verhindert Textselektion und emittiert `onResizePanels` mit aktuellen Pixelwerten.
   - Resizer besitzen `role="separator"` und `aria-orientation="vertical"` als semantische Vorgabe.
3. **Persistenz & Events**
   - Abschluss eines Drags ruft `onResizePanels` für Presenter/Store; externe Speicherungen werden über `setPanelSizes` gespiegelt.
   - Shell reagiert auf Stage- oder Inspector-spezifische Updates, indem sie Sub-Hosts bereitstellt (`getStageHost`, `getInspectorHost`).

## Zustandsmodell

| Zustand | Auslöser | Darstellung |
| --- | --- | --- |
| Standard | Mount & `initialSizes` gesetzt | Panelbreiten folgen Startwerten, Resizer neutral. |
| Resizing | Pointer-Drag aktiv | Resizer trägt `is-active`, Panelbreite folgt Cursor. |
| Persistiert | Externe Verbraucher schreiben Werte zurück | Neue `setPanelSizes`-Werte werden sofort angewendet. |
| Banner aktiv | `getBannerHost()` mit Inhalt befüllt | Status-Banner erscheint oberhalb der Stage laut [`status-banner.md`](status-banner.md). |

## Abhängigkeiten & Integrationen

- **UI-Komponenten:** Hostet [`StageComponent`](stage.md), [`StructureTreeComponent`](structure-tree.md) und Inspector (siehe [`layout-editor/src/ui/inspector-panel.ts`](../../layout-editor/src/ui/inspector-panel.ts)).
- **Primitives & Styles:** Nutzt Klassenpräfix `sm-le-` gemäß [`layout-editor/src/ui/components/README.md`](../../layout-editor/src/ui/components/README.md#konventionen).
- **Persistenz:** Panelgrößen werden über Presenter an Settings/Store weitergereicht; Workflow-Beschreibung siehe [`docs/layout-editor-state-history.md`](../layout-editor-state-history.md#editor-shell-panelpersistenz).
- **Tests:** Layout-Snapshots und Resize-Verhalten sind Teil von [`layout-editor/tests/ui-component.test.ts`](../../layout-editor/tests/ui-component.test.ts).

## Ist-Analyse Fokus & ARIA

- **Resizer:** `div.sm-le-resizer` verwenden `role="separator"`, `aria-orientation="vertical"` und `tabindex="0"`. Es existieren keine `aria-valuenow`/`valuemin`/`valuemax` Angaben und keine Reaktion auf Tastaturereignisse.
- **Paneltitel:** `h3`-Überschriften sind visuell, aber nicht via `aria-labelledby` mit den Panels verknüpft.
- **Fokusfluss:** Nach einem `Tab` auf den Struktur-Resizer folgt direkt die Stage (wenn sie fokussierbar wäre). Resizer behalten den Fokus nach beendetem Drag.
- **Feedback:** Es gibt keine Ansagen, wenn Minimal- oder Maximalbreiten erreicht werden.

## Accessibility-Richtlinie

| Ziel | Soll-Vorgabe |
| --- | --- |
| **Resizer-Tastatursteuerung** | `ArrowLeft/Right` passen die jeweilige Panelbreite um 16 px an (`Shift` = 64 px). Werte werden begrenzt (`minPanelWidth`, `minStageWidth`). |
| **ARIA-Werte** | Resizer führen `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (Pixelwerte) sowie `aria-label` wie „Panelbreite Struktur“. Änderungen aktualisieren die Attribute sofort. |
| **Live-Region** | Beim Erreichen der Grenzen (min/max) informiert eine gemeinsame Live-Region („Strukturbreite minimal erreicht“). |
| **Fokus-Handhabung** | Nach abgeschlossenem Resize (Pointer oder Keyboard) springt der Fokus zurück in das Panel, das zuletzt aktiv war (Tree oder Inspector). |
| **Panel-Beschriftung** | Panels verwenden `role="region"` und `aria-labelledby` zeigt auf die jeweilige `h3`-Überschrift. |

> 🛠️ **Implementierungshinweis:** Keyboard-Resize nutzt denselben Codepfad wie Pointer-Drag (`beginResize`), d. h. `onResizePanels` wird identisch ausgelöst, damit Persistenz und Telemetrie keine Sonderfälle benötigen.

## Accessibility & Telemetrie

- Persistente Resize-Events sollten Telemetrie (z. B. Panel-Verteilung) protokollieren; Ergänzungen laufen über [`todo/ui-accessibility-and-diagrams.md`](../../todo/ui-accessibility-and-diagrams.md) für die Sequenzdokumentation.
- Die Richtlinie ergänzt die globale Übersicht in [`docs/ui-components.md`](../ui-components.md#accessibility-richtlinie-stage-tree-shell) und ersetzt frühere TODO-Verweise.
