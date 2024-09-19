import validate from "../validators/validate.ts";
import { BUILDER_KEYS } from "../index.ts";
export default function validateNode(node) {
    // todo: because keys not in BUILDER_KEYS are not validated - this actually allows invalid nodes in some cases
    const keys = BUILDER_KEYS[node.type];
    for (const key of keys) {
        validate(node, key, node[key]);
    }
    return node;
}
