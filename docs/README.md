# Benutzer-Dokumentation – Index

Dieses Verzeichnis bündelt die nutzerorientierten Ergänzungen zum technischen Wiki im Ordner [`layout-editor/docs/`](../layout-editor/docs/). Hier findest du Schritt-für-Schritt-Anleitungen, Migrationshinweise und Querverweise, damit du den Layout-Editor sicher einsetzen kannst.

## Struktur & Dateien in `docs/`

- [`api-migrations.md`](api-migrations.md) – Leitfaden für API-Änderungen, Layout-Schema-Migrationen sowie Qualitätschecks rund um Versionssprünge.
- [`persistence-diagnostics.md`](persistence-diagnostics.md) – Monitoring-Checks und Leitplanken für Speicherintegrität im Clusterbetrieb.
- [`stage-instrumentation.md`](stage-instrumentation.md) – Messpunkte, KPIs und Alarmierungs-Setup für Deploy- und Preview-Stages.

## Verwandte Deep-Dives in `layout-editor/docs/`

- [`plugin-api.md`](../layout-editor/docs/plugin-api.md) – Vollständige Referenz der öffentlichen Plugin-API inklusive Fehlerszenarien.
- [`layout-library.md`](../layout-editor/docs/layout-library.md) – Nutzung der Layout-Bibliothek, Persistenzregeln und Wiederherstellungsabläufe.
- [`data-model-overview.md`](../layout-editor/docs/data-model-overview.md) – Überblick über Layout-Entities, Beziehungen und Schemafelder.
- [`persistence-errors.md`](../layout-editor/docs/persistence-errors.md) – Fehlermeldungen und Troubleshooting bei Speichern & Laden.
- [`ui-performance.md`](../layout-editor/docs/ui-performance.md) – Optimierung von Rendering, Diffs und Interaktionen für große Layouts.
- [`i18n.md`](../layout-editor/docs/i18n.md) – Lokalisierung und Übersetzungs-Workflow im Layout-Editor.
- [`view-registry.md`](../layout-editor/docs/view-registry.md) – Lebenszyklus und Schutzmechanismen der View-Registry.
- [`domain-configuration.md`](../layout-editor/docs/domain-configuration.md) – Konfiguration von Datenquellen und Sicherheitsmechanismen.
- [`tooling.md`](../layout-editor/docs/tooling.md) – CLI-Helfer, Tests und Automatisierungen für Entwickler:innen.

## Weiterführende Hinweise

- Technische Detailentscheidungen findest du weiterhin direkt in den Deep-Dive-Dateien unter `layout-editor/docs/`.
- Ergänzungen oder neue Artikel sollten hier verlinkt werden, damit Anwender:innen einen konsistenten Einstiegspunkt besitzen.
- Offene technische Maßnahmen sind im [`../todo/`](../todo/) Verzeichnis dokumentiert und bei den jeweiligen Modulen verlinkt.

## Offene Aufgaben

- Integrations-Guides gegen Soll-Zustand prüfen: [`documentation-audit-integration-api.md`](../todo/documentation-audit-integration-api.md).
