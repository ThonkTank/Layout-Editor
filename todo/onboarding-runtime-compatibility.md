# Onboarding – Runtime Compatibility

## Kontext
- In den aktualisierten Setup-Leitfäden (User-Wiki, `layout-editor/docs/plugin-api.md`, `layout-editor/docs/tooling.md`, `layout-editor/docs/view-registry.md`) wird auf CI-gleiche Checks und Aktivierungsworkflows verwiesen.
- Es fehlt jedoch eine verbindliche Aussage zu den unterstützten Node.js-Versionen sowie zur minimalen Obsidian-Version, die Integratoren lokal benötigen.
- Ohne diese Angaben können neue Teammitglieder oder externe Plugin-Autoren in inkompatible Umgebungen installieren und Fehlverhalten schwerer einordnen.

## Betroffene Module / Dokumente
- `docs/README.md` (Setup-Workflows & Qualitätschecks)
- `layout-editor/docs/plugin-api.md`
- `layout-editor/docs/view-registry.md`
- `layout-editor/docs/tooling.md`
- potenziell `layout-editor/manifest.json` und Build-Skripte (`package.json`, `scripts/`)

## Lösungsideen
- Node.js LTS-Version aus CI-Definition oder `.nvmrc` ableiten und explizit in den Setup-Abschnitten dokumentieren.
- Minimal unterstützte Obsidian-Version aus `manifest.json` validieren und prominent verlinken.
- Optional: Automatisierten Preflight-Check (`npm run doctor`) einführen, der Node-Version und Obsidian-API-Level prüft.
- User-Wiki um einen Abschnitt „Systemvoraussetzungen“ erweitern und aus technischen Deep-Dives darauf verlinken.

## Erwartete Ergebnisse
- Neue Entwickler:innen können ohne Trial-and-Error ein konsistentes Runtime-Setup herstellen.
- CI- und lokale Ergebnisse nähern sich an, weil identische Node-Versionen verwendet werden.
- Support-Anfragen zu „funktioniert nicht“ Szenarien lassen sich schneller abgleichen.
