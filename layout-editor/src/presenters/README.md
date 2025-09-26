# Presenters

This folder contains presenter classes that bridge application state to reusable UI components. They subscribe to the `LayoutEditorStore`, translate store events into component updates, and coordinate cross-component behaviour such as focus management or stage synchronisation. Refer to the [UI rendering guidelines](../../docs/ui-performance.md) for architectural background.

## Files

- `header-controls.ts` – Presenter that wires header controls (layout import/export, save/load) to the store, normalises persistence errors, and emits notices for the host Obsidian app.
- `stage-controller.ts` – Thin controller around `StageComponent` that renders the canvas, ensures container defaults exist before interactions, and keeps the stage in sync with selection and canvas size changes.
- `structure-panel.ts` – Presenter for the structure tree sidebar that mirrors the layout hierarchy, forwards drag/drop gestures to the store, and keeps the stage focused on the selected element.

## Conventions & Extension Points

- Presenters must stay side-effect free outside of store callbacks. Perform DOM updates through `renderComponent` and call `destroy()` during `dispose()` to avoid leaks.
- Subscribe to the store with `store.subscribe` and cache the unsubscribe handler. Always emit initial state to components so they can render before the first event tick.
- Encapsulate cross-component communication (e.g. stage focus on selection) inside presenters; avoid directly coupling UI components.
- To add a new presenter, expose a class/function that accepts its dependencies (host element, store, collaborators) as constructor parameters and returns a disposer. Place tests or usage documentation in the component or higher-level feature docs; link to deep-dive UI notes in [`../../docs/ui-performance.md`](../../docs/ui-performance.md) or the [view registry guide](../../docs/view-registry.md) where relevant.
