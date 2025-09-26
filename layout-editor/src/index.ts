// plugins/layout-editor/src/index.ts
export {
    default as LayoutEditorPlugin,
    type LayoutEditorPluginApi,
    LAYOUT_EDITOR_API_VERSION,
    createLayoutEditorApiCompatibility,
    type LayoutEditorApiCompatibility,
} from "./main";
export { LayoutEditorView, VIEW_LAYOUT_EDITOR } from "./view";
export {
    DEFAULT_ELEMENT_DEFINITIONS,
    getElementDefinitions,
    onLayoutElementDefinitionsChanged,
    registerLayoutElementDefinition,
    resetLayoutElementDefinitions,
    unregisterLayoutElementDefinition,
} from "./definitions";
export {
    listSavedLayouts,
    loadSavedLayout,
    saveLayoutToLibrary,
    runLayoutSchemaMigrations,
    LAYOUT_SCHEMA_VERSION,
    MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION,
    type VersionedSavedLayout,
} from "./layout-library";
export {
    getViewBinding,
    getViewBindings,
    onViewBindingsChanged,
    registerViewBinding,
    resetViewBindings,
    unregisterViewBinding,
    type LayoutViewBindingDefinition,
} from "./view-registry";
export * from "./types";
