import { isExportDefaultDeclaration, isExportNamedDeclaration, } from "@babel/types";
import * as charCodes from "charcodes";
export function ArkTSStructDeclaration(node, parent) {
    const inExport = isExportDefaultDeclaration(parent) || isExportNamedDeclaration(parent);
    if (!inExport) {
        this.printJoin(node.decorators, node);
    }
    this.word("struct");
    if (node.id) {
        this.space();
        this.print(node.id, node);
    }
    this.space();
    this.print(node.body, node);
}
export function ClassDeclaration(node, parent) {
    const inExport = isExportDefaultDeclaration(parent) || isExportNamedDeclaration(parent);
    if (!inExport ||
        !this._shouldPrintDecoratorsBeforeExport(parent)) {
        this.printJoin(node.decorators, node);
    }
    if (node.declare) {
        // TS
        this.word("declare");
        this.space();
    }
    if (node.abstract) {
        // TS
        this.word("abstract");
        this.space();
    }
    this.word("class");
    if (node.id) {
        this.space();
        this.print(node.id, node);
    }
    this.print(node.typeParameters, node);
    if (node.superClass) {
        this.space();
        this.word("extends");
        this.space();
        this.print(node.superClass, node);
        this.print(node.superTypeParameters, node);
    }
    if (node.implements) {
        this.space();
        this.word("implements");
        this.space();
        this.printList(node.implements, node);
    }
    this.space();
    this.print(node.body, node);
}
export { ClassDeclaration as ClassExpression };
export function ClassBody(node) {
    this.token("{");
    if (node.body.length === 0) {
        this.token("}");
    }
    else {
        this.newline();
        this.printSequence(node.body, node, { indent: true });
        if (!this.endsWith(charCodes.lineFeed))
            this.newline();
        this.rightBrace(node);
    }
}
export function ClassProperty(node) {
    this.printJoin(node.decorators, node);
    // catch up to property key, avoid line break
    // between member modifiers and the property key.
    const endLine = node.key.loc?.end?.line;
    if (endLine)
        this.catchUp(endLine);
    this.tsPrintClassMemberModifiers(node);
    if (node.computed) {
        this.token("[");
        this.print(node.key, node);
        this.token("]");
    }
    else {
        this._variance(node);
        this.print(node.key, node);
    }
    // TS
    if (node.optional) {
        this.token("?");
    }
    if (node.definite) {
        this.token("!");
    }
    this.print(node.typeAnnotation, node);
    if (node.value) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.value, node);
    }
    this.semicolon();
}
export function ClassAccessorProperty(node) {
    this.printJoin(node.decorators, node);
    // catch up to property key, avoid line break
    // between member modifiers and the property key.
    const endLine = node.key.loc?.end?.line;
    if (endLine)
        this.catchUp(endLine);
    // TS does not support class accessor property yet
    this.tsPrintClassMemberModifiers(node);
    this.word("accessor", true);
    this.space();
    if (node.computed) {
        this.token("[");
        this.print(node.key, node);
        this.token("]");
    }
    else {
        // Todo: Flow does not support class accessor property yet.
        this._variance(node);
        this.print(node.key, node);
    }
    // TS
    if (node.optional) {
        this.token("?");
    }
    if (node.definite) {
        this.token("!");
    }
    this.print(node.typeAnnotation, node);
    if (node.value) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.value, node);
    }
    this.semicolon();
}
export function ClassPrivateProperty(node) {
    this.printJoin(node.decorators, node);
    if (node.static) {
        this.word("static");
        this.space();
    }
    this.print(node.key, node);
    this.print(node.typeAnnotation, node);
    if (node.value) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.value, node);
    }
    this.semicolon();
}
export function ClassMethod(node) {
    this._classMethodHead(node);
    this.space();
    this.print(node.body, node);
}
export function ClassPrivateMethod(node) {
    this._classMethodHead(node);
    this.space();
    this.print(node.body, node);
}
export function _classMethodHead(node) {
    this.printJoin(node.decorators, node);
    // catch up to method key, avoid line break
    // between member modifiers/method heads and the method key.
    const endLine = node.key.loc?.end?.line;
    if (endLine)
        this.catchUp(endLine);
    this.tsPrintClassMemberModifiers(node);
    this._methodHead(node);
}
export function StaticBlock(node) {
    this.word("static");
    this.space();
    this.token("{");
    if (node.body.length === 0) {
        this.token("}");
    }
    else {
        this.newline();
        this.printSequence(node.body, node, {
            indent: true,
        });
        this.rightBrace(node);
    }
}
