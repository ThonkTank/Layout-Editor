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

## Dokumentationspflichten

1. **Soll-Zustand beschreiben:** Jede Seite definiert den erwarteten Nutzerwert und verweist auf technische Quellen wie [`layout-editor/src/ui/components/README.md`](../layout-editor/src/ui/components/README.md) oder spezifische Komponenten-Dateien.
2. **Interaktionsketten abbilden:** Stage ⇄ Tree Handshakes, Drag-Lifecycles und Menüverhalten folgen den Vorgaben in [`layout-editor/src/ui/README.md`](../layout-editor/src/ui/README.md).
3. **Cross-Links pflegen:** Technische Readmes verlinken zurück auf diese Wiki-Seiten, damit Reviewer den Soll-/Ist-Abgleich durchführen können.
4. **Abweichungen als To-Do erfassen:** Offene Accessibility-, Menü- oder Eskalationslücken verweisen auf die bestehenden Tickets im [`todo/`](../todo/) Verzeichnis (z. B. [`todo/ui-component-accessibility-spec.md`](../todo/ui-component-accessibility-spec.md)).

## Weitere Ressourcen

- Performance- und Messpunkterläuterungen: [`layout-editor/docs/ui-performance.md`](../layout-editor/docs/ui-performance.md), [`docs/stage-instrumentation.md`](stage-instrumentation.md).
- Workflow-Einstiege & Glossar: [`docs/README.md`](README.md).
- Architektur der UI-Schicht: [`layout-editor/src/ui/README.md`](../layout-editor/src/ui/README.md).

Neue UI-Widgets werden erst nach Ergänzung in diesem Kapitel als „Soll“ akzeptiert. Änderungen an Interaktionsmustern müssen sowohl hier als auch in den technischen Dokumenten synchronisiert werden.
