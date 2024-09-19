import { isBinding, isBlockScoped as nodeIsBlockScoped, isExportDeclaration, isExpression as nodeIsExpression, isFlow as nodeIsFlow, isForStatement, isForXStatement, isIdentifier, isImportDeclaration, isImportSpecifier, isJSXIdentifier, isJSXMemberExpression, isMemberExpression, isRestElement as nodeIsRestElement, isReferenced as nodeIsReferenced, isScope as nodeIsScope, isStatement as nodeIsStatement, isVar as nodeIsVar, isVariableDeclaration, react, isForOfStatement, } from "@babel/types";
const { isCompatTag } = react;
export function isReferencedIdentifier(opts) {
    const { node, parent } = this;
    if (!isIdentifier(node, opts) && !isJSXMemberExpression(parent, opts)) {
        if (isJSXIdentifier(node, opts)) {
            if (isCompatTag(node.name))
                return false;
        }
        else {
            // not a JSXIdentifier or an Identifier
            return false;
        }
    }
    // check if node is referenced
    return nodeIsReferenced(node, parent, this.parentPath.parent);
}
export function isReferencedMemberExpression() {
    const { node, parent } = this;
    return isMemberExpression(node) && nodeIsReferenced(node, parent);
}
export function isBindingIdentifier() {
    const { node, parent } = this;
    const grandparent = this.parentPath.parent;
    return isIdentifier(node) && isBinding(node, parent, grandparent);
}
export function isStatement() {
    const { node, parent } = this;
    if (nodeIsStatement(node)) {
        if (isVariableDeclaration(node)) {
            if (isForXStatement(parent, { left: node }))
                return false;
            if (isForStatement(parent, { init: node }))
                return false;
        }
        return true;
    }
    else {
        return false;
    }
}
export function isExpression() {
    if (this.isIdentifier()) {
        return this.isReferencedIdentifier();
    }
    else {
        return nodeIsExpression(this.node);
    }
}
export function isScope() {
    return nodeIsScope(this.node, this.parent);
}
export function isReferenced() {
    return nodeIsReferenced(this.node, this.parent);
}
export function isBlockScoped() {
    return nodeIsBlockScoped(this.node);
}
export function isVar() {
    return nodeIsVar(this.node);
}
export function isUser() {
    return this.node && !!this.node.loc;
}
export function isGenerated() {
    return !this.isUser();
}
export function isPure(constantsOnly) {
    return this.scope.isPure(this.node, constantsOnly);
}
export function isFlow() {
    const { node } = this;
    if (nodeIsFlow(node)) {
        return true;
    }
    else if (isImportDeclaration(node)) {
        return node.importKind === "type" || node.importKind === "typeof";
    }
    else if (isExportDeclaration(node)) {
        return node.exportKind === "type";
    }
    else if (isImportSpecifier(node)) {
        return node.importKind === "type" || node.importKind === "typeof";
    }
    else {
        return false;
    }
}
// TODO: 7.0 Backwards Compat
export function isRestProperty() {
    return (nodeIsRestElement(this.node) &&
        this.parentPath &&
        this.parentPath.isObjectPattern());
}
export function isSpreadProperty() {
    return (nodeIsRestElement(this.node) &&
        this.parentPath &&
        this.parentPath.isObjectExpression());
}
export function isForAwaitStatement() {
    return isForOfStatement(this.node, { await: true });
}
if (!process.env.BABEL_8_BREAKING && !USE_ESM) {
    // eslint-disable-next-line no-restricted-globals
    exports.isExistentialTypeParam = function isExistentialTypeParam() {
        throw new Error("`path.isExistentialTypeParam` has been renamed to `path.isExistsTypeAnnotation()` in Babel 7.");
    };
    // eslint-disable-next-line no-restricted-globals
    exports.isNumericLiteralTypeAnnotation =
        function isNumericLiteralTypeAnnotation() {
            throw new Error("`path.isNumericLiteralTypeAnnotation()` has been renamed to `path.isNumberLiteralTypeAnnotation()` in Babel 7.");
        };
}
