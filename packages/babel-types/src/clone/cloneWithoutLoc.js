import cloneNode from "./cloneNode.ts";
/**
 * Create a shallow clone of a `node` excluding `_private` and location properties.
 */
export default function cloneWithoutLoc(node) {
    return cloneNode(node, /* deep */ false, /* withoutLoc */ true);
}
