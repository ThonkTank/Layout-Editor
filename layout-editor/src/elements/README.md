# Elements Module

Dieses Verzeichnis bündelt alle Layout-Editor-Komponenten, die als **Elements** im Preview, im Inspector und in Modals gerendert werden. Die Implementierungen bauen auf geteilten Basisklassen auf, registrieren sich über das Manifest und stellen UI-Hilfen für Palette, Stage und Inspector bereit.

## Struktur & Zuständigkeiten

| Pfad | Beschreibung |
| --- | --- |
| [`base.ts`](./base.ts) | Deklariert `LayoutElementComponent`, Preview-/Inspector-Kontexte sowie Factory-Signaturen, die von allen Element-Implementierungen genutzt werden. |
| [`component-manifest.ts`](./component-manifest.ts) | Build-Artefakt, das alle registrierten Komponenten exportiert. Wird von [`registry.ts`](./registry.ts) eingelesen und sollte nicht manuell bearbeitet werden. |
| [`registry.ts`](./registry.ts) | Zentraler Einstieg zum Nachschlagen von Elementdefinitionen. Bindet das Manifest ein und bietet Helfer für Palette, Defaultwerte und Inspector. |
| [`ui.ts`](./ui.ts) | Liefert UI-Primitiven (z. B. `createElementsField`, `createElementsSelect`) für Preview- und Inspector-Flows. Nutzt die generischen Controls aus [`../ui/components`](../ui/components). |
| [`shared/`](./shared/README.md) | Enthält wiederverwendbare Basisklassen und Renderer für Element-Previews. Details in der [Shared-Dokumentation](./shared/README.md). |
| [`components/`](./components/README.md) | Konkrete Elementimplementierungen für Palette & Stage. Übersicht in der [Komponenten-Dokumentation](./components/README.md). |

## Arbeitsfluss

1. **Komponente ableiten:** Neue Elemente bauen auf den Basisklassen aus [`shared/component-bases.ts`](./shared/component-bases.ts) auf oder implementieren `LayoutElementComponent` direkt.
2. **Registrieren:** Die Implementierung wird im Build-Prozess dem [`component-manifest.ts`](./component-manifest.ts) hinzugefügt und dadurch automatisch von [`registry.ts`](./registry.ts) erfasst.
3. **UI anbinden:** Preview- und Inspector-Logik verwenden die Hilfsfunktionen aus [`ui.ts`](./ui.ts) sowie die globalen Presenter in [`../presenters`](../presenters), insbesondere [`stage-controller.ts`](../presenters/stage-controller.ts) für die Stage-Interaktion.

## Verwandte Dokumente

- [Element Preview API](../element-preview.ts) – definiert, wie Previews im Editor gerendert werden.
- [View Registry](../view-registry.ts) – stellt Feature-Bindings bereit, die z. B. vom `view-container` genutzt werden.
- [UI-Komponenten](../ui/components) – Basisbausteine für Palette, Inspector und Modals.
