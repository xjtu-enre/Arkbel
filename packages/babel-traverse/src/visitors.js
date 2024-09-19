import * as virtualTypes from "./path/lib/virtual-types.ts";
import * as virtualTypesValidators from "./path/lib/virtual-types-validator.ts";
import { DEPRECATED_KEYS, DEPRECATED_ALIASES, FLIPPED_ALIAS_KEYS, TYPES, __internal__deprecationWarning as deprecationWarning, } from "@babel/types";
function isVirtualType(type) {
    return type in virtualTypes;
}
export function isExplodedVisitor(visitor) {
    // @ts-expect-error _exploded is not defined on non-exploded Visitor
    return visitor?._exploded;
}
/**
 * explode() will take a visitor object with all of the various shorthands
 * that we support, and validates & normalizes it into a common format, ready
 * to be used in traversal
 *
 * The various shorthands are:
 * * `Identifier() { ... }` -> `Identifier: { enter() { ... } }`
 * * `"Identifier|NumericLiteral": { ... }` -> `Identifier: { ... }, NumericLiteral: { ... }`
 * * Aliases in `@babel/types`: e.g. `Property: { ... }` -> `ObjectProperty: { ... }, ClassProperty: { ... }`
 * Other normalizations are:
 * * Visitors of virtual types are wrapped, so that they are only visited when
 *   their dynamic check passes
 * * `enter` and `exit` functions are wrapped in arrays, to ease merging of
 *   visitors
 */
export function explode(visitor) {
    if (isExplodedVisitor(visitor))
        return visitor;
    // @ts-expect-error `visitor` will be cast to ExplodedVisitor by this function
    visitor._exploded = true;
    // normalise pipes
    for (const nodeType of Object.keys(visitor)) {
        if (shouldIgnoreKey(nodeType))
            continue;
        const parts = nodeType.split("|");
        if (parts.length === 1)
            continue;
        const fns = visitor[nodeType];
        delete visitor[nodeType];
        for (const part of parts) {
            // @ts-expect-error part will be verified by `verify` later
            visitor[part] = fns;
        }
    }
    // verify data structure
    verify(visitor);
    // make sure there's no __esModule type since this is because we're using loose mode
    // and it sets __esModule to be enumerable on all modules :(
    // @ts-expect-error ESModule interop
    delete visitor.__esModule;
    // ensure visitors are objects
    ensureEntranceObjects(visitor);
    // ensure enter/exit callbacks are arrays
    ensureCallbackArrays(visitor);
    // add type wrappers
    for (const nodeType of Object.keys(visitor)) {
        if (shouldIgnoreKey(nodeType))
            continue;
        if (!isVirtualType(nodeType))
            continue;
        // wrap all the functions
        const fns = visitor[nodeType];
        for (const type of Object.keys(fns)) {
            // @ts-expect-error normalised as VisitNodeObject
            fns[type] = wrapCheck(nodeType, fns[type]);
        }
        // clear it from the visitor
        delete visitor[nodeType];
        const types = virtualTypes[nodeType];
        if (types !== null) {
            for (const type of types) {
                // merge the visitor if necessary or just put it back in
                if (visitor[type]) {
                    mergePair(visitor[type], fns);
                }
                else {
                    // @ts-expect-error Expression produces too complex union
                    visitor[type] = fns;
                }
            }
        }
        else {
            mergePair(visitor, fns);
        }
    }
    // add aliases
    for (const nodeType of Object.keys(visitor)) {
        if (shouldIgnoreKey(nodeType))
            continue;
        let aliases = FLIPPED_ALIAS_KEYS[nodeType];
        if (nodeType in DEPRECATED_KEYS) {
            const deprecatedKey = DEPRECATED_KEYS[nodeType];
            deprecationWarning(nodeType, deprecatedKey, "Visitor ");
            aliases = [deprecatedKey];
        }
        else if (nodeType in DEPRECATED_ALIASES) {
            const deprecatedAlias = DEPRECATED_ALIASES[nodeType];
            deprecationWarning(nodeType, deprecatedAlias, "Visitor ");
            aliases = FLIPPED_ALIAS_KEYS[deprecatedAlias];
        }
        if (!aliases)
            continue;
        const fns = visitor[nodeType];
        // clear it from the visitor
        delete visitor[nodeType];
        for (const alias of aliases) {
            const existing = visitor[alias];
            if (existing) {
                mergePair(existing, fns);
            }
            else {
                // @ts-expect-error Expression produces a union type that is too complex to represent.
                visitor[alias] = { ...fns };
            }
        }
    }
    for (const nodeType of Object.keys(visitor)) {
        if (shouldIgnoreKey(nodeType))
            continue;
        ensureCallbackArrays(
        // @ts-expect-error nodeType must present in visitor after previous validations
        visitor[nodeType]);
    }
    // @ts-expect-error explosion has been performed
    return visitor;
}
export function verify(visitor) {
    // @ts-expect-error _verified is not defined on non-verified Visitor.
    // TODO: unify _verified and _exploded.
    if (visitor._verified)
        return;
    if (typeof visitor === "function") {
        throw new Error("You passed `traverse()` a function when it expected a visitor object, " +
            "are you sure you didn't mean `{ enter: Function }`?");
    }
    for (const nodeType of Object.keys(visitor)) {
        if (nodeType === "enter" || nodeType === "exit") {
            validateVisitorMethods(nodeType, visitor[nodeType]);
        }
        if (shouldIgnoreKey(nodeType))
            continue;
        if (TYPES.indexOf(nodeType) < 0) {
            throw new Error(`You gave us a visitor for the node type ${nodeType} but it's not a valid type`);
        }
        const visitors = visitor[nodeType];
        if (typeof visitors === "object") {
            for (const visitorKey of Object.keys(visitors)) {
                if (visitorKey === "enter" || visitorKey === "exit") {
                    // verify that it just contains functions
                    validateVisitorMethods(`${nodeType}.${visitorKey}`, visitors[visitorKey]);
                }
                else {
                    throw new Error("You passed `traverse()` a visitor object with the property " +
                        `${nodeType} that has the invalid property ${visitorKey}`);
                }
            }
        }
    }
    // @ts-expect-error _verified is not defined on non-verified Visitor.
    // TODO: unify _verified and _exploded.
    visitor._verified = true;
}
function validateVisitorMethods(path, val) {
    const fns = [].concat(val);
    for (const fn of fns) {
        if (typeof fn !== "function") {
            throw new TypeError(`Non-function found defined in ${path} with type ${typeof fn}`);
        }
    }
}
export function merge(visitors, states = [], wrapper) {
    // @ts-expect-error don't bother with internal flags so it can work with earlier @babel/core validations
    const mergedVisitor = {};
    for (let i = 0; i < visitors.length; i++) {
        const visitor = explode(visitors[i]);
        const state = states[i];
        let topVisitor = visitor;
        if (state || wrapper) {
            topVisitor = wrapWithStateOrWrapper(topVisitor, state, wrapper);
        }
        mergePair(mergedVisitor, topVisitor);
        for (const key of Object.keys(visitor)) {
            if (shouldIgnoreKey(key))
                continue;
            let typeVisitor = visitor[key];
            // if we have state or wrapper then overload the callbacks to take it
            if (state || wrapper) {
                typeVisitor = wrapWithStateOrWrapper(typeVisitor, state, wrapper);
            }
            const nodeVisitor = (mergedVisitor[key] ||= {});
            mergePair(nodeVisitor, typeVisitor);
        }
    }
    if (process.env.BABEL_8_BREAKING) {
        return {
            ...mergedVisitor,
            _exploded: true,
            _verified: true,
        };
    }
    return mergedVisitor;
}
function wrapWithStateOrWrapper(oldVisitor, state, wrapper) {
    const newVisitor = {};
    for (const phase of ["enter", "exit"]) {
        let fns = oldVisitor[phase];
        // not an enter/exit array of callbacks
        if (!Array.isArray(fns))
            continue;
        fns = fns.map(function (fn) {
            let newFn = fn;
            if (state) {
                newFn = function (path) {
                    fn.call(state, path, state);
                };
            }
            if (wrapper) {
                // @ts-expect-error Fixme: actually PluginPass.key (aka pluginAlias)?
                newFn = wrapper(state?.key, phase, newFn);
            }
            // Override toString in case this function is printed, we want to print the wrapped function, same as we do in `wrapCheck`
            if (newFn !== fn) {
                newFn.toString = () => fn.toString();
            }
            return newFn;
        });
        newVisitor[phase] = fns;
    }
    return newVisitor;
}
function ensureEntranceObjects(obj) {
    for (const key of Object.keys(obj)) {
        if (shouldIgnoreKey(key))
            continue;
        const fns = obj[key];
        if (typeof fns === "function") {
            // @ts-expect-error: Expression produces a union type that is too complex to represent.
            obj[key] = { enter: fns };
        }
    }
}
function ensureCallbackArrays(obj) {
    if (obj.enter && !Array.isArray(obj.enter))
        obj.enter = [obj.enter];
    if (obj.exit && !Array.isArray(obj.exit))
        obj.exit = [obj.exit];
}
function wrapCheck(nodeType, fn) {
    const fnKey = `is${nodeType}`;
    // @ts-expect-error we know virtualTypesValidators will contain `fnKey`, but TS doesn't
    const validator = virtualTypesValidators[fnKey];
    const newFn = function (path) {
        if (validator.call(path)) {
            return fn.apply(this, arguments);
        }
    };
    newFn.toString = () => fn.toString();
    return newFn;
}
function shouldIgnoreKey(key) {
    // internal/hidden key
    if (key[0] === "_")
        return true;
    // ignore function keys
    if (key === "enter" || key === "exit" || key === "shouldSkip")
        return true;
    // ignore other options
    if (key === "denylist" || key === "noScope" || key === "skipKeys") {
        return true;
    }
    if (!process.env.BABEL_8_BREAKING) {
        if (key === "blacklist") {
            return true;
        }
    }
    return false;
}
/*
function mergePair(
  dest: ExplVisitNode<unknown, Node>,
  src: ExplVisitNode<unknown, Node>,
);
*/
function mergePair(dest, src) {
    for (const phase of ["enter", "exit"]) {
        if (!src[phase])
            continue;
        dest[phase] = [].concat(dest[phase] || [], src[phase]);
    }
}
