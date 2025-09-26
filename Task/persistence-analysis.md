# Persistenz-Analyse: Seed-Layout-Synchronisation

## Dateiliste & Navigation
- `persistence-analysis.md` (dieses Dokument) – Analyse des Vault-Persistenzpfads für Seed-Layouts.
- Zurück zur [Task-Übersicht](README.md) für Symptomkontext und weitere geplante Analysen.
- Ergänzende Referenz: [Domänenkonfigurations-Workflow](../layout-editor/docs/domain-configuration.md).

## Kontext: `ensureSeedLayouts` → `saveLayoutToLibrary`
1. Beim Plugin-Start lädt `ensureSeedLayouts` die Domänenkonfiguration (Fallback auf Defaults bei Fehlern) und iteriert alle Seeds, wobei jedes Layout durch `ensureSeedLayout` geprüft wird.【F:layout-editor/src/seed-layouts.ts†L30-L49】
2. `ensureSeedLayout` versucht zunächst, ein bestehendes Layout über `loadSavedLayout` zu lesen; nur wenn kein gültiger Datensatz zurückkommt, wird ein Speichervorgang gestartet.【F:layout-editor/src/seed-layouts.ts†L9-L27】【F:layout-editor/src/layout-library.ts†L389-L395】
3. `saveLayoutToLibrary` erstellt den JSON-Körper und ruft `app.vault.create` auf, sobald kein verwertbares File-Handle vorliegt. Bestehende Dateien werden andernfalls mit `modify` aktualisiert.【F:layout-editor/src/layout-library.ts†L193-L225】

## Beobachtung: Konsolenfehler "File already exists"
- Im Fehlerfall schreibt `ensureSeedLayout` `console.error("Layout Editor: Seed-Layout '…' konnte nicht gespeichert werden", error)`. Das beobachtete Obsidian-Fehlobjekt enthält die Meldung "File already exists.", wenn `app.vault.create` auf ein bereits vorhandenes JSON stößt.【F:layout-editor/src/seed-layouts.ts†L19-L27】【F:layout-editor/src/layout-library.ts†L201-L225】
- Damit korreliert das Log exakt mit dem Pfad "Seed unbekannt → speichern → Vault meldet Duplikat", was die Persistenzkette bestätigt.

## Plausible Ursachen & Prüfpfade
- **Unlesbare Legacy-Datei:** `readLayoutMeta` verwirft Layouts mit unvollständigen Dimensionen, Elementlisten oder JSON-Parse-Fehlern. Das vorhandene File bleibt unerkannt, `app.vault.create` kollidiert und produziert den beobachteten Fehler. *Instrumentation:* Debug-Logging des `existing`-Handles in `ensureSeedLayout` sowie Auswertung der Warnungen aus `readLayoutMeta`/`runLayoutSchemaMigrations`. *Vault-Check:* Inhalt von `LayoutEditor/Layouts/<id>.json` auf Schemafehler prüfen.【F:layout-editor/src/layout-library.ts†L340-L374】
- **Konfliktierende Seed-Definitionen:** Mehrere Seeds mit identischer `id` (z. B. unterschiedliche Domain-Sources) erzeugen parallele Schreibversuche. Da `ensureSeedLayouts` sequentiell arbeitet, ist eher eine zweite Aktivierung oder konkurrierende Seeds aus verschiedenen Vault-Konfigurationen denkbar. *Instrumentation:* Logging der aktiven Domäne, Seed-IDs und Aufrufer-Stack beim Start; Vergleich der geladenen Konfigurationsdateien laut [Domänenkonfigurations-Dokumentation].【F:layout-editor/src/seed-layouts.ts†L30-L49】【F:layout-editor/docs/domain-configuration.md†L20-L33】
- **Race Condition mit externer Synchronisation:** Ein externes Plugin oder Sync-Prozess kann zwischen `findLayoutFile` und `app.vault.create` das File anlegen. *Instrumentation:* Zeitstempel-Logging direkt vor und nach `app.vault.create`, plus Vault-Event-Hooks (`app.vault.on('create', …)`) während der Startphase. *Vault-Check:* Prüfen, ob `LayoutEditor/Layouts` mehrere Schreibquellen (z. B. Git Sync) gleichzeitig bedient.【F:layout-editor/src/layout-library.ts†L193-L225】

## Weiterführende Dokumente & Korrelation
- Task-Kontext: [Bug-Analyse "rechter Rand festgenagelt"](README.md).
- Weitere Analyse-Slots: `ui-stage-analysis.md` & `view-preview-analysis.md` (Platzhalter; ergänzen, sobald Erkenntnisse zu UI/Persistenz gekreuzt werden können).
- Persistenz-Referenzen im Modul: [`layout-library.ts`](../layout-editor/src/layout-library.ts) und [`seed-layouts.ts`](../layout-editor/src/seed-layouts.ts) für zukünftige Deep Dives.
