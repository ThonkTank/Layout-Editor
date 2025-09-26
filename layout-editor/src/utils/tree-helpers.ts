import type { LayoutTree } from "../model/layout-tree";

export function collectDescendantIds(tree: LayoutTree, elementId: string): Set<string> {
    const result = new Set<string>();
    const queue: string[] = [...tree.getChildIds(elementId)];
    while (queue.length) {
        const id = queue.pop()!;
        if (result.has(id)) continue;
        result.add(id);
        for (const childId of tree.getChildIds(id)) {
            queue.push(childId);
        }
    }
    return result;
}

export function collectAncestorIds(tree: LayoutTree, elementId: string): Set<string> {
    const result = new Set<string>();
    let current = tree.getParentId(elementId) ?? null;
    while (current) {
        if (result.has(current)) break;
        result.add(current);
        current = tree.getParentId(current) ?? null;
    }
    return result;
}
