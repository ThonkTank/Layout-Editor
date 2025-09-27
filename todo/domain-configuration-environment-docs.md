---
status: open
priority: medium
area:
  - documentation
  - configuration
owner: unassigned
tags:
  - domain-config
  - persistence
  - environment
links:
  - layout-editor/src/config/README.md
  - layout-editor/src/settings/README.md
  - layout-editor/docs/domain-configuration.md
  - layout-editor/docs/persistence-errors.md
  - layout-editor/src/settings/domain-settings.ts
  - layout-editor/src/config/domain-source.ts
---

# Environment-spezifische Optionen & Fehlerpfade dokumentieren

## Kontext
- Mobile Clients und Sandboxed Browser bieten keinen vollwertigen `localStorage` bzw. Vault-Zugriff; das Verhalten bei aktivierter Vault-Konfiguration ist derzeit nur im Code ersichtlich.
- `DomainConfigurationError` wird zwar geloggt, aber ohne dedizierte Fehlercodes (`config/...`) in die Persistenzanzeige eingespeist.
- Remote-Speicher (z. B. iCloud/Obsidian Sync) können Lese-/Schreibverzögerungen verursachen, die nicht in der Dokumentation adressiert sind.

## Betroffene Module
- `src/config/domain-source.ts` (Vault-Lesezugriff, Default-Fallbacks)
- `src/settings/domain-settings.ts` (Persistenz der Quellenwahl, lokale Fallbacks)
- `docs/domain-configuration.md`, `src/config/README.md`, `src/settings/README.md`, `docs/persistence-errors.md`

## Offene Fragen
- Wie dokumentieren wir den empfohlenen Workflow für Geräte ohne `localStorage`? (z. B. automatischer Rückfall auf `builtin`, sichtbare Hinweise im UI)
- Welche Fehlercodes sollen für `DomainConfigurationError` eingeführt werden, damit Persistenzbanner konfigurationsbezogene Probleme klar benennen?
- Müssen zusätzliche Retry-/Backoff-Strategien für verzögerte Vault-Zugriffe beschrieben werden?

## Lösungsideen
- Erweiterung der Persistenz-Dokumentation um eine Sektion „Plattformbesonderheiten“ mit konkreten Handlungsschritten pro Plattform.
- Einführung einer Fehlercode-Tabelle `config/...` analog zur bestehenden `layout/...`-Matrix; Mapping in `describeLayoutPersistenceError` ergänzen.
- Ergänzende Tests oder Monitoring-Hooks beschreiben, die Remote-Latenzen sichtbar machen (z. B. Diagnostics-Events im Seed-Sync).
- Abgleich mit dem User-Wiki: Verlinken, wie Anwender Domain-Konfigurationen auf mobilen Geräten aktivieren bzw. Fehler erkennen.
