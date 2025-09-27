# UI-Primitives

**Zweck:** Die Primitives kapseln wiederkehrende UI-Bausteine (Buttons, Formfelder, Stacks, Statusanzeigen) auf Basis der Elements-Bibliothek und stellen konsistente APIs für Presenter bereit. Implementierung siehe [`layout-editor/src/ui/components/primitives.ts`](../../layout-editor/src/ui/components/primitives.ts).

## Primäre Interaktionen

1. **ButtonComponent**
   - Erstellt `sm-elements-button` Instanzen und leitet `click`-Events über `onClick` weiter.
   - `setDisabled` und `setLabel` erlauben Laufzeit-Updates; Label passt sich Icon-Präsenzen an.
2. **FieldComponent**
   - Kapselt `createElementsField`, bietet Zugriff auf `ElementsFieldResult` für Validierung und Value-Handling.
   - `setDescription` verwaltet optionale Hilfetexte, erstellt/entfernt DOM-Knoten nach Bedarf.
3. **StackComponent & StatusComponent**
   - `StackComponent` erzeugt Layout-Container für verschachtelte Controls.
   - `StatusComponent` aktualisiert Text & Ton über `setText`/`setTone` und hält Klassen konsistent (`sm-elements-status--{tone}`).

## Zustandsmodell

| Primitive | Zustände |
| --- | --- |
| ButtonComponent | Aktiv, deaktiviert (`disabled` true), Label aktualisiert. |
| FieldComponent | Beschreibung vorhanden/entfernt, Feldresultate zugänglich. |
| StackComponent | Mount/Unmount verwaltet Container-Element. |
| StatusComponent | Tone-Varianten entsprechend `ElementsStatusOptions`. |

## Abhängigkeiten & Integrationen

- **Elements-Bibliothek:** Baut auf [`layout-editor/src/elements/ui`](../../layout-editor/src/elements/ui) auf und garantiert Styles mit Präfix `sm-elements-`.
- **Komponenten-Nutzung:** Verwendet durch Inspector-Panel und Shell, wenn Presenter Controls dynamisch rendern.
- **Lifecycle:** Nutzt [`UIComponent`](component-base.md) für Mount/Dismount, wodurch Cleanups an globale Konventionen gebunden bleiben.

## Accessibility & Telemetrie

- Primitives erben ARIA-Attribute der Elements-Bibliothek; zusätzliche Anforderungen (z. B. Fokus-Reihenfolge) folgen der globalen Richtlinie in [`docs/ui-components.md`](../ui-components.md#accessibility-richtlinie-stage-tree-shell).
- Button- und Status-Interaktionen sollten Telemetrie-Events (z. B. Settings-Änderungen) konsistent loggen; Sequenzdiagramme folgen [`todo/ui-accessibility-and-diagrams.md`](../../todo/ui-accessibility-and-diagrams.md).
