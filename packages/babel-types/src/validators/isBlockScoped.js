import { isClassDeclaration, isFunctionDeclaration, isArkTSStructDeclaration, } from "./generated/index.ts";
import isLet from "./isLet.ts";
/**
 * Check if the input `node` is block scoped.
 */
export default function isBlockScoped(node) {
    return isFunctionDeclaration(node) || isClassDeclaration(node) || isArkTSStructDeclaration(node) || isLet(node);
}
