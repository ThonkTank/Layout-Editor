// src/presenters/stage-controller.ts
import { isContainerType } from "../definitions";
import { LayoutEditorStore } from "../state/layout-editor-store";
import { LayoutElement } from "../types";
import { renderComponent } from "../ui/components/component";
import { StageCameraObserver, StageComponent } from "../ui/components/stage";

interface StageControllerOptions {
    host: HTMLElement;
    store: LayoutEditorStore;
    onSelectElement?(id: string | null): void;
    cameraTelemetry?: StageCameraObserver;
}

export class StageController {
    private readonly component: StageComponent;
    private unsubscribe: (() => void) | null = null;
    private releaseCameraObserver: (() => void) | null = null;

    constructor(private readonly options: StageControllerOptions) {
        this.component = new StageComponent({
            store: options.store,
            onSelectElement: options.onSelectElement,
        });
        renderComponent(options.host, this.component);
        if (options.cameraTelemetry) {
            this.releaseCameraObserver = this.component.observeCamera(options.cameraTelemetry);
        }
        const initialState = options.store.getState();
        for (const element of initialState.elements) {
            if (isContainerType(element.type)) {
                options.store.ensureContainerDefaults(element.id);
            }
        }
        this.component.syncStage(
            initialState.elements,
            initialState.selectedElementId,
            initialState.canvasWidth,
            initialState.canvasHeight,
        );
        this.unsubscribe = options.store.subscribe(event => {
            if (event.type !== "state") return;
            for (const element of event.state.elements) {
                if (isContainerType(element.type)) {
                    options.store.ensureContainerDefaults(element.id);
                }
            }
            this.component.syncStage(
                event.state.elements,
                event.state.selectedElementId,
                event.state.canvasWidth,
                event.state.canvasHeight,
            );
        });
    }

    dispose() {
        this.releaseCameraObserver?.();
        this.releaseCameraObserver = null;
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.component.destroy();
    }

    refreshElement(element: LayoutElement) {
        this.component.refreshElement(element);
    }

    focusElement(element: LayoutElement) {
        this.component.focusElement(element);
    }
}
