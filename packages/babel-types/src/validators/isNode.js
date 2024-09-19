import { VISITOR_KEYS } from "../definitions/index.ts";
export default function isNode(node) {
    return !!(node && VISITOR_KEYS[node.type]);
}
