# Configuration

Configuration sources define how the editor loads domain-specific element metadata, attribute groups, and seed layouts. The logic here resolves the active configuration, validates incoming payloads, and exposes defaults for callers that need deterministic fallback data.

## Struktur & Dateien

```text
config/
├── README.md (dieses Dokument)
└── domain-source.ts – Lädt Domänendaten, validiert Payloads und stellt Fallbacks bereit
```

- `domain-source.ts` – Loads the configured domain bundle (builtin or vault JSON), validates payloads, exposes helper types for seed layouts, and emits descriptive errors when configuration is invalid.

## Conventions & Extension Points

- Always route configuration reads through the exported functions instead of accessing storage directly. They handle caching, validation, and default materialisation.
- When introducing new configuration keys, update both the TypeScript interfaces and validation logic before extending the persisted schema. Document the new fields in the [domain configuration guide](../../docs/domain-configuration.md).
- Domain source selection is controlled by the settings layer; new sources should integrate with [`../settings`](../settings/README.md) so users can toggle them at runtime.

## Validierungen, Fallbacks & Fehlerpfade

| Bereich | Validierungen | Fallback-Strategie | Fehleroberfläche & Referenzen |
| --- | --- | --- | --- |
| Attributgruppen (`attributeGroups`) | Prüft, dass jedes Objekt ein String-Label enthält und alle Optionen Strings sind.【F:layout-editor/src/config/domain-source.ts†L628-L707】 | Fehlende oder invalide Gruppen werden durch die Defaults ersetzt.【F:layout-editor/src/config/domain-source.ts†L1000-L1023】 | `DomainConfigurationError` mit Pfadangaben; Details dokumentiert unter [Validierungs-Matrix](../../docs/domain-configuration.md#validierungs--fallback-matrix). |
| Element-Definitionen (`elementDefinitions`) | Validiert Pflichtfelder (`type`, `buttonLabel`, `defaultLabel`, Dimensionen) und optionale Arrays/Layouts.【F:layout-editor/src/config/domain-source.ts†L707-L815】 | Bei Fehlern oder leerer Liste greifen die Standarddefinitionen.【F:layout-editor/src/config/domain-source.ts†L1000-L1023】 | Fehlerdetails werden an Listener propagiert und im Log ausgegeben; siehe [Persistenzfehler](../../docs/persistence-errors.md#fehlertypen--codes). |
| Seed-Layouts (`seedLayouts`) | Erzwingt IDs, Namen, Canvasmaße und mindestens ein valides Element pro Layout.【F:layout-editor/src/config/domain-source.ts†L815-L908】 | Ungültige Seeds führen zum Rückfall auf Default-Seeds; vorhandene gültige Seeds werden übernommen.【F:layout-editor/src/config/domain-source.ts†L1008-L1023】 | Seed-Sync meldet Fehler als `DomainConfigurationError`; Seed-Synchronisation dokumentiert in [Domain Configuration](../../docs/domain-configuration.md#seed-layouts-synchronisieren). |
| Vault-Zugriff | Überprüft Adapter-Methoden `exists`/`read` und fängt JSON-Parsing-Fehler ab.【F:layout-editor/src/config/domain-source.ts†L1025-L1074】 | Bei fehlender Datei oder Fehlern wird vollständig auf die Defaults zurückgesetzt.【F:layout-editor/src/config/domain-source.ts†L994-L1035】 | Fehler werden im Seed-Sync geloggt; dedizierte Banner-Codes folgen laut To-do [`domain-configuration-environment-docs.md`](../../todo/domain-configuration-environment-docs.md). |

- Die Tabelle spiegelt die Laufzeitlogik wider; Erweiterungen müssen hier und in der [Domain-Konfigurationsdokumentation](../../docs/domain-configuration.md) ergänzt werden.
- Fehlerdetails werden als Liste (`details`) innerhalb von `DomainConfigurationError` ausgegeben. UI-Schichten können sie für Debug-Ausgaben oder Support-Hinweise verwenden.

## Offene Punkte

- Validierungs- und Fehlerdokumentation prüfen: [`documentation-audit-configuration-settings.md`](../../todo/documentation-audit-configuration-settings.md).
- Umgebungsspezifische Optionen (z. B. Mobile Vaults, Remote-Speicher) dokumentieren: [`domain-configuration-environment-docs.md`](../../todo/domain-configuration-environment-docs.md).
