# Ergebnisse-Review: Stage- & Persistenz-Analysen

## Bestätigte Erkenntnisse
- **Doppelte Canvas-Klammerung erzwingt Rechtsanschlag.** Sowohl die Stage-Interaktionen als auch der `LayoutEditorStore` begrenzen Drag- und Resize-Bewegungen je Pointer-Frame strikt auf `0…canvasWidth`, wodurch jede Verschiebung über die rechte Canvas-Grenze sofort zurückgesetzt wird.【F:Task/ui-stage-analysis.md†L10-L20】
- **Container-Relayouts überschreiben Benutzerinput.** Nach jedem Interaktionsframe führen `applyContainerLayout` und nachgelagerte Clamp-Läufe ein stilles Relayout durch, das Kinder wieder ins Container-Innenrechteck zwingt und damit horizontale Offsets neutralisiert.【F:Task/ui-stage-analysis.md†L22-L29】
- **Persistenzkette erklärt „File already exists“-Fehler.** `ensureSeedLayout` loggt den beobachteten Fehler exakt dann, wenn `app.vault.create` trotz bestehender Datei ausgeführt wird; damit ist der Persistenzpfad für die Seed-Synchronisation bestätigt.【F:Task/persistence-analysis.md†L8-L15】

## Hypothesenstatus
### Stage-/UI-bezogene Hypothesen
1. **Canvas-Clamping auf Stage + Store-Ebene** – Mechanismus bestätigt, aber offen bleibt, ob divergierende Canvas-Maße zusätzliche Rücksprünge auslösen. ➜ *Status: offen (Teilmechanismus verifiziert, Ursache noch nicht eingegrenzt).*【F:Task/ui-stage-analysis.md†L12-L28】
2. **Container-Layouts überschreiben Benutzerinput** – Relayout-Kaskade belegt; offene Frage ist, welche Container-Varianten betroffen sind. ➜ *Status: offen (Matrix-Test erforderlich).*【F:Task/ui-stage-analysis.md†L22-L29】
3. **`clampElementsToCanvas` nach Canvas-Änderungen** – Trigger-Kette dokumentiert, Frequenz während aktiver Interaktionen ungeklärt. ➜ *Status: offen (Instrumentation fehlt).*【F:Task/ui-stage-analysis.md†L18-L30】
4. **Kamera-Recentering im View-Container** – Potenzieller Einfluss beschrieben, empirische Daten fehlen. ➜ *Status: offen (weiterer Preview-Deep-Dive nötig).*【F:Task/ui-stage-analysis.md†L26-L30】

### Persistenzbezogene Hypothesen
1. **Unlesbare Legacy-Datei** – Plausibler Grund für duplizierte Seeds, bislang nicht verifiziert. ➜ *Status: offen (Vault-Analyse & Logging erforderlich).*【F:Task/persistence-analysis.md†L17-L19】
2. **Konfliktierende Seed-Definitionen** – Sequenzielle Seeds belegt, Konfliktquellen noch unbestimmt. ➜ *Status: offen (Konfigurationsvergleich notwendig).*【F:Task/persistence-analysis.md†L17-L20】
3. **Race Condition mit externer Synchronisation** – Theoretisch möglich, keine Messdaten vorhanden. ➜ *Status: offen (Sync-Instrumentation fehlt).*【F:Task/persistence-analysis.md†L17-L21】

## Priorisierte Empfehlungen & Ownership
1. **Instrumentation PR (Stage & Store Team):** Logging-Hooks für `runInteraction`, `setCanvasSize` und `clampElementsToCanvas` einbauen, um Canvas-Deltas und Clamp-Häufigkeit während Drag/Resize zu erfassen. Ziel: Hypothesen 1–3 (Stage) messbar machen.
2. **Container-Verhaltenstest PR (QA/Automation Team):** Matrix-Test-Suite über Container-Typen und Align-Optionen erstellen, um reproduzierbar festzustellen, wann Relayouts Offsets neutralisieren. Ergebnisse fließen in Hypothese 2 (Stage) und künftige UI-Fixes ein.
3. **Persistenz-Diagnose PR (Platform/Sync Team):** Debug-Logging für `ensureSeedLayout` + Vault-Event-Hooks implementieren, parallel Vault-Inhalte auf Alt-Schema prüfen. Damit Hypothesen 1–3 (Persistenz) priorisieren und Verantwortlichkeit eingrenzen.
4. **Preview-Kamera-Analyse PR (Rendering Team):** Eigenes Deep-Dive-Dokument für `view-container` anlegen, Kamera-Events instrumentieren und ggf. Replay-Tests durchführen, um Hypothese 4 (Stage/UI) zu bestätigen oder zu verwerfen.

---
- ← Zurück zum [Task-Index](./README.md)
