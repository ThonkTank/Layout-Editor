# UI-Komponenten des Layout-Editors – Soll-Referenz

Diese Einstiegsseite bündelt alle nutzerorientierten Anforderungen an die UI-Komponenten und verweist auf die detaillierten Unterseiten im Ordner [`docs/ui-components/`](ui-components/). Der Aufbau ermöglicht Reviewer:innen, jede Komponente entlang der gleichen Struktur (Zweck, Interaktionen, Zustände, Abhängigkeiten, Accessibility) nachzuvollziehen und mit den technischen Readmes aus `layout-editor/src/ui/` abzugleichen.

## Struktur & Navigation

- [`ui-components/README.md`](ui-components/README.md) – Index, Dokumentationsstandard und Strukturdiagramm.
- [`ui-components/stage.md`](ui-components/stage.md) – Canvas, Kamera & Interaktions-Workflow.
- [`ui-components/structure-tree.md`](ui-components/structure-tree.md) – Hierarchieansicht, Reparenting, Drag & Drop.
- [`ui-components/editor-shell.md`](ui-components/editor-shell.md) – Panel-Verteilung, Resizer, Hosts.
- [`ui-components/status-banner.md`](ui-components/status-banner.md) – Statusmeldungen & Eskalation.
- [`ui-components/diff-renderer.md`](ui-components/diff-renderer.md) – Diffing & Scope-Management.
- [`ui-components/component-base.md`](ui-components/component-base.md) – Lifecycle & Scopes.
- [`ui-components/primitives.md`](ui-components/primitives.md) – Wiederverwendbare Controls.

## Accessibility-Richtlinie Stage ⇄ Tree ⇄ Shell

| Aspekt | Soll-Vorgabe | Status 2024-05 | Nachweis |
| --- | --- | --- | --- |
| **Fokusreihenfolge** | 1) Header-Kommandos → 2) Strukturbaum → 3) Stage → 4) Inspector. Stage erhält `tabindex="0"` am Host, Resizer übernehmen Fokus nur beim Drag oder gezieltem Tastatur-Resize. | Stage-Host ist derzeit nicht fokussierbar, Fokus springt nach Strukturbaum direkt zum Inspector. | Details in [`ui-components/stage.md`](ui-components/stage.md#ist-analyse-fokus--aria) & [`ui-components/editor-shell.md`](ui-components/editor-shell.md#ist-analyse-fokus--aria). |
| **Keyboard-Shortcuts** | `ArrowUp/Down` im Tree zum Wechseln der Auswahl, `Enter` übergibt Fokus an Stage und triggert Kamera-Fokus. Stage verarbeitet `Arrow`/`Shift+Arrow` für Move/Resize-Schritte; Resizer akzeptieren `ArrowLeft/Right` mit `Shift` für größere Inkremente. | Tree unterstützt `Tab`-Fokus dank `<button>`, aber keine Pfeiltasten-Shortcuts; Stage & Resizer reagieren ausschließlich auf Pointer. | Spezifikation pro Komponente siehe [`ui-components/structure-tree.md`](ui-components/structure-tree.md#accessibility-richtlinie) & [`ui-components/editor-shell.md`](ui-components/editor-shell.md#accessibility-richtlinie). |
| **Screenreader-Texte** | Strukturbaum-Anzeige liefert kombinierte Labels „Typ – Benutzerlabel – Eltern“. Stage meldet Selektion & Fokus über Live-Region, Resizer geben Grenzen als `aria-valuenow/min/max` aus. | Tree erzeugt lesbare Buttons, aber ohne `aria-level` oder Elterninformationen; Stage/Resizer besitzen keine Live-Region. | Analyse & Maßnahmen: [`ui-components/stage.md`](ui-components/stage.md#accessibility-richtlinie) & [`ui-components/structure-tree.md`](ui-components/structure-tree.md#accessibility-richtlinie). |
| **Live-Regionen** | Status-Banner (`status`) kündigt Änderungen an; Stage fokussiert Elemente via `aria-live="polite"` Nachricht „Element {Label} fokussiert, Position {x}/{y}“. | Nur Status-Banner implementiert Live-Region; Stage/Tree senden keine Ankündigungen. | Abgleich mit [`ui-components/status-banner.md`](ui-components/status-banner.md) und Stage-Leitlinie. |

> ℹ️ **Manual QA:** Die Tastaturpfade werden über die Checkliste in [`layout-editor/tests/README.md`](../layout-editor/tests/README.md#manuelle-accessibility-checkliste) dokumentiert. Reviewer müssen alle Punkte abhaken, bis automatisierte Tests existieren.

## Dokumentationspflichten

1. **Soll-Zustand beschreiben:** Jede Seite definiert den erwarteten Nutzerwert und verweist auf technische Quellen wie [`layout-editor/src/ui/components/README.md`](../layout-editor/src/ui/components/README.md) oder spezifische Komponenten-Dateien.
2. **Interaktionsketten abbilden:** Stage ⇄ Tree Handshakes, Drag-Lifecycles und Menüverhalten folgen den Vorgaben in [`layout-editor/src/ui/README.md`](../layout-editor/src/ui/README.md).
3. **Cross-Links pflegen:** Technische Readmes verlinken zurück auf diese Wiki-Seiten, damit Reviewer den Soll-/Ist-Abgleich durchführen können.
4. **Abweichungen dokumentieren:** Accessibility-Gaps sind im Abschnitt „Ist-Analyse“ der Komponenten festgehalten. Nur neue Lücken wandern in [`todo/`](../todo/).

## Weitere Ressourcen

- Performance- und Messpunkterläuterungen: [`layout-editor/docs/ui-performance.md`](../layout-editor/docs/ui-performance.md), [`docs/stage-instrumentation.md`](stage-instrumentation.md).
- Workflow-Einstiege & Glossar: [`docs/README.md`](README.md).
- Architektur der UI-Schicht: [`layout-editor/src/ui/README.md`](../layout-editor/src/ui/README.md).

Neue UI-Widgets werden erst nach Ergänzung in diesem Kapitel als „Soll“ akzeptiert. Änderungen an Interaktionsmustern müssen sowohl hier als auch in den technischen Dokumenten synchronisiert werden.
