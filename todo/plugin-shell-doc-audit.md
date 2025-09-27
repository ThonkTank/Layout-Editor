---
status: open
priority: high
area:
  - documentation
  - api
owner: unassigned
tags:
  - plugin-shell
  - view-registry
---

# Plugin-Shell-Dokumentationsaudit

## Originalkritik

- Die Dokumentation zur View-Registry verheißt zusätzliche Diagnose-Helfer (`getViewBinding`, `hasViewBinding`, `getViewBindingIds`, `getViewBindingsByTag`) als Teil der öffentlich importierbaren API. Der tatsächlich ausgelieferte Einstiegspunkt (Plugin-API sowie `index.ts`-Re-Exports) stellt diese Diagnosefunktionen nur teilweise bereit.

## Kontext

- `layout-editor/docs/view-registry.md` listet die genannten Helfer im Abschnitt „Abfragen & Diagnose“ als verfügbaren Teil der importierbaren Registry-API, inklusive der Aussage, dass der bestehende API-Umfang unverändert bleibt.
- Das in `layout-editor/src/main.ts` definierte `LayoutEditorPluginApi`-Objekt liefert jedoch ausschließlich `getViewBindings` und `onViewBindingsChanged` neben den Mutationsfunktionen; weitere Diagnose-Helfer fehlen vollständig.
- `layout-editor/src/index.ts` exportiert zwar `getViewBinding`, lässt aber `hasViewBinding`, `getViewBindingIds` und `getViewBindingsByTag` aus, womit auch direkte Modulimporte keinen dokumentationskonformen Umfang erhalten.

## Betroffene Module

- `layout-editor/docs/view-registry.md`
- `layout-editor/src/main.ts`
- `layout-editor/src/index.ts`

## Lösungsideen

- Öffentliche API und Re-Exports erweitern, sodass die dokumentierten Diagnosefunktionen tatsächlich verfügbar sind (inklusive Typdefinitionen und Tests für das Paket-Bundle).
- Alternativ die Dokumentation auf den realen Funktionsumfang zurückschneiden und klarstellen, dass weitergehende Diagnosen derzeit nicht über den Einstiegspunkt erreichbar sind.
- In beiden Fällen die User-Dokumentation und etwaige Workflows aktualisieren, damit Konsumenten verlässliche Hinweise für Shell-/Registry-Integrationen erhalten.
