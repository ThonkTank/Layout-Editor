---
status: open
priority: medium
area: documentation
owner: unassigned
tags:
  - ui
  - accessibility
  - diagrams
---

# Sequenzdiagramme & Barrierefreiheit für UI-Flows

## Originalkritik
- Die technischen Readmes beschreiben Stage-, Tree- und Header-Flows textuell, aber es fehlen verbindliche Sequenzdiagramme und Zustandsübersichten für kritische Interaktionen (z. B. Fokus-Handshake, Drag-Lifecycle, Persistenz-Feedback).
- Anforderungen zur Barrierefreiheit (Keyboard-Navigation, ARIA-Rollen, Kontrast) werden weder im User-Wiki noch in Modul-Dokumentationen konkretisiert.

## Kontext
- Betrifft die UI-Schichten `src/ui`, `src/presenters` sowie die Elements-Implementierungen, da dort Interaktionszustände und DOM-Semantik definiert werden.
- Nutzer:innen-Workflows im User-Wiki referenzieren diese Interaktionen, weshalb fehlende Diagramme und A11y-Kriterien aktuell nicht mit dem Soll-Zustand abgeglichen werden können.

## Betroffene Module
- `layout-editor/src/ui` – Komponenten und DOM-Baum für Stage, Tree und Menüs.
- `layout-editor/src/presenters` – Orchestriert Fokus, Drag-Sequenzen und Persistenzhinweise.
- `layout-editor/src/elements` – Liefert die konkreten UI-Bausteine für Stage & Inspector samt eventueller ARIA-/Keyboard-Hooks.
- User-Wiki (`docs/stage-instrumentation.md`, `docs/README.md`) – Muss die visualisierten Abläufe aufnehmen und den Soll-Zustand für Barrierefreiheit beschreiben.

## Lösungsideen
- Sequenzdiagramme (PlantUML oder Mermaid) für Fokus-Handshake Tree ⇄ Stage, Drag-Reparenting und Persistenzfehler-Flows erstellen und in den passenden Modul-Readmes einbetten.
- Accessibility-Guideline erarbeiten (Rollen, Tastatursteuerung, visuelle Zustände), in den Modul-Dokumenten verankern und im User-Wiki konsolidieren.
- Review-Checklist ergänzen, damit neue UI-Features Diagramme und A11y-Kriterien dokumentiert haben, bevor sie gemerged werden.
