import { isIdentifier } from "../validators/generated/index.ts";
import { stringLiteral } from "../builders/generated/index.ts";
export default function toComputedKey(node, 
// @ts-expect-error todo(flow->ts): maybe check the type of node before accessing .key and .property
key = node.key || node.property) {
    if (!node.computed && isIdentifier(key))
        key = stringLiteral(key.name);
    return key;
}
