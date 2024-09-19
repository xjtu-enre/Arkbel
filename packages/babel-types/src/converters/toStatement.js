import { isStatement, isFunction, isClass, isAssignmentExpression, } from "../validators/generated/index.ts";
import { expressionStatement } from "../builders/generated/index.ts";
export default toStatement;
function toStatement(node, ignore) {
    if (isStatement(node)) {
        return node;
    }
    let mustHaveId = false;
    let newType;
    if (isClass(node)) {
        mustHaveId = true;
        newType = "ClassDeclaration";
    }
    else if (isFunction(node)) {
        mustHaveId = true;
        newType = "FunctionDeclaration";
    }
    else if (isAssignmentExpression(node)) {
        return expressionStatement(node);
    }
    // @ts-expect-error todo(flow->ts): node.id might be missing
    if (mustHaveId && !node.id) {
        newType = false;
    }
    if (!newType) {
        if (ignore) {
            return false;
        }
        else {
            throw new Error(`cannot turn ${node.type} to a statement`);
        }
    }
    // @ts-expect-error manipulating node.type
    node.type = newType;
    // @ts-expect-error todo(flow->ts) refactor to avoid type unsafe mutations like reassigning node type above
    return node;
}
