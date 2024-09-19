import { types as t } from "@babel/core";
import buildOptimizedSequenceExpression from "./buildOptimizedSequenceExpression.ts";
const minimalVisitor = {
    BinaryExpression(path) {
        const { scope, node } = path;
        const { operator, left, right } = node;
        if (operator !== "|>")
            return;
        const placeholder = scope.generateUidIdentifierBasedOnNode(left);
        const call = t.callExpression(right, [t.cloneNode(placeholder)]);
        path.replaceWith(buildOptimizedSequenceExpression({
            placeholder,
            call,
            path: path,
        }));
    },
};
export default minimalVisitor;
