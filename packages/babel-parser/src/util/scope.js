import { ScopeFlag, BindingFlag } from "./scopeflags.ts";
import { Errors } from "../parse-error.ts";
export var NameType;
(function (NameType) {
    // var-declared names in the current lexical scope
    NameType[NameType["Var"] = 1] = "Var";
    // lexically-declared names in the current lexical scope
    NameType[NameType["Lexical"] = 2] = "Lexical";
    // lexically-declared FunctionDeclaration names in the current lexical scope
    NameType[NameType["Function"] = 4] = "Function";
})(NameType || (NameType = {}));
// Start an AST node, attaching a start offset.
export class Scope {
    flags = 0;
    names = new Map();
    firstLexicalName = "";
    constructor(flags) {
        this.flags = flags;
    }
}
// The functions in this module keep track of declared variables in the
// current scope in order to detect duplicate variable names.
export default class ScopeHandler {
    parser;
    scopeStack = [];
    inModule;
    undefinedExports = new Map();
    constructor(parser, inModule) {
        this.parser = parser;
        this.inModule = inModule;
    }
    get inTopLevel() {
        return (this.currentScope().flags & ScopeFlag.PROGRAM) > 0;
    }
    get inFunction() {
        return (this.currentVarScopeFlags() & ScopeFlag.FUNCTION) > 0;
    }
    get allowSuper() {
        return (this.currentThisScopeFlags() & ScopeFlag.SUPER) > 0;
    }
    get allowDirectSuper() {
        return (this.currentThisScopeFlags() & ScopeFlag.DIRECT_SUPER) > 0;
    }
    get inClass() {
        return (this.currentThisScopeFlags() & ScopeFlag.CLASS) > 0;
    }
    get inClassAndNotInNonArrowFunction() {
        const flags = this.currentThisScopeFlags();
        return (flags & ScopeFlag.CLASS) > 0 && (flags & ScopeFlag.FUNCTION) === 0;
    }
    get inStaticBlock() {
        for (let i = this.scopeStack.length - 1;; i--) {
            const { flags } = this.scopeStack[i];
            if (flags & ScopeFlag.STATIC_BLOCK) {
                return true;
            }
            if (flags & (ScopeFlag.VAR | ScopeFlag.CLASS)) {
                // function body, module body, class property initializers
                return false;
            }
        }
    }
    get inNonArrowFunction() {
        return (this.currentThisScopeFlags() & ScopeFlag.FUNCTION) > 0;
    }
    get treatFunctionsAsVar() {
        return this.treatFunctionsAsVarInScope(this.currentScope());
    }
    createScope(flags) {
        return new Scope(flags);
    }
    enter(flags) {
        /*:: +createScope: (flags:ScopeFlag) => IScope; */
        // @ts-expect-error This method will be overwritten by subclasses
        this.scopeStack.push(this.createScope(flags));
    }
    exit() {
        const scope = this.scopeStack.pop();
        return scope.flags;
    }
    // The spec says:
    // > At the top level of a function, or script, function declarations are
    // > treated like var declarations rather than like lexical declarations.
    treatFunctionsAsVarInScope(scope) {
        return !!(scope.flags & (ScopeFlag.FUNCTION | ScopeFlag.STATIC_BLOCK) ||
            (!this.parser.inModule && scope.flags & ScopeFlag.PROGRAM));
    }
    declareName(name, bindingType, loc) {
        let scope = this.currentScope();
        if (bindingType & BindingFlag.SCOPE_LEXICAL ||
            bindingType & BindingFlag.SCOPE_FUNCTION) {
            this.checkRedeclarationInScope(scope, name, bindingType, loc);
            let type = scope.names.get(name) || 0;
            if (bindingType & BindingFlag.SCOPE_FUNCTION) {
                type = type | NameType.Function;
            }
            else {
                if (!scope.firstLexicalName) {
                    scope.firstLexicalName = name;
                }
                type = type | NameType.Lexical;
            }
            scope.names.set(name, type);
            if (bindingType & BindingFlag.SCOPE_LEXICAL) {
                this.maybeExportDefined(scope, name);
            }
        }
        else if (bindingType & BindingFlag.SCOPE_VAR) {
            for (let i = this.scopeStack.length - 1; i >= 0; --i) {
                scope = this.scopeStack[i];
                this.checkRedeclarationInScope(scope, name, bindingType, loc);
                scope.names.set(name, (scope.names.get(name) || 0) | NameType.Var);
                this.maybeExportDefined(scope, name);
                if (scope.flags & ScopeFlag.VAR)
                    break;
            }
        }
        if (this.parser.inModule && scope.flags & ScopeFlag.PROGRAM) {
            this.undefinedExports.delete(name);
        }
    }
    maybeExportDefined(scope, name) {
        if (this.parser.inModule && scope.flags & ScopeFlag.PROGRAM) {
            this.undefinedExports.delete(name);
        }
    }
    checkRedeclarationInScope(scope, name, bindingType, loc) {
        if (this.isRedeclaredInScope(scope, name, bindingType)) {
            this.parser.raise(Errors.VarRedeclaration, loc, {
                identifierName: name,
            });
        }
    }
    isRedeclaredInScope(scope, name, bindingType) {
        if (!(bindingType & BindingFlag.KIND_VALUE))
            return false;
        if (bindingType & BindingFlag.SCOPE_LEXICAL) {
            return scope.names.has(name);
        }
        const type = scope.names.get(name);
        if (bindingType & BindingFlag.SCOPE_FUNCTION) {
            return ((type & NameType.Lexical) > 0 ||
                (!this.treatFunctionsAsVarInScope(scope) && (type & NameType.Var) > 0));
        }
        return (((type & NameType.Lexical) > 0 &&
            // Annex B.3.4
            // https://tc39.es/ecma262/#sec-variablestatements-in-catch-blocks
            !(scope.flags & ScopeFlag.SIMPLE_CATCH &&
                scope.firstLexicalName === name)) ||
            (!this.treatFunctionsAsVarInScope(scope) &&
                (type & NameType.Function) > 0));
    }
    checkLocalExport(id) {
        const { name } = id;
        const topLevelScope = this.scopeStack[0];
        if (!topLevelScope.names.has(name)) {
            this.undefinedExports.set(name, id.loc.start);
        }
    }
    currentScope() {
        return this.scopeStack[this.scopeStack.length - 1];
    }
    currentVarScopeFlags() {
        for (let i = this.scopeStack.length - 1;; i--) {
            const { flags } = this.scopeStack[i];
            if (flags & ScopeFlag.VAR) {
                return flags;
            }
        }
    }
    // Could be useful for `arguments`, `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
    currentThisScopeFlags() {
        for (let i = this.scopeStack.length - 1;; i--) {
            const { flags } = this.scopeStack[i];
            if (flags & (ScopeFlag.VAR | ScopeFlag.CLASS) &&
                !(flags & ScopeFlag.ARROW)) {
                return flags;
            }
        }
    }
}
