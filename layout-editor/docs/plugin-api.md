# Layout Editor Plugin API

Diese Seite beschreibt die öffentliche Schnittstelle, die `LayoutEditorPlugin.getApi()` bereitstellt. Sie ergänzt die Überblicks-
dokumente des Repos um konkrete Signaturen, Parameterbeschreibungen sowie Hinweise zur Versionierung und zum Fehlerverhalten der
Methoden. Die Signaturen basieren auf `src/main.ts`.

## Navigation

- [Dokumentenindex](./README.md)
- Verwandt: [View-Registry](./view-registry.md)

## Versionierung & Kompatibilität

| Feld/Funktion | Zweck | Seit | Hinweise |
| --- | --- | --- | --- |
| `apiVersion: string` | Gibt die veröffentlichte API-Version zurück (SemVer, `MAJOR.MINOR.PATCH`). | 1.0.0 | Konsumenten sollen `apiVersion` lesen, aber für Vergleiche die untenstehenden Helfer verwenden. |
| `isApiVersionAtLeast(version: string): boolean` | Prüft, ob die aktuelle API-Version mindestens der angegebenen Version entspricht. | 1.0.0 | Version wird normalisiert (`x.y.z`). Rückgabe `false`, wenn `version` höher ist. |
| `assertApiVersion(version: string, featureName?: string): void` | Wirft einen Fehler, falls `version` nicht erfüllt ist. | 1.0.0 | Fehlertext enthält optional `featureName`. Verwende für harte Abhängigkeiten. |
| `withMinimumApiVersion<T>(version: string, feature: () => T): T \| undefined` | Führt `feature` nur aus, wenn die Version erreicht ist. | 1.0.0 | Liefert `undefined`, falls nicht erfüllt. Ideal für optionale Features. |

> **Hinweis:** Versionen werden tolerant geparst (Nicht-Ziffern werden entfernt). Verwende trotzdem reguläre SemVer-Strings wie
> `"1.0.0"` oder `"1.2.3"`, um unerwartete Normalisierungen zu vermeiden.

## View-Integration

| Feld/Funktion | Zweck | Seit | Fehlerverhalten |
| --- | --- | --- | --- |
| `viewType: string` | Konstante View-ID (`"layout-editor"`). | 1.0.0 | Kann genutzt werden, um vorhandene `WorkspaceLeaf`s zu prüfen. |
| `openView(): Promise<void>` | Öffnet die Layout-Editor-View in Obsidian. Erstellt bei Bedarf einen neuen Leaf und macht ihn sichtbar. | 1.0.0 | Fehler aus Obsidian werden durchgereicht. Aufruf ist idempotent: bestehende View wird aktiviert. |

### Typischer Workflow: View öffnen

1. `api.assertApiVersion("1.0.0", "layout editor view");`
2. Optional vorhandene Leafs prüfen (`app.workspace.getLeavesOfType(api.viewType)`).
3. `await api.openView();`
4. Auf `LayoutEditorView`-spezifische Nachrichten oder View-Events reagieren.

## Element-Definitionen verwalten

Alle Definitionen entsprechen dem Typ `LayoutElementDefinition` und werden intern in einer Registry gespiegelt.

| Funktion | Zweck | Seit | Fehlerverhalten |
| --- | --- | --- | --- |
| `registerElementDefinition(definition: LayoutElementDefinition): void` | Registriert oder überschreibt eine Definition anhand von `definition.type`. | 1.0.0 | Keine Validierung – fehlerhafte Definitionen führen später zu UI-Fehlern. Vor dem Registrieren Felder prüfen. |
| `unregisterElementDefinition(type: LayoutElementType): void` | Entfernt eine Definition. | 1.0.0 | Ignoriert unbekannte Typen. |
| `resetElementDefinitions(definitions?: LayoutElementDefinition[]): void` | Ersetzt alle Definitionen. Ohne Argument werden die Default-Definitionen geladen. | 1.0.0 | Bei übergebenen Definitionen werden vorhandene Einträge überschrieben. |
| `getElementDefinitions(): LayoutElementDefinition[]` | Liefert einen Snapshot aller Definitionen. | 1.0.0 | Rückgabe ist eine neue Kopie; Änderungen wirken nicht auf die Registry zurück. |
| `onDefinitionsChanged(listener): () => void` | Registriert Listener, der bei jeder Änderung einen Snapshot erhält. | 1.0.0 | Rückgabe ist eine Unsubscribe-Funktion. Listener wird synchron beim Ereignis aufgerufen. |

### Workflow: Definitionen registrieren & observieren

1. Per `api.withMinimumApiVersion("1.0.0", () => api.registerElementDefinition(myDefinition));` neue Elemente bereitstellen.
2. Mit `api.onDefinitionsChanged(snapshot => { ... })` auf Änderungen reagieren.
3. Bei Bedarf `unsubscribe()` aufrufen, z. B. im `onunload` eines Plugins.
4. Für Reset-Szenarien `api.resetElementDefinitions([...])` nutzen oder ohne Argument die Defaults wiederherstellen.

> **Defensive Checks:** Da `registerElementDefinition` keine Plausibilitätsprüfung durchführt, sollten Plugins Eingaben vorher validieren (z. B. Pflichtfelder, Mindestgröße). Fehlerhafte Definitionen manifestieren sich erst beim Rendern.

## Layout-Bibliothek nutzen

Die Layout-Bibliothek verwaltet Layout-Dateien im Vault.

| Funktion | Zweck | Seit | Fehlerverhalten |
| --- | --- | --- | --- |
| `saveLayout(payload: LayoutBlueprint & { name: string; id?: string }): Promise<VersionedSavedLayout>` | Persistiert ein Layout. Ohne `id` wird eine UUID erzeugt. | 1.0.0 | Wirft `Error`, wenn `id` ungültige Zeichen (`/` oder `\`) enthält, Breite/Höhe ≤ 0 sind oder Elemente ungültige Werte haben. |
| `listLayouts(): Promise<VersionedSavedLayout[]>` | Liest alle Layout-Dateien und sortiert nach `updatedAt`. | 1.0.0 | Überspringt Dateien, die nicht gelesen/migriert werden können; die übrigen werden geliefert. |
| `loadLayout(id: string): Promise<VersionedSavedLayout \| null>` | Lädt ein Layout anhand der ID. | 1.0.0 | Gibt `null` zurück, wenn Datei fehlt oder Migration fehlschlägt. Fehler beim Lesen werden geloggt und führen zu `null`. |

### Workflow: Layout speichern und laden

1. Layout modellieren und `LayoutBlueprint` erstellen (`canvasWidth`, `canvasHeight`, `elements`).
2. `const saved = await api.saveLayout({ ...blueprint, name: "Mein Layout" });`
3. Spätere Aktualisierung: `await api.saveLayout({ ...blueprint, id: saved.id, name: saved.name });`
4. Alle Layouts listen: `const layouts = await api.listLayouts();`
5. Spezifisches Layout laden: `const layout = await api.loadLayout(saved.id); // null bei Fehlern`
6. Fehlerfall behandeln: Anzeige für ungültige IDs, Dimensionen oder Elemente und Logging unerwarteter Exceptions.

> **Migrationen:** Die Rückgabewerte enthalten `schemaVersion`. Falls `loadLayout` `null` liefert, sollte das aufrufende Plugin eine Nutzerwarnung ausgeben (z. B. „Layout-Version nicht unterstützt“).

## View-Bindings registrieren

View-Bindings koppeln externe Render-Views an den Layout-Editor. Weitere Hintergründe enthält [`docs/view-registry.md`](./view-registry.md).

| Funktion | Zweck | Seit | Fehlerverhalten |
| --- | --- | --- | --- |
| `registerViewBinding(definition: LayoutViewBindingDefinition): void` | Registriert ein Binding anhand von `definition.id`. | 1.0.0 | Wirft `Error`, wenn `id` leer ist oder bereits existiert. ID wird intern getrimmt. |
| `unregisterViewBinding(id: string): void` | Entfernt ein Binding. | 1.0.0 | Ignoriert unbekannte IDs. |
| `resetViewBindings(definitions?: LayoutViewBindingDefinition[]): void` | Ersetzt den gesamten Registry-Inhalt. Ohne Argument wird auf eine leere Registry zurückgesetzt. | 1.0.0 | Bei doppelten IDs in `definitions` wird ein Fehler geworfen; bestehende Bindings bleiben unverändert. |
| `getViewBindings(): LayoutViewBindingDefinition[]` | Liefert Snapshot aller Bindings. | 1.0.0 | Snapshot ist kopiert; direkte Mutationen haben keine Wirkung. |
| `getViewBinding(id: string): LayoutViewBindingDefinition \| undefined` | Greift auf ein einzelnes Binding zu. | 1.0.0 | Gibt `undefined` zurück, wenn die ID unbekannt oder leer (nach Trimmen) ist. |
| `hasViewBinding(id: string): boolean` | Prüft, ob eine ID registriert ist. | 1.0.0 | Leere/Whitespace-IDs ergeben `false` – ideal für Guards vor einer Registrierung. |
| `getViewBindingIds(): string[]` | Gibt nur die IDs zurück. | 1.0.0 | Reihenfolge entspricht der Registrier-Reihenfolge. Für Logging oder Debug-Ausgaben geeignet. |
| `getViewBindingsByTag(tag: string): LayoutViewBindingDefinition[]` | Filtert Bindings nach Tags. | 1.0.0 | Tag-Vergleich ist case-insensitive und trimmt Eingaben; unbekannte/leer getrimmte Tags liefern `[]`. |
| `onViewBindingsChanged(listener): () => void` | Listener für Registry-Änderungen. | 1.0.0 | Rückgabe beendet die Beobachtung. Listener wird synchron ausgelöst. |

### Workflow: View-Bindings verwalten

1. `api.registerViewBinding({ id: "cards", label: "Kartenansicht" });`
2. Änderungen verfolgen: `const stop = api.onViewBindingsChanged(bindings => updateUi(bindings));`
3. Diagnose & Telemetrie: `console.log(api.getViewBindingIds());` oder `api.getViewBindingsByTag("utility")` für Tag-basierte Filter.
4. Beim Deaktivieren oder Entladen: `stop(); api.unregisterViewBinding("cards");`
5. Für Bulk-Updates `api.resetViewBindings(newBindings);` verwenden. Doppelte IDs vorher deduplizieren, sonst wird eine `Error` geworfen.

## Fehlerhandling & Best Practices

- **Version-Gates:** Jede neue Funktion sollte über `withMinimumApiVersion` oder `assertApiVersion` abgesichert werden, bevor sie aufgerufen wird.
- **Synchronität:** Listener (`onDefinitionsChanged`, `onViewBindingsChanged`) werden synchron ausgelöst. Rechenintensive Arbeit sollte in `requestAnimationFrame` oder `setTimeout` ausgelagert werden, um UI-Blocking zu vermeiden.
- **Persistenz-Fehler:** Die Layout-Bibliothek wirft Exceptions für ungültige Eingaben. Fange Fehler ab, um Nutzerfreundlichkeit zu erhöhen (z. B. Hinweismodal).
- **Defaults wiederherstellen:** `resetElementDefinitions()` ohne Argument lädt die Standarddefinitionen; `resetViewBindings()` ohne Argument leert die Registry.
- **Aufräumen:** Plugins sollten Listener und registrierte Definitionen/Bindings beim eigenen `onunload` entfernen, um Seiteneffekte bei Reloads zu vermeiden.

## Weiterführende Ressourcen

- [`docs/view-registry.md`](./view-registry.md) – Detaillierte Informationen zur View-Registry inklusive Fehlermeldungen.
- [`docs/persistence-errors.md`](./persistence-errors.md) – Hintergrund zu Persistenz- und Migrationfehlern, die bei `saveLayout` oder `loadLayout` auftreten können.
- [`docs/tooling.md`](./tooling.md) – Hinweise zu Tests und Bundling rund um die API.

