// TODO(Babel 8) Remove this file
if (process.env.BABEL_8_BREAKING) {
    throw new Error("Internal Babel error: This file should only be loaded in Babel 7");
}
import gatherSequenceExpressions from "./gatherSequenceExpressions.ts";
/**
 * Turn an array of statement `nodes` into a `SequenceExpression`.
 *
 * Variable declarations are turned into simple assignments and their
 * declarations hoisted to the top of the current scope.
 *
 * Expression statements are just resolved to their expression.
 */
export default function toSequenceExpression(nodes, scope) {
    if (!nodes?.length)
        return;
    const declars = [];
    const result = gatherSequenceExpressions(nodes, scope, declars);
    if (!result)
        return;
    for (const declar of declars) {
        scope.push(declar);
    }
    // @ts-expect-error fixme: gatherSequenceExpressions will return an Expression when there are only one element
    return result;
}
