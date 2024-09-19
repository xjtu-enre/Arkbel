// Each scope gets a bitset that may contain these flags
/* eslint-disable prettier/prettier */
/* prettier-ignore */
export var ScopeFlag;
(function (ScopeFlag) {
    ScopeFlag[ScopeFlag["OTHER"] = 0] = "OTHER";
    ScopeFlag[ScopeFlag["PROGRAM"] = 1] = "PROGRAM";
    ScopeFlag[ScopeFlag["FUNCTION"] = 2] = "FUNCTION";
    ScopeFlag[ScopeFlag["ARROW"] = 4] = "ARROW";
    ScopeFlag[ScopeFlag["SIMPLE_CATCH"] = 8] = "SIMPLE_CATCH";
    ScopeFlag[ScopeFlag["SUPER"] = 16] = "SUPER";
    ScopeFlag[ScopeFlag["DIRECT_SUPER"] = 32] = "DIRECT_SUPER";
    ScopeFlag[ScopeFlag["CLASS"] = 64] = "CLASS";
    ScopeFlag[ScopeFlag["STATIC_BLOCK"] = 128] = "STATIC_BLOCK";
    ScopeFlag[ScopeFlag["TS_MODULE"] = 256] = "TS_MODULE";
    ScopeFlag[ScopeFlag["VAR"] = 387] = "VAR";
})(ScopeFlag || (ScopeFlag = {}));
/* prettier-ignore */
export var BindingFlag;
(function (BindingFlag) {
    // These flags are meant to be _only_ used inside the Scope class (or subclasses).
    BindingFlag[BindingFlag["KIND_VALUE"] = 1] = "KIND_VALUE";
    BindingFlag[BindingFlag["KIND_TYPE"] = 2] = "KIND_TYPE";
    // Used in checkLVal and declareName to determine the type of a binding
    BindingFlag[BindingFlag["SCOPE_VAR"] = 4] = "SCOPE_VAR";
    BindingFlag[BindingFlag["SCOPE_LEXICAL"] = 8] = "SCOPE_LEXICAL";
    BindingFlag[BindingFlag["SCOPE_FUNCTION"] = 16] = "SCOPE_FUNCTION";
    BindingFlag[BindingFlag["SCOPE_OUTSIDE"] = 32] = "SCOPE_OUTSIDE";
    // bound inside the function
    // Misc flags
    BindingFlag[BindingFlag["FLAG_NONE"] = 64] = "FLAG_NONE";
    BindingFlag[BindingFlag["FLAG_CLASS"] = 128] = "FLAG_CLASS";
    BindingFlag[BindingFlag["FLAG_TS_ENUM"] = 256] = "FLAG_TS_ENUM";
    BindingFlag[BindingFlag["FLAG_TS_CONST_ENUM"] = 512] = "FLAG_TS_CONST_ENUM";
    BindingFlag[BindingFlag["FLAG_TS_EXPORT_ONLY"] = 1024] = "FLAG_TS_EXPORT_ONLY";
    BindingFlag[BindingFlag["FLAG_FLOW_DECLARE_FN"] = 2048] = "FLAG_FLOW_DECLARE_FN";
    BindingFlag[BindingFlag["FLAG_TS_IMPORT"] = 4096] = "FLAG_TS_IMPORT";
    // Whether "let" should be allowed in bound names in sloppy mode
    BindingFlag[BindingFlag["FLAG_NO_LET_IN_LEXICAL"] = 8192] = "FLAG_NO_LET_IN_LEXICAL";
    // These flags are meant to be _only_ used by Scope consumers
    /* prettier-ignore */
    /*                   = is value?  | is type?  |      scope     |    misc flags    */
    BindingFlag[BindingFlag["TYPE_CLASS"] = 8331] = "TYPE_CLASS";
    BindingFlag[BindingFlag["TYPE_LEXICAL"] = 8201] = "TYPE_LEXICAL";
    BindingFlag[BindingFlag["TYPE_CATCH_PARAM"] = 9] = "TYPE_CATCH_PARAM";
    BindingFlag[BindingFlag["TYPE_VAR"] = 5] = "TYPE_VAR";
    BindingFlag[BindingFlag["TYPE_FUNCTION"] = 17] = "TYPE_FUNCTION";
    BindingFlag[BindingFlag["TYPE_TS_INTERFACE"] = 130] = "TYPE_TS_INTERFACE";
    BindingFlag[BindingFlag["TYPE_TS_TYPE"] = 2] = "TYPE_TS_TYPE";
    BindingFlag[BindingFlag["TYPE_TS_ENUM"] = 8459] = "TYPE_TS_ENUM";
    BindingFlag[BindingFlag["TYPE_TS_AMBIENT"] = 1024] = "TYPE_TS_AMBIENT";
    // These bindings don't introduce anything in the scope. They are used for assignments and
    // function expressions IDs.
    BindingFlag[BindingFlag["TYPE_NONE"] = 64] = "TYPE_NONE";
    BindingFlag[BindingFlag["TYPE_OUTSIDE"] = 65] = "TYPE_OUTSIDE";
    BindingFlag[BindingFlag["TYPE_TS_CONST_ENUM"] = 8971] = "TYPE_TS_CONST_ENUM";
    BindingFlag[BindingFlag["TYPE_TS_NAMESPACE"] = 1024] = "TYPE_TS_NAMESPACE";
    BindingFlag[BindingFlag["TYPE_TS_TYPE_IMPORT"] = 4098] = "TYPE_TS_TYPE_IMPORT";
    BindingFlag[BindingFlag["TYPE_TS_VALUE_IMPORT"] = 4096] = "TYPE_TS_VALUE_IMPORT";
    BindingFlag[BindingFlag["TYPE_FLOW_DECLARE_FN"] = 2048] = "TYPE_FLOW_DECLARE_FN";
})(BindingFlag || (BindingFlag = {}));
/* prettier-ignore */
export var ClassElementType;
(function (ClassElementType) {
    ClassElementType[ClassElementType["OTHER"] = 0] = "OTHER";
    ClassElementType[ClassElementType["FLAG_STATIC"] = 4] = "FLAG_STATIC";
    ClassElementType[ClassElementType["KIND_GETTER"] = 2] = "KIND_GETTER";
    ClassElementType[ClassElementType["KIND_SETTER"] = 1] = "KIND_SETTER";
    ClassElementType[ClassElementType["KIND_ACCESSOR"] = 3] = "KIND_ACCESSOR";
    ClassElementType[ClassElementType["STATIC_GETTER"] = 6] = "STATIC_GETTER";
    ClassElementType[ClassElementType["STATIC_SETTER"] = 5] = "STATIC_SETTER";
    ClassElementType[ClassElementType["INSTANCE_GETTER"] = 2] = "INSTANCE_GETTER";
    ClassElementType[ClassElementType["INSTANCE_SETTER"] = 1] = "INSTANCE_SETTER";
})(ClassElementType || (ClassElementType = {}));
