import { assignmentExpression, sequenceExpression } from "@babel/types";
import explode from "./explode-assignable-expression.ts";
export default function (opts) {
    const { build, operator } = opts;
    const visitor = {
        AssignmentExpression(path) {
            const { node, scope } = path;
            if (node.operator !== operator + "=")
                return;
            const nodes = [];
            // @ts-expect-error Fixme: node.left can be a TSAsExpression
            const exploded = explode(node.left, nodes, scope);
            nodes.push(assignmentExpression("=", exploded.ref, build(exploded.uid, node.right)));
            path.replaceWith(sequenceExpression(nodes));
        },
        BinaryExpression(path) {
            const { node } = path;
            if (node.operator === operator) {
                path.replaceWith(build(node.left, node.right));
            }
        },
    };
    return visitor;
}
