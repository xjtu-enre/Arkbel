import { isBlockStatement, isFunction, isEmptyStatement, isStatement, } from "../validators/generated/index.ts";
import { returnStatement, expressionStatement, blockStatement, } from "../builders/generated/index.ts";
export default function toBlock(node, parent) {
    if (isBlockStatement(node)) {
        return node;
    }
    let blockNodes = [];
    if (isEmptyStatement(node)) {
        blockNodes = [];
    }
    else {
        if (!isStatement(node)) {
            if (isFunction(parent)) {
                node = returnStatement(node);
            }
            else {
                node = expressionStatement(node);
            }
        }
        blockNodes = [node];
    }
    return blockStatement(blockNodes);
}
