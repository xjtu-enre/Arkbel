import * as virtualTypes from "./lib/virtual-types.ts";
import buildDebug from "debug";
import traverse from "../index.ts";
import Scope from "../scope/index.ts";
import { validate } from "@babel/types";
import * as t from "@babel/types";
import * as cache from "../cache.ts";
import generator from "@babel/generator";
// NodePath is split across many files.
import * as NodePath_ancestry from "./ancestry.ts";
import * as NodePath_inference from "./inference/index.ts";
import * as NodePath_replacement from "./replacement.ts";
import * as NodePath_evaluation from "./evaluation.ts";
import * as NodePath_conversion from "./conversion.ts";
import * as NodePath_introspection from "./introspection.ts";
import * as NodePath_context from "./context.ts";
import * as NodePath_removal from "./removal.ts";
import * as NodePath_modification from "./modification.ts";
import * as NodePath_family from "./family.ts";
import * as NodePath_comments from "./comments.ts";
import * as NodePath_virtual_types_validator from "./lib/virtual-types-validator.ts";
const debug = buildDebug("babel");
export const REMOVED = 1 << 0;
export const SHOULD_STOP = 1 << 1;
export const SHOULD_SKIP = 1 << 2;
class NodePath {
    constructor(hub, parent) {
        this.parent = parent;
        this.hub = hub;
        this.data = null;
        this.context = null;
        this.scope = null;
    }
    contexts = [];
    state = null;
    opts = null;
    // this.shouldSkip = false; this.shouldStop = false; this.removed = false;
    _traverseFlags = 0;
    skipKeys = null;
    parentPath = null;
    container = null;
    listKey = null;
    key = null;
    node = null;
    type = null;
    static get({ hub, parentPath, parent, container, listKey, key, }) {
        if (!hub && parentPath) {
            hub = parentPath.hub;
        }
        if (!parent) {
            throw new Error("To get a node path the parent needs to exist");
        }
        const targetNode = 
        // @ts-expect-error key must present in container
        container[key];
        const paths = cache.getOrCreateCachedPaths(hub, parent);
        let path = paths.get(targetNode);
        if (!path) {
            path = new NodePath(hub, parent);
            if (targetNode)
                paths.set(targetNode, path);
        }
        path.setup(parentPath, container, listKey, key);
        return path;
    }
    getScope(scope) {
        return this.isScope() ? new Scope(this) : scope;
    }
    setData(key, val) {
        if (this.data == null) {
            this.data = Object.create(null);
        }
        return (this.data[key] = val);
    }
    getData(key, def) {
        if (this.data == null) {
            this.data = Object.create(null);
        }
        let val = this.data[key];
        if (val === undefined && def !== undefined)
            val = this.data[key] = def;
        return val;
    }
    hasNode() {
        return this.node != null;
    }
    buildCodeFrameError(msg, Error = SyntaxError) {
        return this.hub.buildError(this.node, msg, Error);
    }
    traverse(visitor, state) {
        traverse(this.node, visitor, this.scope, state, this);
    }
    set(key, node) {
        validate(this.node, key, node);
        // @ts-expect-error key must present in this.node
        this.node[key] = node;
    }
    getPathLocation() {
        const parts = [];
        let path = this;
        do {
            let key = path.key;
            if (path.inList)
                key = `${path.listKey}[${key}]`;
            parts.unshift(key);
        } while ((path = path.parentPath));
        return parts.join(".");
    }
    debug(message) {
        if (!debug.enabled)
            return;
        debug(`${this.getPathLocation()} ${this.type}: ${message}`);
    }
    toString() {
        return generator(this.node).code;
    }
    get inList() {
        return !!this.listKey;
    }
    set inList(inList) {
        if (!inList) {
            this.listKey = null;
        }
        // ignore inList = true as it should depend on `listKey`
    }
    get parentKey() {
        return (this.listKey || this.key);
    }
    get shouldSkip() {
        return !!(this._traverseFlags & SHOULD_SKIP);
    }
    set shouldSkip(v) {
        if (v) {
            this._traverseFlags |= SHOULD_SKIP;
        }
        else {
            this._traverseFlags &= ~SHOULD_SKIP;
        }
    }
    get shouldStop() {
        return !!(this._traverseFlags & SHOULD_STOP);
    }
    set shouldStop(v) {
        if (v) {
            this._traverseFlags |= SHOULD_STOP;
        }
        else {
            this._traverseFlags &= ~SHOULD_STOP;
        }
    }
    get removed() {
        return !!(this._traverseFlags & REMOVED);
    }
    set removed(v) {
        if (v) {
            this._traverseFlags |= REMOVED;
        }
        else {
            this._traverseFlags &= ~REMOVED;
        }
    }
}
Object.assign(NodePath.prototype, NodePath_ancestry, NodePath_inference, NodePath_replacement, NodePath_evaluation, NodePath_conversion, NodePath_introspection, NodePath_context, NodePath_removal, NodePath_modification, NodePath_family, NodePath_comments);
if (!process.env.BABEL_8_BREAKING) {
    // @ts-expect-error The original _guessExecutionStatusRelativeToDifferentFunctions only worked for paths in
    // different functions, but _guessExecutionStatusRelativeTo works as a replacement in those cases.
    NodePath.prototype._guessExecutionStatusRelativeToDifferentFunctions =
        NodePath_introspection._guessExecutionStatusRelativeTo;
}
// we can not use `import { TYPES } from "@babel/types"` here
// because the transformNamedBabelTypesImportToDestructuring plugin in babel.config.js
// does not offer live bindings for `TYPES`
// we can change to `import { TYPES }` when we are publishing ES modules only
for (const type of t.TYPES) {
    const typeKey = `is${type}`;
    // @ts-expect-error typeKey must present in t
    const fn = t[typeKey];
    // @ts-expect-error augmenting NodePath prototype
    NodePath.prototype[typeKey] = function (opts) {
        return fn(this.node, opts);
    };
    // @ts-expect-error augmenting NodePath prototype
    NodePath.prototype[`assert${type}`] = function (opts) {
        if (!fn(this.node, opts)) {
            throw new TypeError(`Expected node path of type ${type}`);
        }
    };
}
// Register virtual types validators after base types validators
Object.assign(NodePath.prototype, NodePath_virtual_types_validator);
for (const type of Object.keys(virtualTypes)) {
    if (type[0] === "_")
        continue;
    if (!t.TYPES.includes(type))
        t.TYPES.push(type);
}
export default NodePath;
