import nameFunction from "@babel/helper-function-name";
import template from "@babel/template";
import { blockStatement, callExpression, functionExpression, isAssignmentPattern, isFunctionDeclaration, isRestElement, returnStatement, isCallExpression, } from "@babel/types";
const buildAnonymousExpressionWrapper = template.expression(`
  (function () {
    var REF = FUNCTION;
    return function NAME(PARAMS) {
      return REF.apply(this, arguments);
    };
  })()
`);
const buildNamedExpressionWrapper = template.expression(`
  (function () {
    var REF = FUNCTION;
    function NAME(PARAMS) {
      return REF.apply(this, arguments);
    }
    return NAME;
  })()
`);
const buildDeclarationWrapper = template.statements(`
  function NAME(PARAMS) { return REF.apply(this, arguments); }
  function REF() {
    REF = FUNCTION;
    return REF.apply(this, arguments);
  }
`);
function classOrObjectMethod(path, callId) {
    const node = path.node;
    const body = node.body;
    const container = functionExpression(null, [], blockStatement(body.body), true);
    body.body = [
        returnStatement(callExpression(callExpression(callId, [container]), [])),
    ];
    // Regardless of whether or not the wrapped function is a an async method
    // or generator the outer function should not be
    node.async = false;
    node.generator = false;
    // Unwrap the wrapper IIFE's environment so super and this and such still work.
    path.get("body.body.0.argument.callee.arguments.0").unwrapFunctionEnvironment();
}
function plainFunction(inPath, callId, noNewArrows, ignoreFunctionLength) {
    let path = inPath;
    let node;
    let functionId = null;
    const nodeParams = inPath.node.params;
    if (path.isArrowFunctionExpression()) {
        if (process.env.BABEL_8_BREAKING) {
            path = path.arrowFunctionToExpression({ noNewArrows });
        }
        else {
            // arrowFunctionToExpression returns undefined in @babel/traverse < 7.18.10
            path = path.arrowFunctionToExpression({ noNewArrows }) ?? path;
        }
        node = path.node;
    }
    else {
        node = path.node;
    }
    const isDeclaration = isFunctionDeclaration(node);
    let built = node;
    if (!isCallExpression(node)) {
        functionId = node.id;
        node.id = null;
        node.type = "FunctionExpression";
        built = callExpression(callId, [
            node,
        ]);
    }
    const params = [];
    for (const param of nodeParams) {
        if (isAssignmentPattern(param) || isRestElement(param)) {
            break;
        }
        params.push(path.scope.generateUidIdentifier("x"));
    }
    const wrapperArgs = {
        NAME: functionId || null,
        REF: path.scope.generateUidIdentifier(functionId ? functionId.name : "ref"),
        FUNCTION: built,
        PARAMS: params,
    };
    if (isDeclaration) {
        const container = buildDeclarationWrapper(wrapperArgs);
        path.replaceWith(container[0]);
        path.insertAfter(container[1]);
    }
    else {
        let container;
        if (functionId) {
            container = buildNamedExpressionWrapper(wrapperArgs);
        }
        else {
            container = buildAnonymousExpressionWrapper(wrapperArgs);
            const returnFn = container.callee.body.body[1].argument;
            nameFunction({
                node: returnFn,
                parent: path.parent,
                scope: path.scope,
            });
            functionId = returnFn.id;
        }
        if (functionId || (!ignoreFunctionLength && params.length)) {
            path.replaceWith(container);
        }
        else {
            // we can omit this wrapper as the conditions it protects for do not apply
            path.replaceWith(built);
        }
    }
}
export default function wrapFunction(path, callId, 
// TODO(Babel 8): Consider defaulting to false for spec compliance
noNewArrows = true, ignoreFunctionLength = false) {
    if (path.isMethod()) {
        classOrObjectMethod(path, callId);
    }
    else {
        plainFunction(path, callId, noNewArrows, ignoreFunctionLength);
    }
}
