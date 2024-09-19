import { types as t } from "@babel/core";
function isConciseArrowExpression(node) {
    return (t.isArrowFunctionExpression(node) &&
        t.isExpression(node.body) &&
        !node.async);
}
const buildOptimizedSequenceExpression = ({ call, path, placeholder, }) => {
    // @ts-expect-error AwaitExpression does not have callee property
    const { callee: calledExpression } = call;
    // pipelineLeft must not be a PrivateName
    const pipelineLeft = path.node.left;
    const assign = t.assignmentExpression("=", t.cloneNode(placeholder), pipelineLeft);
    const expressionIsArrow = isConciseArrowExpression(calledExpression);
    if (expressionIsArrow) {
        let param;
        let optimizeArrow = true;
        const { params } = calledExpression;
        if (params.length === 1 && t.isIdentifier(params[0])) {
            param = params[0];
        }
        else if (params.length > 0) {
            optimizeArrow = false;
        }
        if (optimizeArrow && !param) {
            // fixme: arrow function with 1 pattern argument will also go into this branch
            // Arrow function with 0 arguments
            return t.sequenceExpression([pipelineLeft, calledExpression.body]);
        }
        else if (param) {
            path.scope.push({ id: t.cloneNode(placeholder) });
            path.get("right").scope.rename(param.name, placeholder.name);
            return t.sequenceExpression([assign, calledExpression.body]);
        }
    }
    else if (t.isIdentifier(calledExpression, { name: "eval" })) {
        const evalSequence = t.sequenceExpression([
            t.numericLiteral(0),
            calledExpression,
        ]);
        call.callee = evalSequence;
    }
    path.scope.push({ id: t.cloneNode(placeholder) });
    return t.sequenceExpression([assign, call]);
};
export default buildOptimizedSequenceExpression;
