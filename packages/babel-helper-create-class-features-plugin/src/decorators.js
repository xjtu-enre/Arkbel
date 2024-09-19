import { types as t, template } from "@babel/core";
import ReplaceSupers from "@babel/helper-replace-supers";
import splitExportDeclaration from "@babel/helper-split-export-declaration";
import * as charCodes from "charcodes";
import { skipTransparentExprWrappers } from "@babel/helper-skip-transparent-expression-wrappers";
function incrementId(id, idx = id.length - 1) {
    // If index is -1, id needs an additional character, unshift A
    if (idx === -1) {
        id.unshift(charCodes.uppercaseA);
        return;
    }
    const current = id[idx];
    if (current === charCodes.uppercaseZ) {
        // if current is Z, skip to a
        id[idx] = charCodes.lowercaseA;
    }
    else if (current === charCodes.lowercaseZ) {
        // if current is z, reset to A and carry the 1
        id[idx] = charCodes.uppercaseA;
        incrementId(id, idx - 1);
    }
    else {
        // else, increment by one
        id[idx] = current + 1;
    }
}
/**
 * Generates a new private name that is unique to the given class. This can be
 * used to create extra class fields and methods for the implementation, while
 * keeping the length of those names as small as possible. This is important for
 * minification purposes (though private names can generally be minified,
 * transpilations and polyfills cannot yet).
 */
function createPrivateUidGeneratorForClass(classPath) {
    const currentPrivateId = [];
    const privateNames = new Set();
    classPath.traverse({
        PrivateName(path) {
            privateNames.add(path.node.id.name);
        },
    });
    return () => {
        let reifiedId;
        do {
            incrementId(currentPrivateId);
            reifiedId = String.fromCharCode(...currentPrivateId);
        } while (privateNames.has(reifiedId));
        return t.privateName(t.identifier(reifiedId));
    };
}
/**
 * Wraps the above generator function so that it's run lazily the first time
 * it's actually required. Several types of decoration do not require this, so it
 * saves iterating the class elements an additional time and allocating the space
 * for the Sets of element names.
 */
function createLazyPrivateUidGeneratorForClass(classPath) {
    let generator;
    return () => {
        if (!generator) {
            generator = createPrivateUidGeneratorForClass(classPath);
        }
        return generator();
    };
}
/**
 * Takes a class definition and the desired class name if anonymous and
 * replaces it with an equivalent class declaration (path) which is then
 * assigned to a local variable (id). This allows us to reassign the local variable with the
 * decorated version of the class. The class definition retains its original
 * name so that `toString` is not affected, other references to the class
 * are renamed instead.
 */
function replaceClassWithVar(path, className) {
    if (path.type === "ClassDeclaration") {
        const id = path.node.id;
        const className = id.name;
        const varId = path.scope.generateUidIdentifierBasedOnNode(id);
        const classId = t.identifier(className);
        path.scope.rename(className, varId.name);
        path.get("id").replaceWith(classId);
        return { id: t.cloneNode(varId), path };
    }
    else {
        let varId;
        if (path.node.id) {
            className = path.node.id.name;
            varId = path.scope.parent.generateDeclaredUidIdentifier(className);
            path.scope.rename(className, varId.name);
        }
        else {
            varId = path.scope.parent.generateDeclaredUidIdentifier(typeof className === "string" ? className : "decorated_class");
        }
        const newClassExpr = t.classExpression(typeof className === "string" ? t.identifier(className) : null, path.node.superClass, path.node.body);
        const [newPath] = path.replaceWith(t.sequenceExpression([newClassExpr, varId]));
        return {
            id: t.cloneNode(varId),
            path: newPath.get("expressions.0"),
        };
    }
}
function generateClassProperty(key, value, isStatic) {
    if (key.type === "PrivateName") {
        return t.classPrivateProperty(key, value, undefined, isStatic);
    }
    else {
        return t.classProperty(key, value, undefined, undefined, isStatic);
    }
}
function addProxyAccessorsFor(className, element, originalKey, targetKey, version, isComputed = false) {
    const { static: isStatic } = element.node;
    const thisArg = version === "2023-05" && isStatic ? className : t.thisExpression();
    const getterBody = t.blockStatement([
        t.returnStatement(t.memberExpression(t.cloneNode(thisArg), t.cloneNode(targetKey))),
    ]);
    const setterBody = t.blockStatement([
        t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.cloneNode(thisArg), t.cloneNode(targetKey)), t.identifier("v"))),
    ]);
    let getter, setter;
    if (originalKey.type === "PrivateName") {
        getter = t.classPrivateMethod("get", t.cloneNode(originalKey), [], getterBody, isStatic);
        setter = t.classPrivateMethod("set", t.cloneNode(originalKey), [t.identifier("v")], setterBody, isStatic);
    }
    else {
        getter = t.classMethod("get", t.cloneNode(originalKey), [], getterBody, isComputed, isStatic);
        setter = t.classMethod("set", t.cloneNode(originalKey), [t.identifier("v")], setterBody, isComputed, isStatic);
    }
    element.insertAfter(setter);
    element.insertAfter(getter);
}
function extractProxyAccessorsFor(targetKey, version) {
    if (version !== "2023-05" && version !== "2023-01") {
        return [
            template.expression.ast `
        function () {
          return this.${t.cloneNode(targetKey)};
        }
      `,
            template.expression.ast `
        function (value) {
          this.${t.cloneNode(targetKey)} = value;
        }
      `,
        ];
    }
    return [
        template.expression.ast `
      o => o.${t.cloneNode(targetKey)}
    `,
        template.expression.ast `
      (o, v) => o.${t.cloneNode(targetKey)} = v
    `,
    ];
}
// 3 bits reserved to this (0-7)
const FIELD = 0;
const ACCESSOR = 1;
const METHOD = 2;
const GETTER = 3;
const SETTER = 4;
const STATIC_OLD_VERSION = 5; // Before 2023-05
const STATIC = 8; // 1 << 3
const DECORATORS_HAVE_THIS = 16; // 1 << 3
function getElementKind(element) {
    switch (element.node.type) {
        case "ClassProperty":
        case "ClassPrivateProperty":
            return FIELD;
        case "ClassAccessorProperty":
            return ACCESSOR;
        case "ClassMethod":
        case "ClassPrivateMethod":
            if (element.node.kind === "get") {
                return GETTER;
            }
            else if (element.node.kind === "set") {
                return SETTER;
            }
            else {
                return METHOD;
            }
    }
}
function isDecoratorInfo(info) {
    return "decorators" in info;
}
function filteredOrderedDecoratorInfo(info) {
    const filtered = info.filter(isDecoratorInfo);
    return [
        ...filtered.filter(el => el.isStatic && el.kind >= ACCESSOR && el.kind <= SETTER),
        ...filtered.filter(el => !el.isStatic && el.kind >= ACCESSOR && el.kind <= SETTER),
        ...filtered.filter(el => el.isStatic && el.kind === FIELD),
        ...filtered.filter(el => !el.isStatic && el.kind === FIELD),
    ];
}
function generateDecorationList(decorators, decoratorsThis, version) {
    const decsCount = decorators.length;
    const hasOneThis = decoratorsThis.some(Boolean);
    const decs = [];
    for (let i = 0; i < decsCount; i++) {
        if (version === "2023-05" && hasOneThis) {
            decs.push(decoratorsThis[i] || t.unaryExpression("void", t.numericLiteral(0)));
        }
        decs.push(decorators[i]);
    }
    return { hasThis: hasOneThis, decs };
}
function generateDecorationExprs(info, version) {
    return t.arrayExpression(filteredOrderedDecoratorInfo(info).map(el => {
        const { decs, hasThis } = generateDecorationList(el.decorators, el.decoratorsThis, version);
        let flag = el.kind;
        if (el.isStatic) {
            flag += version === "2023-05" ? STATIC : STATIC_OLD_VERSION;
        }
        if (hasThis)
            flag += DECORATORS_HAVE_THIS;
        return t.arrayExpression([
            decs.length === 1 ? decs[0] : t.arrayExpression(decs),
            t.numericLiteral(flag),
            el.name,
            ...(el.privateMethods || []),
        ]);
    }));
}
function extractElementLocalAssignments(decorationInfo) {
    const localIds = [];
    for (const el of filteredOrderedDecoratorInfo(decorationInfo)) {
        const { locals } = el;
        if (Array.isArray(locals)) {
            localIds.push(...locals);
        }
        else if (locals !== undefined) {
            localIds.push(locals);
        }
    }
    return localIds;
}
function addCallAccessorsFor(element, key, getId, setId) {
    element.insertAfter(t.classPrivateMethod("get", t.cloneNode(key), [], t.blockStatement([
        t.returnStatement(t.callExpression(t.cloneNode(getId), [t.thisExpression()])),
    ])));
    element.insertAfter(t.classPrivateMethod("set", t.cloneNode(key), [t.identifier("v")], t.blockStatement([
        t.expressionStatement(t.callExpression(t.cloneNode(setId), [
            t.thisExpression(),
            t.identifier("v"),
        ])),
    ])));
}
function isNotTsParameter(node) {
    return node.type !== "TSParameterProperty";
}
function movePrivateAccessor(element, key, methodLocalVar, isStatic) {
    let params;
    let block;
    if (element.node.kind === "set") {
        params = [t.identifier("v")];
        block = [
            t.expressionStatement(t.callExpression(methodLocalVar, [
                t.thisExpression(),
                t.identifier("v"),
            ])),
        ];
    }
    else {
        params = [];
        block = [
            t.returnStatement(t.callExpression(methodLocalVar, [t.thisExpression()])),
        ];
    }
    element.replaceWith(t.classPrivateMethod(element.node.kind, t.cloneNode(key), params, t.blockStatement(block), isStatic));
}
function isClassDecoratableElementPath(path) {
    const { type } = path;
    return (type !== "TSDeclareMethod" &&
        type !== "TSIndexSignature" &&
        type !== "StaticBlock");
}
function staticBlockToIIFE(block) {
    return t.callExpression(t.arrowFunctionExpression([], t.blockStatement(block.body)), []);
}
function maybeSequenceExpression(exprs) {
    if (exprs.length === 0)
        return t.unaryExpression("void", t.numericLiteral(0));
    if (exprs.length === 1)
        return exprs[0];
    return t.sequenceExpression(exprs);
}
function createSetFunctionNameCall(state, className) {
    return t.callExpression(state.addHelper("setFunctionName"), [
        t.thisExpression(),
        className,
    ]);
}
function createToPropertyKeyCall(state, propertyKey) {
    return t.callExpression(state.addHelper("toPropertyKey"), [propertyKey]);
}
function transformClass(path, state, constantSuper, version, className, propertyVisitor) {
    const body = path.get("body.body");
    const classDecorators = path.node.decorators;
    let hasElementDecorators = false;
    const generateClassPrivateUid = createLazyPrivateUidGeneratorForClass(path);
    const assignments = [];
    const scopeParent = path.scope.parent;
    const memoiseExpression = (expression, hint) => {
        const localEvaluatedId = scopeParent.generateDeclaredUidIdentifier(hint);
        assignments.push(t.assignmentExpression("=", localEvaluatedId, expression));
        return t.cloneNode(localEvaluatedId);
    };
    // Iterate over the class to see if we need to decorate it, and also to
    // transform simple auto accessors which are not decorated
    for (const element of body) {
        if (!isClassDecoratableElementPath(element)) {
            continue;
        }
        if (element.node.decorators && element.node.decorators.length > 0) {
            switch (element.node.type) {
                case "ClassProperty":
                    // @ts-expect-error todo: propertyVisitor.ClassProperty should be callable. Improve typings.
                    propertyVisitor.ClassProperty(element, state);
                    break;
                case "ClassPrivateProperty":
                    // @ts-expect-error todo: propertyVisitor.ClassPrivateProperty should be callable. Improve typings.
                    propertyVisitor.ClassPrivateProperty(element, state);
                    break;
                case "ClassAccessorProperty":
                    // @ts-expect-error todo: propertyVisitor.ClassAccessorProperty should be callable. Improve typings.
                    propertyVisitor.ClassAccessorProperty(element, state);
                    break;
            }
            hasElementDecorators = true;
        }
        else if (element.node.type === "ClassAccessorProperty") {
            // @ts-expect-error todo: propertyVisitor.ClassAccessorProperty should be callable. Improve typings.
            propertyVisitor.ClassAccessorProperty(element, state);
            const { key, value, static: isStatic, computed } = element.node;
            const newId = generateClassPrivateUid();
            const newField = generateClassProperty(newId, value, isStatic);
            const keyPath = element.get("key");
            const [newPath] = element.replaceWith(newField);
            addProxyAccessorsFor(path.node.id, newPath, computed && !keyPath.isConstantExpression()
                ? memoiseExpression(createToPropertyKeyCall(state, key), "computedKey")
                : key, newId, version, computed);
        }
    }
    if (!classDecorators && !hasElementDecorators) {
        // If nothing is decorated but we have assignments, it must be the memoised
        // computed keys of class accessors
        if (assignments.length > 0) {
            path.insertBefore(assignments.map(expr => t.expressionStatement(expr)));
            // Recrawl the scope to make sure new identifiers are properly synced
            path.scope.crawl();
        }
        // If nothing is decorated and no assignments inserted, return
        return;
    }
    const elementDecoratorInfo = [];
    // The initializer of the first non-static field will be injected with the protoInit call
    let firstFieldPath;
    let constructorPath;
    let requiresProtoInit = false;
    let requiresStaticInit = false;
    const decoratedPrivateMethods = new Set();
    let protoInitLocal, staticInitLocal, classInitLocal, classIdLocal;
    const decoratorsThis = new Map();
    const maybeExtractDecorator = (decorator) => {
        const { expression } = decorator;
        if (version === "2023-05" && t.isMemberExpression(expression)) {
            let object;
            if (t.isSuper(expression.object) ||
                t.isThisExpression(expression.object)) {
                object = memoiseExpression(t.thisExpression(), "obj");
            }
            else if (!scopeParent.isStatic(expression.object)) {
                object = memoiseExpression(expression.object, "obj");
                expression.object = object;
            }
            else {
                object = expression.object;
            }
            decoratorsThis.set(decorator, t.cloneNode(object));
        }
        if (!scopeParent.isStatic(expression)) {
            decorator.expression = memoiseExpression(expression, "dec");
        }
    };
    let needsDeclaraionForClassBinding = false;
    if (classDecorators) {
        classInitLocal = scopeParent.generateDeclaredUidIdentifier("initClass");
        needsDeclaraionForClassBinding = path.isClassDeclaration();
        ({ id: classIdLocal, path } = replaceClassWithVar(path, className));
        path.node.decorators = null;
        for (const classDecorator of classDecorators) {
            maybeExtractDecorator(classDecorator);
        }
    }
    else {
        if (!path.node.id) {
            path.node.id = path.scope.generateUidIdentifier("Class");
        }
        classIdLocal = t.cloneNode(path.node.id);
    }
    let lastInstancePrivateName;
    let needsInstancePrivateBrandCheck = false;
    if (hasElementDecorators) {
        for (const element of body) {
            if (!isClassDecoratableElementPath(element)) {
                continue;
            }
            const { node } = element;
            const decorators = element.get("decorators");
            const hasDecorators = Array.isArray(decorators) && decorators.length > 0;
            if (hasDecorators) {
                for (const decoratorPath of decorators) {
                    maybeExtractDecorator(decoratorPath.node);
                }
            }
            const isComputed = "computed" in element.node && element.node.computed === true;
            if (isComputed) {
                if (!element.get("key").isConstantExpression()) {
                    node.key = memoiseExpression(createToPropertyKeyCall(state, node.key), "computedKey");
                }
            }
            const kind = getElementKind(element);
            const { key } = node;
            const isPrivate = key.type === "PrivateName";
            const isStatic = !!element.node.static;
            let name = "computedKey";
            if (isPrivate) {
                name = key.id.name;
            }
            else if (!isComputed && key.type === "Identifier") {
                name = key.name;
            }
            if (isPrivate && !isStatic) {
                if (hasDecorators) {
                    needsInstancePrivateBrandCheck = true;
                }
                if (t.isClassPrivateProperty(node) || !lastInstancePrivateName) {
                    lastInstancePrivateName = key;
                }
            }
            if (element.isClassMethod({ kind: "constructor" })) {
                constructorPath = element;
            }
            if (hasDecorators) {
                let locals;
                let privateMethods;
                if (kind === ACCESSOR) {
                    const { value } = element.node;
                    const params = [t.thisExpression()];
                    if (value) {
                        params.push(t.cloneNode(value));
                    }
                    const newId = generateClassPrivateUid();
                    const newFieldInitId = element.scope.parent.generateDeclaredUidIdentifier(`init_${name}`);
                    const newValue = t.callExpression(t.cloneNode(newFieldInitId), params);
                    const newField = generateClassProperty(newId, newValue, isStatic);
                    const [newPath] = element.replaceWith(newField);
                    if (isPrivate) {
                        privateMethods = extractProxyAccessorsFor(newId, version);
                        const getId = newPath.scope.parent.generateDeclaredUidIdentifier(`get_${name}`);
                        const setId = newPath.scope.parent.generateDeclaredUidIdentifier(`set_${name}`);
                        addCallAccessorsFor(newPath, key, getId, setId);
                        locals = [newFieldInitId, getId, setId];
                    }
                    else {
                        addProxyAccessorsFor(path.node.id, newPath, key, newId, version, isComputed);
                        locals = newFieldInitId;
                    }
                }
                else if (kind === FIELD) {
                    const initId = element.scope.parent.generateDeclaredUidIdentifier(`init_${name}`);
                    const valuePath = element.get("value");
                    valuePath.replaceWith(t.callExpression(t.cloneNode(initId), [t.thisExpression(), valuePath.node].filter(v => v)));
                    locals = initId;
                    if (isPrivate) {
                        privateMethods = extractProxyAccessorsFor(key, version);
                    }
                }
                else if (isPrivate) {
                    locals = element.scope.parent.generateDeclaredUidIdentifier(`call_${name}`);
                    const replaceSupers = new ReplaceSupers({
                        constantSuper,
                        methodPath: element,
                        objectRef: classIdLocal,
                        superRef: path.node.superClass,
                        file: state.file,
                        refToPreserve: classIdLocal,
                    });
                    replaceSupers.replace();
                    const { params, body, async: isAsync, } = element.node;
                    privateMethods = [
                        t.functionExpression(undefined, params.filter(isNotTsParameter), body, isAsync),
                    ];
                    if (kind === GETTER || kind === SETTER) {
                        movePrivateAccessor(element, t.cloneNode(key), t.cloneNode(locals), isStatic);
                    }
                    else {
                        const node = element.node;
                        // Unshift
                        path.node.body.body.unshift(t.classPrivateProperty(key, t.cloneNode(locals), [], node.static));
                        decoratedPrivateMethods.add(key.id.name);
                        element.remove();
                    }
                }
                let nameExpr;
                if (isComputed) {
                    nameExpr = t.cloneNode(key);
                }
                else if (key.type === "PrivateName") {
                    nameExpr = t.stringLiteral(key.id.name);
                }
                else if (key.type === "Identifier") {
                    nameExpr = t.stringLiteral(key.name);
                }
                else {
                    nameExpr = t.cloneNode(key);
                }
                elementDecoratorInfo.push({
                    kind,
                    decorators: decorators.map(d => d.node.expression),
                    decoratorsThis: decorators.map(d => decoratorsThis.get(d.node)),
                    name: nameExpr,
                    isStatic,
                    privateMethods,
                    locals,
                });
                if (kind !== FIELD) {
                    if (isStatic) {
                        requiresStaticInit = true;
                    }
                    else {
                        requiresProtoInit = true;
                    }
                }
                if (element.node) {
                    element.node.decorators = null;
                }
                if (!firstFieldPath &&
                    !isStatic &&
                    (kind === FIELD || kind === ACCESSOR)) {
                    firstFieldPath = element;
                }
            }
        }
    }
    const elementDecorations = generateDecorationExprs(elementDecoratorInfo, version);
    let classDecorationsFlag = 0;
    let classDecorations = [];
    if (classDecorators) {
        const { hasThis, decs } = generateDecorationList(classDecorators.map(el => el.expression), classDecorators.map(dec => decoratorsThis.get(dec)), version);
        classDecorationsFlag = hasThis ? 1 : 0;
        classDecorations = decs;
    }
    const elementLocals = extractElementLocalAssignments(elementDecoratorInfo);
    if (requiresProtoInit) {
        protoInitLocal = scopeParent.generateDeclaredUidIdentifier("initProto");
        elementLocals.push(protoInitLocal);
        const protoInitCall = t.callExpression(t.cloneNode(protoInitLocal), [
            t.thisExpression(),
        ]);
        if (firstFieldPath) {
            const value = firstFieldPath.get("value");
            const body = [protoInitCall];
            if (value.node) {
                body.push(value.node);
            }
            value.replaceWith(t.sequenceExpression(body));
        }
        else if (constructorPath) {
            if (path.node.superClass) {
                constructorPath.traverse({
                    CallExpression: {
                        exit(path) {
                            if (!path.get("callee").isSuper())
                                return;
                            path.replaceWith(t.callExpression(t.cloneNode(protoInitLocal), [path.node]));
                            path.skip();
                        },
                    },
                    ClassMethod(path) {
                        if (path.node.kind === "constructor") {
                            path.skip();
                        }
                    },
                });
            }
            else {
                constructorPath.node.body.body.unshift(t.expressionStatement(protoInitCall));
            }
        }
        else {
            const body = [t.expressionStatement(protoInitCall)];
            if (path.node.superClass) {
                body.unshift(t.expressionStatement(t.callExpression(t.super(), [
                    t.spreadElement(t.identifier("args")),
                ])));
            }
            path.node.body.body.unshift(t.classMethod("constructor", t.identifier("constructor"), [t.restElement(t.identifier("args"))], t.blockStatement(body)));
        }
    }
    if (requiresStaticInit) {
        staticInitLocal = scopeParent.generateDeclaredUidIdentifier("initStatic");
        elementLocals.push(staticInitLocal);
    }
    if (decoratedPrivateMethods.size > 0) {
        path.traverse({
            PrivateName(path) {
                if (!decoratedPrivateMethods.has(path.node.id.name))
                    return;
                const parentPath = path.parentPath;
                const parentParentPath = parentPath.parentPath;
                if (
                // this.bar().#x = 123;
                (parentParentPath.node.type === "AssignmentExpression" &&
                    parentParentPath.node.left === parentPath.node) ||
                    // this.#x++;
                    parentParentPath.node.type === "UpdateExpression" ||
                    // ([...this.#x] = foo);
                    parentParentPath.node.type === "RestElement" ||
                    // ([this.#x] = foo);
                    parentParentPath.node.type === "ArrayPattern" ||
                    // ({ a: this.#x } = bar);
                    (parentParentPath.node.type === "ObjectProperty" &&
                        parentParentPath.node.value === parentPath.node &&
                        parentParentPath.parentPath.type === "ObjectPattern") ||
                    // for (this.#x of []);
                    (parentParentPath.node.type === "ForOfStatement" &&
                        parentParentPath.node.left === parentPath.node)) {
                    throw path.buildCodeFrameError(`Decorated private methods are not updatable, but "#${path.node.id.name}" is updated via this expression.`);
                }
            },
        });
    }
    const classLocals = [];
    let classInitInjected = false;
    const classInitCall = classInitLocal && t.callExpression(t.cloneNode(classInitLocal), []);
    const originalClass = path.node;
    if (classDecorators) {
        classLocals.push(classIdLocal, classInitLocal);
        const statics = [];
        let staticBlocks = [];
        path.get("body.body").forEach(element => {
            // Static blocks cannot be compiled to "instance blocks", but we can inline
            // them as IIFEs in the next property.
            if (element.isStaticBlock()) {
                staticBlocks.push(element.node);
                element.remove();
                return;
            }
            const isProperty = element.isClassProperty() || element.isClassPrivateProperty();
            if ((isProperty || element.isClassPrivateMethod()) &&
                element.node.static) {
                if (isProperty && staticBlocks.length > 0) {
                    const allValues = staticBlocks.map(staticBlockToIIFE);
                    if (element.node.value)
                        allValues.push(element.node.value);
                    element.node.value = maybeSequenceExpression(allValues);
                    staticBlocks = [];
                }
                element.node.static = false;
                statics.push(element.node);
                element.remove();
            }
        });
        if (statics.length > 0 || staticBlocks.length > 0) {
            const staticsClass = template.expression.ast `
        class extends ${state.addHelper("identity")} {}
      `;
            staticsClass.body.body = [
                t.staticBlock([
                    t.toStatement(originalClass, true) ||
                        // If toStatement returns false, originalClass must be an anonymous ClassExpression,
                        // because `export default @dec ...` has been handled in the export visitor before.
                        t.expressionStatement(originalClass),
                ]),
                ...statics,
            ];
            const constructorBody = [];
            const newExpr = t.newExpression(staticsClass, []);
            if (staticBlocks.length > 0) {
                constructorBody.push(...staticBlocks.map(staticBlockToIIFE));
            }
            if (classInitCall) {
                classInitInjected = true;
                constructorBody.push(classInitCall);
            }
            if (constructorBody.length > 0) {
                constructorBody.unshift(t.callExpression(t.super(), [t.cloneNode(classIdLocal)]));
                staticsClass.body.body.push(t.classMethod("constructor", t.identifier("constructor"), [], t.blockStatement([
                    t.expressionStatement(t.sequenceExpression(constructorBody)),
                ])));
            }
            else {
                newExpr.arguments.push(t.cloneNode(classIdLocal));
            }
            path.replaceWith(newExpr);
        }
    }
    if (!classInitInjected && classInitCall) {
        path.node.body.body.push(t.staticBlock([t.expressionStatement(classInitCall)]));
    }
    let { superClass } = originalClass;
    if (superClass && (process.env.BABEL_8_BREAKING || version === "2023-05")) {
        const id = path.scope.maybeGenerateMemoised(superClass);
        if (id) {
            originalClass.superClass = t.assignmentExpression("=", id, superClass);
            superClass = id;
        }
    }
    originalClass.body.body.unshift(t.staticBlock([
        t.expressionStatement(createLocalsAssignment(elementLocals, classLocals, elementDecorations, t.arrayExpression(classDecorations), t.numericLiteral(classDecorationsFlag), needsInstancePrivateBrandCheck ? lastInstancePrivateName : null, typeof className === "object" ? className : undefined, t.cloneNode(superClass), state, version)),
        requiresStaticInit &&
            t.expressionStatement(t.callExpression(t.cloneNode(staticInitLocal), [
                t.thisExpression(),
            ])),
    ].filter(Boolean)));
    // When path is a ClassExpression, path.insertBefore will convert `path`
    // into a SequenceExpression
    path.insertBefore(assignments.map(expr => t.expressionStatement(expr)));
    if (needsDeclaraionForClassBinding) {
        path.insertBefore(t.variableDeclaration("let", [
            t.variableDeclarator(t.cloneNode(classIdLocal)),
        ]));
    }
    // Recrawl the scope to make sure new identifiers are properly synced
    path.scope.crawl();
    return path;
}
function createLocalsAssignment(elementLocals, classLocals, elementDecorations, classDecorations, classDecorationsFlag, maybePrivateBranName, setClassName, superClass, state, version) {
    let lhs, rhs;
    const args = [
        setClassName
            ? createSetFunctionNameCall(state, setClassName)
            : t.thisExpression(),
        elementDecorations,
        classDecorations,
    ];
    if (!process.env.BABEL_8_BREAKING) {
        if (version === "2021-12" ||
            (version === "2022-03" && !state.availableHelper("applyDecs2203R"))) {
            const lhs = t.arrayPattern([...elementLocals, ...classLocals]);
            const rhs = t.callExpression(state.addHelper(version === "2021-12" ? "applyDecs" : "applyDecs2203"), args);
            return t.assignmentExpression("=", lhs, rhs);
        }
    }
    if (process.env.BABEL_8_BREAKING || version === "2023-05") {
        if (maybePrivateBranName ||
            superClass ||
            classDecorationsFlag.value !== 0) {
            args.push(classDecorationsFlag);
        }
        if (maybePrivateBranName) {
            args.push(template.expression.ast `
            _ => ${t.cloneNode(maybePrivateBranName)} in _
          `);
        }
        else if (superClass) {
            args.push(t.unaryExpression("void", t.numericLiteral(0)));
        }
        if (superClass)
            args.push(superClass);
        rhs = t.callExpression(state.addHelper("applyDecs2305"), args);
    }
    else if (version === "2023-01") {
        if (maybePrivateBranName) {
            args.push(template.expression.ast `
            _ => ${t.cloneNode(maybePrivateBranName)} in _
          `);
        }
        rhs = t.callExpression(state.addHelper("applyDecs2301"), args);
    }
    else {
        rhs = t.callExpression(state.addHelper("applyDecs2203R"), args);
    }
    // optimize `{ c: [classLocals] } = applyapplyDecs2203R(...)` to
    // `[classLocals] = applyapplyDecs2203R(...).c`
    if (elementLocals.length > 0) {
        if (classLocals.length > 0) {
            lhs = t.objectPattern([
                t.objectProperty(t.identifier("e"), t.arrayPattern(elementLocals)),
                t.objectProperty(t.identifier("c"), t.arrayPattern(classLocals)),
            ]);
        }
        else {
            lhs = t.arrayPattern(elementLocals);
            rhs = t.memberExpression(rhs, t.identifier("e"), false, false);
        }
    }
    else {
        // invariant: classLocals.length > 0
        lhs = t.arrayPattern(classLocals);
        rhs = t.memberExpression(rhs, t.identifier("c"), false, false);
    }
    return t.assignmentExpression("=", lhs, rhs);
}
function isProtoKey(node) {
    return node.type === "Identifier"
        ? node.name === "__proto__"
        : node.value === "__proto__";
}
function isDecorated(node) {
    return node.decorators && node.decorators.length > 0;
}
function shouldTransformElement(node) {
    switch (node.type) {
        case "ClassAccessorProperty":
            return true;
        case "ClassMethod":
        case "ClassProperty":
        case "ClassPrivateMethod":
        case "ClassPrivateProperty":
            return isDecorated(node);
        default:
            return false;
    }
}
function shouldTransformClass(node) {
    return isDecorated(node) || node.body.body.some(shouldTransformElement);
}
// Todo: unify name references logic with helper-function-name
function NamedEvaluationVisitoryFactory(isAnonymous, visitor) {
    function handleComputedProperty(propertyPath, key, state) {
        switch (key.type) {
            case "StringLiteral":
                return t.stringLiteral(key.value);
            case "NumericLiteral":
            case "BigIntLiteral": {
                const keyValue = key.value + "";
                propertyPath.get("key").replaceWith(t.stringLiteral(keyValue));
                return t.stringLiteral(keyValue);
            }
            default: {
                const ref = propertyPath.scope.maybeGenerateMemoised(key);
                propertyPath
                    .get("key")
                    .replaceWith(t.assignmentExpression("=", ref, createToPropertyKeyCall(state, key)));
                return t.cloneNode(ref);
            }
        }
    }
    return {
        VariableDeclarator(path, state) {
            const id = path.node.id;
            if (id.type === "Identifier") {
                const initializer = skipTransparentExprWrappers(path.get("init"));
                if (isAnonymous(initializer)) {
                    const name = id.name;
                    visitor(initializer, state, name);
                }
            }
        },
        AssignmentExpression(path, state) {
            const id = path.node.left;
            if (id.type === "Identifier") {
                const initializer = skipTransparentExprWrappers(path.get("right"));
                if (isAnonymous(initializer)) {
                    switch (path.node.operator) {
                        case "=":
                        case "&&=":
                        case "||=":
                        case "??=":
                            visitor(initializer, state, id.name);
                    }
                }
            }
        },
        AssignmentPattern(path, state) {
            const id = path.node.left;
            if (id.type === "Identifier") {
                const initializer = skipTransparentExprWrappers(path.get("right"));
                if (isAnonymous(initializer)) {
                    const name = id.name;
                    visitor(initializer, state, name);
                }
            }
        },
        // We listen on ObjectExpression so that we don't have to visit
        // the object properties under object patterns
        ObjectExpression(path, state) {
            for (const propertyPath of path.get("properties")) {
                const { node } = propertyPath;
                if (node.type !== "ObjectProperty")
                    continue;
                const id = node.key;
                const initializer = skipTransparentExprWrappers(propertyPath.get("value"));
                if (isAnonymous(initializer)) {
                    if (!node.computed) {
                        // 13.2.5.5 RS: PropertyDefinitionEvaluation
                        if (!isProtoKey(id)) {
                            if (id.type === "Identifier") {
                                visitor(initializer, state, id.name);
                            }
                            else {
                                const className = t.stringLiteral(id
                                    .value + "");
                                visitor(initializer, state, className);
                            }
                        }
                    }
                    else {
                        const ref = handleComputedProperty(propertyPath, 
                        // The key of a computed object property must not be a private name
                        id, state);
                        visitor(initializer, state, ref);
                    }
                }
            }
        },
        ClassPrivateProperty(path, state) {
            const { node } = path;
            const initializer = skipTransparentExprWrappers(path.get("value"));
            if (isAnonymous(initializer)) {
                const className = t.stringLiteral("#" + node.key.id.name);
                visitor(initializer, state, className);
            }
        },
        ClassAccessorProperty(path, state) {
            const { node } = path;
            const id = node.key;
            const initializer = skipTransparentExprWrappers(path.get("value"));
            if (isAnonymous(initializer)) {
                if (!node.computed) {
                    if (id.type === "Identifier") {
                        visitor(initializer, state, id.name);
                    }
                    else if (id.type === "PrivateName") {
                        const className = t.stringLiteral("#" + id.id.name);
                        visitor(initializer, state, className);
                    }
                    else {
                        const className = t.stringLiteral(id
                            .value + "");
                        visitor(initializer, state, className);
                    }
                }
                else {
                    const ref = handleComputedProperty(path, 
                    // The key of a computed accessor property must not be a private name
                    id, state);
                    visitor(initializer, state, ref);
                }
            }
        },
        ClassProperty(path, state) {
            const { node } = path;
            const id = node.key;
            const initializer = skipTransparentExprWrappers(path.get("value"));
            if (isAnonymous(initializer)) {
                if (!node.computed) {
                    if (id.type === "Identifier") {
                        visitor(initializer, state, id.name);
                    }
                    else {
                        const className = t.stringLiteral(id
                            .value + "");
                        visitor(initializer, state, className);
                    }
                }
                else {
                    const ref = handleComputedProperty(path, id, state);
                    visitor(initializer, state, ref);
                }
            }
        },
    };
}
function isDecoratedAnonymousClassExpression(path) {
    return (path.isClassExpression({ id: null }) && shouldTransformClass(path.node));
}
export default function ({ assertVersion, assumption }, { loose }, 
// TODO(Babel 8): Only keep 2023-05
version, inherits) {
    if (process.env.BABEL_8_BREAKING) {
        assertVersion(process.env.IS_PUBLISH ? PACKAGE_JSON.version : "^7.21.0");
    }
    else {
        if (version === "2023-05" || version === "2023-01") {
            assertVersion("^7.21.0");
        }
        else if (version === "2021-12") {
            assertVersion("^7.16.0");
        }
        else {
            assertVersion("^7.19.0");
        }
    }
    const VISITED = new WeakSet();
    const constantSuper = assumption("constantSuper") ?? loose;
    const namedEvaluationVisitor = NamedEvaluationVisitoryFactory(isDecoratedAnonymousClassExpression, visitClass);
    function visitClass(path, state, className) {
        if (VISITED.has(path))
            return;
        const { node } = path;
        className ??= node.id?.name;
        const newPath = transformClass(path, state, constantSuper, version, className, namedEvaluationVisitor);
        if (newPath) {
            VISITED.add(newPath);
            return;
        }
        VISITED.add(path);
    }
    return {
        name: "proposal-decorators",
        inherits: inherits,
        visitor: {
            ExportDefaultDeclaration(path, state) {
                const { declaration } = path.node;
                if (declaration?.type === "ClassDeclaration" &&
                    // When compiling class decorators we need to replace the class
                    // binding, so we must split it in two separate declarations.
                    isDecorated(declaration)) {
                    const isAnonymous = !declaration.id;
                    const updatedVarDeclarationPath = splitExportDeclaration(path);
                    if (isAnonymous) {
                        visitClass(updatedVarDeclarationPath, state, t.stringLiteral("default"));
                    }
                }
            },
            ExportNamedDeclaration(path) {
                const { declaration } = path.node;
                if (declaration?.type === "ClassDeclaration" &&
                    // When compiling class decorators we need to replace the class
                    // binding, so we must split it in two separate declarations.
                    isDecorated(declaration)) {
                    splitExportDeclaration(path);
                }
            },
            Class(path, state) {
                visitClass(path, state, undefined);
            },
            ...namedEvaluationVisitor,
        },
    };
}
