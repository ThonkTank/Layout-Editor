# Status-Banner

**Zweck:** Kommuniziert Speichervorgänge, Fehlerzustände und Ratelimits über der Stage. Implementiert durch [`StatusBannerComponent`](../../layout-editor/src/ui/components/status-banner.ts).

## Primäre Interaktionen

1. **Aktivierung & Tonwahl**
   - `setState(null)` blendet das Banner aus (`display: none`).
   - Aktive States setzen `tone` (`info`, `success`, `warning`, `danger`) und aktualisieren CSS-Präfix `sm-le-status-banner--{tone}`.
2. **Inhalt & Details**
   - Titel und optionale Beschreibung vermitteln Kontext; zusätzliche Details erscheinen als Definition-Liste (`<dl>`), wenn `details` vorhanden sind.
   - Komponenten aktualisieren Inhalte über DiffRenderer, damit Timer & Listener bereinigt werden.
3. **Persistenz & Eskalation**
   - Kritische Fehler (`danger`) sollten Folgeaktionen (Modal, Blocker) gemäß To-Do [`todo/ui-component-status-ux-gaps.md`](../../todo/ui-component-status-ux-gaps.md) triggern.
   - Presenter synchronisieren Banner-State mit Store-Exporten und Persistenz-Mutationen.

## Zustandsmodell

| Zustand | Auslöser | Darstellung |
| --- | --- | --- |
| Versteckt | `setState(null)` | Keine DOM-Präsenz, Banner nimmt keinen Platz ein. |
| Info | Nicht-blockierende Hinweise (Autosave aktiv) | Blaue Variante, optionaler Beschreibungstext. |
| Success | Abschluss erfolgreicher Aktionen | Grüne Variante, kann nach Timeout ausblenden. |
| Warning | Ratelimit- oder Validierungswarnungen | Gelbe Variante, optional Detail-Liste. |
| Danger | Kritische Fehler | Rote Variante, erwartet weitere Eskalation (Modal/Dialog). |

## Abhängigkeiten & Integrationen

- **Shell-Einbindung:** Wird über `EditorShellComponent.getBannerHost()` montiert (siehe [`editor-shell.md`](editor-shell.md)).
- **Statusquellen:** Presenter spiegeln Ergebnisse aus `LayoutEditorStore.flushExport()` und Persistenzpfaden gemäß [`docs/persistence-diagnostics.md`](../persistence-diagnostics.md).
- **Monitoring & QA:** Telemetrie-Schwellen siehe [`docs/stage-instrumentation.md`](../stage-instrumentation.md#tests--qualit%C3%A4tssicherung).

## Accessibility & Telemetrie

- Banner verwenden ARIA-Live-Regionen (`role="status"`) zur Ankündigung; Details müssen strukturierte `<dl>`-Elemente bleiben.
- Eskalationspfade (wann Banner vs. Dialog) und Tastaturfokus gehören zum offenen To-Do [`todo/ui-component-status-ux-gaps.md`](../../todo/ui-component-status-ux-gaps.md).
- Screenreader-Textbausteine richten sich nach der globalen Accessibility-Richtlinie (siehe [`docs/ui-components.md`](../ui-components.md#accessibility-richtlinie-stage-tree-shell)); Banner nutzen weiterhin `role="status"` als Live-Region.
