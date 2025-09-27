---
status: open
priority: medium
area:
  - documentation
owner: unassigned
tags:
  - element-library
  - preview-hooks
---

# Element-Bibliothek: Dokumentationsaudit

## Originalkritik
- **Registry-Manifest unklar dokumentiert:** `layout-editor/src/elements/README.md` verweist zwar auf das Build-Artefakt `component-manifest.ts`, beschreibt aber nicht, wie Entwickler das Manifest bei neuen Komponenten regenerieren oder welches Script (`scripts/generate-component-manifest.mjs`) dafür zuständig ist. Dadurch bleibt unklar, wie die Registry konsistent gehalten wird.
- **Shared-Bibliothek ohne Utility-Übersicht:** `layout-editor/src/elements/shared/README.md` erläutert Basisklassen, erwähnt jedoch keine der Hilfsfunktionen (`createFieldWrapper`, Such-Utilities) und Lifecycle-Verträge (`finalize`, `ensureDefaults`), die in `component-bases.ts` vorausgesetzt werden. Neue Komponenten erhalten so keine Guidance für verpflichtende Aufrufe.
- **Preview-Hooks nicht beschrieben:** Weder die Element-README noch die Komponentenübersicht dokumentieren die Preview-Lifecycle-Hooks aus `ElementPreviewContext` (z. B. `registerPreviewCleanup`, `ensureContainerDefaults`, `applyContainerLayout`). Entwickler erkennen daher nicht, wann diese Aufräum- und Layout-Funktionen zu verwenden sind, obwohl komplexe Komponenten wie `view-container` darauf angewiesen sind.

## Kontext
- Die Readmes dienen als Einstieg in die Element-Bibliothek. Ohne klare Anleitung zur Manifest-Generierung riskieren wir veraltete Registries oder manuelle Änderungen am Build-Artefakt (`layout-editor/src/elements/component-manifest.ts`).
- Die Shared-Dokumentation fokussiert auf Klassen, lässt aber wesentliche Utilities unerwähnt. In der Praxis müssen Entwickler dennoch `createFieldWrapper`, `enhanceSelectToSearch` und das `finalize`-Pattern korrekt einsetzen, um Undo/Redo und Inspector-Sync zu gewährleisten.
- Die Preview-Hooks werden implizit genutzt (z. B. in `components/view-container.ts`), doch es fehlt eine dokumentierte Lifecycle-Beschreibung. Ohne diese Guidance besteht die Gefahr von Speicherlecks, fehlenden Default-Layouts oder inkonsistentem Verhalten bei Container-Komponenten.

## Betroffene Module
- `layout-editor/src/elements/README.md`
- `layout-editor/src/elements/shared/README.md`
- `layout-editor/src/elements/components/README.md`

## Lösungsideen
- Ergänze im Modul-README einen Abschnitt „Registry & Manifest-Pipeline“ mit Hinweisen zum Generator-Script, Trigger (Build-Step, NPM-Script) und Prüfkriterien (z. B. Warnung bei Duplikaten aus `registry.ts`).
- Erweitere die Shared-Dokumentation um eine Tabelle für Utilities und Hooks, inklusive Pflichtaufrufen (`finalize`, `registerPreviewCleanup`) und Best Practices zur Error-Handhabung.
- In der Komponenten-README einen Leitfaden „Preview-Lifecycle“ ergänzen, der exemplarisch erklärt, wann `ensureDefaults`, `ensureContainerDefaults` und `applyContainerLayout` aufzurufen sind, inkl. Verweis auf komplexe Beispiele (`view-container`). Optional kurze Code-Snippets einfügen.
