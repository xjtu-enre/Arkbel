import ScopeHandler, { NameType, Scope } from "../../util/scope.ts";
import { BindingFlag } from "../../util/scopeflags.ts";
// Reference implementation: https://github.com/facebook/flow/blob/23aeb2a2ef6eb4241ce178fde5d8f17c5f747fb5/src/typing/env.ml#L536-L584
class FlowScope extends Scope {
    // declare function foo(): type;
    declareFunctions = new Set();
}
export default class FlowScopeHandler extends ScopeHandler {
    createScope(flags) {
        return new FlowScope(flags);
    }
    declareName(name, bindingType, loc) {
        const scope = this.currentScope();
        if (bindingType & BindingFlag.FLAG_FLOW_DECLARE_FN) {
            this.checkRedeclarationInScope(scope, name, bindingType, loc);
            this.maybeExportDefined(scope, name);
            scope.declareFunctions.add(name);
            return;
        }
        super.declareName(name, bindingType, loc);
    }
    isRedeclaredInScope(scope, name, bindingType) {
        if (super.isRedeclaredInScope(scope, name, bindingType))
            return true;
        if (bindingType & BindingFlag.FLAG_FLOW_DECLARE_FN &&
            !scope.declareFunctions.has(name)) {
            const type = scope.names.get(name);
            return (type & NameType.Function) > 0 || (type & NameType.Lexical) > 0;
        }
        return false;
    }
    checkLocalExport(id) {
        if (!this.scopeStack[0].declareFunctions.has(id.name)) {
            super.checkLocalExport(id);
        }
    }
}
