const HOST_COMPONENT_KEY = Symbol("sm-ui-component");

export type UIComponentHost<T extends HTMLElement = HTMLElement> = T & {
    [HOST_COMPONENT_KEY]?: UIComponent<T>;
};

export interface UIComponentScope {
    listen(
        target: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): () => void;
    register(cleanup: () => void): void;
    dispose(): void;
}

export abstract class UIComponent<T extends HTMLElement = HTMLElement> {
    private cleanups: Array<() => void> = [];
    private mountedHost: UIComponentHost<T> | null = null;

    mount(host: T): void {
        if (this.mountedHost && this.mountedHost !== host) {
            this.destroy();
        }
        const typedHost = host as UIComponentHost<T>;
        if (typedHost[HOST_COMPONENT_KEY] && typedHost[HOST_COMPONENT_KEY] !== this) {
            typedHost[HOST_COMPONENT_KEY]!.destroy();
        }
        this.mountedHost = typedHost;
        typedHost[HOST_COMPONENT_KEY] = this;
        this.onMount(host);
    }

    destroy(): void {
        if (!this.mountedHost) return;
        try {
            this.onDestroy();
        } finally {
            for (const cleanup of this.cleanups.splice(0)) {
                try {
                    cleanup();
                } catch (error) {
                    console.error("UIComponent cleanup failed", error);
                }
            }
            delete this.mountedHost[HOST_COMPONENT_KEY];
            this.mountedHost = null;
        }
    }

    protected abstract onMount(host: T): void;
    protected onDestroy(): void {}

    protected requireHost(): T {
        if (!this.mountedHost) {
            throw new Error("Component is not mounted");
        }
        return this.mountedHost as T;
    }

    protected registerCleanup(cleanup: () => void): void {
        this.cleanups.push(cleanup);
    }

    protected createScope(): UIComponentScope {
        const ownedCleanups: Array<() => void> = [];
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            while (ownedCleanups.length) {
                const cleanup = ownedCleanups.pop()!;
                try {
                    cleanup();
                } catch (error) {
                    console.error("UIComponent scope cleanup failed", error);
                }
            }
        };

        return {
            listen: (target, type, listener, options) => {
                const cleanup = this.listen(target, type, listener, options);
                ownedCleanups.push(cleanup);
                return cleanup;
            },
            register: cleanup => {
                this.registerCleanup(cleanup);
                ownedCleanups.push(cleanup);
            },
            dispose,
        };
    }

    protected listen(
        target: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): () => void {
        target.addEventListener(type, listener, options);
        let active = true;
        const cleanup = () => {
            if (!active) return;
            active = false;
            target.removeEventListener(type, listener, options);
        };
        this.registerCleanup(cleanup);
        return cleanup;
    }

    protected observeMutations(target: Node, options: MutationObserverInit, callback: MutationCallback): MutationObserver {
        const observer = new MutationObserver(callback);
        observer.observe(target, options);
        this.registerCleanup(() => observer.disconnect());
        return observer;
    }

    protected observeResize(target: Element, callback: ResizeObserverCallback): ResizeObserver {
        const observer = new ResizeObserver(callback);
        observer.observe(target);
        this.registerCleanup(() => observer.disconnect());
        return observer;
    }

    protected observeIntersections(target: Element, callback: IntersectionObserverCallback, options?: IntersectionObserverInit): IntersectionObserver {
        const observer = new IntersectionObserver(callback, options);
        observer.observe(target);
        this.registerCleanup(() => observer.disconnect());
        return observer;
    }

    protected clearHost(host?: HTMLElement): void {
        const node = host ?? this.requireHost();
        const anyNode = node as any;
        if (typeof anyNode.empty === "function") {
            anyNode.empty();
            return;
        }
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
}

export function renderComponent<T extends HTMLElement, C extends UIComponent<T>>(host: T, component: C): C {
    component.mount(host);
    return component;
}
