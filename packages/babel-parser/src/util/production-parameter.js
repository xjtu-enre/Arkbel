// ProductionParameterHandler is a stack fashioned production parameter tracker
// https://tc39.es/ecma262/#sec-grammar-notation
// The tracked parameters are defined above.
//
// Whenever [+Await]/[+Yield] appears in the right-hand sides of a production,
// we must enter a new tracking stack. For example when parsing
//
// AsyncFunctionDeclaration [Yield, Await]:
//   async [no LineTerminator here] function BindingIdentifier[?Yield, ?Await]
//     ( FormalParameters[~Yield, +Await] ) { AsyncFunctionBody }
//
// we must follow such process:
//
// 1. parse async keyword
// 2. parse function keyword
// 3. parse bindingIdentifier <= inherit current parameters: [?Await]
// 4. enter new stack with (PARAM_AWAIT)
// 5. parse formal parameters <= must have [Await] parameter [+Await]
// 6. parse function body
// 7. exit current stack
export var ParamKind;
(function (ParamKind) {
    // Initial Parameter flags
    ParamKind[ParamKind["PARAM"] = 0] = "PARAM";
    // track [Yield] production parameter
    ParamKind[ParamKind["PARAM_YIELD"] = 1] = "PARAM_YIELD";
    // track [Await] production parameter
    ParamKind[ParamKind["PARAM_AWAIT"] = 2] = "PARAM_AWAIT";
    // track [Return] production parameter
    ParamKind[ParamKind["PARAM_RETURN"] = 4] = "PARAM_RETURN";
    // track [In] production parameter
    ParamKind[ParamKind["PARAM_IN"] = 8] = "PARAM_IN";
})(ParamKind || (ParamKind = {}));
// todo(flow->ts) - check if more granular type can be used,
//  type below is not good because things like PARAM_AWAIT|PARAM_YIELD are not included
// export type ParamKind =
//   | typeof PARAM
//   | typeof PARAM_AWAIT
//   | typeof PARAM_IN
//   | typeof PARAM_RETURN
//   | typeof PARAM_YIELD;
export default class ProductionParameterHandler {
    stacks = [];
    enter(flags) {
        this.stacks.push(flags);
    }
    exit() {
        this.stacks.pop();
    }
    currentFlags() {
        return this.stacks[this.stacks.length - 1];
    }
    get hasAwait() {
        return (this.currentFlags() & ParamKind.PARAM_AWAIT) > 0;
    }
    get hasYield() {
        return (this.currentFlags() & ParamKind.PARAM_YIELD) > 0;
    }
    get hasReturn() {
        return (this.currentFlags() & ParamKind.PARAM_RETURN) > 0;
    }
    get hasIn() {
        return (this.currentFlags() & ParamKind.PARAM_IN) > 0;
    }
}
export function functionFlags(isAsync, isGenerator) {
    return ((isAsync ? ParamKind.PARAM_AWAIT : 0) |
        (isGenerator ? ParamKind.PARAM_YIELD : 0));
}
