# UI-Komponenten

Die Komponenten in diesem Ordner implementieren die interaktiven Widgets der Canvas-Ansicht. Sie folgen dem `UIComponent`-Pattern, um DOM-Lebenszyklen und Eventlistener deterministisch zu verwalten.

## Inhalte
- [`component.ts`](component.ts) – Basisklasse `UIComponent` inkl. `UIComponentScope`, Listener-Verwaltung und `renderComponent`-Helper.
- [`diff-renderer.ts`](diff-renderer.ts) – Leichtgewichtiger Renderer, der auf Key-basierten Diffs DOM-Bäume patcht.
- [`editor-shell.ts`](editor-shell.ts) – Umschließender Rahmen für Toolbar, Stage und Inspector.
- [`primitives.ts`](primitives.ts) – Hilfsfunktionen zum Erzeugen wiederkehrender DOM-Bausteine (Buttons, Panels, Placeholder).
- [`stage.ts`](stage.ts) – Canvas- und Kamera-Verwaltung inklusive Pointer-Interaktionen und Element-Synchronisation; Kamera-Hooks siehe [Stage-Instrumentierung › Kamera-Telemetrie](../../../docs/stage-instrumentation.md#kamera-telemetrie).
- [`status-banner.ts`](status-banner.ts) – Anzeige für Speichervorgänge, Fehlermeldungen und Rate-Limits.
- [`structure-tree.ts`](structure-tree.ts) – Visualisiert die Layout-Hierarchie und hält Selektion & Fokus synchron.

## Konventionen
- **Benennung**: Komponenten-Dateien enden auf `.ts` und exportieren genau eine Klasse `SomethingComponent`. Hilfsfunktionen werden in `primitives.ts` gesammelt.
- **Lifecycle-Hooks**: `onMount` richtet DOM-Elemente und Renderer ein. `onDestroy` konzentriert sich auf komponentenweite Ressourcen (`registerCleanup`) und ruft keine manuellen `scope.dispose()`-Kaskaden für Diff-Renderer mehr auf.
- **DiffRenderer**: `DiffRenderer` entsorgt nach dem optionalen `destroy`-Hook automatisch den zugehörigen Scope und entfernt den DOM-Knoten. `getKey` muss für jedes Modell stabil bleiben. `destroy` enthält ausschließlich komponentenspezifische Aufräumarbeiten (Cache-Updates, DOM-Attribute, Telemetrie).
- **CSS**: Komponenten erzeugen ausschließlich Klassen mit Präfix `sm-le-`. Zusätzliche Styles werden in `src/css.ts` registriert.
- **Tests**: Änderungen an Stage, StructureTree oder DiffRenderer erfordern Begleit-Updates in `../../tests/ui-component.test.ts`, `../../tests/ui-diff-renderer.test.ts` sowie Performance-Messungen laut [`../../docs/ui-performance.md`](../../docs/ui-performance.md).
- **Stage-Cursor**: Stage-Pointer-Interaktionen laufen über Snapshot-Caches und `store.runInteraction()`. Neue Pointer-Handler dürfen keine direkten `store.getState()`-Scans pro Frame hinzufügen.

## Scope-Hilfen

- `context.scope.listen(target, type, listener, options?)` registriert Eventlistener auf Kindknoten. Die Verbindung wird automatisch gelöst, sobald der Knoten den Baum verlässt oder der Renderer geleert wird.
- `context.scope.register(cleanup)` verknüpft beliebige Aufräumlogik (z. B. Observer, Timer, Kind-Komponenten). Der Cleanup wird beim Entfernen des Knotens oder beim `DiffRenderer.clear()`-Aufruf ausgeführt.
- Kombiniere Scope-Hilfen mit komponentenweiten `registerCleanup`-Einträgen: globale Listener bleiben am Komponenten-Scope, Knoten-spezifische Ressourcen hängen am Diff-Kontext und werden durch den Renderer freigegeben.

## Weiterführende Dokumentation
- Canvas- und Rendering-Details: [`../../docs/ui-performance.md`](../../docs/ui-performance.md)
- Architektur des `src`-Moduls: [`../../README.md`](../../README.md)
- Projektweiter Kontext: [`../../../README.md`](../../../README.md)
