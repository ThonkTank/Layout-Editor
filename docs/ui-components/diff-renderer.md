# DiffRenderer

**Zweck:** Der `DiffRenderer` patcht DOM-Listen auf Basis stabiler Keys, verwaltet pro Knoten einen `UIComponentScope` und sorgt für deterministische Aufräumlogik. Implementierung siehe [`layout-editor/src/ui/components/diff-renderer.ts`](../../layout-editor/src/ui/components/diff-renderer.ts).

## Primäre Interaktionen

1. **Patch-Lifecycle**
   - `patch(values)` vergleicht Keys, erstellt neue Knoten über `options.create` und ruft optional `options.update` für jeden Eintrag auf.
   - Entfernte Knoten lösen `options.destroy` aus, bevor der zugehörige Scope `dispose()` aufgerufen und das DOM-Element entfernt wird.
2. **Scope-Vererbung**
   - Jeder Eintrag erhält einen eigenen Scope (`createScope` vom Host), der Listener und Timer kapselt.
   - `context.scope.register` erlaubt Komponenten-übergreifende Cleanups, die sowohl beim Entfernen des Knotens als auch beim Komponenten-Destroy greifen.
3. **Clear-Operation**
   - `clear()` entfernt alle Einträge inklusive `destroy`-Hooks und Scopes, ohne neue Werte zu rendern – relevant bei Stage-Remounts und Shell-Wechseln.

## Zustandsmodell

| Zustand | Auslöser | Verhalten |
| --- | --- | --- |
| Leer | Konstruktor oder `clear()` | Host enthält keine Child-Knoten, keine Scopes aktiv. |
| Synchronisiert | `patch(values)` erfolgreich | DOM spiegelt `values` in Reihenfolge der Keys. |
| Dirty | Zwischen zwei `patch`-Aufrufen | Renderer hält temporäre Maps, bis der Patch abgeschlossen ist. |

## Abhängigkeiten & Integrationen

- **Verbraucher:** Eingesetzt durch [`StageComponent`](stage.md), [`StructureTreeComponent`](structure-tree.md) und [`StatusBannerComponent`](status-banner.md) für dynamische Listen.
- **Scopes & Lifecycle:** Ergänzt das [`UIComponent`](component-base.md) Konzept, indem Scopes automatisch entsorgt werden.
- **Testing:** Verhalten validiert in [`layout-editor/tests/ui-diff-renderer.test.ts`](../../layout-editor/tests/ui-diff-renderer.test.ts).

## Accessibility & Telemetrie

- DiffRenderer selbst setzt keine ARIA-Attribute, muss aber semantische Strukturen (z. B. Listen) der Verbraucher respektieren.
- Für Performance-Metriken siehe [`layout-editor/docs/ui-performance.md`](../../layout-editor/docs/ui-performance.md#diff-renderer). Telemetrie-spezifische Erweiterungen laufen über dasselbe Dokument.
