import { isVariableDeclaration } from "./generated/index.ts";
import { BLOCK_SCOPED_SYMBOL } from "../constants/index.ts";
/**
 * Check if the input `node` is a `let` variable declaration.
 */
export default function isLet(node) {
    return (isVariableDeclaration(node) &&
        (node.kind !== "var" ||
            // @ts-expect-error Fixme: document private properties
            node[BLOCK_SCOPED_SYMBOL]));
}
