// TODO(Babel 8): Remove this file
import { types as t, template } from "@babel/core";
import ReplaceSupers from "@babel/helper-replace-supers";
import nameFunction from "@babel/helper-function-name";
export function hasOwnDecorators(node) {
    // @ts-expect-error: 'decorators' not in TSIndexSignature
    return !!node.decorators?.length;
}
export function hasDecorators(node) {
    return hasOwnDecorators(node) || node.body.body.some(hasOwnDecorators);
}
function prop(key, value) {
    if (!value)
        return null;
    return t.objectProperty(t.identifier(key), value);
}
function method(key, body) {
    return t.objectMethod("method", t.identifier(key), [], t.blockStatement(body));
}
function takeDecorators(node) {
    let result;
    if (node.decorators && node.decorators.length > 0) {
        result = t.arrayExpression(node.decorators.map(decorator => decorator.expression));
    }
    node.decorators = undefined;
    return result;
}
function getKey(node) {
    if (node.computed) {
        return node.key;
    }
    else if (t.isIdentifier(node.key)) {
        return t.stringLiteral(node.key.name);
    }
    else {
        return t.stringLiteral(String(
        // A non-identifier non-computed key
        node.key
            .value));
    }
}
function extractElementDescriptor(file, classRef, superRef, path) {
    const isMethod = path.isClassMethod();
    if (path.isPrivate()) {
        throw path.buildCodeFrameError(`Private ${isMethod ? "methods" : "fields"} in decorated classes are not supported yet.`);
    }
    if (path.node.type === "ClassAccessorProperty") {
        throw path.buildCodeFrameError(`Accessor properties are not supported in 2018-09 decorator transform, please specify { "version": "2021-12" } instead.`);
    }
    if (path.node.type === "StaticBlock") {
        throw path.buildCodeFrameError(`Static blocks are not supported in 2018-09 decorator transform, please specify { "version": "2021-12" } instead.`);
    }
    const { node, scope } = path;
    if (!path.isTSDeclareMethod()) {
        new ReplaceSupers({
            methodPath: path,
            objectRef: classRef,
            superRef,
            file,
            refToPreserve: classRef,
        }).replace();
    }
    const properties = [
        prop("kind", t.stringLiteral(t.isClassMethod(node) ? node.kind : "field")),
        prop("decorators", takeDecorators(node)),
        prop("static", node.static && t.booleanLiteral(true)),
        prop("key", getKey(node)),
    ].filter(Boolean);
    if (t.isClassMethod(node)) {
        const id = node.computed
            ? null
            : node.key;
        const transformed = t.toExpression(node);
        properties.push(prop("value", nameFunction({ node: transformed, id, scope }) || transformed));
    }
    else if (t.isClassProperty(node) && node.value) {
        properties.push(method("value", template.statements.ast `return ${node.value}`));
    }
    else {
        properties.push(prop("value", scope.buildUndefinedNode()));
    }
    path.remove();
    return t.objectExpression(properties);
}
function addDecorateHelper(file) {
    return file.addHelper("decorate");
}
export function buildDecoratedClass(ref, path, elements, file) {
    const { node, scope } = path;
    const initializeId = scope.generateUidIdentifier("initialize");
    const isDeclaration = node.id && path.isDeclaration();
    const isStrict = path.isInStrictMode();
    const { superClass } = node;
    node.type = "ClassDeclaration";
    if (!node.id)
        node.id = t.cloneNode(ref);
    let superId;
    if (superClass) {
        superId = scope.generateUidIdentifierBasedOnNode(node.superClass, "super");
        node.superClass = superId;
    }
    const classDecorators = takeDecorators(node);
    const definitions = t.arrayExpression(elements
        .filter(element => 
    // @ts-expect-error Ignore TypeScript's abstract methods (see #10514)
    !element.node.abstract && element.node.type !== "TSIndexSignature")
        .map(path => extractElementDescriptor(file, node.id, superId, 
    // @ts-expect-error TS can not exclude TSIndexSignature
    path)));
    const wrapperCall = template.expression.ast `
    ${addDecorateHelper(file)}(
      ${classDecorators || t.nullLiteral()},
      function (${initializeId}, ${superClass ? t.cloneNode(superId) : null}) {
        ${node}
        return { F: ${t.cloneNode(node.id)}, d: ${definitions} };
      },
      ${superClass}
    )
  `;
    if (!isStrict) {
        wrapperCall.arguments[1].body.directives.push(t.directive(t.directiveLiteral("use strict")));
    }
    let replacement = wrapperCall;
    let classPathDesc = "arguments.1.body.body.0";
    if (isDeclaration) {
        replacement = template.statement.ast `let ${ref} = ${wrapperCall}`;
        classPathDesc = "declarations.0.init." + classPathDesc;
    }
    return {
        instanceNodes: [
            template.statement.ast `
        ${t.cloneNode(initializeId)}(this)
      `,
        ],
        wrapClass(path) {
            path.replaceWith(replacement);
            return path.get(classPathDesc);
        },
    };
}
