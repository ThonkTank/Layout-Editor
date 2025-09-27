# Shared Element Foundations

Die Dateien in diesem Ordner enthalten wiederverwendbare Bausteine, die allen Element-Komponenten konsistente Preview- und Inspector-Verhalten geben. Verwende diese Basen immer dann, wenn neue Komponenten ähnliche Aufgaben erfüllen – so bleiben Palette, Stage und Inspector einheitlich.

## Dateien

| Pfad | Beschreibung |
| --- | --- |
| [`component-bases.ts`](./component-bases.ts) | Sammlung von Klassen für Preview-/Inspector-Flüsse (`ElementComponentBase`, `FieldComponent`, `TextFieldComponent`, `ContainerComponent`, `SelectComponent`) sowie Utility-Funktionen (`enhanceSelectToSearch`). |
| [`container-preview.ts`](./container-preview.ts) | Rendert das gemeinsame Container-Preview-Layout und kapselt Pointer-/Layout-Hilfen für verschachtelte Elemente. |

## Basisklassen im Detail

### `ElementComponentBase`
- Implementiert `LayoutElementComponent` aus [`../base.ts`](../base.ts) und hält die gemeinsame `definition`.
- Stellt optionale Hooks wie `renderInspector` und `ensureDefaults` bereit.
- **Verwendung:** Direkte Ableitung für Spezialfälle mit eigenem Verhalten, z. B. [`../components/view-container.ts`](../components/view-container.ts).

### `FieldComponent`
- Erweitert `ElementComponentBase` um Inspector-Felder für Label- und optional Placeholder-Eingaben.
- Bietet `createFieldWrapper`, um Previews inklusive Label-Wrapper zu erzeugen.
- **Verwendung:** Für Eingabeelemente mit Label/Placeholder-Anteilen, Grundlage für `TextFieldComponent` und `SelectComponent`.

### `TextFieldComponent`
- Baut auf `FieldComponent` auf und erzeugt `<input>` oder `<textarea>` Previews inklusive Value-/Placeholder-Sync.
- Reagiert auf `input`/`blur`-Events und ruft `finalize` auf, um Änderungen in Undo/Redo aufzunehmen.
- **Verwendung:** [`../components/text-input.ts`](../components/text-input.ts) und [`../components/textarea.ts`](../components/textarea.ts). Kann durch Optionen (z. B. `multiline`, `supportsPlaceholder`) angepasst werden.

### `SelectComponent`
- Ebenfalls von `FieldComponent` abgeleitet; erweitert die Preview um Dropdown-Strukturen.
- Nutzt `enhanceSelectToSearch`, um optional Suchfunktionen zu aktivieren.
- **Verwendung:** [`../components/dropdown.ts`](../components/dropdown.ts) und [`../components/search-dropdown.ts`](../components/search-dropdown.ts).

### `ContainerComponent`
- Ableitung von `ElementComponentBase`, die Standardverhalten für Container liefert (Default-Layout, Inspector, Preview).
- Verwendet [`renderContainerPreview`](./container-preview.ts), um Kinder konsistent anzuordnen.
- **Verwendung:** Alle Container-Varianten (`box`, `hbox`, `vbox`) in [`../components`](../components/README.md).

## Preview-Helfer

### `renderContainerPreview`
- Wird von `ContainerComponent` genutzt, um Kinderflächen, Padding und Gap in der Stage-Preview darzustellen.
- Bindet die Stage-Presenter (`stage-controller`) über den `ElementPreviewContext` aus [`../base.ts`](../base.ts) ein.
- **Best Practice:** Bei eigenen Container-Ableitungen nie direkt DOM-Manipulation duplizieren, sondern diesen Helfer verwenden, damit Drag/Drop-Verhalten konsistent bleibt.

## Integration in andere Module

- **Registry:** Neue Basisklassen oder Erweiterungen müssen nichts in [`../registry.ts`](../registry.ts) ändern, solange die Komponenten-Definition `LayoutElementDefinition` erfüllt.
- **UI-Hilfen:** Inspector-spezifische Controls kommen aus [`../ui.ts`](../ui.ts) und ergänzen die hier definierten Hooks.
- **Presenter:** Stage- und Inspector-Präsentationen (siehe [`../../presenters`](../../presenters)) erwarten, dass Komponenten `renderPreview`/`renderInspector` so implementieren, wie es die Basisklassen vorgeben. Abweichungen sollten dokumentiert und mit Tests abgesichert werden.

---

Weitere Kritikpunkte siehe [To-Do „Element-Dokumentation auditieren“](../../../../todo/element-library-doc-audit.md).
