import type { LayoutElement } from "../types";

export type ElementFrameSnapshot = Pick<LayoutElement, "x" | "y" | "width" | "height">;

export interface InteractionStartedEvent {
    type: "interaction:start";
    depth: number;
}

export interface InteractionFinishedEvent {
    type: "interaction:end";
    depth: number;
    hasPendingState: boolean;
    willDispatchState: boolean;
    skipExport: boolean;
}

export interface CanvasSizeEvaluatedEvent {
    type: "canvas:size";
    previous: { width: number; height: number };
    requested: { width: number; height: number };
    result: { width: number; height: number };
    changed: boolean;
}

export interface ClampStepObservedEvent {
    type: "clamp:step";
    elementId: string;
    previous: ElementFrameSnapshot;
    result: ElementFrameSnapshot;
    canvas: { width: number; height: number };
}

export type StageInteractionEvent =
    | InteractionStartedEvent
    | InteractionFinishedEvent
    | CanvasSizeEvaluatedEvent
    | ClampStepObservedEvent;

export interface StageInteractionObserver {
    interactionStarted?(event: InteractionStartedEvent): void;
    interactionFinished?(event: InteractionFinishedEvent): void;
    canvasSizeEvaluated?(event: CanvasSizeEvaluatedEvent): void;
    clampStepObserved?(event: ClampStepObservedEvent): void;
}

export interface StageInteractionLogger {
    log(event: StageInteractionEvent): void;
}

type ObserverEventMap = {
    interactionStarted: InteractionStartedEvent;
    interactionFinished: InteractionFinishedEvent;
    canvasSizeEvaluated: CanvasSizeEvaluatedEvent;
    clampStepObserved: ClampStepObservedEvent;
};

const nullObserver: StageInteractionObserver = {};
let activeObserver: StageInteractionObserver = nullObserver;
let activeLogger: StageInteractionLogger | null = null;

function publish<K extends keyof ObserverEventMap>(method: K, event: ObserverEventMap[K]) {
    const handler = activeObserver[method];
    if (typeof handler === "function") {
        handler.call(activeObserver, event);
    }
    if (activeLogger) {
        activeLogger.log(event);
    }
}

export const stageInteractionTelemetry = {
    interactionStarted(payload: Omit<InteractionStartedEvent, "type">) {
        const event: InteractionStartedEvent = { type: "interaction:start", ...payload };
        publish("interactionStarted", event);
    },
    interactionFinished(payload: Omit<InteractionFinishedEvent, "type">) {
        const event: InteractionFinishedEvent = { type: "interaction:end", ...payload };
        publish("interactionFinished", event);
    },
    canvasSizeEvaluated(payload: Omit<CanvasSizeEvaluatedEvent, "type">) {
        const event: CanvasSizeEvaluatedEvent = { type: "canvas:size", ...payload };
        publish("canvasSizeEvaluated", event);
    },
    clampStepObserved(payload: Omit<ClampStepObservedEvent, "type">) {
        const event: ClampStepObservedEvent = { type: "clamp:step", ...payload };
        publish("clampStepObserved", event);
    },
} as const;

export function setStageInteractionObserver(observer: StageInteractionObserver | null) {
    activeObserver = observer ?? nullObserver;
}

export function getStageInteractionObserver(): StageInteractionObserver {
    return activeObserver;
}

export function setStageInteractionLogger(logger: StageInteractionLogger | null) {
    activeLogger = logger;
}

export function getStageInteractionLogger(): StageInteractionLogger | null {
    return activeLogger;
}

export function resetStageInteractionTelemetry() {
    activeObserver = nullObserver;
    activeLogger = null;
}
