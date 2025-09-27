# UI Layer

Dieser Ordner enthält die UI-Hilfsfunktionen des Layout-Editors – insbesondere Menü- und Baumrendering – und stellt die Verbindung zwischen dem Store (`src/state`) und den wiederverwendbaren UI-Komponenten her.

## Inhalte
- [`components/`](components/README.md) – Sammlung der komplexen UI-Komponenten (Stage, DiffRenderer, Shell usw.).
- [`editor-menu.ts`](editor-menu.ts) – Erzeugt kontextuelle Aktionsmenüs für Canvas- und Bauminteraktionen.
- [`element-tree.ts`](element-tree.ts) – Rendert die Element-Bibliothek als gruppierten Baum und meldet Selektionen.

## Aufgaben & Verantwortlichkeiten
- Kapselt DOM-Manipulationen, damit Presenter und Store ausschließlich Daten liefern.
- Nutzt die Basisklasse `UIComponent` aus `components/component.ts`, um Listener/Cleanups sicher zu verwalten.
- Bindet CSS-Klassen mit dem Präfix `sm-le-` und `sm-elements-` ein; neue Klassen folgen diesem Namensschema für konsistentes Styling.

## Arbeitskonventionen
- **Lebenszyklus**: UI-Komponenten müssen `mount()`/`destroy()` aus `UIComponent` nutzen. Direkte DOM-Eingriffe erfolgen nur innerhalb von `onMount`/`onDestroy` oder über `UIComponentScope`-Scopes.
- **Event-Handling**: Ereignisse immer über `scope.listen` bzw. `this.listen` registrieren, damit Cleanups automatisch laufen.
- **Element-Baum**: `ElementTreeNode.id` muss eindeutig sein; Gruppen ohne `definition` werden als reine Abschnittsüberschriften behandelt.
- **Tests**: Änderungen an UI-Hilfen erfordern Aktualisierungen in `../../tests/ui-component.test.ts` bzw. `../../tests/ui-diff-renderer.test.ts`.
- **Stage-Performance**: `StageComponent` nutzt Snapshot-Cursor und `store.runInteraction()`, um Pointer-Frames ohne zusätzliche `getState()`-Aufrufe oder doppelte Exporte abzuwickeln. Neue Interaktionen müssen diese Mechanik respektieren.

## Weiterführende Dokumentation
- Architektur-Überblick: [`../README.md`](../README.md)
- Performance-Guidelines für UI-Widgets: [`../../docs/ui-performance.md`](../../docs/ui-performance.md)
- Projektweite Einordnung & Workflows: [`../../../README.md`](../../../README.md)

## Offene Punkte

- Dokumentationsabgleich für Interaktionen und Presenter: [`documentation-audit-ui-experience.md`](../../todo/documentation-audit-ui-experience.md).
