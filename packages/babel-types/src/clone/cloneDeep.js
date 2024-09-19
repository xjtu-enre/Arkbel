import cloneNode from "./cloneNode.ts";
/**
 * Create a deep clone of a `node` and all of it's child nodes
 * including only properties belonging to the node.
 * @deprecated Use t.cloneNode instead.
 */
export default function cloneDeep(node) {
    return cloneNode(node);
}
