import { isContainerType } from "../definitions";
import { cloneLayoutElement } from "../utils";
import type { LayoutElement } from "../types";

interface LayoutNode {
    readonly element: LayoutElement;
    children: string[];
}

interface InsertOptions {
    parentId?: string | null;
    index?: number;
}

export class LayoutTree {
    private readonly nodes = new Map<string, LayoutNode>();
    private readonly order: string[] = [];

    constructor(elements: LayoutElement[] = []) {
        if (elements.length) {
            this.load(elements);
        }
    }

    load(elements: LayoutElement[]): void {
        this.nodes.clear();
        this.order.length = 0;

        const initialChildren = new Map<string, string[]>();

        for (const element of elements) {
            const clone = cloneLayoutElement(element);
            clone.children = undefined;
            const node: LayoutNode = {
                element: clone,
                children: [],
            };
            this.nodes.set(clone.id, node);
            this.order.push(clone.id);
            if (Array.isArray(element.children) && element.children.length) {
                initialChildren.set(clone.id, [...element.children]);
            }
        }

        for (const node of this.nodes.values()) {
            const parentId = node.element.parentId ?? undefined;
            if (!parentId) continue;
            if (!this.nodes.has(parentId) || parentId === node.element.id) {
                node.element.parentId = undefined;
            }
        }

        for (const [parentId, children] of initialChildren.entries()) {
            const parent = this.nodes.get(parentId);
            if (!parent) continue;
            const nextChildren: string[] = [];
            for (const childId of children) {
                if (childId === parentId) continue;
                const child = this.nodes.get(childId);
                if (!child) continue;
                child.element.parentId = parentId;
                if (!nextChildren.includes(childId)) {
                    nextChildren.push(childId);
                }
            }
            parent.children = nextChildren;
            this.updateDerivedChildren(parent);
        }

        for (const node of this.nodes.values()) {
            const parentId = node.element.parentId;
            if (!parentId) continue;
            const parent = this.nodes.get(parentId);
            if (!parent) {
                node.element.parentId = undefined;
                continue;
            }
            if (!parent.children.includes(node.element.id)) {
                parent.children.push(node.element.id);
                this.updateDerivedChildren(parent);
            }
        }
    }

    has(id: string): boolean {
        return this.nodes.has(id);
    }

    getElement(id: string): LayoutElement | undefined {
        const node = this.nodes.get(id);
        if (!node) return undefined;
        this.updateDerivedChildren(node);
        return node.element;
    }

    getElementsSnapshot(): LayoutElement[] {
        return this.order
            .map(id => this.nodes.get(id))
            .filter((node): node is LayoutNode => !!node)
            .map(node => {
                this.updateDerivedChildren(node);
                return node.element;
            });
    }

    getChildIds(id: string): readonly string[] {
        return this.nodes.get(id)?.children ?? [];
    }

    getChildElements(id: string): LayoutElement[] {
        const node = this.nodes.get(id);
        if (!node) return [];
        const result: LayoutElement[] = [];
        const nextChildren: string[] = [];
        for (const childId of node.children) {
            if (childId === id) continue;
            const child = this.nodes.get(childId);
            if (!child) continue;
            result.push(child.element);
            nextChildren.push(childId);
        }
        if (nextChildren.length !== node.children.length) {
            node.children = nextChildren;
            this.updateDerivedChildren(node);
        }
        return result;
    }

    insert(element: LayoutElement, options: InsertOptions = {}): LayoutElement {
        if (this.nodes.has(element.id)) {
            throw new Error(`Layout element with id "${element.id}" already exists.`);
        }
        const clone = cloneLayoutElement(element);
        clone.children = undefined;
        const node: LayoutNode = { element: clone, children: [] };
        this.nodes.set(clone.id, node);
        this.order.push(clone.id);
        this.attachToParent(clone.id, options.parentId ?? clone.parentId ?? null, options.index);
        this.updateDerivedChildren(node);
        return node.element;
    }

    update(id: string, mutate: (element: LayoutElement) => void): LayoutElement {
        const node = this.nodes.get(id);
        if (!node) {
            throw new Error(`Cannot update missing layout element "${id}".`);
        }
        mutate(node.element);
        this.updateDerivedChildren(node);
        return node.element;
    }

    remove(id: string): LayoutElement | undefined {
        const node = this.nodes.get(id);
        if (!node) return undefined;
        const parentId = node.element.parentId ?? null;
        if (parentId) {
            this.detachFromParent(id, parentId);
        }
        const childIds = [...node.children];
        for (const childId of childIds) {
            this.setParent(childId, null);
        }
        this.nodes.delete(id);
        const orderIndex = this.order.indexOf(id);
        if (orderIndex !== -1) {
            this.order.splice(orderIndex, 1);
        }
        return node.element;
    }

    setParent(id: string, parentId: string | null, index?: number): boolean {
        const node = this.nodes.get(id);
        if (!node) return false;
        if (parentId === id) return false;
        const currentParentId = node.element.parentId ?? null;
        if (currentParentId === parentId) {
            if (parentId) {
                const parent = this.nodes.get(parentId);
                if (parent && (!parent.children.includes(id) || typeof index === "number")) {
                    this.insertChildId(parent, id, index);
                    this.updateDerivedChildren(parent);
                }
            }
            return true;
        }
        if (parentId && !this.nodes.has(parentId)) {
            return false;
        }
        if (parentId) {
            const descendants = this.collectDescendants(id);
            if (descendants.has(parentId)) {
                return false;
            }
        }
        if (currentParentId) {
            this.detachFromParent(id, currentParentId);
        }
        if (!parentId) {
            node.element.parentId = undefined;
            this.updateDerivedChildren(node);
            return true;
        }
        const parent = this.nodes.get(parentId);
        if (!parent) return false;
        node.element.parentId = parentId;
        this.insertChildId(parent, id, index);
        this.updateDerivedChildren(parent);
        this.updateDerivedChildren(node);
        return true;
    }

    moveChild(containerId: string, childId: string, offset: number): boolean {
        const container = this.nodes.get(containerId);
        if (!container) return false;
        const index = container.children.indexOf(childId);
        if (index === -1) return false;
        const nextIndex = Math.max(0, Math.min(container.children.length - 1, index + offset));
        if (index === nextIndex) return false;
        const [removed] = container.children.splice(index, 1);
        container.children.splice(nextIndex, 0, removed);
        this.updateDerivedChildren(container);
        return true;
    }

    getParentId(id: string): string | undefined {
        const node = this.nodes.get(id);
        return node?.element.parentId ?? undefined;
    }

    private attachToParent(id: string, parentId: string | null, index?: number) {
        if (!parentId) {
            this.setParent(id, null, index);
            return;
        }
        this.setParent(id, parentId, index);
    }

    private insertChildId(parent: LayoutNode, childId: string, index?: number) {
        const existingIndex = parent.children.indexOf(childId);
        if (existingIndex !== -1) {
            parent.children.splice(existingIndex, 1);
        }
        if (typeof index === "number") {
            const clamped = Math.max(0, Math.min(parent.children.length, index));
            parent.children.splice(clamped, 0, childId);
        } else {
            parent.children.push(childId);
        }
    }

    private detachFromParent(id: string, parentId: string) {
        const parent = this.nodes.get(parentId);
        if (!parent) return;
        const index = parent.children.indexOf(id);
        if (index !== -1) {
            parent.children.splice(index, 1);
            this.updateDerivedChildren(parent);
        }
    }

    private collectDescendants(id: string): Set<string> {
        const result = new Set<string>();
        const queue: string[] = [...(this.nodes.get(id)?.children ?? [])];
        while (queue.length) {
            const next = queue.pop()!;
            if (result.has(next)) continue;
            result.add(next);
            const node = this.nodes.get(next);
            if (!node) continue;
            for (const child of node.children) {
                queue.push(child);
            }
        }
        return result;
    }

    private updateDerivedChildren(node: LayoutNode) {
        if (node.children.length) {
            node.element.children = [...node.children];
            return;
        }
        if (isContainerType(node.element.type)) {
            node.element.children = [];
        } else {
            node.element.children = undefined;
        }
    }
}
