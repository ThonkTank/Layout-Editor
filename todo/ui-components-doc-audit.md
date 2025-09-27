# UI-Komponenten Doku-Audit

## Originalkritik
- Die Konventionen im Komponenten-README verlangen weiterhin, dass `DiffRenderer`-Hooks `scope.dispose()` manuell aufrufen. Die aktuelle Implementierung von `DiffRenderer` erledigt das selbst nach `destroy()`, wodurch die Dokumentation veraltet ist und unnötige bzw. doppelte Cleanups begünstigt.

## Kontext
- `DiffRenderer.patch()` ruft nach dem optionalen `destroy`-Hook immer `entry.scope.dispose()` auf. Zusätzliche Aufräumaufrufe würden doppelte Disposables auslösen. Die Stage- und Structure-Tree-Komponenten folgen bereits diesem Muster und übergeben nur Aufräumlogik, die den DOM-Cache aktualisiert.
- Die Dokumentation zu Pointer-Caching und Telemetrie-Hooks ist konsistent mit dem Ist-Zustand: `StageComponent` pflegt einen `elementCursorCache` je Snapshot und feuert `StageCameraObserver`-Events für Scroll-, Zoom- und Center-Aktionen.

## Betroffene Module
- `layout-editor/src/ui/components/README.md`

## Lösungsideen
- Konventionsabschnitt im Komponenten-README aktualisieren: klarstellen, dass `DiffRenderer` selbst `scope.dispose()` übernimmt und der `destroy`-Hook sich auf komponentenspezifische Aufräumarbeiten beschränken soll.
- Im selben Zug auf den Funktionsumfang des Scopes hinweisen (`context.scope.listen`/`register`), damit Integratoren erkennen, wie untergeordnete Komponenten sauber angebunden werden.
