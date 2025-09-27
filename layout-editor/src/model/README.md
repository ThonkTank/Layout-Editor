# Model

Das Modell bildet die kanonische Baumstruktur aller Layout-Elemente ab. Es konzentriert Validierung, Eltern-Kind-Beziehungen und Ordnungsverwaltung an einer Stelle.

## Struktur

```
model/
├─ README.md
└─ layout-tree.ts
```

## LayoutTree

`layout-tree.ts` implementiert den `LayoutTree`, der alle `LayoutElement`-Instanzen als mutierbare Nodes hält und die externe Welt ausschließlich über geklonte Snapshots versorgt.

### Kernaufgaben

- **Initialisierung (`load`)** – importiert persistierte Elemente, entfernt ungültige Elternreferenzen, synchronisiert `parentId`/`children` und stellt eindeutige IDs sicher.
- **Lookups** – `getElement`, `getChildIds`, `getChildElements` und `getParentId` liefern referenzierte Nodes für Store-Operationen. Vor jeder Rückgabe werden `children`-Arrays aktualisiert.
- **Mutation** – `insert`, `update`, `remove`, `setParent` und `moveChild` kapseln alle Schreibzugriffe. Der Baum verhindert Zyklen, Mehrfach-Einträge und sorgt für konsistente Reihenfolgen.
- **Snapshot-Erzeugung** – `getElementsSnapshot()` liefert die globale Reihenfolge aus `order` und stellt Container-Kinder ebenfalls bereit. Der Store klont diese Elemente vor der weiteren Verteilung.

### Wichtige Garantien

- `children` ist eine abgeleitete Struktur: Container ohne Kinder liefern ein leeres Array, Nicht-Container setzen `children` auf `undefined`.
- Elternwechsel über `setParent` validieren Zielcontainer (`isContainerType`), verhindern Selbstreferenzen und prüfen zyklische Beziehungen.
- Beim Entfernen eines Elements werden Kinder automatisch entkoppelt und bleiben in der globalen Reihenfolge erhalten, bis der Store weitere Maßnahmen ergreift.
- `moveChild` verschiebt Kinder innerhalb eines Containers, clamped auf gültige Indizes.

## Konventionen & Erweiterungspunkte

- Interne Node-Objekte bleiben mutierbar, dürfen aber nur über `LayoutTree`-APIs verändert werden. Konsumenten erhalten Kopien via `cloneLayoutElement` (siehe [State-Layer](../state/README.md)).
- Neue Traversal-/Analysefunktionen sollten Hilfsfunktionen aus [`../utils`](../utils/README.md) nutzen, um z. B. Zyklen frühzeitig zu erkennen.
- Schema-Erweiterungen (zusätzliche Felder auf `LayoutElement`) erfordern Anpassungen an `load`, `cloneLayoutElement` und der Dokumentation im [Data Model Overview](../../docs/data-model-overview.md).

## Navigation

- [Data Model Overview](../../docs/data-model-overview.md)
- [State Layer](../state/README.md)

## Offene Punkte

- Konsistenz- und Vollständigkeitsprüfung siehe [`documentation-audit-state-model.md`](../../todo/documentation-audit-state-model.md).
