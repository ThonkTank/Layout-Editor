import assert from "node:assert/strict";
import { UIComponent, renderComponent } from "../src/ui/components/component";

class FakeElement extends EventTarget {
    private listenerCounts = new Map<string, number>();

    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        super.addEventListener(type, listener as EventListener, options);
        this.listenerCounts.set(type, (this.listenerCounts.get(type) ?? 0) + 1);
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
        super.removeEventListener(type, listener as EventListener, options);
        const next = (this.listenerCounts.get(type) ?? 1) - 1;
        this.listenerCounts.set(type, Math.max(0, next));
    }

    listenerCount(type: string): number {
        return this.listenerCounts.get(type) ?? 0;
    }
}

class ClickCounterComponent extends UIComponent<HTMLElement> {
    count = 0;

    protected onMount(host: HTMLElement): void {
        this.listen(host, "ping", () => {
            this.count += 1;
        });
    }
}

class TrackingComponent extends UIComponent<HTMLElement> {
    destroyCount = 0;

    protected onMount(): void {}

    protected onDestroy(): void {
        this.destroyCount += 1;
    }
}

async function run() {
    const host = new FakeElement() as unknown as HTMLElement;
    const component = new ClickCounterComponent();
    component.mount(host);
    assert.equal(host.listenerCount("ping"), 1, "listener should be registered on mount");
    host.dispatchEvent(new Event("ping"));
    assert.equal(component.count, 1, "listener should increment count");
    component.destroy();
    assert.equal(host.listenerCount("ping"), 0, "listener should be removed after destroy");
    host.dispatchEvent(new Event("ping"));
    assert.equal(component.count, 1, "destroyed component should ignore events");

    const secondHost = new FakeElement() as unknown as HTMLElement;
    const first = new TrackingComponent();
    const second = new TrackingComponent();
    renderComponent(secondHost, first);
    renderComponent(secondHost, second);
    assert.equal(first.destroyCount, 1, "renderComponent should destroy previous component on host");
    assert.equal(second.destroyCount, 0, "new component should not be destroyed immediately");

    console.log("ui-component tests passed");
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
