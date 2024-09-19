import { COMMENT_KEYS } from "../constants/index.ts";
/**
 * Remove comment properties from a node.
 */
export default function removeComments(node) {
    COMMENT_KEYS.forEach(key => {
        node[key] = null;
    });
    return node;
}
