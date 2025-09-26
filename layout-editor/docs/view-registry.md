# View Registry

Die View-Registry kapselt alle Bindings, über die externe Plugins eigene Visualisierungen im Layout-Editor verfügbar machen. Sie stellt eine kleine API zur Verfügung, mit der Module ihre Views registrieren, abfragen und auf Änderungen reagieren können. Eine Gesamtsicht auf alle öffentlich angebotenen Methoden inklusive Workflows bietet die [Plugin-API-Referenz](./plugin-api.md).

## Registrierung

```ts
import { registerViewBinding } from "plugins/layout-editor";

registerViewBinding({
    id: "stat-block",
    label: "Stat Block",
    description: "Rendern eines Charakter-Blocks",
    tags: ["character", "utility"],
});
```

* `id` wird intern getrimmt und muss eindeutig sein.
* Bei einem Duplikat wird die Registrierung mit einer aussagekräftigen Fehlermeldung abgelehnt, sodass Plugin-Autoren Konflikte sofort erkennen.
* `resetViewBindings([...])` akzeptiert mehrere Bindings gleichzeitig und bricht den Vorgang ab, falls doppelte IDs erkannt werden. Bereits registrierte Bindings bleiben in diesem Fall unverändert erhalten.

## Abfragen & Diagnose

Für die Laufzeitdiagnose stehen mehrere Hilfsfunktionen bereit:

| Funktion | Zweck |
| --- | --- |
| `getViewBindings()` | Liefert alle registrierten Bindings. |
| `getViewBinding(id)` | Gibt ein einzelnes Binding zurück (oder `undefined`). |
| `hasViewBinding(id)` | Prüft schnell, ob eine ID bereits vergeben ist. |
| `getViewBindingIds()` | Gibt nur die IDs aller Bindings zurück, z. B. für Logging. |
| `getViewBindingsByTag(tag)` | Filtert Bindings nach Tags (Groß-/Kleinschreibung wird ignoriert). |
| `onViewBindingsChanged(listener)` | Beobachtet Registry-Änderungen und liefert stets einen Snapshot aller Bindings. |

Die Hilfsfunktionen erleichtern Fehlersuche und Telemetrie, ohne den bestehenden API-Umfang zu verändern.

## Fehlerbehandlung bei Duplikaten

* `registerViewBinding` wirft `Error: Duplicate view binding id "<id>" (currently registered as "<label>")`.
* `resetViewBindings` wirft `Error: Duplicate view binding ids detected: "<id>" [<label1>, <label2>, ...]`.

Entwickler können diese Fehler auffangen, um alternative Workflows anzubieten (z. B. UI-Benachrichtigungen oder automatische Umbenennungen).
