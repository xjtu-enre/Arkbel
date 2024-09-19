import { VISITOR_KEYS } from "../definitions/index.ts";
/**
 * A prefix AST traversal implementation meant for simple searching
 * and processing.
 */
export default function traverseFast(node, enter, opts) {
    if (!node)
        return;
    const keys = VISITOR_KEYS[node.type];
    if (!keys)
        return;
    opts = opts || {};
    enter(node, opts);
    for (const key of keys) {
        const subNode = 
        // @ts-expect-error key must present in node
        node[key];
        if (Array.isArray(subNode)) {
            for (const node of subNode) {
                traverseFast(node, enter, opts);
            }
        }
        else {
            traverseFast(subNode, enter, opts);
        }
    }
}
