# UIComponent-Basisklasse

**Zweck:** `UIComponent` stellt den gemeinsamen Lifecycle für alle UI-Widgets bereit, verwaltet Host-Belegung, Listener-Cleanup und Scopes. Implementierung siehe [`layout-editor/src/ui/components/component.ts`](../../layout-editor/src/ui/components/component.ts).

## Primäre Interaktionen

1. **Mount & Hostbindung**
   - `mount(host)` zerstört ggf. einen vorherigen Komponenten-Besitzer desselben Hosts und ruft `onMount` der konkreten Komponente auf.
   - `requireHost()` validiert den Mount-Status und verhindert Aufrufe im unmontierten Zustand.
2. **Cleanup-Management**
   - `registerCleanup` speichert Aufräumfunktionen, die beim `destroy()` garantiert ausgeführt werden.
   - `listen` kapselt Eventlistener, entfernt sie automatisch beim Destroy und liefert ein manuelles Cleanup zurück.
3. **Scopes**
   - `createScope()` erzeugt einen Scope mit eigenem Cleanup-Stack; `scope.dispose()` räumt Eintrags-spezifische Ressourcen auf.
   - Scopes können zusätzliche Cleanups über `scope.register` aufnehmen, die sowohl beim Komponenten-Destroy als auch beim Scope-Dispose greifen.

## Zustandsmodell

| Zustand | Auslöser | Verhalten |
| --- | --- | --- |
| Unmontiert | Nach Konstruktion oder `destroy()` | Kein Host referenziert; Aufrufe von `requireHost()` werfen Fehler. |
| Montiert | `mount(host)` erfolgreich | Host verknüpft mit Komponente; `onMount`-Hook ausgeführt. |
| Zerstört | `destroy()` | Alle Cleanups laufen, Host-Referenz wird entfernt. |

## Abhängigkeiten & Integrationen

- **Komponenten:** Basis für [`StageComponent`](stage.md), [`StructureTreeComponent`](structure-tree.md), [`EditorShellComponent`](editor-shell.md) und weitere Widgets.
- **Scopes:** Ergänzt [`DiffRenderer`](diff-renderer.md), indem Listen-Knoten saubere Listener erhalten.
- **Render-Helfer:** `renderComponent(host, component)` montiert Komponenten funktional; genutzt in Presenter-Layern.
- **Konventionen:** Lebenszyklus-Vorgaben dokumentiert in [`layout-editor/src/ui/README.md`](../../layout-editor/src/ui/README.md#arbeitskonventionen).

## Accessibility & Telemetrie

- Komponenten müssen ARIA-Attribute in `onMount` setzen und über `registerCleanup` entfernen, um Zustände konsistent zu halten.
- Für Telemetrie wird empfohlen, Observer und Timer in Scopes zu kapseln, damit Messpunkte beim Entfernen eines DOM-Knotens sofort deaktiviert werden.
