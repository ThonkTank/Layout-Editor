# Domain Configuration

Die Layout-Definitionen des Plugins lassen sich jetzt entweder aus den eingebauten Defaults
oder aus einer JSON-Datei im Vault laden. Diese Seite beschreibt Aufbau, Ablageort und
Validierungsregeln der Konfiguration sowie die notwendigen Schritte zur Aktivierung.

## Quellen auswählen

1. Öffne die **Einstellungen** von Obsidian und navigiere zu **Community Plugins → Layout Editor**.
2. Wähle den Reiter **Layout Editor**. Dort findest du den Toggle **Domänenquelle**.
3. Schalte den Toggle auf den gewünschten Modus:
   - **Builtin** lädt die mit dem Plugin ausgelieferten Attributgruppen, Element-Definitionen und Seed-Layouts.
   - **Vault** lädt alle Bereiche aus deiner Vault-Datei `Layout Editor/domain-config.json` (siehe unten).
4. Beim Umschalten wird die Domänenkonfiguration automatisch neu geladen und sowohl die Element-Definitionen
   als auch die Seed-Layouts aktualisiert. Der Seed-Sync läuft unmittelbar erneut, ergänzt fehlende Layouts
   und protokolliert Konflikte (z. B. doppelte Dateien) ohne bestehende Seeds zu überschreiben.

Die Auswahl wird über `localStorage` pro Client gesichert, sodass der zuletzt verwendete Modus beim nächsten Start wiederhergestellt wird.

## Weiterführend

- [Dokumentenindex](./README.md)
- Verwandt: [Layout-Bibliothek](./layout-library.md)

## Ablageort und Struktur der JSON-Datei

* Dateipfad: `Layout Editor/domain-config.json` (relativ zum Vault-Stamm).
* Voraussetzungen für den Vault-Modus:
  - Die Datei muss existieren und valides JSON enthalten.
  - Der Vault benötigt Schreib-/Leserechte für den Ordner `Layout Editor`.
  - Änderungen an der Datei erfordern ein erneutes Laden des Toggles oder einen Neustart des Plugins, damit sie übernommen werden.
* Erwartete Wurzelstruktur:

```json
{
  "attributeGroups": [
    {
      "label": "Allgemein",
      "options": [{ "value": "name", "label": "Name" }]
    }
  ],
  "elementDefinitions": [
    {
      "type": "my-element",
      "buttonLabel": "Mein Element",
      "defaultLabel": "Neues Element",
      "width": 200,
      "height": 120,
      "category": "element",
      "paletteGroup": "input",
      "defaultPlaceholder": "…"
    }
  ],
  "seedLayouts": [
    {
      "id": "custom-layout",
      "name": "Custom",
      "blueprint": {
        "canvasWidth": 960,
        "canvasHeight": 540,
        "elements": [
          {
            "id": "el-1",
            "type": "my-element",
            "x": 48,
            "y": 48,
            "width": 200,
            "height": 120,
            "label": "Titel",
            "attributes": []
          }
        ]
      }
    }
  ]
}
```

Alle Felder sind optional. Fehlende Abschnitte werden automatisch mit den Standardwerten
gefüllt (Default-Attributgruppen, Standard-Element-Definitionen und Seed-Layouts).

## Validierungsregeln

Die Laufzeitvalidierung überprüft sämtliche Pflichtfelder der Domänenkonfiguration:

- **Attributgruppen** benötigen einen String `label` sowie ein nicht-leeres Array von
  Optionen (`value` und `label` als Strings).
- **Element-Definitionen** müssen `type`, `buttonLabel`, `defaultLabel`, `width` und `height`
  als Pflichtfelder enthalten. Zahlenwerte müssen positiv sein. Optionale Felder wie
  `options`, `defaultLayout`, `defaultValue` usw. werden übernommen, sofern die Datentypen
  stimmen.
- **Seed-Layouts** verlangen `id`, `name` sowie ein Blueprint mit `canvasWidth`,
  `canvasHeight` und mindestens einem gültigen Element. Elementdaten prüfen Koordinaten,
  Größe, `label` und optionale Strukturen wie `layout`, `children` oder `options`.

Tritt ein Validierungsfehler auf, wird die Konfiguration verworfen, der Ladevorgang schlägt mit
`DomainConfigurationError` fehl und die Defaults bleiben aktiv. Die Fehlermeldung enthält alle
betroffenen Pfade (z. B. `elementDefinitions[0].buttonLabel`), damit Korrekturen schnell
möglich sind.

## Seed-Layouts synchronisieren

Beim Plugin-Start ruft `ensureSeedLayouts` die aktuell aktive Konfiguration ab und legt für
jedes definierte Seed-Layout einen Eintrag in der Layout-Bibliothek an. Existierende Einträge
werden nicht überschrieben. Scheitert das Laden der Vault-Konfiguration, wird automatisch auf
die eingebauten Seeds zurückgegriffen. Jeder Wechsel der Domänenquelle löst denselben
Synchronisationslauf erneut aus. Die Routine ist idempotent: Bereits vorhandene Layout-Dateien
bleiben unangetastet, fehlende Seeds werden ergänzt und erkannte Konflikte werden im Log
hervorgehoben. Details zur Struktur der Bibliothek findest du in
[`layout-library.md`](./layout-library.md).

## Entwicklungsnotizen

- `src/config/domain-source.ts` kapselt das Laden, Caching und Validieren der Domänendaten.
  Änderungen an der JSON-Struktur sollten ausschließlich hier erweitert werden.
- Tests (`tests/domain-configuration.test.ts`) decken Standardfall, erfolgreiche Vault-Ladung
  und Fehlerszenarien ab und dienen als Referenz für zukünftige Anpassungen.

## Offene Aufgaben

- Validierung & Soll-Dokumentation ergänzen: [`documentation-audit-configuration-settings.md`](../todo/documentation-audit-configuration-settings.md).
