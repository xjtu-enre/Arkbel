import ScopeHandler, { NameType, Scope } from "../../util/scope.ts";
import { BindingFlag, ScopeFlag } from "../../util/scopeflags.ts";
import { Errors } from "../../parse-error.ts";
var TsNameType;
(function (TsNameType) {
    TsNameType[TsNameType["Types"] = 1] = "Types";
    // enums (which are also in .types)
    TsNameType[TsNameType["Enums"] = 2] = "Enums";
    // const enums (which are also in .enums and .types)
    TsNameType[TsNameType["ConstEnums"] = 4] = "ConstEnums";
    // classes (which are also in .lexical) and interface (which are also in .types)
    TsNameType[TsNameType["Classes"] = 8] = "Classes";
    // namespaces and ambient functions (or classes) are too difficult to track,
    // especially without type analysis.
    // We need to track them anyway, to avoid "X is not defined" errors
    // when exporting them.
    TsNameType[TsNameType["ExportOnlyBindings"] = 16] = "ExportOnlyBindings";
})(TsNameType || (TsNameType = {}));
class TypeScriptScope extends Scope {
    tsNames = new Map();
}
// See https://github.com/babel/babel/pull/9766#discussion_r268920730 for an
// explanation of how typescript handles scope.
export default class TypeScriptScopeHandler extends ScopeHandler {
    importsStack = [];
    createScope(flags) {
        this.importsStack.push(new Set()); // Always keep the top-level scope for export checks.
        return new TypeScriptScope(flags);
    }
    enter(flags) {
        if (flags == ScopeFlag.TS_MODULE) {
            this.importsStack.push(new Set());
        }
        super.enter(flags);
    }
    exit() {
        const flags = super.exit();
        if (flags == ScopeFlag.TS_MODULE) {
            this.importsStack.pop();
        }
        return flags;
    }
    hasImport(name, allowShadow) {
        const len = this.importsStack.length;
        if (this.importsStack[len - 1].has(name)) {
            return true;
        }
        if (!allowShadow && len > 1) {
            for (let i = 0; i < len - 1; i++) {
                if (this.importsStack[i].has(name))
                    return true;
            }
        }
        return false;
    }
    declareName(name, bindingType, loc) {
        if (bindingType & BindingFlag.FLAG_TS_IMPORT) {
            if (this.hasImport(name, true)) {
                this.parser.raise(Errors.VarRedeclaration, loc, {
                    identifierName: name,
                });
            }
            this.importsStack[this.importsStack.length - 1].add(name);
            return;
        }
        const scope = this.currentScope();
        let type = scope.tsNames.get(name) || 0;
        if (bindingType & BindingFlag.FLAG_TS_EXPORT_ONLY) {
            this.maybeExportDefined(scope, name);
            scope.tsNames.set(name, type | TsNameType.ExportOnlyBindings);
            return;
        }
        super.declareName(name, bindingType, loc);
        if (bindingType & BindingFlag.KIND_TYPE) {
            if (!(bindingType & BindingFlag.KIND_VALUE)) {
                // "Value" bindings have already been registered by the superclass.
                this.checkRedeclarationInScope(scope, name, bindingType, loc);
                this.maybeExportDefined(scope, name);
            }
            type = type | TsNameType.Types;
        }
        if (bindingType & BindingFlag.FLAG_TS_ENUM) {
            type = type | TsNameType.Enums;
        }
        if (bindingType & BindingFlag.FLAG_TS_CONST_ENUM) {
            type = type | TsNameType.ConstEnums;
        }
        if (bindingType & BindingFlag.FLAG_CLASS) {
            type = type | TsNameType.Classes;
        }
        if (type)
            scope.tsNames.set(name, type);
    }
    isRedeclaredInScope(scope, name, bindingType) {
        const type = scope.tsNames.get(name);
        if ((type & TsNameType.Enums) > 0) {
            if (bindingType & BindingFlag.FLAG_TS_ENUM) {
                // Enums can be merged with other enums if they are both
                //  const or both non-const.
                const isConst = !!(bindingType & BindingFlag.FLAG_TS_CONST_ENUM);
                const wasConst = (type & TsNameType.ConstEnums) > 0;
                return isConst !== wasConst;
            }
            return true;
        }
        if (bindingType & BindingFlag.FLAG_CLASS &&
            (type & TsNameType.Classes) > 0) {
            if (scope.names.get(name) & NameType.Lexical) {
                // Classes can be merged with interfaces
                return !!(bindingType & BindingFlag.KIND_VALUE);
            }
            else {
                // Interface can be merged with other classes or interfaces
                return false;
            }
        }
        if (bindingType & BindingFlag.KIND_TYPE && (type & TsNameType.Types) > 0) {
            return true;
        }
        return super.isRedeclaredInScope(scope, name, bindingType);
    }
    checkLocalExport(id) {
        const { name } = id;
        if (this.hasImport(name))
            return;
        const len = this.scopeStack.length;
        for (let i = len - 1; i >= 0; i--) {
            const scope = this.scopeStack[i];
            const type = scope.tsNames.get(name);
            if ((type & TsNameType.Types) > 0 ||
                (type & TsNameType.ExportOnlyBindings) > 0) {
                return;
            }
        }
        super.checkLocalExport(id);
    }
}
