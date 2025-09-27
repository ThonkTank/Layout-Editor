# User-Wiki · UI-Komponenten-Index

Dieses Kapitel bündelt die nutzerorientierte Soll-Dokumentation für alle UI-Komponenten des Layout-Editors. Jede Unterseite beschreibt Zweck, Interaktionsmuster, Zustandsmodell, Abhängigkeiten und Accessibility-Hinweise der jeweiligen Komponente und verknüpft sie mit den technischen Quellen im Repository.

## Struktur

```
ui-components/
├── README.md               – Index & Navigationshilfe (diese Datei)
├── component-base.md       – Lifecycle- und Scope-Konzept der `UIComponent`-Basisklasse.
├── diff-renderer.md        – DOM-Diffing & Scope-Verhalten.
├── editor-shell.md         – Rahmen, Resizer und Panel-Verteilung.
├── primitives.md           – Wiederverwendbare UI-Bausteine & Patterns.
├── stage.md                – Canvas, Kamera und Interaktionen.
├── status-banner.md        – Statusmeldungen & Eskalationsregeln.
└── structure-tree.md       – Hierarchieansicht, Drag & Drop.
```

> ℹ️ **Technische Referenzen:** Für Implementierungsdetails siehe [`layout-editor/src/ui/components/README.md`](../../layout-editor/src/ui/components/README.md) sowie die verlinkten Quelldateien in den jeweiligen Unterseiten.

## Navigationsleitfaden

- [Stage (Canvas)](stage.md)
- [Strukturbaum](structure-tree.md)
- [Editor-Shell & Resizer](editor-shell.md)
- [Status-Banner](status-banner.md)
- [DiffRenderer](diff-renderer.md)
- [UIComponent-Basisklasse](component-base.md)
- [UI-Primitives](primitives.md)

## Dokumentationsstandard

- **Zweck & Nutzerwert** beschreiben den sichtbaren Soll-Zustand.
- **Interaktionsmuster** listen die entscheidenden Benutzerabläufe und verweisen auf die technischen Presenter/Store-Hooks (siehe `layout-editor/src/ui/README.md`).
- **Zustände** dokumentieren sichtbare UI-Varianten inklusive Triggern.
- **Abhängigkeiten & Integrationen** verbinden UI-Komponenten mit Store, Tests und technischen Readmes.
- **Accessibility & Telemetrie** fassen Anforderungen und offene Lücken zusammen. Nicht umgesetzte Punkte verweisen auf To-Dos im [`todo/`](../../todo/) Ordner.

Reviewer nutzen diese Seiten, um UI-Änderungen gegen den Soll-Zustand zu prüfen. Neue Komponenten müssen hier ergänzt und querverlinkt werden.
