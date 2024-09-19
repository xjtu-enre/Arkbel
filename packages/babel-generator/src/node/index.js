import * as whitespace from "./whitespace.ts";
import * as parens from "./parentheses.ts";
import { FLIPPED_ALIAS_KEYS, isCallExpression, isExpressionStatement, isMemberExpression, isNewExpression, } from "@babel/types";
function expandAliases(obj) {
    const map = new Map();
    function add(type, func) {
        const fn = map.get(type);
        map.set(type, fn
            ? function (node, parent, stack) {
                return fn(node, parent, stack) ?? func(node, parent, stack);
            }
            : func);
    }
    for (const type of Object.keys(obj)) {
        const aliases = FLIPPED_ALIAS_KEYS[type];
        if (aliases) {
            for (const alias of aliases) {
                add(alias, obj[type]);
            }
        }
        else {
            add(type, obj[type]);
        }
    }
    return map;
}
// Rather than using `t.is` on each object property, we pre-expand any type aliases
// into concrete types so that the 'find' call below can be as fast as possible.
const expandedParens = expandAliases(parens);
const expandedWhitespaceNodes = expandAliases(whitespace.nodes);
function isOrHasCallExpression(node) {
    if (isCallExpression(node)) {
        return true;
    }
    return isMemberExpression(node) && isOrHasCallExpression(node.object);
}
export function needsWhitespace(node, parent, type) {
    if (!node)
        return false;
    if (isExpressionStatement(node)) {
        node = node.expression;
    }
    const flag = expandedWhitespaceNodes.get(node.type)?.(node, parent);
    if (typeof flag === "number") {
        return (flag & type) !== 0;
    }
    return false;
}
export function needsWhitespaceBefore(node, parent) {
    return needsWhitespace(node, parent, 1);
}
export function needsWhitespaceAfter(node, parent) {
    return needsWhitespace(node, parent, 2);
}
export function needsParens(node, parent, printStack) {
    if (!parent)
        return false;
    if (isNewExpression(parent) && parent.callee === node) {
        if (isOrHasCallExpression(node))
            return true;
    }
    return expandedParens.get(node.type)?.(node, parent, printStack);
}
