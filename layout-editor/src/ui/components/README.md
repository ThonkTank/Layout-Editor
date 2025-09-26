# UI-Komponenten

Die Komponenten in diesem Ordner implementieren die interaktiven Widgets der Canvas-Ansicht. Sie folgen dem `UIComponent`-Pattern, um DOM-Lebenszyklen und Eventlistener deterministisch zu verwalten.

## Inhalte
- [`component.ts`](component.ts) – Basisklasse `UIComponent` inkl. `UIComponentScope`, Listener-Verwaltung und `renderComponent`-Helper.
- [`diff-renderer.ts`](diff-renderer.ts) – Leichtgewichtiger Renderer, der auf Key-basierten Diffs DOM-Bäume patcht.
- [`editor-shell.ts`](editor-shell.ts) – Umschließender Rahmen für Toolbar, Stage und Inspector.
- [`primitives.ts`](primitives.ts) – Hilfsfunktionen zum Erzeugen wiederkehrender DOM-Bausteine (Buttons, Panels, Placeholder).
- [`stage.ts`](stage.ts) – Canvas- und Kamera-Verwaltung inklusive Pointer-Interaktionen und Element-Synchronisation.
- [`status-banner.ts`](status-banner.ts) – Anzeige für Speichervorgänge, Fehlermeldungen und Rate-Limits.
- [`structure-tree.ts`](structure-tree.ts) – Visualisiert die Layout-Hierarchie und hält Selektion & Fokus synchron.

## Konventionen
- **Benennung**: Komponenten-Dateien enden auf `.ts` und exportieren genau eine Klasse `SomethingComponent`. Hilfsfunktionen werden in `primitives.ts` gesammelt.
- **Lifecycle-Hooks**: `onMount` richtet DOM-Elemente und Renderer ein, `onDestroy` räumt alle Diff-Renderer und Observer über `scope.dispose()`/`registerCleanup` auf.
- **DiffRenderer**: Beim Einsatz von `DiffRenderer` muss `getKey` stabil bleiben; `destroy` sollte `scope.dispose()` für Kind-Komponenten aufrufen.
- **CSS**: Komponenten erzeugen ausschließlich Klassen mit Präfix `sm-le-`. Zusätzliche Styles werden in `src/css.ts` registriert.
- **Tests**: Änderungen an Stage, StructureTree oder DiffRenderer erfordern Begleit-Updates in `../../tests/ui-component.test.ts`, `../../tests/ui-diff-renderer.test.ts` sowie Performance-Messungen laut [`../../docs/ui-performance.md`](../../docs/ui-performance.md).

## Weiterführende Dokumentation
- Canvas- und Rendering-Details: [`../../docs/ui-performance.md`](../../docs/ui-performance.md)
- Architektur des `src`-Moduls: [`../../LayoutEditorOverview.txt`](../../LayoutEditorOverview.txt)
- Projektweiter Kontext: [`../../../README.md`](../../../README.md)
