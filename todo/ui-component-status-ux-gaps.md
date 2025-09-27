---
status: open
priority: medium
area:
  - documentation
  - ux
owner: unassigned
tags:
  - ui-components
  - status-banner
links:
  - docs/ui-components.md
  - docs/persistence-diagnostics.md
  - layout-editor/src/ui/components/status-banner.ts
---

# Status-Banner – Eskalationsregeln definieren

## Originalkritik
- Der User-Wiki-Eintrag beschreibt mögliche Banner-Töne, aber keine Richtlinien, wann stattdessen Dialoge, Toasts oder Modals eingesetzt werden.
- Aktuell fehlt ein konsistenter Eskalationspfad zwischen Warnungen, Fehlern und Blockern.

## Kontext
- Ohne klare Eskalationsregeln entstehen divergierende UX-Muster, wenn Teams neue Statusmeldungen hinzufügen.
- Support benötigt Vorgaben, ab wann Benutzer aktiv aufgehalten oder informiert werden müssen.
- Monitoring/Telemetry (siehe `stage-instrumentation.md`) kann nur sinnvoll ausgewertet werden, wenn die Bedeutung der Töne dokumentiert ist.

## Betroffene Module
- `layout-editor/src/ui/components/status-banner.ts`
- User-Wiki (`docs/ui-components.md`)
- `docs/persistence-diagnostics.md`
- Mögliche Modalkomponenten (`layout-editor/src/ui/*`)

## Lösungsideen
- Eskalationsmatrix erstellen (Banner vs. Modal vs. Blocking-Screen) mit Beispielszenarien.
- Dokumentierte KPI-Schwellenwerte aus `persistence-diagnostics.md` integrieren.
- UX-Guideline veröffentlichen und in User-Wiki verlinken, Banner-Eintrag aktualisieren.
- Ergänzende Playbook-Checkliste für Support-/Oncall-Teams erstellen.
