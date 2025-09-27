# View Registry

Die View-Registry kapselt alle Bindings, über die externe Plugins eigene Visualisierungen im Layout-Editor verfügbar machen. Sie stellt eine kleine API zur Verfügung, mit der Module ihre Views registrieren, abfragen und auf Änderungen reagieren können. Eine Gesamtsicht auf alle öffentlich angebotenen Methoden inklusive Workflows bietet die [Plugin-API-Referenz](./plugin-api.md).

## Navigation

- [Dokumentenindex](./README.md)
- User-Wiki: [`docs/README.md`](../../docs/README.md#verwandte-deep-dives-in-layout-editordocs)
- Verwandt: [Plugin-API](./plugin-api.md)

## Setup-Workflow

1. **Plugin initialisieren:** Sicherstellen, dass das Layout-Editor-Plugin aktiv ist (`app.plugins.enablePlugin("layout-editor")` laut User-Wiki).
2. **API-Version validieren:** `api.assertApiVersion("1.0.0", "view registry");` aufrufen, bevor Bindings registriert werden.
3. **Binding entwerfen:** IDs, Labels und optionale Tags vorab festlegen. Doppelte IDs vermeiden – bei Bedarf `api.hasViewBinding(id)` prüfen.
4. **Registrierung in Lifecycle-Hooks:** Registrierung innerhalb von `onload` durchführen und im `onunload` sauber entfernen (`unregisterViewBinding`), um Reload-Leaks zu vermeiden.
5. **Tooling ausführen:** Vor Pull Requests `npm install` im Projektstamm `layout-editor/` und anschließend die Befehle aus [Tooling](./tooling.md) laufen lassen, damit CI-konforme Artefakte entstehen.

## Versionierung & Kompatibilität

- Alle Registry-Funktionen wurden mit API-Version `1.0.0` eingeführt. Neue Flags oder optionale Eigenschaften müssen mit `withMinimumApiVersion` abgesichert werden.
- Änderungen an bestehenden Bindings sollten mit Versionshinweisen in [`docs/api-migrations.md`](../../docs/api-migrations.md) ergänzt werden.
- Für externe Plugins empfiehlt sich ein Fail-Fast-Check über `assertApiVersion`, um Nutzer frühzeitig auf inkompatible Layout-Editor-Versionen hinzuweisen.

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

## Diagnose & Fehlerbehebung

- **Registrierungsfehler:** Konsumiere die konkreten Fehlermeldungen (siehe oben) und ergänze Nutzerfeedback anhand der Richtlinien in [`docs/persistence-errors.md`](./persistence-errors.md).
- **Debug-Snapshots:** `getViewBindingIds()` oder `getViewBindings()` in der Developer-Konsole protokollieren, um kollidierende IDs, falsche Tags oder Labels sichtbar zu machen.
- **Stage-Monitoring:** Für Deploy-/Preview-Überwachung [`docs/stage-instrumentation.md`](../../docs/stage-instrumentation.md) konsultieren.
- **Benutzerseitige Hinweise:** Das User-Wiki dokumentiert beobachtete Fehlermeldungen in [`persistence-diagnostics`](../../docs/persistence-diagnostics.md).
- **Noch offen:** Die verifizierten Node.js- und Obsidian-Versionen für Registry-Erweiterungen sind unklar – siehe [`onboarding-runtime-compatibility.md`](../todo/onboarding-runtime-compatibility.md).

## Tooling & CI-Anforderungen

- `npm run lint`, `npm run format` und `npm test` sind Pflichtläufe vor Pull Requests; sie entsprechen dem CI-Gate.
- `npm run build` validiert den Esbuild-Bundling-Prozess sowie die generierten Manifeste.
- Für wiederkehrende Checks auf Branches können dieselben Befehle über die Stage-Pipelines laut [`docs/tooling.md`](./tooling.md) automatisiert werden.

## Weiterführend

- [Dokumentenindex](./README.md)
- Verwandt: [Plugin-API](./plugin-api.md)

## Offene Aufgaben

- Integrationspfade und Fehlerszenarien dokumentieren: [`documentation-audit-integration-api.md`](../todo/documentation-audit-integration-api.md).
- Runtime-Voraussetzungen für Registry-Erweiterungen klären: [`onboarding-runtime-compatibility.md`](../todo/onboarding-runtime-compatibility.md).
