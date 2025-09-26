# Persistenzfehler im Layout-Editor

Der Header des Layout-Editors blendet bei fehlgeschlagenen Speicheroperationen eine persistente Statusleiste ein. Die Leiste
stellt strukturierte Informationen dar, damit Anwender den Fehler ohne Konsole nachvollziehen können.

## Verhalten

- **Auslöser:** Fehler des `layout-library`-Moduls, z. B. ungültige IDs oder Elementdaten beim Speichern.
- **Darstellung:** Roter Banner unterhalb der Header-Statistik mit Titel, Beschreibung und Detail-Liste.
- **Details:**
  - Immer angezeigter Fehlercode (`layout/...`).
  - Kontextabhängige Empfehlungen (z. B. gültiger Größenbereich 200–2000 px).
  - Originalfehlermeldung, falls sie nicht bereits durch die Empfehlung abgedeckt ist.
- **Benachrichtigung:** Parallel erscheint weiterhin ein Obsidian-Notice mit einer zusammengefassten Meldung.
- **Rücksetzung:** Bei erfolgreichem Speichern oder erneuten Interaktionen verschwindet der Banner automatisch.

## Beispiele

| Situation | Bannerinhalt |
| --- | --- |
| Breite liegt außerhalb des zulässigen Bereichs | Titel „Breite der Arbeitsfläche ist ungültig“, Beschreibung zur gültigen Breite, Empfehlung zum gültigen Wertebereich, Fehlercode `layout/canvas-width-invalid`. |
| Layout enthält keine gültigen Elemente | Titel „Keine Layout-Elemente“, Hinweis zum Hinzufügen von Elementen, Fehlercode `layout/elements-empty`. |
| Unbekannter Fehler | Titel „Speichern fehlgeschlagen“, Beschreibung mit Hinweis auf Details, zusätzlich die Rohmeldung im Detailbereich. |

Die Banner-Komponente steht als `StatusBannerComponent` zur Verfügung und kann für weitere Statusmeldungen wiederverwendet
werden.
