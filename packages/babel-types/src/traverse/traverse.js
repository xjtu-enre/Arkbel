import { VISITOR_KEYS } from "../definitions/index.ts";
/**
 * A general AST traversal with both prefix and postfix handlers, and a
 * state object. Exposes ancestry data to each handler so that more complex
 * AST data can be taken into account.
 */
export default function traverse(node, handlers, state) {
    if (typeof handlers === "function") {
        handlers = { enter: handlers };
    }
    const { enter, exit } = handlers;
    traverseSimpleImpl(node, enter, exit, state, []);
}
function traverseSimpleImpl(node, enter, exit, state, ancestors) {
    const keys = VISITOR_KEYS[node.type];
    if (!keys)
        return;
    if (enter)
        enter(node, ancestors, state);
    for (const key of keys) {
        const subNode = node[key];
        if (Array.isArray(subNode)) {
            for (let i = 0; i < subNode.length; i++) {
                const child = subNode[i];
                if (!child)
                    continue;
                ancestors.push({
                    node,
                    key,
                    index: i,
                });
                traverseSimpleImpl(child, enter, exit, state, ancestors);
                ancestors.pop();
            }
        }
        else if (subNode) {
            ancestors.push({
                node,
                key,
            });
            traverseSimpleImpl(subNode, enter, exit, state, ancestors);
            ancestors.pop();
        }
    }
    if (exit)
        exit(node, ancestors, state);
}
