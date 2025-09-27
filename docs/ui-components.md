# UI-Komponenten des Layout-Editors – Soll-Referenz

Diese Seite dokumentiert den erwarteten Funktionsumfang der sichtbaren Editor-Bausteine. Sie ergänzt die technischen Detailbeschreibungen in `layout-editor/docs/` und dient als verbindlicher Abgleich für Produkt, QA und Entwicklung.

## Navigationshilfe

- [Stage (Canvas)](#stage-canvas)
- [Strukturbaum](#strukturbaum)
- [Inspector-Panel](#inspector-panel)
- [Status-Banner](#status-banner)
- [Editor-Hülle & Resizer](#editor-hülle--resizer)
- [Menüs & Kontextaktionen](#menüs--kontextaktionen)

> 💡 **Technische Deep-Dives**: Siehe insbesondere [`layout-editor/src/ui/components/README.md`](../layout-editor/src/ui/components/README.md) für den Komponentenüberblick, [`layout-editor/docs/ui-performance.md`](../layout-editor/docs/ui-performance.md) für Render- und Diff-Verhalten sowie [`docs/stage-instrumentation.md`](stage-instrumentation.md) für Telemetrie.

## Stage (Canvas)

**Zweck:** Visualisiert das aktive Layout, ermöglicht direkte Manipulation von Elementen und steuert die Kamera. Verantwortlich ist [`StageComponent`](../layout-editor/src/ui/components/stage.ts).

### Interaktionsmuster

1. **Auswahl & Kontextwechsel**
   - Klick auf leeren Canvas setzt die Auswahl zurück (`onSelectElement(null)`).
   - Klick auf ein Element setzt `is-selected` und synchronisiert Strukturbaum & Inspector.
   - Inline-Mutationen (z. B. direktes Editieren über Previews) schließen mit `finalizeInlineMutation` ab, damit Store, Layout und Export konsistent bleiben.
2. **Bewegen & Begrenzen**
   - Drag startet nach `pointerdown` und hält das Element innerhalb der Canvas-Abmessungen (`clamp` auf `canvasWidth`/`canvasHeight`).
   - Container-Bewegungen triggern zusätzlich `applyContainerLayout` für Eltern.
3. **Größenänderung**
   - Resize-Griffe wechseln abhängig von Ecke den Cursor (`nwse-resize`/`nesw-resize`).
   - Mindestgröße entspricht `MIN_ELEMENT_SIZE`; Container aktualisieren abhängige Layouts.
4. **Kamera**
   - Erstinitialisierung erfolgt lazy nach `requestAnimationFrame`, Ziel ist `StageCameraCenterEvent` mit `reason: "initial"`.
   - Zoom (`wheel`) und Scroll/Pan (`pointermove` bei gedrückter Mitteltaste) emittieren Observer-Ereignisse für Telemetrie (`observeCamera`).

### Zustände

| Zustand | Beschreibung | Sichtbares Verhalten |
| --- | --- | --- |
| Initialisierung | Renderer erstellt DOM und wartet auf erstes `syncStage`. | Canvas leer, Kamera wird nachgelagert zentriert. |
| Auswahl aktiv | `selectedElementId` gesetzt. | Box mit `is-selected`-Klasse, Inspector zeigt Elementdetails. |
| Interaktion (Move/Resize) | `is-interacting` auf Element. | Cursor wechselt; Stage sperrt weitere Interaktionen bis Cleanup. |
| Kamera-Fokus | `focusElement` aufgerufen. | Kamera zentriert Ziel, `reason: "focus"` für Observer. |

### Verweise

- Renderpfad & Diffing: [`layout-editor/src/ui/components/diff-renderer.ts`](../layout-editor/src/ui/components/diff-renderer.ts).
- Kamera-Telemetrie & Metriken: [`docs/stage-instrumentation.md`](stage-instrumentation.md#kamera-telemetrie).
- Performance-Anforderungen: [`layout-editor/docs/ui-performance.md`](../layout-editor/docs/ui-performance.md#stage-component).

### Bekannte Lücken

- Barrierefreiheit (Tastaturnavigation & Screenreader-Ankündigungen) ist nicht spezifiziert → siehe [`todo/ui-component-accessibility-spec.md`](../todo/ui-component-accessibility-spec.md).

## Strukturbaum

**Zweck:** Spiegelt die Layout-Hierarchie, ermöglicht Auswahl, Reparenting und Reordering. Implementiert durch [`StructureTreeComponent`](../layout-editor/src/ui/components/structure-tree.ts).

### Interaktionsmuster

1. **Auswahl** – Klick auf `button.sm-le-structure__entry` ruft `onSelect` und synchronisiert Stage/Inspector.
2. **Drag & Drop**
   - Root-Dropzone erscheint, sobald Elemente vorhanden sind; erlaubt das Ablösen (`onReparent` mit `parentId: null`).
   - Kinder-Listen folgen der Modellreihenfolge (`children` des LayoutElements); Reorder sendet `onReorder` mit Ziel-ID und Position.
   - Während Drag markiert `onDragStateChange` Quell-Element und Zielzonen.
3. **Leerer Zustand** – Ohne Elemente zeigt `sm-le-empty` den Hinweis „Noch keine Elemente.“

### Zustände

| Zustand | Auslöser | Darstellung |
| --- | --- | --- |
| Leer | `elements.length === 0` | Nur leerer Hinweis, keine Dropzone. |
| Drop verfügbar | Drag gestartet & Container erlaubt | Aktive Dropzone (`is-active` auf Wurzel/Eintrag). |
| Selektion | `selectedId` gesetzt | Entry trägt `is-selected`, Stage-Highlight synchron. |
| Dragging | `draggedElementId` gesetzt | Entry markiert, Drop-Hinweise sichtbar. |

### Verweise

- Container-Gültigkeit & Constraints: [`layout-editor/docs/layout-library.md`](../layout-editor/docs/layout-library.md#layout-tree-service).
- Historie & Store-Interaktion: [`layout-editor/docs/data-model-overview.md`](../layout-editor/docs/data-model-overview.md#store-integration).
- Testszenarien: [`layout-editor/tests/ui-component.test.ts`](../layout-editor/tests/ui-component.test.ts) und [`layout-editor/tests/ui-diff-renderer.test.ts`](../layout-editor/tests/ui-diff-renderer.test.ts) für Drag/Render-Verhalten.

### Bekannte Lücken

- Reihenfolge der Tastatur-Fokusnavigation im Baum ist offen → [`todo/ui-component-accessibility-spec.md`](../todo/ui-component-accessibility-spec.md).

## Inspector-Panel

**Zweck:** Zeigt und editiert Eigenschaften des selektierten Elements. Der Funktionsumfang wird von [`renderInspectorPanel`](../layout-editor/src/inspector-panel.ts) bereitgestellt.

### Interaktionsmuster

1. **Leerer Zustand** – Ohne Auswahl erscheint `strings.inspector.emptyState` als Hinweis.
2. **Kontextinfo** – Oben `sm-le-meta` mit Typlabel, darunter Hinweistext (`strings.inspector.hint`).
3. **Container-Zuweisung** – Dropdown listet alle Container, blockiert Vorfahren/Abkömmlinge (`collectAncestorIds`/`collectDescendantIds`).
4. **Attribut-Übersicht** – Read-only Chip `sm-le-attr` fasst Attribute zusammen (`getAttributeSummary`).
5. **Aktionen** – `Löschen`-Button (Warn-Variante) ruft `deleteElement`.
6. **Dimension & Position** – Inline-Felder für `width`, `height`, `x`, `y` mit Grenzwerten (`MIN_ELEMENT_SIZE`, Canvasgrenzen). Änderungen synchronisieren Store, Export & Layout (`applyContainerLayout`).
7. **Custom Sections** – Komponenten-spezifische Controls werden über `getLayoutElementComponent` injiziert.

### Zustände

| Zustand | Beschreibung |
| --- | --- |
| Keine Auswahl | Inspector zeigt nur Heading & Empty-State-Hinweis. |
| Container | Zusätzliche Container-spezifische Felder aktiv; `ensureContainerDefaults` wird aufgerufen. |
| Read-only Felder | Nicht implementiert – pending Accessibility/Permissions-Konzept. |

### Verweise

- Lokalisierung: [`layout-editor/docs/i18n.md`](../layout-editor/docs/i18n.md#injecting-strings-into-presenters).
- Element-Komponenten: [`layout-editor/docs/view-registry.md`](../layout-editor/docs/view-registry.md).
- Store-Abläufe: [`layout-editor/docs/data-model-overview.md`](../layout-editor/docs/data-model-overview.md#store-integration).

### Bekannte Lücken

- Rollenspezifische Felder (Read-only vs. editierbar) fehlen in der Soll-Dokumentation → [`todo/ui-component-inspector-permissions.md`](../todo/ui-component-inspector-permissions.md).

## Status-Banner

**Zweck:** Kommuniziert kritische Statusinformationen (Speicherstand, Validierung, Ratelimits). Implementiert durch [`StatusBannerComponent`](../layout-editor/src/ui/components/status-banner.ts).

### Interaktionsmuster

1. **Ein-/Ausblenden** – `setState(null)` versteckt das Banner vollständig (`display: none`).
2. **Tonwahl** – `tone` bestimmt CSS-Modifikator `sm-le-status-banner--{tone}`.
3. **Details** – Optionale Liste (`<dl>`) aus `details`-Tuple (Label/Wert). Wird nur angezeigt, wenn vorhanden.
4. **Beschreibung** – Freitext-Zusatz unterhalb des Titels.

### Zustände

| Zustand | Beschreibung |
| --- | --- |
| Versteckt | Keine aktiven Statusmeldungen. |
| Info | Standardhinweis, z. B. Autosave aktiv. |
| Success | Abschluss-Meldungen (z. B. Export erfolgreich). |
| Warning | Nicht-blockierende Probleme (Quota nahe Limit). |
| Danger | Kritische Fehler, häufig gepaart mit Modal oder Blocker. |

### Verweise

- Fehlerbehebung & Persistenz: [`docs/persistence-diagnostics.md`](persistence-diagnostics.md).
- Telemetrie & Monitoring: [`docs/stage-instrumentation.md`](stage-instrumentation.md).

### Bekannte Lücken

- Eskalationspfad (wann Banner vs. Dialog) unklar → [`todo/ui-component-status-ux-gaps.md`](../todo/ui-component-status-ux-gaps.md).

## Editor-Hülle & Resizer

**Zweck:** Das `EditorShellComponent` verwaltet Struktur-Panel, Stage und Inspector inklusive Resizer-Logik und Panel-Breiten.

### Interaktionsmuster

1. **Panel-Initialisierung** – Panels übernehmen `initialSizes`; `applyPanelSizes` setzt Flex-Basis.
2. **Resizer** – Drag über `sm-le-resizer` (mit `role="separator"`, `aria-orientation="vertical"`). PointerCapture sorgt für konsistente Interaktion.
3. **Minimale Breite** – `minPanelWidth` & `minStageWidth` verhindern, dass Stage kollabiert.
4. **Persistenz** – `onResizePanels` Callback informiert Store/Settings zum Speichern.
5. **Header-Host** – `getHeaderHost()` stellt Aufnahmeort für Toolbars/Banner bereit.

### Zustände

| Zustand | Beschreibung |
| --- | --- |
| Standard | Panels auf Initialwerten. |
| Resizing | Aktiver Resizer trägt `is-active`. |
| Persistiert | Externe Consumer speichern Werte; Shell reflektiert bei `setPanelSizes`.

### Verweise

- Technische Layout-Details: [`layout-editor/src/ui/components/editor-shell.ts`](../layout-editor/src/ui/components/editor-shell.ts).
- Tooling zur Panel-Persistenz: [`layout-editor/docs/tooling.md`](../layout-editor/docs/tooling.md).

### Bekannte Lücken

- Kein definierter Fokusrahmen für Tastatur-Resize → [`todo/ui-component-accessibility-spec.md`](../todo/ui-component-accessibility-spec.md).

## Menüs & Kontextaktionen

**Zweck:** Kontextmenüs, Trigger über Buttons oder rechte Maustaste. Zentral verwaltet durch [`openEditorMenu`](../layout-editor/src/ui/editor-menu.ts).

### Interaktionsmuster

1. **Öffnen** – Menü erhält `anchor`, optionale Mausposition (`event`). Bereits offene Menüs schließen zuerst.
2. **Navigation** – Erstes aktivierbares Item erhält Fokus. ESC oder Blur schließen Menü.
3. **Items** – Unterstützt `item` (Label, optionale Beschreibung, `disabled`) und `separator`.
4. **Schließen** – Pointer außerhalb von Menü & Anker oder `onSelect` beenden Menü.

### Zustände

| Zustand | Beschreibung |
| --- | --- |
| Geschlossen | Kein Menü aktiv (`activeMenu === null`). |
| Offen | Menü im DOM, globale Listener aktiv. |
| Deaktiviertes Item | Item trägt `is-disabled`, reagiert nicht auf Klick/Enter/Space. |

### Verweise

- UI-Primitives: [`layout-editor/src/ui/components/primitives.ts`](../layout-editor/src/ui/components/primitives.ts).
- Workflow-Integration: [`docs/api-migrations.md`](api-migrations.md) für release-relevante Änderungen.

### Bekannte Lücken

- Vollständige Auflistung aller Menüs und Triggerpunkte fehlt → [`todo/ui-component-menu-inventory.md`](../todo/ui-component-menu-inventory.md).

## Weiteres Vorgehen

- Neue Komponenten müssen diese Struktur übernehmen (Zweck, Interaktion, Zustände, Verweise, Lücken).
- Querverweise zu technischen Spezifikationen sind Pflicht, damit Implementierung & Wiki konsistent bleiben.
- Offene Punkte werden ausschließlich im `todo/`-Ordner gepflegt (siehe oben verlinkte Dateien).
