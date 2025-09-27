---
status: open
priority: medium
area:
  - tests
  - ui
owner: unassigned
tags:
  - shortcuts
  - presenters
  - stage
links:
  - layout-editor/src/ui/README.md
  - layout-editor/src/presenters/README.md
  - layout-editor/docs/ui-performance.md
---

# Shortcut-Workflows automatisiert absichern

## Originalkritik
- Die aktualisierten UI-Dokumente beschreiben Shortcut-Sequenzen (Tree ↔ Stage ↔ Header) inklusive Telemetrie-Erwartungen, jedoch existieren keine automatisierten Tests, die Tastaturinteraktionen gegen den Store oder Presenter verifizieren.

## Kontext
- Tree- und Stage-Komponenten koordinieren Fokus, Auswahl und Kamera über Presenter (`StructurePanelPresenter`, `StageController`).
- Keyboard-Shortcuts sind im User-Wiki als Soll-Zustand dokumentiert ([UI-Komponenten › Keyboard-Shortcuts](../docs/ui-components.md#keyboard-shortcuts)).
- Performance-Guidelines fordern stabile Batch-Verarbeitung (`runInteraction`, `flushExport`), die bislang nur über Pointer-Szenarien getestet wird.

## Betroffene Module
- `layout-editor/src/presenters/structure-panel.ts`
- `layout-editor/src/presenters/stage-controller.ts`
- `layout-editor/src/ui/components/stage.ts`
- `layout-editor/tests`

## Lösungsideen
- Integrationstests schreiben, die Tree-Keyboard-Events simulieren (`ArrowUp/Down`, `Enter`, `Shift+Arrow`) und den resultierenden Fokus/Export-State prüfen.
- Telemetrie-Logger (`stageInteractionTelemetry`, `StageCameraObserver`) mocken und Sequenzen für Keyboard-gestützte Bewegungen/Snapping verifizieren.
- Header-Pfad (`HeaderControlsPresenter`) auf Shortcut-Benachrichtigungen prüfen, um Bibliotheksstatus und Notices zu testen.
- Erfolgsnachweis in den Modul-Readmes verlinken, sobald Tests vorliegen.
