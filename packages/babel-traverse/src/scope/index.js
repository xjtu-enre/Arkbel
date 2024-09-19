import Renamer from "./lib/renamer.ts";
import traverse from "../index.ts";
import Binding from "./binding.ts";
import globals from "globals";
import { NOT_LOCAL_BINDING, callExpression, cloneNode, getBindingIdentifiers, identifier, isArrayExpression, isBinary, isClass, isClassBody, isClassDeclaration, isArkTSStructDeclaration, isExportAllDeclaration, isExportDefaultDeclaration, isExportNamedDeclaration, isFunctionDeclaration, isIdentifier, isImportDeclaration, isLiteral, isMethod, isModuleSpecifier, isNullLiteral, isObjectExpression, isProperty, isPureish, isRegExpLiteral, isSuper, isTaggedTemplateExpression, isTemplateLiteral, isThisExpression, isUnaryExpression, isVariableDeclaration, matchesPattern, memberExpression, numericLiteral, toIdentifier, variableDeclaration, variableDeclarator, isRecordExpression, isTupleExpression, isObjectProperty, isTopicReference, isMetaProperty, isPrivateName, isExportDeclaration, buildUndefinedNode, } from "@babel/types";
import * as t from "@babel/types";
import { scope as scopeCache } from "../cache.ts";
import { isExplodedVisitor } from "../visitors.ts";
// Recursively gathers the identifying names of a node.
function gatherNodeParts(node, parts) {
    switch (node?.type) {
        default:
            if (isImportDeclaration(node) || isExportDeclaration(node)) {
                if ((isExportAllDeclaration(node) ||
                    isExportNamedDeclaration(node) ||
                    isImportDeclaration(node)) &&
                    node.source) {
                    gatherNodeParts(node.source, parts);
                }
                else if ((isExportNamedDeclaration(node) || isImportDeclaration(node)) &&
                    node.specifiers?.length) {
                    for (const e of node.specifiers)
                        gatherNodeParts(e, parts);
                }
                else if ((isExportDefaultDeclaration(node) ||
                    isExportNamedDeclaration(node)) &&
                    node.declaration) {
                    gatherNodeParts(node.declaration, parts);
                }
            }
            else if (isModuleSpecifier(node)) {
                // todo(flow->ts): should condition instead be:
                //    ```
                //    t.isExportSpecifier(node) ||
                //    t.isImportDefaultSpecifier(node) ||
                //    t.isImportNamespaceSpecifier(node) ||
                //    t.isImportSpecifier(node)
                //    ```
                //    allowing only nodes with `.local`?
                // @ts-expect-error todo(flow->ts)
                gatherNodeParts(node.local, parts);
            }
            else if (isLiteral(node) &&
                !isNullLiteral(node) &&
                !isRegExpLiteral(node) &&
                !isTemplateLiteral(node)) {
                parts.push(node.value);
            }
            break;
        case "MemberExpression":
        case "OptionalMemberExpression":
        case "JSXMemberExpression":
            gatherNodeParts(node.object, parts);
            gatherNodeParts(node.property, parts);
            break;
        case "Identifier":
        case "JSXIdentifier":
            parts.push(node.name);
            break;
        case "CallExpression":
        case "OptionalCallExpression":
        case "NewExpression":
            gatherNodeParts(node.callee, parts);
            break;
        case "ObjectExpression":
        case "ObjectPattern":
            for (const e of node.properties) {
                gatherNodeParts(e, parts);
            }
            break;
        case "SpreadElement":
        case "RestElement":
            gatherNodeParts(node.argument, parts);
            break;
        case "ObjectProperty":
        case "ObjectMethod":
        case "ClassProperty":
        case "ClassMethod":
        case "ClassPrivateProperty":
        case "ClassPrivateMethod":
            gatherNodeParts(node.key, parts);
            break;
        case "ThisExpression":
            parts.push("this");
            break;
        case "Super":
            parts.push("super");
            break;
        case "Import":
            parts.push("import");
            break;
        case "DoExpression":
            parts.push("do");
            break;
        case "YieldExpression":
            parts.push("yield");
            gatherNodeParts(node.argument, parts);
            break;
        case "AwaitExpression":
            parts.push("await");
            gatherNodeParts(node.argument, parts);
            break;
        case "AssignmentExpression":
            gatherNodeParts(node.left, parts);
            break;
        case "VariableDeclarator":
            gatherNodeParts(node.id, parts);
            break;
        case "FunctionExpression":
        case "FunctionDeclaration":
        case "ClassExpression":
        case "ClassDeclaration":
        case "ArkTSStructDeclaration":
            gatherNodeParts(node.id, parts);
            break;
        case "PrivateName":
            gatherNodeParts(node.id, parts);
            break;
        case "ParenthesizedExpression":
            gatherNodeParts(node.expression, parts);
            break;
        case "UnaryExpression":
        case "UpdateExpression":
            gatherNodeParts(node.argument, parts);
            break;
        case "MetaProperty":
            gatherNodeParts(node.meta, parts);
            gatherNodeParts(node.property, parts);
            break;
        case "JSXElement":
            gatherNodeParts(node.openingElement, parts);
            break;
        case "JSXOpeningElement":
            gatherNodeParts(node.name, parts);
            break;
        case "JSXFragment":
            gatherNodeParts(node.openingFragment, parts);
            break;
        case "JSXOpeningFragment":
            parts.push("Fragment");
            break;
        case "JSXNamespacedName":
            gatherNodeParts(node.namespace, parts);
            gatherNodeParts(node.name, parts);
            break;
    }
}
const collectorVisitor = {
    ForStatement(path) {
        const declar = path.get("init");
        // delegate block scope handling to the `BlockScoped` method
        if (declar.isVar()) {
            const { scope } = path;
            const parentScope = scope.getFunctionParent() || scope.getProgramParent();
            parentScope.registerBinding("var", declar);
        }
    },
    Declaration(path) {
        // delegate block scope handling to the `BlockScoped` method
        if (path.isBlockScoped())
            return;
        // delegate import handing to the `ImportDeclaration` method
        if (path.isImportDeclaration())
            return;
        // this will be hit again once we traverse into it after this iteration
        if (path.isExportDeclaration())
            return;
        // we've ran into a declaration!
        const parent = path.scope.getFunctionParent() || path.scope.getProgramParent();
        parent.registerDeclaration(path);
    },
    ImportDeclaration(path) {
        // import may only appear in the top level or inside a module/namespace (for TS/flow)
        const parent = path.scope.getBlockParent();
        parent.registerDeclaration(path);
    },
    ReferencedIdentifier(path, state) {
        state.references.push(path);
    },
    ForXStatement(path, state) {
        const left = path.get("left");
        if (left.isPattern() || left.isIdentifier()) {
            state.constantViolations.push(path);
        }
        // delegate block scope handling to the `BlockScoped` method
        else if (left.isVar()) {
            const { scope } = path;
            const parentScope = scope.getFunctionParent() || scope.getProgramParent();
            parentScope.registerBinding("var", left);
        }
    },
    ExportDeclaration: {
        exit(path) {
            const { node, scope } = path;
            // ExportAllDeclaration does not have `declaration`
            if (isExportAllDeclaration(node))
                return;
            const declar = node.declaration;
            if (isClassDeclaration(declar) || isArkTSStructDeclaration(declar) || isFunctionDeclaration(declar)) {
                const id = declar.id;
                if (!id)
                    return;
                const binding = scope.getBinding(id.name);
                binding?.reference(path);
            }
            else if (isVariableDeclaration(declar)) {
                for (const decl of declar.declarations) {
                    for (const name of Object.keys(getBindingIdentifiers(decl))) {
                        const binding = scope.getBinding(name);
                        binding?.reference(path);
                    }
                }
            }
        },
    },
    LabeledStatement(path) {
        path.scope.getBlockParent().registerDeclaration(path);
    },
    AssignmentExpression(path, state) {
        state.assignments.push(path);
    },
    UpdateExpression(path, state) {
        state.constantViolations.push(path);
    },
    UnaryExpression(path, state) {
        if (path.node.operator === "delete") {
            state.constantViolations.push(path);
        }
    },
    BlockScoped(path) {
        let scope = path.scope;
        if (scope.path === path)
            scope = scope.parent;
        const parent = scope.getBlockParent();
        parent.registerDeclaration(path);
        // Register class identifier in class' scope if this is a class declaration.
        if ((path.isClassDeclaration() || path.isArkTSStructDeclaration()) && path.node.id) {
            const id = path.node.id;
            const name = id.name;
            path.scope.bindings[name] = path.scope.parent.getBinding(name);
        }
    },
    CatchClause(path) {
        path.scope.registerBinding("let", path);
    },
    Function(path) {
        const params = path.get("params");
        for (const param of params) {
            path.scope.registerBinding("param", param);
        }
        // Register function expression id after params. When the id
        // collides with a function param, the id effectively can't be
        // referenced: here we registered it as a constantViolation
        if (path.isFunctionExpression() &&
            path.has("id") &&
            // @ts-expect-error Fixme: document symbol ast properties
            !path.get("id").node[NOT_LOCAL_BINDING]) {
            path.scope.registerBinding("local", path.get("id"), path);
        }
    },
    ClassExpression(path) {
        if (path.has("id") &&
            // @ts-expect-error Fixme: document symbol ast properties
            !path.get("id").node[NOT_LOCAL_BINDING]) {
            path.scope.registerBinding("local", path);
        }
    },
};
let uid = 0;
export default class Scope {
    uid;
    path;
    block;
    labels;
    inited;
    bindings;
    references;
    globals;
    uids;
    data;
    crawling;
    /**
     * This searches the current "scope" and collects all references/bindings
     * within.
     */
    constructor(path) {
        const { node } = path;
        const cached = scopeCache.get(node);
        // Sometimes, a scopable path is placed higher in the AST tree.
        // In these cases, have to create a new Scope.
        if (cached?.path === path) {
            return cached;
        }
        scopeCache.set(node, this);
        this.uid = uid++;
        this.block = node;
        this.path = path;
        this.labels = new Map();
        this.inited = false;
    }
    /**
     * Globals.
     */
    static globals = Object.keys(globals.builtin);
    /**
     * Variables available in current context.
     */
    static contextVariables = ["arguments", "undefined", "Infinity", "NaN"];
    get parent() {
        let parent, path = this.path;
        do {
            // Skip method scope if coming from inside computed key or decorator expression
            const shouldSkip = path.key === "key" || path.listKey === "decorators";
            path = path.parentPath;
            if (shouldSkip && path.isMethod())
                path = path.parentPath;
            if (path && path.isScope())
                parent = path;
        } while (path && !parent);
        return parent?.scope;
    }
    get parentBlock() {
        return this.path.parent;
    }
    get hub() {
        return this.path.hub;
    }
    /**
     * Traverse node with current scope and path.
     *
     * !!! WARNING !!!
     * This method assumes that `this.path` is the NodePath representing `node`.
     * After running the traversal, the `.parentPath` of the NodePaths
     * corresponding to `node`'s children will be set to `this.path`.
     *
     * There is no good reason to use this method, since the only safe way to use
     * it is equivalent to `scope.path.traverse(opts, state)`.
     */
    traverse(node, opts, state) {
        traverse(node, opts, this, state, this.path);
    }
    /**
     * Generate a unique identifier and add it to the current scope.
     */
    generateDeclaredUidIdentifier(name) {
        const id = this.generateUidIdentifier(name);
        this.push({ id });
        return cloneNode(id);
    }
    /**
     * Generate a unique identifier.
     */
    generateUidIdentifier(name) {
        return identifier(this.generateUid(name));
    }
    /**
     * Generate a unique `_id1` binding.
     */
    generateUid(name = "temp") {
        name = toIdentifier(name)
            .replace(/^_+/, "")
            .replace(/[0-9]+$/g, "");
        let uid;
        let i = 1;
        do {
            uid = this._generateUid(name, i);
            i++;
        } while (this.hasLabel(uid) ||
            this.hasBinding(uid) ||
            this.hasGlobal(uid) ||
            this.hasReference(uid));
        const program = this.getProgramParent();
        program.references[uid] = true;
        program.uids[uid] = true;
        return uid;
    }
    /**
     * Generate an `_id1`.
     */
    _generateUid(name, i) {
        let id = name;
        if (i > 1)
            id += i;
        return `_${id}`;
    }
    generateUidBasedOnNode(node, defaultName) {
        const parts = [];
        gatherNodeParts(node, parts);
        let id = parts.join("$");
        id = id.replace(/^_/, "") || defaultName || "ref";
        return this.generateUid(id.slice(0, 20));
    }
    /**
     * Generate a unique identifier based on a node.
     */
    generateUidIdentifierBasedOnNode(node, defaultName) {
        return identifier(this.generateUidBasedOnNode(node, defaultName));
    }
    /**
     * Determine whether evaluating the specific input `node` is a consequenceless reference. ie.
     * evaluating it won't result in potentially arbitrary code from being ran. The following are
     * allowed and determined not to cause side effects:
     *
     *  - `this` expressions
     *  - `super` expressions
     *  - Bound identifiers
     */
    isStatic(node) {
        if (isThisExpression(node) || isSuper(node) || isTopicReference(node)) {
            return true;
        }
        if (isIdentifier(node)) {
            const binding = this.getBinding(node.name);
            if (binding) {
                return binding.constant;
            }
            else {
                return this.hasBinding(node.name);
            }
        }
        return false;
    }
    /**
     * Possibly generate a memoised identifier if it is not static and has consequences.
     */
    maybeGenerateMemoised(node, dontPush) {
        if (this.isStatic(node)) {
            return null;
        }
        else {
            const id = this.generateUidIdentifierBasedOnNode(node);
            if (!dontPush) {
                this.push({ id });
                return cloneNode(id);
            }
            return id;
        }
    }
    checkBlockScopedCollisions(local, kind, name, id) {
        // ignore parameters
        if (kind === "param")
            return;
        // Ignore existing binding if it's the name of the current function or
        // class expression
        if (local.kind === "local")
            return;
        const duplicate = 
        // don't allow duplicate bindings to exist alongside
        kind === "let" ||
            local.kind === "let" ||
            local.kind === "const" ||
            local.kind === "module" ||
            // don't allow a local of param with a kind of let
            (local.kind === "param" && kind === "const");
        if (duplicate) {
            throw this.hub.buildError(id, `Duplicate declaration "${name}"`, TypeError);
        }
    }
    rename(oldName, newName) {
        const binding = this.getBinding(oldName);
        if (binding) {
            newName ||= this.generateUidIdentifier(oldName).name;
            const renamer = new Renamer(binding, oldName, newName);
            if (process.env.BABEL_8_BREAKING) {
                renamer.rename();
            }
            else {
                // @ts-ignore(Babel 7 vs Babel 8) TODO: Delete this
                renamer.rename(arguments[2]);
            }
        }
    }
    /** @deprecated Not used in our codebase */
    _renameFromMap(map, oldName, newName, value) {
        if (map[oldName]) {
            map[newName] = value;
            map[oldName] = null;
        }
    }
    dump() {
        const sep = "-".repeat(60);
        console.log(sep);
        let scope = this;
        do {
            console.log("#", scope.block.type);
            for (const name of Object.keys(scope.bindings)) {
                const binding = scope.bindings[name];
                console.log(" -", name, {
                    constant: binding.constant,
                    references: binding.references,
                    violations: binding.constantViolations.length,
                    kind: binding.kind,
                });
            }
        } while ((scope = scope.parent));
        console.log(sep);
    }
    // TODO: (Babel 8) Split i in two parameters, and use an object of flags
    toArray(node, i, arrayLikeIsIterable) {
        if (isIdentifier(node)) {
            const binding = this.getBinding(node.name);
            if (binding?.constant && binding.path.isGenericType("Array")) {
                return node;
            }
        }
        if (isArrayExpression(node)) {
            return node;
        }
        if (isIdentifier(node, { name: "arguments" })) {
            return callExpression(memberExpression(memberExpression(memberExpression(identifier("Array"), identifier("prototype")), identifier("slice")), identifier("call")), [node]);
        }
        let helperName;
        const args = [node];
        if (i === true) {
            // Used in array-spread to create an array.
            helperName = "toConsumableArray";
        }
        else if (typeof i === "number") {
            args.push(numericLiteral(i));
            // Used in array-rest to create an array from a subset of an iterable.
            helperName = "slicedToArray";
            // TODO if (this.hub.isLoose("es6.forOf")) helperName += "-loose";
        }
        else {
            // Used in array-rest to create an array
            helperName = "toArray";
        }
        if (arrayLikeIsIterable) {
            args.unshift(this.hub.addHelper(helperName));
            helperName = "maybeArrayLike";
        }
        // @ts-expect-error todo(flow->ts): t.Node is not valid to use in args, function argument typeneeds to be clarified
        return callExpression(this.hub.addHelper(helperName), args);
    }
    hasLabel(name) {
        return !!this.getLabel(name);
    }
    getLabel(name) {
        return this.labels.get(name);
    }
    registerLabel(path) {
        this.labels.set(path.node.label.name, path);
    }
    registerDeclaration(path) {
        if (path.isLabeledStatement()) {
            this.registerLabel(path);
        }
        else if (path.isFunctionDeclaration()) {
            this.registerBinding("hoisted", path.get("id"), path);
        }
        else if (path.isVariableDeclaration()) {
            const declarations = path.get("declarations");
            const { kind } = path.node;
            for (const declar of declarations) {
                this.registerBinding(kind === "using" || kind === "await using" ? "const" : kind, declar);
            }
        }
        else if (path.isClassDeclaration()) {
            if (path.node.declare)
                return;
            this.registerBinding("let", path);
        }
        else if (path.isImportDeclaration()) {
            const isTypeDeclaration = path.node.importKind === "type" || path.node.importKind === "typeof";
            const specifiers = path.get("specifiers");
            for (const specifier of specifiers) {
                const isTypeSpecifier = isTypeDeclaration ||
                    (specifier.isImportSpecifier() &&
                        (specifier.node.importKind === "type" ||
                            specifier.node.importKind === "typeof"));
                this.registerBinding(isTypeSpecifier ? "unknown" : "module", specifier);
            }
        }
        else if (path.isExportDeclaration()) {
            // todo: improve babel-types
            const declar = path.get("declaration");
            if (declar.isClassDeclaration() ||
                declar.isFunctionDeclaration() ||
                declar.isVariableDeclaration() ||
                declar.isArkTSStructDeclaration()) {
                this.registerDeclaration(declar);
            }
        }
        else {
            this.registerBinding("unknown", path);
        }
    }
    buildUndefinedNode() {
        return buildUndefinedNode();
    }
    registerConstantViolation(path) {
        const ids = path.getBindingIdentifiers();
        for (const name of Object.keys(ids)) {
            this.getBinding(name)?.reassign(path);
        }
    }
    registerBinding(kind, path, bindingPath = path) {
        if (!kind)
            throw new ReferenceError("no `kind`");
        if (path.isVariableDeclaration()) {
            const declarators = path.get("declarations");
            for (const declar of declarators) {
                this.registerBinding(kind, declar);
            }
            return;
        }
        const parent = this.getProgramParent();
        const ids = path.getOuterBindingIdentifiers(true);
        for (const name of Object.keys(ids)) {
            parent.references[name] = true;
            for (const id of ids[name]) {
                const local = this.getOwnBinding(name);
                if (local) {
                    // same identifier so continue safely as we're likely trying to register it
                    // multiple times
                    if (local.identifier === id)
                        continue;
                    this.checkBlockScopedCollisions(local, kind, name, id);
                }
                // A redeclaration of an existing variable is a modification
                if (local) {
                    this.registerConstantViolation(bindingPath);
                }
                else {
                    this.bindings[name] = new Binding({
                        identifier: id,
                        scope: this,
                        path: bindingPath,
                        kind: kind,
                    });
                }
            }
        }
    }
    addGlobal(node) {
        this.globals[node.name] = node;
    }
    hasUid(name) {
        let scope = this;
        do {
            if (scope.uids[name])
                return true;
        } while ((scope = scope.parent));
        return false;
    }
    hasGlobal(name) {
        let scope = this;
        do {
            if (scope.globals[name])
                return true;
        } while ((scope = scope.parent));
        return false;
    }
    hasReference(name) {
        return !!this.getProgramParent().references[name];
    }
    isPure(node, constantsOnly) {
        if (isIdentifier(node)) {
            const binding = this.getBinding(node.name);
            if (!binding)
                return false;
            if (constantsOnly)
                return binding.constant;
            return true;
        }
        else if (isThisExpression(node) ||
            isMetaProperty(node) ||
            isTopicReference(node) ||
            isPrivateName(node)) {
            return true;
        }
        else if (isClass(node)) {
            if (node.superClass && !this.isPure(node.superClass, constantsOnly)) {
                return false;
            }
            if (node.decorators?.length > 0) {
                return false;
            }
            return this.isPure(node.body, constantsOnly);
        }
        else if (isClassBody(node)) {
            for (const method of node.body) {
                if (!this.isPure(method, constantsOnly))
                    return false;
            }
            return true;
        }
        else if (isBinary(node)) {
            return (this.isPure(node.left, constantsOnly) &&
                this.isPure(node.right, constantsOnly));
        }
        else if (isArrayExpression(node) || isTupleExpression(node)) {
            for (const elem of node.elements) {
                if (elem !== null && !this.isPure(elem, constantsOnly))
                    return false;
            }
            return true;
        }
        else if (isObjectExpression(node) || isRecordExpression(node)) {
            for (const prop of node.properties) {
                if (!this.isPure(prop, constantsOnly))
                    return false;
            }
            return true;
        }
        else if (isMethod(node)) {
            if (node.computed && !this.isPure(node.key, constantsOnly))
                return false;
            if (node.decorators?.length > 0) {
                return false;
            }
            return true;
        }
        else if (isProperty(node)) {
            // @ts-expect-error todo(flow->ts): computed in not present on private properties
            if (node.computed && !this.isPure(node.key, constantsOnly))
                return false;
            if (node.decorators?.length > 0) {
                return false;
            }
            if (isObjectProperty(node) || node.static) {
                if (node.value !== null && !this.isPure(node.value, constantsOnly)) {
                    return false;
                }
            }
            return true;
        }
        else if (isUnaryExpression(node)) {
            return this.isPure(node.argument, constantsOnly);
        }
        else if (isTaggedTemplateExpression(node)) {
            return (matchesPattern(node.tag, "String.raw") &&
                !this.hasBinding("String", true) &&
                this.isPure(node.quasi, constantsOnly));
        }
        else if (isTemplateLiteral(node)) {
            for (const expression of node.expressions) {
                if (!this.isPure(expression, constantsOnly))
                    return false;
            }
            return true;
        }
        else {
            return isPureish(node);
        }
    }
    /**
     * Set some arbitrary data on the current scope.
     */
    setData(key, val) {
        return (this.data[key] = val);
    }
    /**
     * Recursively walk up scope tree looking for the data `key`.
     */
    getData(key) {
        let scope = this;
        do {
            const data = scope.data[key];
            if (data != null)
                return data;
        } while ((scope = scope.parent));
    }
    /**
     * Recursively walk up scope tree looking for the data `key` and if it exists,
     * remove it.
     */
    removeData(key) {
        let scope = this;
        do {
            const data = scope.data[key];
            if (data != null)
                scope.data[key] = null;
        } while ((scope = scope.parent));
    }
    init() {
        if (!this.inited) {
            this.inited = true;
            this.crawl();
        }
    }
    crawl() {
        const path = this.path;
        this.references = Object.create(null);
        this.bindings = Object.create(null);
        this.globals = Object.create(null);
        this.uids = Object.create(null);
        this.data = Object.create(null);
        const programParent = this.getProgramParent();
        if (programParent.crawling)
            return;
        const state = {
            references: [],
            constantViolations: [],
            assignments: [],
        };
        this.crawling = true;
        // traverse does not visit the root node, here we explicitly collect
        // root node binding info when the root is not a Program.
        if (path.type !== "Program" && isExplodedVisitor(collectorVisitor)) {
            for (const visit of collectorVisitor.enter) {
                visit.call(state, path, state);
            }
            const typeVisitors = collectorVisitor[path.type];
            if (typeVisitors) {
                for (const visit of typeVisitors.enter) {
                    visit.call(state, path, state);
                }
            }
        }
        path.traverse(collectorVisitor, state);
        this.crawling = false;
        // register assignments
        for (const path of state.assignments) {
            // register undeclared bindings as globals
            const ids = path.getBindingIdentifiers();
            for (const name of Object.keys(ids)) {
                if (path.scope.getBinding(name))
                    continue;
                programParent.addGlobal(ids[name]);
            }
            // register as constant violation
            path.scope.registerConstantViolation(path);
        }
        // register references
        for (const ref of state.references) {
            const binding = ref.scope.getBinding(ref.node.name);
            if (binding) {
                binding.reference(ref);
            }
            else {
                programParent.addGlobal(ref.node);
            }
        }
        // register constant violations
        for (const path of state.constantViolations) {
            path.scope.registerConstantViolation(path);
        }
    }
    push(opts) {
        let path = this.path;
        if (path.isPattern()) {
            path = this.getPatternParent().path;
        }
        else if (!path.isBlockStatement() && !path.isProgram()) {
            path = this.getBlockParent().path;
        }
        if (path.isSwitchStatement()) {
            path = (this.getFunctionParent() || this.getProgramParent()).path;
        }
        const { init, unique, kind = "var", id } = opts;
        // When injecting a non-const non-initialized binding inside
        // an IIFE, if the number of call arguments is less than or
        // equal to the number of function parameters, we can safely
        // inject the binding into the parameter list.
        if (!init &&
            !unique &&
            (kind === "var" || kind === "let") &&
            path.isFunction() &&
            // @ts-expect-error ArrowFunctionExpression never has a name
            !path.node.name &&
            t.isCallExpression(path.parent, { callee: path.node }) &&
            path.parent.arguments.length <= path.node.params.length &&
            t.isIdentifier(id)) {
            path.pushContainer("params", id);
            path.scope.registerBinding("param", path.get("params")[path.node.params.length - 1]);
            return;
        }
        if (path.isLoop() || path.isCatchClause() || path.isFunction()) {
            // @ts-expect-error TS can not infer NodePath<Loop> | NodePath<CatchClause> as NodePath<Loop | CatchClause>
            path.ensureBlock();
            // @ts-expect-error todo(flow->ts): improve types
            path = path.get("body");
        }
        const blockHoist = opts._blockHoist == null ? 2 : opts._blockHoist;
        const dataKey = `declaration:${kind}:${blockHoist}`;
        let declarPath = !unique && path.getData(dataKey);
        if (!declarPath) {
            const declar = variableDeclaration(kind, []);
            // @ts-expect-error todo(flow->ts): avoid modifying nodes
            declar._blockHoist = blockHoist;
            [declarPath] = path.unshiftContainer("body", [declar]);
            if (!unique)
                path.setData(dataKey, declarPath);
        }
        const declarator = variableDeclarator(id, init);
        const len = declarPath.node.declarations.push(declarator);
        path.scope.registerBinding(kind, declarPath.get("declarations")[len - 1]);
    }
    /**
     * Walk up to the top of the scope tree and get the `Program`.
     */
    getProgramParent() {
        let scope = this;
        do {
            if (scope.path.isProgram()) {
                return scope;
            }
        } while ((scope = scope.parent));
        throw new Error("Couldn't find a Program");
    }
    /**
     * Walk up the scope tree until we hit either a Function or return null.
     */
    getFunctionParent() {
        let scope = this;
        do {
            if (scope.path.isFunctionParent()) {
                return scope;
            }
        } while ((scope = scope.parent));
        return null;
    }
    /**
     * Walk up the scope tree until we hit either a BlockStatement/Loop/Program/Function/Switch or reach the
     * very top and hit Program.
     */
    getBlockParent() {
        let scope = this;
        do {
            if (scope.path.isBlockParent()) {
                return scope;
            }
        } while ((scope = scope.parent));
        throw new Error("We couldn't find a BlockStatement, For, Switch, Function, Loop or Program...");
    }
    /**
     * Walk up from a pattern scope (function param initializer) until we hit a non-pattern scope,
     * then returns its block parent
     * @returns An ancestry scope whose path is a block parent
     */
    getPatternParent() {
        let scope = this;
        do {
            if (!scope.path.isPattern()) {
                return scope.getBlockParent();
            }
        } while ((scope = scope.parent.parent));
        throw new Error("We couldn't find a BlockStatement, For, Switch, Function, Loop or Program...");
    }
    /**
     * Walks the scope tree and gathers **all** bindings.
     */
    getAllBindings() {
        const ids = Object.create(null);
        let scope = this;
        do {
            for (const key of Object.keys(scope.bindings)) {
                if (key in ids === false) {
                    ids[key] = scope.bindings[key];
                }
            }
            scope = scope.parent;
        } while (scope);
        return ids;
    }
    /**
     * Walks the scope tree and gathers all declarations of `kind`.
     */
    getAllBindingsOfKind(...kinds) {
        const ids = Object.create(null);
        for (const kind of kinds) {
            let scope = this;
            do {
                for (const name of Object.keys(scope.bindings)) {
                    const binding = scope.bindings[name];
                    if (binding.kind === kind)
                        ids[name] = binding;
                }
                scope = scope.parent;
            } while (scope);
        }
        return ids;
    }
    bindingIdentifierEquals(name, node) {
        return this.getBindingIdentifier(name) === node;
    }
    getBinding(name) {
        let scope = this;
        let previousPath;
        do {
            const binding = scope.getOwnBinding(name);
            if (binding) {
                // Check if a pattern is a part of parameter expressions.
                // Note: for performance reason we skip checking previousPath.parentPath.isFunction()
                // because `scope.path` is validated as scope in packages/babel-types/src/validators/isScope.js
                // That is, if a scope path is pattern, its parent must be Function/CatchClause
                // Spec 9.2.10.28: The closure created by this expression should not have visibility of
                // declarations in the function body. If the binding is not a `param`-kind (as function parameters)
                // or `local`-kind (as id in function expression),
                // then it must be defined inside the function body, thus it should be skipped
                if (previousPath?.isPattern() &&
                    binding.kind !== "param" &&
                    binding.kind !== "local") {
                    // do nothing
                }
                else {
                    return binding;
                }
            }
            else if (!binding &&
                name === "arguments" &&
                scope.path.isFunction() &&
                !scope.path.isArrowFunctionExpression()) {
                break;
            }
            previousPath = scope.path;
        } while ((scope = scope.parent));
    }
    getOwnBinding(name) {
        return this.bindings[name];
    }
    // todo: return probably can be undefined…
    getBindingIdentifier(name) {
        return this.getBinding(name)?.identifier;
    }
    // todo: flow->ts return probably can be undefined
    getOwnBindingIdentifier(name) {
        const binding = this.bindings[name];
        return binding?.identifier;
    }
    hasOwnBinding(name) {
        return !!this.getOwnBinding(name);
    }
    // By default, we consider generated UIDs as bindings.
    // This is because they are almost always used to declare variables,
    // and since the scope isn't always up-to-date it's better to assume that
    // there is a variable with that name. The `noUids` option can be used to
    // turn off this behavior, for example if you know that the generate UID
    // was used to declare a variable in a different scope.
    hasBinding(name, opts) {
        if (!name)
            return false;
        if (this.hasOwnBinding(name))
            return true;
        {
            // TODO: Only accept the object form.
            if (typeof opts === "boolean")
                opts = { noGlobals: opts };
        }
        if (this.parentHasBinding(name, opts))
            return true;
        if (!opts?.noUids && this.hasUid(name))
            return true;
        if (!opts?.noGlobals && Scope.globals.includes(name))
            return true;
        if (!opts?.noGlobals && Scope.contextVariables.includes(name))
            return true;
        return false;
    }
    parentHasBinding(name, opts) {
        return this.parent?.hasBinding(name, opts);
    }
    /**
     * Move a binding of `name` to another `scope`.
     */
    moveBindingTo(name, scope) {
        const info = this.getBinding(name);
        if (info) {
            info.scope.removeOwnBinding(name);
            info.scope = scope;
            scope.bindings[name] = info;
        }
    }
    removeOwnBinding(name) {
        delete this.bindings[name];
    }
    removeBinding(name) {
        // clear literal binding
        this.getBinding(name)?.scope.removeOwnBinding(name);
        // clear uids with this name - https://github.com/babel/babel/issues/2101
        let scope = this;
        do {
            if (scope.uids[name]) {
                scope.uids[name] = false;
            }
        } while ((scope = scope.parent));
    }
}
