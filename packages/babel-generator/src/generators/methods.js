import { isIdentifier } from "@babel/types";
export function _params(node, idNode, parentNode) {
    this.print(node.typeParameters, node);
    const nameInfo = _getFuncIdName.call(this, idNode, parentNode);
    if (nameInfo) {
        this.sourceIdentifierName(nameInfo.name, nameInfo.pos);
    }
    this.token("(");
    this._parameters(node.params, node);
    this.token(")");
    const noLineTerminator = node.type === "ArrowFunctionExpression";
    this.print(node.returnType, node, noLineTerminator);
    this._noLineTerminator = noLineTerminator;
}
export function _parameters(parameters, parent) {
    const paramLength = parameters.length;
    for (let i = 0; i < paramLength; i++) {
        this._param(parameters[i], parent);
        if (i < parameters.length - 1) {
            this.token(",");
            this.space();
        }
    }
}
export function _param(parameter, parent) {
    this.printJoin(parameter.decorators, parameter);
    this.print(parameter, parent);
    if (
    // @ts-expect-error optional is not in TSParameterProperty
    parameter.optional) {
        this.token("?"); // TS / flow
    }
    this.print(
    // @ts-expect-error typeAnnotation is not in TSParameterProperty
    parameter.typeAnnotation, parameter); // TS / flow
}
export function _methodHead(node) {
    const kind = node.kind;
    const key = node.key;
    if (kind === "get" || kind === "set") {
        this.word(kind);
        this.space();
    }
    if (node.async) {
        this.word("async", true);
        this.space();
    }
    if (kind === "method" ||
        // @ts-expect-error Fixme: kind: "init" is not defined
        kind === "init") {
        if (node.generator) {
            this.token("*");
        }
    }
    if (node.computed) {
        this.token("[");
        this.print(key, node);
        this.token("]");
    }
    else {
        this.print(key, node);
    }
    if (
    // @ts-expect-error optional is not in ObjectMethod
    node.optional) {
        // TS
        this.token("?");
    }
    this._params(node, node.computed && node.key.type !== "StringLiteral" ? undefined : node.key, undefined);
}
export function _predicate(node, noLineTerminatorAfter) {
    if (node.predicate) {
        if (!node.returnType) {
            this.token(":");
        }
        this.space();
        this.print(node.predicate, node, noLineTerminatorAfter);
    }
}
export function _functionHead(node, parent) {
    if (node.async) {
        this.word("async");
        // We prevent inner comments from being printed here,
        // so that they are always consistently printed in the
        // same place regardless of the function type.
        this._endsWithInnerRaw = false;
        this.space();
    }
    this.word("function");
    if (node.generator) {
        // We prevent inner comments from being printed here,
        // so that they are always consistently printed in the
        // same place regardless of the function type.
        this._endsWithInnerRaw = false;
        this.token("*");
    }
    this.space();
    if (node.id) {
        this.print(node.id, node);
    }
    this._params(node, node.id, parent);
    if (node.type !== "TSDeclareFunction") {
        this._predicate(node);
    }
}
export function FunctionExpression(node, parent) {
    this._functionHead(node, parent);
    this.space();
    this.print(node.body, node);
}
export { FunctionExpression as FunctionDeclaration };
export function ArrowFunctionExpression(node, parent) {
    if (node.async) {
        this.word("async", true);
        this.space();
    }
    // Try to avoid printing parens in simple cases, but only if we're pretty
    // sure that they aren't needed by type annotations or potential newlines.
    let firstParam;
    if (!this.format.retainLines &&
        node.params.length === 1 &&
        isIdentifier((firstParam = node.params[0])) &&
        !hasTypesOrComments(node, firstParam)) {
        this.print(firstParam, node, true);
    }
    else {
        this._params(node, undefined, parent);
    }
    this._predicate(node, true);
    this.space();
    // When printing (x)/*1*/=>{}, we remove the parentheses
    // and thus there aren't two contiguous inner tokens.
    // We forcefully print inner comments here.
    this.printInnerComments();
    this.token("=>");
    this.space();
    this.print(node.body, node);
}
function hasTypesOrComments(node, param) {
    return !!(node.typeParameters ||
        node.returnType ||
        node.predicate ||
        param.typeAnnotation ||
        param.optional ||
        // Flow does not support `foo /*: string*/ => {};`
        param.leadingComments?.length ||
        param.trailingComments?.length);
}
function _getFuncIdName(idNode, parent) {
    let id = idNode;
    if (!id && parent) {
        const parentType = parent.type;
        if (parentType === "VariableDeclarator") {
            id = parent.id;
        }
        else if (parentType === "AssignmentExpression" ||
            parentType === "AssignmentPattern") {
            id = parent.left;
        }
        else if (parentType === "ObjectProperty" ||
            parentType === "ClassProperty") {
            if (!parent.computed || parent.key.type === "StringLiteral") {
                id = parent.key;
            }
        }
        else if (parentType === "ClassPrivateProperty" ||
            parentType === "ClassAccessorProperty") {
            id = parent.key;
        }
    }
    if (!id)
        return;
    let nameInfo;
    if (id.type === "Identifier") {
        nameInfo = {
            pos: id.loc?.start,
            name: id.loc?.identifierName || id.name,
        };
    }
    else if (id.type === "PrivateName") {
        nameInfo = {
            pos: id.loc?.start,
            name: "#" + id.id.name,
        };
    }
    else if (id.type === "StringLiteral") {
        nameInfo = {
            pos: id.loc?.start,
            name: id.value,
        };
    }
    return nameInfo;
}
