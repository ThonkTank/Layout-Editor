# Element-Komponenten

Die Dateien in diesem Ordner instanziieren konkrete `LayoutElementComponent`-Objekte. Sie nutzen die Basisklassen aus [`../shared`](../shared/README.md), werden durch das [Komponenten-Manifest](../component-manifest.ts) gesammelt und über die [Registry](../registry.ts) in Palette, Stage und Inspector eingebunden.

## Übersicht der Komponenten

| Datei | Element-Typ | Basisklasse | Kurzbeschreibung & relevante Flows |
| --- | --- | --- | --- |
| [`box-container.ts`](./box-container.ts) | `box-container` | `ContainerComponent` | Vertikaler Container mit Standardabständen. Wird in der Stage durch den [`stage-controller`](../../presenters/stage-controller.ts) arrangiert und nutzt den gemeinsamen Preview-Renderer aus [`../shared/container-preview.ts`](../shared/container-preview.ts). |
| [`hbox-container.ts`](./hbox-container.ts) | `hbox-container` | `ContainerComponent` | Horizontale Variante mit zentrierter Ausrichtung; teilt Layout- und Preview-Logik mit den anderen Container-Komponenten. |
| [`vbox-container.ts`](./vbox-container.ts) | `vbox-container` | `ContainerComponent` | Vertikaler Container mit Stretch-Alignment und erklärendem Beschreibungstext für Inspector & Palette. |
| [`view-container.ts`](./view-container.ts) | `view-container` | `ElementComponentBase` | Spezialcontainer für externe Visualisierungen. Bindet Feature-Daten über die [View Registry](../../view-registry.ts) und nutzt UI-Primitiven aus [`../ui.ts`](../ui.ts) für Inspector-Felder. Implementiert Kamera-/Zoom-Verhalten direkt im Preview. |
| [`dropdown.ts`](./dropdown.ts) | `dropdown` | `SelectComponent` | Einfaches Auswahlfeld ohne Suche. Der Inspector stellt Label- und Options-Felder über die Select-Basis zur Verfügung; genutzt von Palette und Inspector-Präsentern. |
| [`search-dropdown.ts`](./search-dropdown.ts) | `search-dropdown` | `SelectComponent` | Dropdown mit aktivierter Suchfunktion (Select-Erweiterung). Verwendet `enhanceSelectToSearch` aus [`../shared/component-bases.ts`](../shared/component-bases.ts) und erscheint im Inspector mit Suchkonfiguration. |
| [`text-input.ts`](./text-input.ts) | `text-input` | `TextFieldComponent` | Einzeiliges Feld ohne Label in der Preview. Überschreibt `renderInspector`, da keine zusätzlichen Inspector-Felder benötigt werden. |
| [`textarea.ts`](./textarea.ts) | `textarea` | `TextFieldComponent` | Mehrzeilige Texteingabe mit Placeholder-Unterstützung. Inspector-Labels und Placeholder werden durch die TextField-Basis verwaltet. |
| [`label.ts`](./label.ts) | `label` | Eigene Implementierung | Überschrift mit Inline-Editing und Auto-Scaling. Nutzt [`../../inline-edit.ts`](../../inline-edit.ts) und interagiert mit dem Preview-Fluss aus [`../base.ts`](../base.ts). |
| [`separator.ts`](./separator.ts) | `separator` | Eigene Implementierung | Trennt Layoutbereiche. Rendert optional einen Titel (Inspector `renderLabelField`) und eine Divider-Linie in der Preview. |

## Preview-Lifecycle

1. **Context-Aufbau:** `renderPreview` erhält einen [`ElementPreviewContext`](../base.ts), der `preview`, `elements`, `finalize`, `registerPreviewCleanup`, `ensureContainerDefaults` und `applyContainerLayout` kapselt. Vor jeder DOM-Manipulation müssen Default-Werte gesetzt werden (z. B. via `ensureDefaults` oder `ensureContainerDefaults`).
2. **DOM & Interaktion:** UI-Knoten entstehen innerhalb von `preview`. Interaktionen müssen bei Statusänderungen `finalize(element)` aufrufen, damit Undo/Redo und Autosave korrekt arbeiten. Beispiel: [`text-input.ts`](./text-input.ts) registriert `blur`-Handler, [`dropdown.ts`](./dropdown.ts) reagiert auf `change`.
3. **Cleanup registrieren:** Langlaufende Listener, Timer oder Observer sind über `registerPreviewCleanup` zu entsorgen. Der [`view-container`](./view-container.ts) zeigt dies exemplarisch: ResizeObserver und `requestAnimationFrame` werden eingerichtet und im Cleanup wieder entfernt, damit Stage-Wechsel keinen Memory-Leak erzeugen.
4. **Container-Spezifika:** Container-Ableitungen rufen zunächst [`renderContainerPreview`](../shared/container-preview.ts) auf und können danach `applyContainerLayout` nutzen, um das Layout mit Stage-Presenter-Semantik zu synchronisieren.

> **Tipp:** Komplexe Previews wie [`view-container.ts`](./view-container.ts) sollten ihre Pointer-Events durch `stopPropagation()` entkoppeln, sobald sie Stage-Interaktionen überschreiben, und dennoch `finalize`/`pushHistory` nutzen, wenn Editor-Zustände verändert werden.

## Neue Komponenten hinzufügen

1. **Basisklasse wählen:** Prüfe die [Shared-Bibliothek](../shared/README.md), ob `ContainerComponent`, `FieldComponent`, `TextFieldComponent` oder `SelectComponent` passt. Andernfalls `ElementComponentBase` direkt erweitern.
2. **Implementierung erstellen:** Leg die Datei hier ab und implementiere `renderPreview` und optional `renderInspector`/`ensureDefaults`.
3. **Build laufen lassen:** Der Build aktualisiert [`component-manifest.ts`](../component-manifest.ts); anschließend steht die Komponente automatisch über [`registry.ts`](../registry.ts) und die Presenter (`stage-controller`, `structure-panel`) bereit.

---

Weitere Kritikpunkte siehe [To-Do „Element-Dokumentation auditieren“](../../../../todo/element-library-doc-audit.md).
