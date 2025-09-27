# Persistenzfehler im Layout-Editor

Der Header des Layout-Editors blendet bei fehlgeschlagenen Speicheroperationen eine persistente Statusleiste ein. Die Leiste
stellt strukturierte Informationen dar, damit Anwender den Fehler ohne Konsole nachvollziehen können. Technische Hintergründe
zu Vault-Pfaden, Schema-Regeln und Fehlerquellen liefert [`layout-library.md`](./layout-library.md).

## Verhalten

- **Auslöser:** Fehler des `layout-library`-Moduls, z. B. ungültige IDs oder Elementdaten beim Speichern.
- **Darstellung:** Roter Banner unterhalb der Header-Statistik mit Titel, Beschreibung und Detail-Liste.
- **Details:**
  - Immer angezeigter Fehlercode (`layout/...`).
  - Kontextabhängige Empfehlungen (z. B. gültiger Größenbereich 200–2000 px).
  - Originalfehlermeldung, falls sie nicht bereits durch die Empfehlung abgedeckt ist.
- **Benachrichtigung:** Parallel erscheint weiterhin ein Obsidian-Notice mit einer zusammengefassten Meldung.
- **Rücksetzung:** Bei erfolgreichem Speichern oder erneuten Interaktionen verschwindet der Banner automatisch.
- **Konsistenz:** Die Codes spiegeln direkt die Validierungen aus der [Domain-Konfigurations-Matrix](./domain-configuration.md#validierungs--fallback-matrix) und der [`layout-library`](./layout-library.md) wider.

## Fehlertypen & Codes

| Code | Quelle der Validierung | Bannerinhalt & Empfehlungen | Fallback-Verhalten |
| --- | --- | --- | --- |
| `layout/id-invalid` | `resolveLayoutId` prüft IDs auf leere Werte.【F:layout-editor/src/layout-library.ts†L176-L210】 | Titel „Ungültige Layout-ID“, Hinweis auf gültige Namen, Empfehlung zur Umbenennung.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Speichern wird abgebrochen; bestehende Layout-Dateien bleiben unverändert.【F:layout-editor/src/layout-library.ts†L193-L233】 |
| `layout/id-invalid-characters` | Blockiert Pfadtrenner in IDs.【F:layout-editor/src/layout-library.ts†L176-L191】 | Banner beschreibt unzulässige Zeichen, verweist auf Entfernen von `/` und `\`.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Kein Dateischreibversuch; Nutzer korrigiert Namen und speichert erneut.【F:layout-editor/src/layout-library.ts†L193-L233】 |
| `layout/canvas-width-invalid` / `layout/canvas-height-invalid` | Validieren positive Canvas-Dimensionen vor dem Speichern.【F:layout-editor/src/layout-library.ts†L205-L233】 | Banner nennt gültigen Bereich (200–2000 px) und markiert das betroffene Maß.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Speichern schlägt fehl, UI behält letzte gültige Maße im Zustand.【F:layout-editor/src/state/layout-editor-store.ts†L1-L200】 |
| `layout/elements-empty` | `saveLayoutToLibrary` fordert mindestens ein Element.【F:layout-editor/src/layout-library.ts†L270-L326】 | Banner fordert zum Hinzufügen von Elementen auf.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Keine Dateiänderung; Seed-Sync bleibt unverändert aktiv.【F:layout-editor/src/seed-layouts.ts†L1-L160】 |
| `layout/elements-invalid` | Einzelne Elemente werden geprüft; invalide Werte lösen Fehler aus.【F:layout-editor/src/layout-library.ts†L270-L326】 | Banner erklärt, dass ein Element ungültige Eigenschaften enthält, und verweist auf die betroffene Gruppe.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Layout wird nicht gespeichert; Benutzer korrigiert Elemente oder lädt Seeds erneut.【F:layout-editor/src/layout-library.ts†L193-L326】 |
| `layout/unknown` | Fallback für unbehandelte Fehler (z. B. Vault-Zugriffe).【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Banner zeigt generische Meldung und listet Rohfehlermeldung, falls vorhanden.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 | Fehler wird geloggt; Anwender wiederholt Aktion oder prüft Vault-Protokolle.【F:layout-editor/src/presenters/header-controls.ts†L24-L83】 |

- Domain-Konfigurationsfehler (`DomainConfigurationError`) werden derzeit nur im Seed-Sync geloggt. Das Mapping auf Banner-Codes (`config/...`) ist als Folgearbeit im To-do [`domain-configuration-environment-docs.md`](../todo/domain-configuration-environment-docs.md) dokumentiert.
- Die Tabellenzeilen ergänzen die Validierungs-Matrix aus [`docs/domain-configuration.md`](./domain-configuration.md#validierungs--fallback-matrix) und dienen als Referenz für Reviewer.

## Beispiele

| Situation | Bannerinhalt |
| --- | --- |
| Breite liegt außerhalb des zulässigen Bereichs | Titel „Breite der Arbeitsfläche ist ungültig“, Beschreibung zur gültigen Breite, Empfehlung zum gültigen Wertebereich, Fehlercode `layout/canvas-width-invalid`. |
| Layout enthält keine gültigen Elemente | Titel „Keine Layout-Elemente“, Hinweis zum Hinzufügen von Elementen, Fehlercode `layout/elements-empty`. |
| Unbekannter Fehler | Titel „Speichern fehlgeschlagen“, Beschreibung mit Hinweis auf Details, zusätzlich die Rohmeldung im Detailbereich. |

Die Banner-Komponente steht als `StatusBannerComponent` zur Verfügung und kann für weitere Statusmeldungen wiederverwendet
werden.

## Weiterführend

- [Dokumentenindex](./README.md)
- Verwandt: [Layout-Bibliothek](./layout-library.md)
- Validierungen & Fallbacks: [Domain-Konfigurationsdokumentation](./domain-configuration.md#validierungs--fallback-matrix)

## Offene Aufgaben

- Fehlerpfad- und Wiki-Abgleich durchführen: [`documentation-audit-configuration-settings.md`](../todo/documentation-audit-configuration-settings.md).
- Fehlercode-Mapping für Domain-Konfiguration erweitern (z. B. `config/...`-Codes): [`domain-configuration-environment-docs.md`](../todo/domain-configuration-environment-docs.md).
