import { UIComponentScope } from "./component";

export interface DiffNodeContext<T, E extends Element = HTMLElement> {
    scope: UIComponentScope;
    index: number;
    value: T;
}

export interface DiffRendererOptions<T, E extends Element = HTMLElement> {
    getKey(value: T, index: number): string;
    create(value: T, context: DiffNodeContext<T, E>): E;
    update?(node: E, value: T, context: DiffNodeContext<T, E>): void;
    destroy?(node: E, context: DiffNodeContext<T, E>): void;
}

interface DiffEntry<T, E extends Element> {
    node: E;
    scope: UIComponentScope;
    value: T;
}

export class DiffRenderer<T, E extends Element = HTMLElement> {
    private entries = new Map<string, DiffEntry<T, E>>();

    constructor(
        private readonly host: HTMLElement,
        private readonly createScope: () => UIComponentScope,
        private readonly options: DiffRendererOptions<T, E>,
    ) {}

    patch(values: readonly T[]): void {
        const nextEntries = new Map<string, DiffEntry<T, E>>();
        let cursor: ChildNode | null = this.host.firstChild;

        for (let index = 0; index < values.length; index += 1) {
            const value = values[index];
            const key = this.options.getKey(value, index);
            let entry = this.entries.get(key);

            if (!entry) {
                const scope = this.createScope();
                const context: DiffNodeContext<T, E> = { scope, index, value };
                const node = this.options.create(value, context);
                entry = { node, scope, value };
                this.options.update?.(entry.node, value, context);
            } else {
                entry.value = value;
                const context: DiffNodeContext<T, E> = { scope: entry.scope, index, value };
                this.options.update?.(entry.node, value, context);
            }

            nextEntries.set(key, entry);

            if (entry.node.parentNode !== this.host || entry.node !== cursor) {
                this.host.insertBefore(entry.node, cursor);
            }

            cursor = entry.node.nextSibling;
        }

        for (const [key, entry] of this.entries.entries()) {
            if (nextEntries.has(key)) continue;
            const context: DiffNodeContext<T, E> = { scope: entry.scope, index: -1, value: entry.value };
            this.options.destroy?.(entry.node, context);
            entry.scope.dispose();
            if (entry.node.parentNode === this.host) {
                this.host.removeChild(entry.node);
            } else {
                entry.node.remove();
            }
        }

        this.entries = nextEntries;
    }

    clear(): void {
        if (!this.entries.size) return;
        for (const entry of this.entries.values()) {
            const context: DiffNodeContext<T, E> = { scope: entry.scope, index: -1, value: entry.value };
            this.options.destroy?.(entry.node, context);
            entry.scope.dispose();
            if (entry.node.parentNode === this.host) {
                this.host.removeChild(entry.node);
            } else {
                entry.node.remove();
            }
        }
        this.entries.clear();
    }
}
