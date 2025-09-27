# Persistenz-, Konfigurations- & i18n-Doku Audit

## Originalkritik
- `docs/domain-configuration.md` verspricht, dass beim Umschalten der Domänenquelle sowohl Element-Definitionen als auch Seed-Layouts sofort aktualisiert werden. Die Implementierung lädt die neue Konfiguration zwar in `domainConfigurationService`, triggert aber keinen erneuten Seed-Sync; `ensureSeedLayouts` wird ausschließlich während `LayoutEditorPlugin.onload` aufgerufen. Dadurch bleiben Vault-Seeds nach einem Toggle unverändert.【F:layout-editor/docs/domain-configuration.md†L11-L17】【F:layout-editor/src/config/domain-source.ts†L935-L991】【F:layout-editor/src/main.ts†L116-L133】【F:layout-editor/src/seed-layouts.ts†L150-L209】

## Kontext
- Audit der Dokumente `layout-library.md`, `domain-configuration.md`, `persistence-errors.md` sowie der Modul-Readmes unter `src/config/`, `src/settings/` und `src/i18n/` gegen die aktuellen Seed-Flows, die Domänen-Toggle-Implementierung, Validierungsregeln und Lokalisierungs-Helper.
- Die Layout-Bibliothek, Persistenzfehler- und i18n-Dokumente beschreiben den aktuellen Stand korrekt; Handlungsbedarf besteht nur im Zusammenspiel zwischen Toggle-Dokumentation und Seed-Synchronisation.

## Betroffene Module
- Dokumentation: `layout-editor/docs/domain-configuration.md`.
- Laufzeitlogik: `layout-editor/src/config/domain-source.ts`, `layout-editor/src/seed-layouts.ts`, `layout-editor/src/main.ts`.

## Lösungsideen
- Dokumentation anpassen, um klarzustellen, dass Seed-Layouts nach einem Toggle nicht automatisch geschrieben werden, oder
- Implementierung erweitern (z. B. `onDomainConfigurationSourceChange` → `ensureSeedLayouts`), damit der beschriebene Workflow stimmt; dabei Konflikte und Idempotenz der Seeds berücksichtigen.
