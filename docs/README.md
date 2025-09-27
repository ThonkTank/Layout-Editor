# Benutzer-Dokumentation – Index

Dieses Verzeichnis bündelt die nutzerorientierten Ergänzungen zum technischen Wiki im Ordner [`layout-editor/docs/`](../layout-editor/docs/). Hier findest du Schritt-für-Schritt-Anleitungen, Migrationshinweise und Querverweise, damit du den Layout-Editor sicher einsetzen kannst.

## Struktur & Dateien in `docs/`

- [`api-migrations.md`](api-migrations.md) – Leitfaden für API-Änderungen, Layout-Schema-Migrationen sowie Qualitätschecks rund um Versionssprünge.
- [`persistence-diagnostics.md`](persistence-diagnostics.md) – Monitoring-Checks und Leitplanken für Speicherintegrität im Clusterbetrieb.
- [`stage-instrumentation.md`](stage-instrumentation.md) – Messpunkte, KPIs und Alarmierungs-Setup für Deploy- und Preview-Stages.
- [`ui-components.md`](ui-components.md) – Einstieg in die Soll-Referenz aller UI-Komponenten mit Verlinkungen zu Detailseiten.
- [`ui-components/`](ui-components/) – Kapitelweise Detaildokumentation pro Komponente (Stage, Strukturbaum, Shell, Banner, DiffRenderer, Basisklassen, Primitives).
- [`layout-editor-state-history.md`](layout-editor-state-history.md) – Soll-Zustand für Snapshots, History/Export-Flows und Telemetrie-Verpflichtungen.

## Setup-Workflows

- **Plugin-Aktivierung:** Folge dem How-To im User-Wiki-Einstieg und kontrolliere anschließend in der [Plugin-API-Referenz](../layout-editor/docs/plugin-api.md#setup-workflow-f%C3%BCr-integratoren), wie externe Module die API beziehen.
- **Entwicklungsumgebung:** Richte Node.js-Abhängigkeiten im Verzeichnis `layout-editor/` ein und spiegle CI-Checks über die [Tooling-Dokumentation](../layout-editor/docs/tooling.md#setup-workflow).
- **View-Bindings:** Verwende die Schritt-für-Schritt-Anleitung in der [View-Registry-Dokumentation](../layout-editor/docs/view-registry.md#setup-workflow), um neue Visualisierungen einzubinden.
- **Offene Lücke:** Die verbindliche Node.js-/Obsidian-Version für lokale Setups fehlt noch – dokumentiert im To-Do [`onboarding-runtime-compatibility.md`](../todo/onboarding-runtime-compatibility.md).

## Versionierung & Release-Hinweise

- Konsultiere [`api-migrations.md`](api-migrations.md) für verbindliche SemVer-Prozesse und Release-Checklisten.
- Die [Plugin-API](../layout-editor/docs/plugin-api.md#versionierung--kompatibilit%C3%A4t) beschreibt Guard-Methoden für Integratoren.
- Tooling-Updates, die CI betreffen, sind in [`layout-editor/docs/tooling.md`](../layout-editor/docs/tooling.md#versionierung--ci-kontext) dokumentiert.

## Fehlerdiagnose & Qualitätschecks

- Schnellstart für Fehlersuche in der Layout-Persistenz liefert [`persistence-diagnostics.md`](persistence-diagnostics.md); technische Details befinden sich in [`layout-editor/docs/persistence-errors.md`](../layout-editor/docs/persistence-errors.md).
- Für View-Probleme Verweise auf [`layout-editor/docs/view-registry.md#diagnose--fehlerbehebung`](../layout-editor/docs/view-registry.md#diagnose--fehlerbehebung) verwenden.
- Stage- und CI-Anforderungen sind in [`stage-instrumentation.md`](stage-instrumentation.md) sowie im [Tooling-Guide](../layout-editor/docs/tooling.md#tooling--ci-anforderungen) gebündelt.

## UI-Komponenten im Überblick

- Nutze [`ui-components.md`](ui-components.md) als zentrale Soll-Referenz für Stage, Strukturbaum, Inspector, Banner und Menüs.
- Detailfragen zu Kamera und Rendering beantwortet [`stage-instrumentation.md`](stage-instrumentation.md) sowie [`../layout-editor/docs/ui-performance.md`](../layout-editor/docs/ui-performance.md).
- Offene UX- und Accessibility-Aspekte sind als To-Dos verlinkt; das User-Wiki selbst dokumentiert nur den Soll-Zustand.

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
- Für State-, Snapshot- und History-Abläufe dient [`layout-editor-state-history.md`](layout-editor-state-history.md) als verbindliche Soll-Referenz; technische Hintergründe liefern die verlinkten Modul-Guides.

## Offene Aufgaben

- Integrations-Guides gegen Soll-Zustand prüfen: [`documentation-audit-integration-api.md`](../todo/documentation-audit-integration-api.md).
- Runtime-Voraussetzungen für Entwickler dokumentieren: [`onboarding-runtime-compatibility.md`](../todo/onboarding-runtime-compatibility.md).
- Accessibility-Standards für UI-Komponenten definieren: [`ui-component-accessibility-spec.md`](../todo/ui-component-accessibility-spec.md).
- Rollen- und Berechtigungskonzept im Inspector fixieren: [`ui-component-inspector-permissions.md`](../todo/ui-component-inspector-permissions.md).
- Eskalationspfad für Statusmeldungen beschreiben: [`ui-component-status-ux-gaps.md`](../todo/ui-component-status-ux-gaps.md).
- Kontextmenü-Inventar vervollständigen: [`ui-component-menu-inventory.md`](../todo/ui-component-menu-inventory.md).
