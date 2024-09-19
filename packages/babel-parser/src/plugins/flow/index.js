/*:: declare var invariant; */
import { tokenIsIdentifier, tokenIsKeyword, tokenIsKeywordOrIdentifier, tokenIsLiteralPropertyName, tokenLabelName, tt, tokenIsFlowInterfaceOrTypeOrOpaque, } from "../../tokenizer/types.ts";
import { types as tc } from "../../tokenizer/context.ts";
import * as charCodes from "charcodes";
import { isIteratorStart } from "../../util/identifier.ts";
import FlowScopeHandler from "./scope.ts";
import { BindingFlag, ScopeFlag } from "../../util/scopeflags.ts";
import { Errors, ParseErrorEnum } from "../../parse-error.ts";
import { cloneIdentifier } from "../../parser/node.ts";
const reservedTypes = new Set([
    "_",
    "any",
    "bool",
    "boolean",
    "empty",
    "extends",
    "false",
    "interface",
    "mixed",
    "null",
    "number",
    "static",
    "string",
    "true",
    "typeof",
    "void",
]);
/* eslint sort-keys: "error" */
// The Errors key follows https://github.com/facebook/flow/blob/master/src/parser/parse_error.ml unless it does not exist
const FlowErrors = ParseErrorEnum `flow`({
    AmbiguousConditionalArrow: "Ambiguous expression: wrap the arrow functions in parentheses to disambiguate.",
    AmbiguousDeclareModuleKind: "Found both `declare module.exports` and `declare export` in the same module. Modules can only have 1 since they are either an ES module or they are a CommonJS module.",
    // TODO: When we get proper string enums in typescript make this ReservedType.
    // Not really worth it to do the whole $Values dance with reservedTypes set.
    AssignReservedType: ({ reservedType }) => `Cannot overwrite reserved type ${reservedType}.`,
    DeclareClassElement: "The `declare` modifier can only appear on class fields.",
    DeclareClassFieldInitializer: "Initializers are not allowed in fields with the `declare` modifier.",
    DuplicateDeclareModuleExports: "Duplicate `declare module.exports` statement.",
    EnumBooleanMemberNotInitialized: ({ memberName, enumName, }) => `Boolean enum members need to be initialized. Use either \`${memberName} = true,\` or \`${memberName} = false,\` in enum \`${enumName}\`.`,
    EnumDuplicateMemberName: ({ memberName, enumName, }) => `Enum member names need to be unique, but the name \`${memberName}\` has already been used before in enum \`${enumName}\`.`,
    EnumInconsistentMemberValues: ({ enumName }) => `Enum \`${enumName}\` has inconsistent member initializers. Either use no initializers, or consistently use literals (either booleans, numbers, or strings) for all member initializers.`,
    EnumInvalidExplicitType: ({ invalidEnumType, enumName, }) => `Enum type \`${invalidEnumType}\` is not valid. Use one of \`boolean\`, \`number\`, \`string\`, or \`symbol\` in enum \`${enumName}\`.`,
    EnumInvalidExplicitTypeUnknownSupplied: ({ enumName, }) => `Supplied enum type is not valid. Use one of \`boolean\`, \`number\`, \`string\`, or \`symbol\` in enum \`${enumName}\`.`,
    // TODO: When moving to typescript, we should either have each of the
    // following errors only accept the specific strings they want:
    //
    // ...PrimaryType: explicitType: "string" | "number" | "boolean"
    // ...SymbolType: explicitType: "symbol"
    // ...UnknownType: explicitType: null
    //
    // Or, alternatively, merge these three errors together into one
    // `EnumInvalidMemberInitializer` error that can accept `EnumExplicitType`
    // without alteration, and then just have its message change based on the
    // explicitType.
    EnumInvalidMemberInitializerPrimaryType: ({ enumName, memberName, explicitType, }) => `Enum \`${enumName}\` has type \`${explicitType}\`, so the initializer of \`${memberName}\` needs to be a ${explicitType} literal.`,
    EnumInvalidMemberInitializerSymbolType: ({ enumName, memberName, }) => `Symbol enum members cannot be initialized. Use \`${memberName},\` in enum \`${enumName}\`.`,
    EnumInvalidMemberInitializerUnknownType: ({ enumName, memberName, }) => `The enum member initializer for \`${memberName}\` needs to be a literal (either a boolean, number, or string) in enum \`${enumName}\`.`,
    EnumInvalidMemberName: ({ enumName, memberName, suggestion, }) => `Enum member names cannot start with lowercase 'a' through 'z'. Instead of using \`${memberName}\`, consider using \`${suggestion}\`, in enum \`${enumName}\`.`,
    EnumNumberMemberNotInitialized: ({ enumName, memberName, }) => `Number enum members need to be initialized, e.g. \`${memberName} = 1\` in enum \`${enumName}\`.`,
    EnumStringMemberInconsistentlyInitialized: ({ enumName, }) => `String enum members need to consistently either all use initializers, or use no initializers, in enum \`${enumName}\`.`,
    GetterMayNotHaveThisParam: "A getter cannot have a `this` parameter.",
    ImportReflectionHasImportType: "An `import module` declaration can not use `type` or `typeof` keyword.",
    ImportTypeShorthandOnlyInPureImport: "The `type` and `typeof` keywords on named imports can only be used on regular `import` statements. It cannot be used with `import type` or `import typeof` statements.",
    InexactInsideExact: "Explicit inexact syntax cannot appear inside an explicit exact object type.",
    InexactInsideNonObject: "Explicit inexact syntax cannot appear in class or interface definitions.",
    InexactVariance: "Explicit inexact syntax cannot have variance.",
    InvalidNonTypeImportInDeclareModule: "Imports within a `declare module` body must always be `import type` or `import typeof`.",
    MissingTypeParamDefault: "Type parameter declaration needs a default, since a preceding type parameter declaration has a default.",
    NestedDeclareModule: "`declare module` cannot be used inside another `declare module`.",
    NestedFlowComment: "Cannot have a flow comment inside another flow comment.",
    PatternIsOptional: {
        message: "A binding pattern parameter cannot be optional in an implementation signature.",
        // For consistency in TypeScript and Flow error codes
        ...(!process.env.BABEL_8_BREAKING
            ? { reasonCode: "OptionalBindingPattern" }
            : {}),
    },
    SetterMayNotHaveThisParam: "A setter cannot have a `this` parameter.",
    SpreadVariance: "Spread properties cannot have variance.",
    ThisParamAnnotationRequired: "A type annotation is required for the `this` parameter.",
    ThisParamBannedInConstructor: "Constructors cannot have a `this` parameter; constructors don't bind `this` like other functions.",
    ThisParamMayNotBeOptional: "The `this` parameter cannot be optional.",
    ThisParamMustBeFirst: "The `this` parameter must be the first function parameter.",
    ThisParamNoDefault: "The `this` parameter may not have a default value.",
    TypeBeforeInitializer: "Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`.",
    TypeCastInPattern: "The type cast expression is expected to be wrapped with parenthesis.",
    UnexpectedExplicitInexactInObject: "Explicit inexact syntax must appear at the end of an inexact object.",
    UnexpectedReservedType: ({ reservedType }) => `Unexpected reserved type ${reservedType}.`,
    UnexpectedReservedUnderscore: "`_` is only allowed as a type argument to call or new.",
    UnexpectedSpaceBetweenModuloChecks: "Spaces between `%` and `checks` are not allowed here.",
    UnexpectedSpreadType: "Spread operator cannot appear in class or interface definitions.",
    UnexpectedSubtractionOperand: 'Unexpected token, expected "number" or "bigint".',
    UnexpectedTokenAfterTypeParameter: "Expected an arrow function after this type parameter declaration.",
    UnexpectedTypeParameterBeforeAsyncArrowFunction: "Type parameters must come after the async keyword, e.g. instead of `<T> async () => {}`, use `async <T>() => {}`.",
    UnsupportedDeclareExportKind: ({ unsupportedExportKind, suggestion, }) => `\`declare export ${unsupportedExportKind}\` is not supported. Use \`${suggestion}\` instead.`,
    UnsupportedStatementInDeclareModule: "Only declares and type imports are allowed inside declare module.",
    UnterminatedFlowComment: "Unterminated flow-comment.",
});
/* eslint-disable sort-keys */
function isEsModuleType(bodyElement) {
    return (bodyElement.type === "DeclareExportAllDeclaration" ||
        (bodyElement.type === "DeclareExportDeclaration" &&
            (!bodyElement.declaration ||
                (bodyElement.declaration.type !== "TypeAlias" &&
                    bodyElement.declaration.type !== "InterfaceDeclaration"))));
}
function hasTypeImportKind(node) {
    return node.importKind === "type" || node.importKind === "typeof";
}
const exportSuggestions = {
    const: "declare export var",
    let: "declare export var",
    type: "export type",
    interface: "export interface",
};
// Like Array#filter, but returns a tuple [ acceptedElements, discardedElements ]
function partition(list, test) {
    const list1 = [];
    const list2 = [];
    for (let i = 0; i < list.length; i++) {
        (test(list[i], i, list) ? list1 : list2).push(list[i]);
    }
    return [list1, list2];
}
const FLOW_PRAGMA_REGEX = /\*?\s*@((?:no)?flow)\b/;
export default (superClass) => class FlowParserMixin extends superClass {
    // The value of the @flow/@noflow pragma. Initially undefined, transitions
    // to "@flow" or "@noflow" if we see a pragma. Transitions to null if we are
    // past the initial comment.
    flowPragma = undefined;
    getScopeHandler() {
        return FlowScopeHandler;
    }
    shouldParseTypes() {
        return this.getPluginOption("flow", "all") || this.flowPragma === "flow";
    }
    shouldParseEnums() {
        return !!this.getPluginOption("flow", "enums");
    }
    finishToken(type, val) {
        if (type !== tt.string &&
            type !== tt.semi &&
            type !== tt.interpreterDirective) {
            if (this.flowPragma === undefined) {
                this.flowPragma = null;
            }
        }
        super.finishToken(type, val);
    }
    addComment(comment) {
        if (this.flowPragma === undefined) {
            // Try to parse a flow pragma.
            const matches = FLOW_PRAGMA_REGEX.exec(comment.value);
            if (!matches) {
                // do nothing
            }
            else if (matches[1] === "flow") {
                this.flowPragma = "flow";
            }
            else if (matches[1] === "noflow") {
                this.flowPragma = "noflow";
            }
            else {
                throw new Error("Unexpected flow pragma");
            }
        }
        super.addComment(comment);
    }
    flowParseTypeInitialiser(tok) {
        const oldInType = this.state.inType;
        this.state.inType = true;
        this.expect(tok || tt.colon);
        const type = this.flowParseType();
        this.state.inType = oldInType;
        return type;
    }
    flowParsePredicate() {
        const node = this.startNode();
        const moduloLoc = this.state.startLoc;
        this.next(); // eat `%`
        this.expectContextual(tt._checks);
        // Force '%' and 'checks' to be adjacent
        if (this.state.lastTokStartLoc.index > moduloLoc.index + 1) {
            this.raise(FlowErrors.UnexpectedSpaceBetweenModuloChecks, moduloLoc);
        }
        if (this.eat(tt.parenL)) {
            node.value = super.parseExpression();
            this.expect(tt.parenR);
            return this.finishNode(node, "DeclaredPredicate");
        }
        else {
            return this.finishNode(node, "InferredPredicate");
        }
    }
    flowParseTypeAndPredicateInitialiser() {
        const oldInType = this.state.inType;
        this.state.inType = true;
        this.expect(tt.colon);
        let type = null;
        let predicate = null;
        if (this.match(tt.modulo)) {
            this.state.inType = oldInType;
            predicate = this.flowParsePredicate();
        }
        else {
            type = this.flowParseType();
            this.state.inType = oldInType;
            if (this.match(tt.modulo)) {
                predicate = this.flowParsePredicate();
            }
        }
        return [type, predicate];
    }
    flowParseDeclareClass(node) {
        this.next();
        this.flowParseInterfaceish(node, /*isClass*/ true);
        return this.finishNode(node, "DeclareClass");
    }
    flowParseDeclareFunction(node) {
        this.next();
        const id = (node.id = this.parseIdentifier());
        const typeNode = this.startNode();
        const typeContainer = this.startNode();
        if (this.match(tt.lt)) {
            typeNode.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        else {
            typeNode.typeParameters = null;
        }
        this.expect(tt.parenL);
        const tmp = this.flowParseFunctionTypeParams();
        typeNode.params = tmp.params;
        typeNode.rest = tmp.rest;
        typeNode.this = tmp._this;
        this.expect(tt.parenR);
        [typeNode.returnType, node.predicate] =
            this.flowParseTypeAndPredicateInitialiser();
        typeContainer.typeAnnotation = this.finishNode(typeNode, "FunctionTypeAnnotation");
        id.typeAnnotation = this.finishNode(typeContainer, "TypeAnnotation");
        this.resetEndLocation(id);
        this.semicolon();
        this.scope.declareName(node.id.name, BindingFlag.TYPE_FLOW_DECLARE_FN, node.id.loc.start);
        return this.finishNode(node, "DeclareFunction");
    }
    flowParseDeclare(node, insideModule) {
        if (this.match(tt._class)) {
            return this.flowParseDeclareClass(node);
        }
        else if (this.match(tt._function)) {
            return this.flowParseDeclareFunction(node);
        }
        else if (this.match(tt._var)) {
            return this.flowParseDeclareVariable(node);
        }
        else if (this.eatContextual(tt._module)) {
            if (this.match(tt.dot)) {
                return this.flowParseDeclareModuleExports(node);
            }
            else {
                if (insideModule) {
                    this.raise(FlowErrors.NestedDeclareModule, this.state.lastTokStartLoc);
                }
                return this.flowParseDeclareModule(node);
            }
        }
        else if (this.isContextual(tt._type)) {
            return this.flowParseDeclareTypeAlias(node);
        }
        else if (this.isContextual(tt._opaque)) {
            return this.flowParseDeclareOpaqueType(node);
        }
        else if (this.isContextual(tt._interface)) {
            return this.flowParseDeclareInterface(node);
        }
        else if (this.match(tt._export)) {
            return this.flowParseDeclareExportDeclaration(node, insideModule);
        }
        else {
            this.unexpected();
        }
    }
    flowParseDeclareVariable(node) {
        this.next();
        node.id = this.flowParseTypeAnnotatableIdentifier(
        /*allowPrimitiveOverride*/ true);
        this.scope.declareName(node.id.name, BindingFlag.TYPE_VAR, node.id.loc.start);
        this.semicolon();
        return this.finishNode(node, "DeclareVariable");
    }
    flowParseDeclareModule(node) {
        this.scope.enter(ScopeFlag.OTHER);
        if (this.match(tt.string)) {
            node.id = super.parseExprAtom();
        }
        else {
            node.id = this.parseIdentifier();
        }
        const bodyNode = (node.body = this.startNode());
        // @ts-expect-error refine typings
        const body = (bodyNode.body = []);
        this.expect(tt.braceL);
        while (!this.match(tt.braceR)) {
            let bodyNode = this.startNode();
            if (this.match(tt._import)) {
                this.next();
                if (!this.isContextual(tt._type) && !this.match(tt._typeof)) {
                    this.raise(FlowErrors.InvalidNonTypeImportInDeclareModule, this.state.lastTokStartLoc);
                }
                super.parseImport(bodyNode);
            }
            else {
                this.expectContextual(tt._declare, FlowErrors.UnsupportedStatementInDeclareModule);
                // @ts-expect-error refine typings
                bodyNode = this.flowParseDeclare(bodyNode, true);
            }
            body.push(bodyNode);
        }
        this.scope.exit();
        this.expect(tt.braceR);
        this.finishNode(bodyNode, "BlockStatement");
        let kind = null;
        let hasModuleExport = false;
        body.forEach(bodyElement => {
            if (isEsModuleType(bodyElement)) {
                if (kind === "CommonJS") {
                    this.raise(FlowErrors.AmbiguousDeclareModuleKind, bodyElement);
                }
                kind = "ES";
            }
            else if (bodyElement.type === "DeclareModuleExports") {
                if (hasModuleExport) {
                    this.raise(FlowErrors.DuplicateDeclareModuleExports, bodyElement);
                }
                if (kind === "ES") {
                    this.raise(FlowErrors.AmbiguousDeclareModuleKind, bodyElement);
                }
                kind = "CommonJS";
                hasModuleExport = true;
            }
        });
        node.kind = kind || "CommonJS";
        return this.finishNode(node, "DeclareModule");
    }
    flowParseDeclareExportDeclaration(node, insideModule) {
        this.expect(tt._export);
        if (this.eat(tt._default)) {
            if (this.match(tt._function) || this.match(tt._class)) {
                // declare export default class ...
                // declare export default function ...
                node.declaration = this.flowParseDeclare(this.startNode());
            }
            else {
                // declare export default [type];
                node.declaration = this.flowParseType();
                this.semicolon();
            }
            node.default = true;
            return this.finishNode(node, "DeclareExportDeclaration");
        }
        else {
            if (this.match(tt._const) ||
                this.isLet() ||
                ((this.isContextual(tt._type) || this.isContextual(tt._interface)) &&
                    !insideModule)) {
                const label = this.state.value;
                throw this.raise(FlowErrors.UnsupportedDeclareExportKind, this.state.startLoc, {
                    unsupportedExportKind: label,
                    suggestion: exportSuggestions[label],
                });
            }
            if (this.match(tt._var) || // declare export var ...
                this.match(tt._function) || // declare export function ...
                this.match(tt._class) || // declare export class ...
                this.isContextual(tt._opaque) // declare export opaque ..
            ) {
                node.declaration = this.flowParseDeclare(this.startNode());
                node.default = false;
                return this.finishNode(node, "DeclareExportDeclaration");
            }
            else if (this.match(tt.star) || // declare export * from ''
                this.match(tt.braceL) || // declare export {} ...
                this.isContextual(tt._interface) || // declare export interface ...
                this.isContextual(tt._type) || // declare export type ...
                this.isContextual(tt._opaque) // declare export opaque type ...
            ) {
                node = this.parseExport(node, 
                /* decorators */ null);
                if (node.type === "ExportNamedDeclaration") {
                    node.type = "ExportDeclaration";
                    node.default = false;
                    delete node.exportKind;
                }
                node.type = "Declare" + node.type;
                return node;
            }
        }
        this.unexpected();
    }
    flowParseDeclareModuleExports(node) {
        this.next();
        this.expectContextual(tt._exports);
        node.typeAnnotation = this.flowParseTypeAnnotation();
        this.semicolon();
        return this.finishNode(node, "DeclareModuleExports");
    }
    flowParseDeclareTypeAlias(node) {
        this.next();
        const finished = this.flowParseTypeAlias(node);
        // Don't do finishNode as we don't want to process comments twice
        finished.type = "DeclareTypeAlias";
        return finished;
    }
    flowParseDeclareOpaqueType(node) {
        this.next();
        const finished = this.flowParseOpaqueType(node, true);
        // Don't do finishNode as we don't want to process comments twice
        finished.type = "DeclareOpaqueType";
        return finished;
    }
    flowParseDeclareInterface(node) {
        this.next();
        this.flowParseInterfaceish(node, /* isClass */ false);
        return this.finishNode(node, "DeclareInterface");
    }
    // Interfaces
    flowParseInterfaceish(node, isClass) {
        node.id = this.flowParseRestrictedIdentifier(
        /* liberal */ !isClass, 
        /* declaration */ true);
        this.scope.declareName(node.id.name, isClass ? BindingFlag.TYPE_FUNCTION : BindingFlag.TYPE_LEXICAL, node.id.loc.start);
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        else {
            node.typeParameters = null;
        }
        node.extends = [];
        if (this.eat(tt._extends)) {
            do {
                node.extends.push(this.flowParseInterfaceExtends());
            } while (!isClass && this.eat(tt.comma));
        }
        if (isClass) {
            node.implements = [];
            node.mixins = [];
            if (this.eatContextual(tt._mixins)) {
                do {
                    node.mixins.push(this.flowParseInterfaceExtends());
                } while (this.eat(tt.comma));
            }
            if (this.eatContextual(tt._implements)) {
                do {
                    node.implements.push(this.flowParseInterfaceExtends());
                } while (this.eat(tt.comma));
            }
        }
        node.body = this.flowParseObjectType({
            allowStatic: isClass,
            allowExact: false,
            allowSpread: false,
            allowProto: isClass,
            allowInexact: false,
        });
    }
    flowParseInterfaceExtends() {
        const node = this.startNode();
        node.id = this.flowParseQualifiedTypeIdentifier();
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterInstantiation();
        }
        else {
            node.typeParameters = null;
        }
        return this.finishNode(node, "InterfaceExtends");
    }
    flowParseInterface(node) {
        this.flowParseInterfaceish(node, /* isClass */ false);
        return this.finishNode(node, "InterfaceDeclaration");
    }
    checkNotUnderscore(word) {
        if (word === "_") {
            this.raise(FlowErrors.UnexpectedReservedUnderscore, this.state.startLoc);
        }
    }
    checkReservedType(word, startLoc, declaration) {
        if (!reservedTypes.has(word))
            return;
        this.raise(declaration
            ? FlowErrors.AssignReservedType
            : FlowErrors.UnexpectedReservedType, startLoc, {
            reservedType: word,
        });
    }
    flowParseRestrictedIdentifier(liberal, declaration) {
        this.checkReservedType(this.state.value, this.state.startLoc, declaration);
        return this.parseIdentifier(liberal);
    }
    // Type aliases
    flowParseTypeAlias(node) {
        node.id = this.flowParseRestrictedIdentifier(
        /* liberal */ false, 
        /* declaration */ true);
        this.scope.declareName(node.id.name, BindingFlag.TYPE_LEXICAL, node.id.loc.start);
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        else {
            node.typeParameters = null;
        }
        node.right = this.flowParseTypeInitialiser(tt.eq);
        this.semicolon();
        return this.finishNode(node, "TypeAlias");
    }
    flowParseOpaqueType(node, declare) {
        this.expectContextual(tt._type);
        node.id = this.flowParseRestrictedIdentifier(
        /* liberal */ true, 
        /* declaration */ true);
        this.scope.declareName(node.id.name, BindingFlag.TYPE_LEXICAL, node.id.loc.start);
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        else {
            node.typeParameters = null;
        }
        // Parse the supertype
        node.supertype = null;
        if (this.match(tt.colon)) {
            node.supertype = this.flowParseTypeInitialiser(tt.colon);
        }
        node.impltype = null;
        if (!declare) {
            node.impltype = this.flowParseTypeInitialiser(tt.eq);
        }
        this.semicolon();
        return this.finishNode(node, "OpaqueType");
    }
    // Type annotations
    flowParseTypeParameter(requireDefault = false) {
        const nodeStartLoc = this.state.startLoc;
        const node = this.startNode();
        const variance = this.flowParseVariance();
        const ident = this.flowParseTypeAnnotatableIdentifier();
        node.name = ident.name;
        // @ts-expect-error migrate to Babel types
        node.variance = variance;
        // @ts-expect-error migrate to Babel types
        node.bound = ident.typeAnnotation;
        if (this.match(tt.eq)) {
            this.eat(tt.eq);
            // @ts-expect-error migrate to Babel types
            node.default = this.flowParseType();
        }
        else {
            if (requireDefault) {
                this.raise(FlowErrors.MissingTypeParamDefault, nodeStartLoc);
            }
        }
        return this.finishNode(node, "TypeParameter");
    }
    flowParseTypeParameterDeclaration() {
        const oldInType = this.state.inType;
        const node = this.startNode();
        node.params = [];
        this.state.inType = true;
        // istanbul ignore else: this condition is already checked at all call sites
        if (this.match(tt.lt) || this.match(tt.jsxTagStart)) {
            this.next();
        }
        else {
            this.unexpected();
        }
        let defaultRequired = false;
        do {
            const typeParameter = this.flowParseTypeParameter(defaultRequired);
            node.params.push(typeParameter);
            if (typeParameter.default) {
                defaultRequired = true;
            }
            if (!this.match(tt.gt)) {
                this.expect(tt.comma);
            }
        } while (!this.match(tt.gt));
        this.expect(tt.gt);
        this.state.inType = oldInType;
        return this.finishNode(node, "TypeParameterDeclaration");
    }
    flowParseTypeParameterInstantiation() {
        const node = this.startNode();
        const oldInType = this.state.inType;
        node.params = [];
        this.state.inType = true;
        this.expect(tt.lt);
        const oldNoAnonFunctionType = this.state.noAnonFunctionType;
        this.state.noAnonFunctionType = false;
        while (!this.match(tt.gt)) {
            node.params.push(this.flowParseType());
            if (!this.match(tt.gt)) {
                this.expect(tt.comma);
            }
        }
        this.state.noAnonFunctionType = oldNoAnonFunctionType;
        this.expect(tt.gt);
        this.state.inType = oldInType;
        return this.finishNode(node, "TypeParameterInstantiation");
    }
    flowParseTypeParameterInstantiationCallOrNew() {
        const node = this.startNode();
        const oldInType = this.state.inType;
        node.params = [];
        this.state.inType = true;
        this.expect(tt.lt);
        while (!this.match(tt.gt)) {
            node.params.push(this.flowParseTypeOrImplicitInstantiation());
            if (!this.match(tt.gt)) {
                this.expect(tt.comma);
            }
        }
        this.expect(tt.gt);
        this.state.inType = oldInType;
        return this.finishNode(node, "TypeParameterInstantiation");
    }
    flowParseInterfaceType() {
        const node = this.startNode();
        this.expectContextual(tt._interface);
        node.extends = [];
        if (this.eat(tt._extends)) {
            do {
                node.extends.push(this.flowParseInterfaceExtends());
            } while (this.eat(tt.comma));
        }
        node.body = this.flowParseObjectType({
            allowStatic: false,
            allowExact: false,
            allowSpread: false,
            allowProto: false,
            allowInexact: false,
        });
        return this.finishNode(node, "InterfaceTypeAnnotation");
    }
    flowParseObjectPropertyKey() {
        return this.match(tt.num) || this.match(tt.string)
            ? super.parseExprAtom()
            : this.parseIdentifier(true);
    }
    flowParseObjectTypeIndexer(node, isStatic, variance) {
        node.static = isStatic;
        // Note: bracketL has already been consumed
        if (this.lookahead().type === tt.colon) {
            node.id = this.flowParseObjectPropertyKey();
            node.key = this.flowParseTypeInitialiser();
        }
        else {
            node.id = null;
            node.key = this.flowParseType();
        }
        this.expect(tt.bracketR);
        node.value = this.flowParseTypeInitialiser();
        node.variance = variance;
        return this.finishNode(node, "ObjectTypeIndexer");
    }
    flowParseObjectTypeInternalSlot(node, isStatic) {
        node.static = isStatic;
        // Note: both bracketL have already been consumed
        node.id = this.flowParseObjectPropertyKey();
        this.expect(tt.bracketR);
        this.expect(tt.bracketR);
        if (this.match(tt.lt) || this.match(tt.parenL)) {
            node.method = true;
            node.optional = false;
            node.value = this.flowParseObjectTypeMethodish(this.startNodeAt(node.loc.start));
        }
        else {
            node.method = false;
            if (this.eat(tt.question)) {
                node.optional = true;
            }
            node.value = this.flowParseTypeInitialiser();
        }
        return this.finishNode(node, "ObjectTypeInternalSlot");
    }
    flowParseObjectTypeMethodish(node) {
        node.params = [];
        node.rest = null;
        node.typeParameters = null;
        node.this = null;
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        this.expect(tt.parenL);
        if (this.match(tt._this)) {
            node.this = this.flowParseFunctionTypeParam(/* first */ true);
            // match Flow parser behavior
            node.this.name = null;
            if (!this.match(tt.parenR)) {
                this.expect(tt.comma);
            }
        }
        while (!this.match(tt.parenR) && !this.match(tt.ellipsis)) {
            node.params.push(this.flowParseFunctionTypeParam(false));
            if (!this.match(tt.parenR)) {
                this.expect(tt.comma);
            }
        }
        if (this.eat(tt.ellipsis)) {
            node.rest = this.flowParseFunctionTypeParam(false);
        }
        this.expect(tt.parenR);
        node.returnType = this.flowParseTypeInitialiser();
        return this.finishNode(node, "FunctionTypeAnnotation");
    }
    flowParseObjectTypeCallProperty(node, isStatic) {
        const valueNode = this.startNode();
        node.static = isStatic;
        node.value = this.flowParseObjectTypeMethodish(valueNode);
        return this.finishNode(node, "ObjectTypeCallProperty");
    }
    flowParseObjectType({ allowStatic, allowExact, allowSpread, allowProto, allowInexact, }) {
        const oldInType = this.state.inType;
        this.state.inType = true;
        const nodeStart = this.startNode();
        nodeStart.callProperties = [];
        nodeStart.properties = [];
        nodeStart.indexers = [];
        nodeStart.internalSlots = [];
        let endDelim;
        let exact;
        let inexact = false;
        if (allowExact && this.match(tt.braceBarL)) {
            this.expect(tt.braceBarL);
            endDelim = tt.braceBarR;
            exact = true;
        }
        else {
            this.expect(tt.braceL);
            endDelim = tt.braceR;
            exact = false;
        }
        nodeStart.exact = exact;
        while (!this.match(endDelim)) {
            let isStatic = false;
            let protoStartLoc = null;
            let inexactStartLoc = null;
            const node = this.startNode();
            if (allowProto && this.isContextual(tt._proto)) {
                const lookahead = this.lookahead();
                if (lookahead.type !== tt.colon && lookahead.type !== tt.question) {
                    this.next();
                    protoStartLoc = this.state.startLoc;
                    allowStatic = false;
                }
            }
            if (allowStatic && this.isContextual(tt._static)) {
                const lookahead = this.lookahead();
                // static is a valid identifier name
                if (lookahead.type !== tt.colon && lookahead.type !== tt.question) {
                    this.next();
                    isStatic = true;
                }
            }
            const variance = this.flowParseVariance();
            if (this.eat(tt.bracketL)) {
                if (protoStartLoc != null) {
                    this.unexpected(protoStartLoc);
                }
                if (this.eat(tt.bracketL)) {
                    if (variance) {
                        this.unexpected(variance.loc.start);
                    }
                    nodeStart.internalSlots.push(this.flowParseObjectTypeInternalSlot(node, isStatic));
                }
                else {
                    nodeStart.indexers.push(this.flowParseObjectTypeIndexer(node, isStatic, variance));
                }
            }
            else if (this.match(tt.parenL) || this.match(tt.lt)) {
                if (protoStartLoc != null) {
                    this.unexpected(protoStartLoc);
                }
                if (variance) {
                    this.unexpected(variance.loc.start);
                }
                nodeStart.callProperties.push(this.flowParseObjectTypeCallProperty(node, isStatic));
            }
            else {
                let kind = "init";
                if (this.isContextual(tt._get) || this.isContextual(tt._set)) {
                    const lookahead = this.lookahead();
                    if (tokenIsLiteralPropertyName(lookahead.type)) {
                        kind = this.state.value;
                        this.next();
                    }
                }
                const propOrInexact = this.flowParseObjectTypeProperty(node, isStatic, protoStartLoc, variance, kind, allowSpread, allowInexact ?? !exact);
                if (propOrInexact === null) {
                    inexact = true;
                    inexactStartLoc = this.state.lastTokStartLoc;
                }
                else {
                    nodeStart.properties.push(propOrInexact);
                }
            }
            this.flowObjectTypeSemicolon();
            if (inexactStartLoc &&
                !this.match(tt.braceR) &&
                !this.match(tt.braceBarR)) {
                this.raise(FlowErrors.UnexpectedExplicitInexactInObject, inexactStartLoc);
            }
        }
        this.expect(endDelim);
        /* The inexact flag should only be added on ObjectTypeAnnotations that
         * are not the body of an interface, declare interface, or declare class.
         * Since spreads are only allowed in object types, checking that is
         * sufficient here.
         */
        if (allowSpread) {
            nodeStart.inexact = inexact;
        }
        const out = this.finishNode(nodeStart, "ObjectTypeAnnotation");
        this.state.inType = oldInType;
        return out;
    }
    flowParseObjectTypeProperty(node, isStatic, protoStartLoc, variance, kind, allowSpread, allowInexact) {
        if (this.eat(tt.ellipsis)) {
            const isInexactToken = this.match(tt.comma) ||
                this.match(tt.semi) ||
                this.match(tt.braceR) ||
                this.match(tt.braceBarR);
            if (isInexactToken) {
                if (!allowSpread) {
                    this.raise(FlowErrors.InexactInsideNonObject, this.state.lastTokStartLoc);
                }
                else if (!allowInexact) {
                    this.raise(FlowErrors.InexactInsideExact, this.state.lastTokStartLoc);
                }
                if (variance) {
                    this.raise(FlowErrors.InexactVariance, variance);
                }
                return null;
            }
            if (!allowSpread) {
                this.raise(FlowErrors.UnexpectedSpreadType, this.state.lastTokStartLoc);
            }
            if (protoStartLoc != null) {
                this.unexpected(protoStartLoc);
            }
            if (variance) {
                this.raise(FlowErrors.SpreadVariance, variance);
            }
            node.argument = this.flowParseType();
            return this.finishNode(node, "ObjectTypeSpreadProperty");
        }
        else {
            node.key = this.flowParseObjectPropertyKey();
            node.static = isStatic;
            node.proto = protoStartLoc != null;
            node.kind = kind;
            let optional = false;
            if (this.match(tt.lt) || this.match(tt.parenL)) {
                // This is a method property
                node.method = true;
                if (protoStartLoc != null) {
                    this.unexpected(protoStartLoc);
                }
                if (variance) {
                    this.unexpected(variance.loc.start);
                }
                node.value = this.flowParseObjectTypeMethodish(this.startNodeAt(node.loc.start));
                if (kind === "get" || kind === "set") {
                    this.flowCheckGetterSetterParams(node);
                }
                /** Declared classes/interfaces do not allow spread */
                if (!allowSpread &&
                    node.key.name === "constructor" &&
                    node.value.this) {
                    this.raise(FlowErrors.ThisParamBannedInConstructor, node.value.this);
                }
            }
            else {
                if (kind !== "init")
                    this.unexpected();
                node.method = false;
                if (this.eat(tt.question)) {
                    optional = true;
                }
                node.value = this.flowParseTypeInitialiser();
                node.variance = variance;
            }
            node.optional = optional;
            return this.finishNode(node, "ObjectTypeProperty");
        }
    }
    // This is similar to checkGetterSetterParams, but as
    // @babel/parser uses non estree properties we cannot reuse it here
    flowCheckGetterSetterParams(property) {
        const paramCount = property.kind === "get" ? 0 : 1;
        const length = property.value.params.length + (property.value.rest ? 1 : 0);
        if (property.value.this) {
            this.raise(property.kind === "get"
                ? FlowErrors.GetterMayNotHaveThisParam
                : FlowErrors.SetterMayNotHaveThisParam, property.value.this);
        }
        if (length !== paramCount) {
            this.raise(property.kind === "get"
                ? Errors.BadGetterArity
                : Errors.BadSetterArity, property);
        }
        if (property.kind === "set" && property.value.rest) {
            this.raise(Errors.BadSetterRestParameter, property);
        }
    }
    flowObjectTypeSemicolon() {
        if (!this.eat(tt.semi) &&
            !this.eat(tt.comma) &&
            !this.match(tt.braceR) &&
            !this.match(tt.braceBarR)) {
            this.unexpected();
        }
    }
    flowParseQualifiedTypeIdentifier(startLoc, id) {
        startLoc ??= this.state.startLoc;
        let node = id || this.flowParseRestrictedIdentifier(true);
        while (this.eat(tt.dot)) {
            const node2 = this.startNodeAt(startLoc);
            node2.qualification = node;
            node2.id = this.flowParseRestrictedIdentifier(true);
            node = this.finishNode(node2, "QualifiedTypeIdentifier");
        }
        return node;
    }
    flowParseGenericType(startLoc, id) {
        const node = this.startNodeAt(startLoc);
        node.typeParameters = null;
        node.id = this.flowParseQualifiedTypeIdentifier(startLoc, id);
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterInstantiation();
        }
        return this.finishNode(node, "GenericTypeAnnotation");
    }
    flowParseTypeofType() {
        const node = this.startNode();
        this.expect(tt._typeof);
        node.argument = this.flowParsePrimaryType();
        return this.finishNode(node, "TypeofTypeAnnotation");
    }
    flowParseTupleType() {
        const node = this.startNode();
        node.types = [];
        this.expect(tt.bracketL);
        // We allow trailing commas
        while (this.state.pos < this.length && !this.match(tt.bracketR)) {
            node.types.push(this.flowParseType());
            if (this.match(tt.bracketR))
                break;
            this.expect(tt.comma);
        }
        this.expect(tt.bracketR);
        return this.finishNode(node, "TupleTypeAnnotation");
    }
    flowParseFunctionTypeParam(first) {
        let name = null;
        let optional = false;
        let typeAnnotation = null;
        const node = this.startNode();
        const lh = this.lookahead();
        const isThis = this.state.type === tt._this;
        if (lh.type === tt.colon || lh.type === tt.question) {
            if (isThis && !first) {
                this.raise(FlowErrors.ThisParamMustBeFirst, node);
            }
            name = this.parseIdentifier(isThis);
            if (this.eat(tt.question)) {
                optional = true;
                if (isThis) {
                    this.raise(FlowErrors.ThisParamMayNotBeOptional, node);
                }
            }
            typeAnnotation = this.flowParseTypeInitialiser();
        }
        else {
            typeAnnotation = this.flowParseType();
        }
        node.name = name;
        node.optional = optional;
        node.typeAnnotation = typeAnnotation;
        return this.finishNode(node, "FunctionTypeParam");
    }
    reinterpretTypeAsFunctionTypeParam(type) {
        const node = this.startNodeAt(type.loc.start);
        node.name = null;
        node.optional = false;
        node.typeAnnotation = type;
        return this.finishNode(node, "FunctionTypeParam");
    }
    flowParseFunctionTypeParams(params = []) {
        let rest = null;
        let _this = null;
        if (this.match(tt._this)) {
            _this = this.flowParseFunctionTypeParam(/* first */ true);
            // match Flow parser behavior
            _this.name = null;
            if (!this.match(tt.parenR)) {
                this.expect(tt.comma);
            }
        }
        while (!this.match(tt.parenR) && !this.match(tt.ellipsis)) {
            params.push(this.flowParseFunctionTypeParam(false));
            if (!this.match(tt.parenR)) {
                this.expect(tt.comma);
            }
        }
        if (this.eat(tt.ellipsis)) {
            rest = this.flowParseFunctionTypeParam(false);
        }
        return { params, rest, _this };
    }
    flowIdentToTypeAnnotation(startLoc, node, id) {
        switch (id.name) {
            case "any":
                return this.finishNode(node, "AnyTypeAnnotation");
            case "bool":
            case "boolean":
                return this.finishNode(node, "BooleanTypeAnnotation");
            case "mixed":
                return this.finishNode(node, "MixedTypeAnnotation");
            case "empty":
                return this.finishNode(node, "EmptyTypeAnnotation");
            case "number":
                return this.finishNode(node, "NumberTypeAnnotation");
            case "string":
                return this.finishNode(node, "StringTypeAnnotation");
            case "symbol":
                return this.finishNode(node, "SymbolTypeAnnotation");
            default:
                this.checkNotUnderscore(id.name);
                return this.flowParseGenericType(startLoc, id);
        }
    }
    // The parsing of types roughly parallels the parsing of expressions, and
    // primary types are kind of like primary expressions...they're the
    // primitives with which other types are constructed.
    flowParsePrimaryType() {
        const startLoc = this.state.startLoc;
        const node = this.startNode();
        let tmp;
        let type;
        let isGroupedType = false;
        const oldNoAnonFunctionType = this.state.noAnonFunctionType;
        switch (this.state.type) {
            case tt.braceL:
                return this.flowParseObjectType({
                    allowStatic: false,
                    allowExact: false,
                    allowSpread: true,
                    allowProto: false,
                    allowInexact: true,
                });
            case tt.braceBarL:
                return this.flowParseObjectType({
                    allowStatic: false,
                    allowExact: true,
                    allowSpread: true,
                    allowProto: false,
                    allowInexact: false,
                });
            case tt.bracketL:
                this.state.noAnonFunctionType = false;
                type = this.flowParseTupleType();
                this.state.noAnonFunctionType = oldNoAnonFunctionType;
                return type;
            case tt.lt:
                node.typeParameters = this.flowParseTypeParameterDeclaration();
                this.expect(tt.parenL);
                tmp = this.flowParseFunctionTypeParams();
                node.params = tmp.params;
                node.rest = tmp.rest;
                node.this = tmp._this;
                this.expect(tt.parenR);
                this.expect(tt.arrow);
                node.returnType = this.flowParseType();
                return this.finishNode(node, "FunctionTypeAnnotation");
            case tt.parenL:
                this.next();
                // Check to see if this is actually a grouped type
                if (!this.match(tt.parenR) && !this.match(tt.ellipsis)) {
                    if (tokenIsIdentifier(this.state.type) || this.match(tt._this)) {
                        const token = this.lookahead().type;
                        isGroupedType = token !== tt.question && token !== tt.colon;
                    }
                    else {
                        isGroupedType = true;
                    }
                }
                if (isGroupedType) {
                    this.state.noAnonFunctionType = false;
                    type = this.flowParseType();
                    this.state.noAnonFunctionType = oldNoAnonFunctionType;
                    // A `,` or a `) =>` means this is an anonymous function type
                    if (this.state.noAnonFunctionType ||
                        !(this.match(tt.comma) ||
                            (this.match(tt.parenR) && this.lookahead().type === tt.arrow))) {
                        this.expect(tt.parenR);
                        return type;
                    }
                    else {
                        // Eat a comma if there is one
                        this.eat(tt.comma);
                    }
                }
                if (type) {
                    tmp = this.flowParseFunctionTypeParams([
                        this.reinterpretTypeAsFunctionTypeParam(type),
                    ]);
                }
                else {
                    tmp = this.flowParseFunctionTypeParams();
                }
                node.params = tmp.params;
                node.rest = tmp.rest;
                node.this = tmp._this;
                this.expect(tt.parenR);
                this.expect(tt.arrow);
                node.returnType = this.flowParseType();
                node.typeParameters = null;
                return this.finishNode(node, "FunctionTypeAnnotation");
            case tt.string:
                return this.parseLiteral(this.state.value, "StringLiteralTypeAnnotation");
            case tt._true:
            case tt._false:
                node.value = this.match(tt._true);
                this.next();
                return this.finishNode(node, "BooleanLiteralTypeAnnotation");
            case tt.plusMin:
                if (this.state.value === "-") {
                    this.next();
                    if (this.match(tt.num)) {
                        return this.parseLiteralAtNode(-this.state.value, "NumberLiteralTypeAnnotation", node);
                    }
                    if (this.match(tt.bigint)) {
                        return this.parseLiteralAtNode(-this.state.value, "BigIntLiteralTypeAnnotation", node);
                    }
                    throw this.raise(FlowErrors.UnexpectedSubtractionOperand, this.state.startLoc);
                }
                this.unexpected();
                return;
            case tt.num:
                return this.parseLiteral(this.state.value, "NumberLiteralTypeAnnotation");
            case tt.bigint:
                return this.parseLiteral(this.state.value, "BigIntLiteralTypeAnnotation");
            case tt._void:
                this.next();
                return this.finishNode(node, "VoidTypeAnnotation");
            case tt._null:
                this.next();
                return this.finishNode(node, "NullLiteralTypeAnnotation");
            case tt._this:
                this.next();
                return this.finishNode(node, "ThisTypeAnnotation");
            case tt.star:
                this.next();
                return this.finishNode(node, "ExistsTypeAnnotation");
            case tt._typeof:
                return this.flowParseTypeofType();
            default:
                if (tokenIsKeyword(this.state.type)) {
                    const label = tokenLabelName(this.state.type);
                    this.next();
                    return super.createIdentifier(node, label);
                }
                else if (tokenIsIdentifier(this.state.type)) {
                    if (this.isContextual(tt._interface)) {
                        return this.flowParseInterfaceType();
                    }
                    return this.flowIdentToTypeAnnotation(startLoc, node, this.parseIdentifier());
                }
        }
        this.unexpected();
    }
    flowParsePostfixType() {
        const startLoc = this.state.startLoc;
        let type = this.flowParsePrimaryType();
        let seenOptionalIndexedAccess = false;
        while ((this.match(tt.bracketL) || this.match(tt.questionDot)) &&
            !this.canInsertSemicolon()) {
            const node = this.startNodeAt(startLoc);
            const optional = this.eat(tt.questionDot);
            seenOptionalIndexedAccess = seenOptionalIndexedAccess || optional;
            this.expect(tt.bracketL);
            if (!optional && this.match(tt.bracketR)) {
                node.elementType = type;
                this.next(); // eat `]`
                type = this.finishNode(node, "ArrayTypeAnnotation");
            }
            else {
                node.objectType = type;
                node.indexType = this.flowParseType();
                this.expect(tt.bracketR);
                if (seenOptionalIndexedAccess) {
                    node.optional = optional;
                    type = this.finishNode(
                    // @ts-expect-error todo(flow->ts)
                    node, "OptionalIndexedAccessType");
                }
                else {
                    type = this.finishNode(
                    // @ts-expect-error todo(flow->ts)
                    node, "IndexedAccessType");
                }
            }
        }
        return type;
    }
    flowParsePrefixType() {
        const node = this.startNode();
        if (this.eat(tt.question)) {
            node.typeAnnotation = this.flowParsePrefixType();
            return this.finishNode(node, "NullableTypeAnnotation");
        }
        else {
            return this.flowParsePostfixType();
        }
    }
    flowParseAnonFunctionWithoutParens() {
        const param = this.flowParsePrefixType();
        if (!this.state.noAnonFunctionType && this.eat(tt.arrow)) {
            // TODO: This should be a type error. Passing in a SourceLocation, and it expects a Position.
            const node = this.startNodeAt(param.loc.start);
            node.params = [this.reinterpretTypeAsFunctionTypeParam(param)];
            node.rest = null;
            node.this = null;
            node.returnType = this.flowParseType();
            node.typeParameters = null;
            return this.finishNode(node, "FunctionTypeAnnotation");
        }
        return param;
    }
    flowParseIntersectionType() {
        const node = this.startNode();
        this.eat(tt.bitwiseAND);
        const type = this.flowParseAnonFunctionWithoutParens();
        node.types = [type];
        while (this.eat(tt.bitwiseAND)) {
            node.types.push(this.flowParseAnonFunctionWithoutParens());
        }
        return node.types.length === 1
            ? type
            : this.finishNode(node, "IntersectionTypeAnnotation");
    }
    flowParseUnionType() {
        const node = this.startNode();
        this.eat(tt.bitwiseOR);
        const type = this.flowParseIntersectionType();
        node.types = [type];
        while (this.eat(tt.bitwiseOR)) {
            node.types.push(this.flowParseIntersectionType());
        }
        return node.types.length === 1
            ? type
            : this.finishNode(node, "UnionTypeAnnotation");
    }
    flowParseType() {
        const oldInType = this.state.inType;
        this.state.inType = true;
        const type = this.flowParseUnionType();
        this.state.inType = oldInType;
        return type;
    }
    flowParseTypeOrImplicitInstantiation() {
        if (this.state.type === tt.name && this.state.value === "_") {
            const startLoc = this.state.startLoc;
            const node = this.parseIdentifier();
            return this.flowParseGenericType(startLoc, node);
        }
        else {
            return this.flowParseType();
        }
    }
    flowParseTypeAnnotation() {
        const node = this.startNode();
        node.typeAnnotation = this.flowParseTypeInitialiser();
        return this.finishNode(node, "TypeAnnotation");
    }
    flowParseTypeAnnotatableIdentifier(allowPrimitiveOverride) {
        const ident = allowPrimitiveOverride
            ? this.parseIdentifier()
            : this.flowParseRestrictedIdentifier();
        if (this.match(tt.colon)) {
            // @ts-expect-error: refine typings
            ident.typeAnnotation = this.flowParseTypeAnnotation();
            this.resetEndLocation(ident);
        }
        return ident;
    }
    typeCastToParameter(node) {
        node.expression.typeAnnotation = node.typeAnnotation;
        this.resetEndLocation(node.expression, node.typeAnnotation.loc.end);
        return node.expression;
    }
    flowParseVariance() {
        let variance = null;
        if (this.match(tt.plusMin)) {
            variance = this.startNode();
            if (this.state.value === "+") {
                variance.kind = "plus";
            }
            else {
                variance.kind = "minus";
            }
            this.next();
            return this.finishNode(variance, "Variance");
        }
        return variance;
    }
    // ==================================
    // Overrides
    // ==================================
    parseFunctionBody(node, allowExpressionBody, isMethod = false) {
        if (allowExpressionBody) {
            this.forwardNoArrowParamsConversionAt(node, () => super.parseFunctionBody(node, true, isMethod));
            return;
        }
        super.parseFunctionBody(node, false, isMethod);
    }
    parseFunctionBodyAndFinish(node, type, isMethod = false) {
        if (this.match(tt.colon)) {
            const typeNode = this.startNode();
            [
                typeNode.typeAnnotation,
                // @ts-expect-error predicate may not exist
                node.predicate,
            ] = this.flowParseTypeAndPredicateInitialiser();
            node.returnType = typeNode.typeAnnotation
                ? this.finishNode(typeNode, "TypeAnnotation")
                : null;
        }
        return super.parseFunctionBodyAndFinish(node, type, isMethod);
    }
    // interfaces and enums
    parseStatementLike(flags) {
        // strict mode handling of `interface` since it's a reserved word
        if (this.state.strict && this.isContextual(tt._interface)) {
            const lookahead = this.lookahead();
            if (tokenIsKeywordOrIdentifier(lookahead.type)) {
                const node = this.startNode();
                this.next();
                return this.flowParseInterface(node);
            }
        }
        else if (this.shouldParseEnums() && this.isContextual(tt._enum)) {
            const node = this.startNode();
            this.next();
            return this.flowParseEnumDeclaration(node);
        }
        const stmt = super.parseStatementLike(flags);
        // We will parse a flow pragma in any comment before the first statement.
        if (this.flowPragma === undefined && !this.isValidDirective(stmt)) {
            this.flowPragma = null;
        }
        return stmt;
    }
    // declares, interfaces and type aliases
    parseExpressionStatement(node, expr, decorators) {
        if (expr.type === "Identifier") {
            if (expr.name === "declare") {
                if (this.match(tt._class) ||
                    tokenIsIdentifier(this.state.type) ||
                    this.match(tt._function) ||
                    this.match(tt._var) ||
                    this.match(tt._export)) {
                    // @ts-expect-error: refine typings
                    return this.flowParseDeclare(node);
                }
            }
            else if (tokenIsIdentifier(this.state.type)) {
                if (expr.name === "interface") {
                    // @ts-expect-error: refine typings
                    return this.flowParseInterface(node);
                }
                else if (expr.name === "type") {
                    // @ts-expect-error: refine typings
                    return this.flowParseTypeAlias(node);
                }
                else if (expr.name === "opaque") {
                    // @ts-expect-error: refine typings
                    return this.flowParseOpaqueType(node, false);
                }
            }
        }
        return super.parseExpressionStatement(node, expr, decorators);
    }
    // export type
    shouldParseExportDeclaration() {
        const { type } = this.state;
        if (tokenIsFlowInterfaceOrTypeOrOpaque(type) ||
            (this.shouldParseEnums() && type === tt._enum)) {
            return !this.state.containsEsc;
        }
        return super.shouldParseExportDeclaration();
    }
    isExportDefaultSpecifier() {
        const { type } = this.state;
        if (tokenIsFlowInterfaceOrTypeOrOpaque(type) ||
            (this.shouldParseEnums() && type === tt._enum)) {
            return this.state.containsEsc;
        }
        return super.isExportDefaultSpecifier();
    }
    parseExportDefaultExpression() {
        if (this.shouldParseEnums() && this.isContextual(tt._enum)) {
            const node = this.startNode();
            this.next();
            return this.flowParseEnumDeclaration(node);
        }
        return super.parseExportDefaultExpression();
    }
    parseConditional(expr, startLoc, refExpressionErrors) {
        if (!this.match(tt.question))
            return expr;
        if (this.state.maybeInArrowParameters) {
            const nextCh = this.lookaheadCharCode();
            // These tokens cannot start an expression, so if one of them follows
            // ? then we are probably in an arrow function parameters list and we
            // don't parse the conditional expression.
            if (nextCh === charCodes.comma || // (a?, b) => c
                nextCh === charCodes.equalsTo || // (a? = b) => c
                nextCh === charCodes.colon || // (a?: b) => c
                nextCh === charCodes.rightParenthesis // (a?) => c
            ) {
                /*:: invariant(refExpressionErrors != null) */
                this.setOptionalParametersError(refExpressionErrors);
                return expr;
            }
        }
        this.expect(tt.question);
        const state = this.state.clone();
        const originalNoArrowAt = this.state.noArrowAt;
        const node = this.startNodeAt(startLoc);
        let { consequent, failed } = this.tryParseConditionalConsequent();
        let [valid, invalid] = this.getArrowLikeExpressions(consequent);
        if (failed || invalid.length > 0) {
            const noArrowAt = [...originalNoArrowAt];
            if (invalid.length > 0) {
                this.state = state;
                this.state.noArrowAt = noArrowAt;
                for (let i = 0; i < invalid.length; i++) {
                    noArrowAt.push(invalid[i].start);
                }
                ({ consequent, failed } = this.tryParseConditionalConsequent());
                [valid, invalid] = this.getArrowLikeExpressions(consequent);
            }
            if (failed && valid.length > 1) {
                // if there are two or more possible correct ways of parsing, throw an
                // error.
                // e.g.   Source: a ? (b): c => (d): e => f
                //      Result 1: a ? b : (c => ((d): e => f))
                //      Result 2: a ? ((b): c => d) : (e => f)
                this.raise(FlowErrors.AmbiguousConditionalArrow, state.startLoc);
            }
            if (failed && valid.length === 1) {
                this.state = state;
                noArrowAt.push(valid[0].start);
                this.state.noArrowAt = noArrowAt;
                ({ consequent, failed } = this.tryParseConditionalConsequent());
            }
        }
        this.getArrowLikeExpressions(consequent, true);
        this.state.noArrowAt = originalNoArrowAt;
        this.expect(tt.colon);
        node.test = expr;
        node.consequent = consequent;
        node.alternate = this.forwardNoArrowParamsConversionAt(node, () => this.parseMaybeAssign(undefined, undefined));
        return this.finishNode(node, "ConditionalExpression");
    }
    tryParseConditionalConsequent() {
        this.state.noArrowParamsConversionAt.push(this.state.start);
        const consequent = this.parseMaybeAssignAllowIn();
        const failed = !this.match(tt.colon);
        this.state.noArrowParamsConversionAt.pop();
        return { consequent, failed };
    }
    // Given an expression, walks through out its arrow functions whose body is
    // an expression and through out conditional expressions. It returns every
    // function which has been parsed with a return type but could have been
    // parenthesized expressions.
    // These functions are separated into two arrays: one containing the ones
    // whose parameters can be converted to assignable lists, one containing the
    // others.
    getArrowLikeExpressions(node, disallowInvalid) {
        const stack = [node];
        const arrows = [];
        while (stack.length !== 0) {
            const node = stack.pop();
            if (node.type === "ArrowFunctionExpression") {
                if (node.typeParameters || !node.returnType) {
                    // This is an arrow expression without ambiguity, so check its parameters
                    // @ts-expect-error: refine typings
                    this.finishArrowValidation(node);
                }
                else {
                    // @ts-expect-error: refine typings
                    arrows.push(node);
                }
                stack.push(node.body);
            }
            else if (node.type === "ConditionalExpression") {
                stack.push(node.consequent);
                stack.push(node.alternate);
            }
        }
        if (disallowInvalid) {
            arrows.forEach(node => this.finishArrowValidation(node));
            return [arrows, []];
        }
        return partition(arrows, node => node.params.every(param => this.isAssignable(param, true)));
    }
    finishArrowValidation(node) {
        this.toAssignableList(
        // node.params is Expression[] instead of $ReadOnlyArray<Pattern> because it
        // has not been converted yet.
        node.params, node.extra?.trailingCommaLoc, 
        /* isLHS */ false);
        // Enter scope, as checkParams defines bindings
        this.scope.enter(ScopeFlag.FUNCTION | ScopeFlag.ARROW);
        // Use super's method to force the parameters to be checked
        super.checkParams(node, false, true);
        this.scope.exit();
    }
    forwardNoArrowParamsConversionAt(node, parse) {
        let result;
        if (this.state.noArrowParamsConversionAt.indexOf(node.start) !== -1) {
            this.state.noArrowParamsConversionAt.push(this.state.start);
            result = parse();
            this.state.noArrowParamsConversionAt.pop();
        }
        else {
            result = parse();
        }
        return result;
    }
    parseParenItem(node, startLoc) {
        node = super.parseParenItem(node, startLoc);
        if (this.eat(tt.question)) {
            node.optional = true;
            // Include questionmark in location of node
            // Don't use this.finishNode() as otherwise we might process comments twice and
            // include already consumed parens
            this.resetEndLocation(node);
        }
        if (this.match(tt.colon)) {
            const typeCastNode = this.startNodeAt(startLoc);
            typeCastNode.expression = node;
            typeCastNode.typeAnnotation = this.flowParseTypeAnnotation();
            return this.finishNode(typeCastNode, "TypeCastExpression");
        }
        return node;
    }
    assertModuleNodeAllowed(node) {
        if ((node.type === "ImportDeclaration" &&
            (node.importKind === "type" || node.importKind === "typeof")) ||
            (node.type === "ExportNamedDeclaration" &&
                node.exportKind === "type") ||
            (node.type === "ExportAllDeclaration" && node.exportKind === "type")) {
            // Allow Flowtype imports and exports in all conditions because
            // Flow itself does not care about 'sourceType'.
            return;
        }
        super.assertModuleNodeAllowed(node);
    }
    parseExportDeclaration(node) {
        if (this.isContextual(tt._type)) {
            node.exportKind = "type";
            const declarationNode = this.startNode();
            this.next();
            if (this.match(tt.braceL)) {
                // export type { foo, bar };
                node.specifiers = this.parseExportSpecifiers(
                /* isInTypeExport */ true);
                super.parseExportFrom(node);
                return null;
            }
            else {
                // export type Foo = Bar;
                // @ts-expect-error: refine typings
                return this.flowParseTypeAlias(declarationNode);
            }
        }
        else if (this.isContextual(tt._opaque)) {
            node.exportKind = "type";
            const declarationNode = this.startNode();
            this.next();
            // export opaque type Foo = Bar;
            // @ts-expect-error: refine typings
            return this.flowParseOpaqueType(declarationNode, false);
        }
        else if (this.isContextual(tt._interface)) {
            node.exportKind = "type";
            const declarationNode = this.startNode();
            this.next();
            // @ts-expect-error: refine typings
            return this.flowParseInterface(declarationNode);
        }
        else if (this.shouldParseEnums() && this.isContextual(tt._enum)) {
            node.exportKind = "value";
            const declarationNode = this.startNode();
            this.next();
            // @ts-expect-error: refine typings
            return this.flowParseEnumDeclaration(declarationNode);
        }
        else {
            return super.parseExportDeclaration(node);
        }
    }
    eatExportStar(node) {
        if (super.eatExportStar(node))
            return true;
        if (this.isContextual(tt._type) && this.lookahead().type === tt.star) {
            node.exportKind = "type";
            this.next();
            this.next();
            return true;
        }
        return false;
    }
    maybeParseExportNamespaceSpecifier(node) {
        const { startLoc } = this.state;
        const hasNamespace = super.maybeParseExportNamespaceSpecifier(node);
        if (hasNamespace && node.exportKind === "type") {
            this.unexpected(startLoc);
        }
        return hasNamespace;
    }
    parseClassId(node, isStatement, optionalId) {
        super.parseClassId(node, isStatement, optionalId);
        if (this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterDeclaration();
        }
    }
    parseClassMember(classBody, member, state) {
        const { startLoc } = this.state;
        if (this.isContextual(tt._declare)) {
            if (super.parseClassMemberFromModifier(classBody, member)) {
                // 'declare' is a class element name
                return;
            }
            member.declare = true;
        }
        super.parseClassMember(classBody, member, state);
        if (member.declare) {
            if (member.type !== "ClassProperty" &&
                member.type !== "ClassPrivateProperty" &&
                member.type !== "PropertyDefinition" // Used by estree plugin
            ) {
                this.raise(FlowErrors.DeclareClassElement, startLoc);
            }
            else if (member.value) {
                this.raise(FlowErrors.DeclareClassFieldInitializer, member.value);
            }
        }
    }
    isIterator(word) {
        return word === "iterator" || word === "asyncIterator";
    }
    readIterator() {
        const word = super.readWord1();
        const fullWord = "@@" + word;
        // Allow @@iterator and @@asyncIterator as a identifier only inside type
        if (!this.isIterator(word) || !this.state.inType) {
            this.raise(Errors.InvalidIdentifier, this.state.curPosition(), {
                identifierName: fullWord,
            });
        }
        this.finishToken(tt.name, fullWord);
    }
    // ensure that inside flow types, we bypass the jsx parser plugin
    getTokenFromCode(code) {
        const next = this.input.charCodeAt(this.state.pos + 1);
        if (code === charCodes.leftCurlyBrace && next === charCodes.verticalBar) {
            this.finishOp(tt.braceBarL, 2);
        }
        else if (this.state.inType &&
            (code === charCodes.greaterThan || code === charCodes.lessThan)) {
            this.finishOp(code === charCodes.greaterThan ? tt.gt : tt.lt, 1);
        }
        else if (this.state.inType && code === charCodes.questionMark) {
            if (next === charCodes.dot) {
                this.finishOp(tt.questionDot, 2);
            }
            else {
                // allow double nullable types in Flow: ??string
                this.finishOp(tt.question, 1);
            }
        }
        else if (isIteratorStart(code, next, this.input.charCodeAt(this.state.pos + 2))) {
            this.state.pos += 2; // eat "@@"
            this.readIterator();
        }
        else {
            super.getTokenFromCode(code);
        }
    }
    isAssignable(node, isBinding) {
        if (node.type === "TypeCastExpression") {
            return this.isAssignable(node.expression, isBinding);
        }
        else {
            return super.isAssignable(node, isBinding);
        }
    }
    toAssignable(node, isLHS = false) {
        if (!isLHS &&
            node.type === "AssignmentExpression" &&
            node.left.type === "TypeCastExpression") {
            node.left = this.typeCastToParameter(node.left);
        }
        super.toAssignable(node, isLHS);
    }
    // turn type casts that we found in function parameter head into type annotated params
    toAssignableList(exprList, trailingCommaLoc, isLHS) {
        for (let i = 0; i < exprList.length; i++) {
            const expr = exprList[i];
            if (expr?.type === "TypeCastExpression") {
                exprList[i] = this.typeCastToParameter(expr);
            }
        }
        super.toAssignableList(exprList, trailingCommaLoc, isLHS);
    }
    // this is a list of nodes, from something like a call expression, we need to filter the
    // type casts that we've found that are illegal in this context
    toReferencedList(exprList, isParenthesizedExpr) {
        for (let i = 0; i < exprList.length; i++) {
            const expr = exprList[i];
            if (expr &&
                expr.type === "TypeCastExpression" &&
                !expr.extra?.parenthesized &&
                (exprList.length > 1 || !isParenthesizedExpr)) {
                this.raise(FlowErrors.TypeCastInPattern, expr.typeAnnotation);
            }
        }
        return exprList;
    }
    parseArrayLike(close, canBePattern, isTuple, refExpressionErrors) {
        const node = super.parseArrayLike(close, canBePattern, isTuple, refExpressionErrors);
        // This could be an array pattern:
        //   ([a: string, b: string]) => {}
        // In this case, we don't have to call toReferencedList. We will
        // call it, if needed, when we are sure that it is a parenthesized
        // expression by calling toReferencedListDeep.
        if (canBePattern && !this.state.maybeInArrowParameters) {
            this.toReferencedList(node.elements);
        }
        return node;
    }
    isValidLVal(type, isParenthesized, binding) {
        return (type === "TypeCastExpression" ||
            super.isValidLVal(type, isParenthesized, binding));
    }
    // parse class property type annotations
    parseClassProperty(node) {
        if (this.match(tt.colon)) {
            // @ts-expect-error refine typings
            node.typeAnnotation = this.flowParseTypeAnnotation();
        }
        return super.parseClassProperty(node);
    }
    parseClassPrivateProperty(node) {
        if (this.match(tt.colon)) {
            // @ts-expect-error refine typings
            node.typeAnnotation = this.flowParseTypeAnnotation();
        }
        return super.parseClassPrivateProperty(node);
    }
    // determine whether or not we're currently in the position where a class method would appear
    isClassMethod() {
        return this.match(tt.lt) || super.isClassMethod();
    }
    // determine whether or not we're currently in the position where a class property would appear
    isClassProperty() {
        return this.match(tt.colon) || super.isClassProperty();
    }
    isNonstaticConstructor(method) {
        return !this.match(tt.colon) && super.isNonstaticConstructor(method);
    }
    // parse type parameters for class methods
    pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
        if (method.variance) {
            this.unexpected(method.variance.loc.start);
        }
        delete method.variance;
        if (this.match(tt.lt)) {
            method.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        super.pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper);
        if (method.params && isConstructor) {
            const params = method.params;
            if (params.length > 0 && this.isThisParam(params[0])) {
                this.raise(FlowErrors.ThisParamBannedInConstructor, method);
            }
            // estree support
        }
        else if (
        // @ts-expect-error TS does not know about the face that estree can replace ClassMethod with MethodDefinition
        method.type === "MethodDefinition" &&
            isConstructor &&
            // @ts-expect-error estree
            method.value.params) {
            // @ts-expect-error estree
            const params = method.value.params;
            if (params.length > 0 && this.isThisParam(params[0])) {
                this.raise(FlowErrors.ThisParamBannedInConstructor, method);
            }
        }
    }
    pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
        if (method.variance) {
            this.unexpected(method.variance.loc.start);
        }
        delete method.variance;
        if (this.match(tt.lt)) {
            method.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
    }
    // parse a the super class type parameters and implements
    parseClassSuper(node) {
        super.parseClassSuper(node);
        if (node.superClass && this.match(tt.lt)) {
            node.superTypeParameters = this.flowParseTypeParameterInstantiation();
        }
        if (this.isContextual(tt._implements)) {
            this.next();
            const implemented = (node.implements = []);
            do {
                const node = this.startNode();
                node.id = this.flowParseRestrictedIdentifier(/*liberal*/ true);
                if (this.match(tt.lt)) {
                    node.typeParameters = this.flowParseTypeParameterInstantiation();
                }
                else {
                    node.typeParameters = null;
                }
                implemented.push(this.finishNode(node, "ClassImplements"));
            } while (this.eat(tt.comma));
        }
    }
    checkGetterSetterParams(method) {
        super.checkGetterSetterParams(method);
        const params = this.getObjectOrClassMethodParams(method);
        if (params.length > 0) {
            const param = params[0];
            if (this.isThisParam(param) && method.kind === "get") {
                this.raise(FlowErrors.GetterMayNotHaveThisParam, param);
            }
            else if (this.isThisParam(param)) {
                this.raise(FlowErrors.SetterMayNotHaveThisParam, param);
            }
        }
    }
    parsePropertyNamePrefixOperator(node) {
        node.variance = this.flowParseVariance();
    }
    // parse type parameters for object method shorthand
    parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
        if (prop.variance) {
            this.unexpected(prop.variance.loc.start);
        }
        delete prop.variance;
        let typeParameters;
        // method shorthand
        if (this.match(tt.lt) && !isAccessor) {
            typeParameters = this.flowParseTypeParameterDeclaration();
            if (!this.match(tt.parenL))
                this.unexpected();
        }
        const result = super.parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors);
        // add typeParameters if we found them
        if (typeParameters) {
            // @ts-expect-error: refine typings
            (result.value || result).typeParameters = typeParameters;
        }
        return result;
    }
    parseAssignableListItemTypes(param) {
        if (this.eat(tt.question)) {
            if (param.type !== "Identifier") {
                this.raise(FlowErrors.PatternIsOptional, param);
            }
            if (this.isThisParam(param)) {
                this.raise(FlowErrors.ThisParamMayNotBeOptional, param);
            }
            param.optional = true;
        }
        if (this.match(tt.colon)) {
            // @ts-expect-error: refine typings
            param.typeAnnotation = this.flowParseTypeAnnotation();
        }
        else if (this.isThisParam(param)) {
            this.raise(FlowErrors.ThisParamAnnotationRequired, param);
        }
        if (this.match(tt.eq) && this.isThisParam(param)) {
            this.raise(FlowErrors.ThisParamNoDefault, param);
        }
        this.resetEndLocation(param);
        return param;
    }
    parseMaybeDefault(startLoc, left) {
        const node = super.parseMaybeDefault(startLoc, left);
        if (node.type === "AssignmentPattern" &&
            node.typeAnnotation &&
            node.right.start < node.typeAnnotation.start) {
            this.raise(FlowErrors.TypeBeforeInitializer, node.typeAnnotation);
        }
        return node;
    }
    checkImportReflection(node) {
        super.checkImportReflection(node);
        if (node.module && node.importKind !== "value") {
            this.raise(FlowErrors.ImportReflectionHasImportType, node.specifiers[0].loc.start);
        }
    }
    parseImportSpecifierLocal(node, specifier, type) {
        specifier.local = hasTypeImportKind(node)
            ? this.flowParseRestrictedIdentifier(
            /* liberal */ true, 
            /* declaration */ true)
            : this.parseIdentifier();
        node.specifiers.push(this.finishImportSpecifier(specifier, type));
    }
    isPotentialImportPhase(isExport) {
        if (super.isPotentialImportPhase(isExport))
            return true;
        if (this.isContextual(tt._type)) {
            if (!isExport)
                return true;
            const ch = this.lookaheadCharCode();
            return ch === charCodes.leftCurlyBrace || ch === charCodes.asterisk;
        }
        return !isExport && this.isContextual(tt._typeof);
    }
    applyImportPhase(node, isExport, phase, loc) {
        super.applyImportPhase(node, isExport, phase, loc);
        if (isExport) {
            if (!phase && this.match(tt._default)) {
                // TODO: Align with our TS AST and always add .exportKind
                return;
            }
            node.exportKind =
                phase === "type" ? phase : "value";
        }
        else {
            if (phase === "type" && this.match(tt.star))
                this.unexpected();
            node.importKind =
                phase === "type" || phase === "typeof" ? phase : "value";
        }
    }
    // parse import-type/typeof shorthand
    parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isMaybeTypeOnly, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bindingType) {
        const firstIdent = specifier.imported;
        let specifierTypeKind = null;
        if (firstIdent.type === "Identifier") {
            if (firstIdent.name === "type") {
                specifierTypeKind = "type";
            }
            else if (firstIdent.name === "typeof") {
                specifierTypeKind = "typeof";
            }
        }
        let isBinding = false;
        if (this.isContextual(tt._as) && !this.isLookaheadContextual("as")) {
            const as_ident = this.parseIdentifier(true);
            if (specifierTypeKind !== null &&
                !tokenIsKeywordOrIdentifier(this.state.type)) {
                // `import {type as ,` or `import {type as }`
                specifier.imported = as_ident;
                specifier.importKind = specifierTypeKind;
                specifier.local = cloneIdentifier(as_ident);
            }
            else {
                // `import {type as foo`
                specifier.imported = firstIdent;
                specifier.importKind = null;
                specifier.local = this.parseIdentifier();
            }
        }
        else {
            if (specifierTypeKind !== null &&
                tokenIsKeywordOrIdentifier(this.state.type)) {
                // `import {type foo`
                specifier.imported = this.parseIdentifier(true);
                specifier.importKind = specifierTypeKind;
            }
            else {
                if (importedIsString) {
                    /*:: invariant(firstIdent instanceof N.StringLiteral) */
                    throw this.raise(Errors.ImportBindingIsString, specifier, {
                        importName: firstIdent.value,
                    });
                }
                /*:: invariant(firstIdent instanceof N.Node) */
                specifier.imported = firstIdent;
                specifier.importKind = null;
            }
            if (this.eatContextual(tt._as)) {
                specifier.local = this.parseIdentifier();
            }
            else {
                isBinding = true;
                specifier.local = cloneIdentifier(specifier.imported);
            }
        }
        const specifierIsTypeImport = hasTypeImportKind(specifier);
        if (isInTypeOnlyImport && specifierIsTypeImport) {
            this.raise(FlowErrors.ImportTypeShorthandOnlyInPureImport, specifier);
        }
        if (isInTypeOnlyImport || specifierIsTypeImport) {
            this.checkReservedType(specifier.local.name, specifier.local.loc.start, 
            /* declaration */ true);
        }
        if (isBinding && !isInTypeOnlyImport && !specifierIsTypeImport) {
            this.checkReservedWord(specifier.local.name, specifier.loc.start, true, true);
        }
        return this.finishImportSpecifier(specifier, "ImportSpecifier");
    }
    parseBindingAtom() {
        switch (this.state.type) {
            case tt._this:
                // "this" may be the name of a parameter, so allow it.
                return this.parseIdentifier(/* liberal */ true);
            default:
                return super.parseBindingAtom();
        }
    }
    // parse function type parameters - function foo<T>() {}
    parseFunctionParams(node, isConstructor) {
        // @ts-expect-error kind may not index node
        const kind = node.kind;
        if (kind !== "get" && kind !== "set" && this.match(tt.lt)) {
            node.typeParameters = this.flowParseTypeParameterDeclaration();
        }
        super.parseFunctionParams(node, isConstructor);
    }
    // parse flow type annotations on variable declarator heads - let foo: string = bar
    parseVarId(decl, kind) {
        super.parseVarId(decl, kind);
        if (this.match(tt.colon)) {
            // @ts-expect-error: refine typings
            decl.id.typeAnnotation = this.flowParseTypeAnnotation();
            this.resetEndLocation(decl.id); // set end position to end of type
        }
    }
    // parse the return type of an async arrow function - let foo = (async (): number => {});
    parseAsyncArrowFromCallExpression(node, call) {
        if (this.match(tt.colon)) {
            const oldNoAnonFunctionType = this.state.noAnonFunctionType;
            this.state.noAnonFunctionType = true;
            // @ts-expect-error refine typings
            node.returnType = this.flowParseTypeAnnotation();
            this.state.noAnonFunctionType = oldNoAnonFunctionType;
        }
        return super.parseAsyncArrowFromCallExpression(node, call);
    }
    // todo description
    shouldParseAsyncArrow() {
        return this.match(tt.colon) || super.shouldParseAsyncArrow();
    }
    // We need to support type parameter declarations for arrow functions. This
    // is tricky. There are three situations we need to handle
    //
    // 1. This is either JSX or an arrow function. We'll try JSX first. If that
    //    fails, we'll try an arrow function. If that fails, we'll throw the JSX
    //    error.
    // 2. This is an arrow function. We'll parse the type parameter declaration,
    //    parse the rest, make sure the rest is an arrow function, and go from
    //    there
    // 3. This is neither. Just call the super method
    parseMaybeAssign(refExpressionErrors, afterLeftParse) {
        let state = null;
        let jsx;
        if (this.hasPlugin("jsx") &&
            (this.match(tt.jsxTagStart) || this.match(tt.lt))) {
            state = this.state.clone();
            jsx = this.tryParse(() => super.parseMaybeAssign(refExpressionErrors, afterLeftParse), state);
            /*:: invariant(!jsx.aborted) */
            /*:: invariant(jsx.node != null) */
            if (!jsx.error)
                return jsx.node;
            // Remove `tc.j_expr` and `tc.j_oTag` from context added
            // by parsing `jsxTagStart` to stop the JSX plugin from
            // messing with the tokens
            const { context } = this.state;
            const currentContext = context[context.length - 1];
            if (currentContext === tc.j_oTag || currentContext === tc.j_expr) {
                context.pop();
            }
        }
        if (jsx?.error || this.match(tt.lt)) {
            state = state || this.state.clone();
            let typeParameters;
            const arrow = this.tryParse(abort => {
                typeParameters = this.flowParseTypeParameterDeclaration();
                const arrowExpression = this.forwardNoArrowParamsConversionAt(typeParameters, () => {
                    const result = super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
                    this.resetStartLocationFromNode(result, typeParameters);
                    return result;
                });
                // <T>(() => {});
                // <T>(() => {}: any);
                if (arrowExpression.extra?.parenthesized)
                    abort();
                // The above can return a TypeCastExpression when the arrow
                // expression is not wrapped in parens. See also `this.parseParenItem`.
                // (<T>() => {}: any);
                const expr = this.maybeUnwrapTypeCastExpression(arrowExpression);
                if (expr.type !== "ArrowFunctionExpression")
                    abort();
                expr.typeParameters = typeParameters;
                this.resetStartLocationFromNode(expr, typeParameters);
                return arrowExpression;
            }, state);
            let arrowExpression = null;
            if (arrow.node &&
                // @ts-expect-error: refine tryParse typings
                this.maybeUnwrapTypeCastExpression(arrow.node).type ===
                    "ArrowFunctionExpression") {
                if (!arrow.error && !arrow.aborted) {
                    // <T> async () => {}
                    // @ts-expect-error: refine tryParse typings
                    if (arrow.node.async) {
                        /*:: invariant(typeParameters) */
                        this.raise(FlowErrors.UnexpectedTypeParameterBeforeAsyncArrowFunction, typeParameters);
                    }
                    // @ts-expect-error: refine tryParse typings
                    return arrow.node;
                }
                // @ts-expect-error: refine typings
                arrowExpression = arrow.node;
            }
            // If we are here, both JSX and Flow parsing attempts failed.
            // Give the precedence to the JSX error, except if JSX had an
            // unrecoverable error while Flow didn't.
            // If the error is recoverable, we can only re-report it if there is
            // a node we can return.
            if (jsx?.node) {
                /*:: invariant(jsx.failState) */
                this.state = jsx.failState;
                return jsx.node;
            }
            if (arrowExpression) {
                /*:: invariant(arrow.failState) */
                this.state = arrow.failState;
                return arrowExpression;
            }
            if (jsx?.thrown)
                throw jsx.error;
            if (arrow.thrown)
                throw arrow.error;
            /*:: invariant(typeParameters) */
            throw this.raise(FlowErrors.UnexpectedTokenAfterTypeParameter, typeParameters);
        }
        return super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
    }
    // handle return types for arrow functions
    parseArrow(node) {
        if (this.match(tt.colon)) {
            // @ts-expect-error todo(flow->ts)
            const result = this.tryParse(() => {
                const oldNoAnonFunctionType = this.state.noAnonFunctionType;
                this.state.noAnonFunctionType = true;
                const typeNode = this.startNode();
                [
                    typeNode.typeAnnotation,
                    // @ts-expect-error (destructuring not supported yet)
                    node.predicate,
                ] = this.flowParseTypeAndPredicateInitialiser();
                this.state.noAnonFunctionType = oldNoAnonFunctionType;
                if (this.canInsertSemicolon())
                    this.unexpected();
                if (!this.match(tt.arrow))
                    this.unexpected();
                return typeNode;
            });
            if (result.thrown)
                return null;
            /*:: invariant(result.node) */
            if (result.error)
                this.state = result.failState;
            // assign after it is clear it is an arrow
            // @ts-expect-error todo(flow->ts)
            node.returnType = result.node.typeAnnotation
                ? this.finishNode(result.node, "TypeAnnotation")
                : null;
        }
        return super.parseArrow(node);
    }
    shouldParseArrow(params) {
        return this.match(tt.colon) || super.shouldParseArrow(params);
    }
    setArrowFunctionParameters(node, params) {
        if (this.state.noArrowParamsConversionAt.indexOf(node.start) !== -1) {
            node.params = params;
        }
        else {
            super.setArrowFunctionParameters(node, params);
        }
    }
    checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged = true) {
        if (isArrowFunction &&
            this.state.noArrowParamsConversionAt.indexOf(node.start) !== -1) {
            return;
        }
        // ensure the `this` param is first, if it exists
        for (let i = 0; i < node.params.length; i++) {
            if (this.isThisParam(node.params[i]) && i > 0) {
                this.raise(FlowErrors.ThisParamMustBeFirst, node.params[i]);
            }
        }
        super.checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged);
    }
    parseParenAndDistinguishExpression(canBeArrow) {
        return super.parseParenAndDistinguishExpression(canBeArrow && this.state.noArrowAt.indexOf(this.state.start) === -1);
    }
    parseSubscripts(base, startLoc, noCalls) {
        if (base.type === "Identifier" &&
            base.name === "async" &&
            this.state.noArrowAt.indexOf(startLoc.index) !== -1) {
            this.next();
            const node = this.startNodeAt(startLoc);
            node.callee = base;
            node.arguments = super.parseCallExpressionArguments(tt.parenR, false);
            base = this.finishNode(node, "CallExpression");
        }
        else if (base.type === "Identifier" &&
            base.name === "async" &&
            this.match(tt.lt)) {
            const state = this.state.clone();
            const arrow = this.tryParse(abort => this.parseAsyncArrowWithTypeParameters(startLoc) || abort(), state);
            /*:: invariant(arrow.node != null) */
            // @ts-expect-error: refine tryParse typings
            if (!arrow.error && !arrow.aborted)
                return arrow.node;
            const result = this.tryParse(() => super.parseSubscripts(base, startLoc, noCalls), state);
            if (result.node && !result.error)
                return result.node;
            if (arrow.node) {
                this.state = arrow.failState;
                // @ts-expect-error: refine tryParse typings
                return arrow.node;
            }
            if (result.node) {
                this.state = result.failState;
                return result.node;
            }
            throw arrow.error || result.error;
        }
        return super.parseSubscripts(base, startLoc, noCalls);
    }
    parseSubscript(base, startLoc, noCalls, subscriptState) {
        if (this.match(tt.questionDot) && this.isLookaheadToken_lt()) {
            subscriptState.optionalChainMember = true;
            if (noCalls) {
                subscriptState.stop = true;
                return base;
            }
            this.next();
            const node = this.startNodeAt(startLoc);
            node.callee = base;
            node.typeArguments = this.flowParseTypeParameterInstantiation();
            this.expect(tt.parenL);
            node.arguments = this.parseCallExpressionArguments(tt.parenR, false);
            node.optional = true;
            return this.finishCallExpression(node, /* optional */ true);
        }
        else if (!noCalls && this.shouldParseTypes() && this.match(tt.lt)) {
            const node = this.startNodeAt(startLoc);
            node.callee = base;
            const result = this.tryParse(() => {
                node.typeArguments =
                    this.flowParseTypeParameterInstantiationCallOrNew();
                this.expect(tt.parenL);
                node.arguments = super.parseCallExpressionArguments(tt.parenR, false);
                if (subscriptState.optionalChainMember) {
                    node.optional = false;
                }
                return this.finishCallExpression(node, subscriptState.optionalChainMember);
            });
            if (result.node) {
                if (result.error)
                    this.state = result.failState;
                return result.node;
            }
        }
        return super.parseSubscript(base, startLoc, noCalls, subscriptState);
    }
    parseNewCallee(node) {
        super.parseNewCallee(node);
        let targs = null;
        if (this.shouldParseTypes() && this.match(tt.lt)) {
            targs = this.tryParse(() => this.flowParseTypeParameterInstantiationCallOrNew()).node;
        }
        node.typeArguments = targs;
    }
    parseAsyncArrowWithTypeParameters(startLoc) {
        const node = this.startNodeAt(startLoc);
        this.parseFunctionParams(node, false);
        if (!this.parseArrow(node))
            return;
        return super.parseArrowExpression(node, 
        /* params */ undefined, 
        /* isAsync */ true);
    }
    readToken_mult_modulo(code) {
        const next = this.input.charCodeAt(this.state.pos + 1);
        if (code === charCodes.asterisk &&
            next === charCodes.slash &&
            this.state.hasFlowComment) {
            this.state.hasFlowComment = false;
            this.state.pos += 2;
            this.nextToken();
            return;
        }
        super.readToken_mult_modulo(code);
    }
    readToken_pipe_amp(code) {
        const next = this.input.charCodeAt(this.state.pos + 1);
        if (code === charCodes.verticalBar &&
            next === charCodes.rightCurlyBrace) {
            // '|}'
            this.finishOp(tt.braceBarR, 2);
            return;
        }
        super.readToken_pipe_amp(code);
    }
    parseTopLevel(file, program) {
        const fileNode = super.parseTopLevel(file, program);
        if (this.state.hasFlowComment) {
            this.raise(FlowErrors.UnterminatedFlowComment, this.state.curPosition());
        }
        return fileNode;
    }
    skipBlockComment() {
        if (this.hasPlugin("flowComments") && this.skipFlowComment()) {
            if (this.state.hasFlowComment) {
                throw this.raise(FlowErrors.NestedFlowComment, this.state.startLoc);
            }
            this.hasFlowCommentCompletion();
            const commentSkip = this.skipFlowComment();
            if (commentSkip) {
                this.state.pos += commentSkip;
                this.state.hasFlowComment = true;
            }
            return;
        }
        return super.skipBlockComment(this.state.hasFlowComment ? "*-/" : "*/");
    }
    skipFlowComment() {
        const { pos } = this.state;
        let shiftToFirstNonWhiteSpace = 2;
        while ([charCodes.space, charCodes.tab].includes(
        // @ts-expect-error testing whether a number is included
        this.input.charCodeAt(pos + shiftToFirstNonWhiteSpace))) {
            shiftToFirstNonWhiteSpace++;
        }
        const ch2 = this.input.charCodeAt(shiftToFirstNonWhiteSpace + pos);
        const ch3 = this.input.charCodeAt(shiftToFirstNonWhiteSpace + pos + 1);
        if (ch2 === charCodes.colon && ch3 === charCodes.colon) {
            return shiftToFirstNonWhiteSpace + 2; // check for /*::
        }
        if (this.input.slice(shiftToFirstNonWhiteSpace + pos, shiftToFirstNonWhiteSpace + pos + 12) === "flow-include") {
            return shiftToFirstNonWhiteSpace + 12; // check for /*flow-include
        }
        if (ch2 === charCodes.colon && ch3 !== charCodes.colon) {
            return shiftToFirstNonWhiteSpace; // check for /*:, advance up to :
        }
        return false;
    }
    hasFlowCommentCompletion() {
        const end = this.input.indexOf("*/", this.state.pos);
        if (end === -1) {
            throw this.raise(Errors.UnterminatedComment, this.state.curPosition());
        }
    }
    // Flow enum parsing
    flowEnumErrorBooleanMemberNotInitialized(loc, { enumName, memberName, }) {
        this.raise(FlowErrors.EnumBooleanMemberNotInitialized, loc, {
            memberName,
            enumName,
        });
    }
    flowEnumErrorInvalidMemberInitializer(loc, enumContext) {
        return this.raise(!enumContext.explicitType
            ? FlowErrors.EnumInvalidMemberInitializerUnknownType
            : enumContext.explicitType === "symbol"
                ? FlowErrors.EnumInvalidMemberInitializerSymbolType
                : FlowErrors.EnumInvalidMemberInitializerPrimaryType, loc, enumContext);
    }
    flowEnumErrorNumberMemberNotInitialized(loc, details) {
        this.raise(FlowErrors.EnumNumberMemberNotInitialized, loc, details);
    }
    flowEnumErrorStringMemberInconsistentlyInitialized(node, details) {
        this.raise(FlowErrors.EnumStringMemberInconsistentlyInitialized, node, details);
    }
    flowEnumMemberInit() {
        const startLoc = this.state.startLoc;
        const endOfInit = () => this.match(tt.comma) || this.match(tt.braceR);
        switch (this.state.type) {
            case tt.num: {
                const literal = this.parseNumericLiteral(this.state.value);
                if (endOfInit()) {
                    return { type: "number", loc: literal.loc.start, value: literal };
                }
                return { type: "invalid", loc: startLoc };
            }
            case tt.string: {
                const literal = this.parseStringLiteral(this.state.value);
                if (endOfInit()) {
                    return { type: "string", loc: literal.loc.start, value: literal };
                }
                return { type: "invalid", loc: startLoc };
            }
            case tt._true:
            case tt._false: {
                const literal = this.parseBooleanLiteral(this.match(tt._true));
                if (endOfInit()) {
                    return {
                        type: "boolean",
                        loc: literal.loc.start,
                        value: literal,
                    };
                }
                return { type: "invalid", loc: startLoc };
            }
            default:
                return { type: "invalid", loc: startLoc };
        }
    }
    flowEnumMemberRaw() {
        const loc = this.state.startLoc;
        const id = this.parseIdentifier(true);
        const init = this.eat(tt.eq)
            ? this.flowEnumMemberInit()
            : { type: "none", loc };
        return { id, init };
    }
    flowEnumCheckExplicitTypeMismatch(loc, context, expectedType) {
        const { explicitType } = context;
        if (explicitType === null) {
            return;
        }
        if (explicitType !== expectedType) {
            this.flowEnumErrorInvalidMemberInitializer(loc, context);
        }
    }
    flowEnumMembers({ enumName, explicitType, }) {
        const seenNames = new Set();
        const members = {
            // @ts-expect-error: migrate to Babel types
            booleanMembers: [],
            // @ts-expect-error: migrate to Babel types
            numberMembers: [],
            // @ts-expect-error: migrate to Babel types
            stringMembers: [],
            // @ts-expect-error: migrate to Babel types
            defaultedMembers: [],
        };
        let hasUnknownMembers = false;
        while (!this.match(tt.braceR)) {
            if (this.eat(tt.ellipsis)) {
                hasUnknownMembers = true;
                break;
            }
            const memberNode = this.startNode();
            const { id, init } = this.flowEnumMemberRaw();
            const memberName = id.name;
            if (memberName === "") {
                continue;
            }
            if (/^[a-z]/.test(memberName)) {
                this.raise(FlowErrors.EnumInvalidMemberName, id, {
                    memberName,
                    suggestion: memberName[0].toUpperCase() + memberName.slice(1),
                    enumName,
                });
            }
            if (seenNames.has(memberName)) {
                this.raise(FlowErrors.EnumDuplicateMemberName, id, {
                    memberName,
                    enumName,
                });
            }
            seenNames.add(memberName);
            const context = { enumName, explicitType, memberName };
            memberNode.id = id;
            switch (init.type) {
                case "boolean": {
                    this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "boolean");
                    memberNode.init = init.value;
                    members.booleanMembers.push(this.finishNode(memberNode, "EnumBooleanMember"));
                    break;
                }
                case "number": {
                    this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "number");
                    memberNode.init = init.value;
                    members.numberMembers.push(this.finishNode(memberNode, "EnumNumberMember"));
                    break;
                }
                case "string": {
                    this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "string");
                    memberNode.init = init.value;
                    members.stringMembers.push(this.finishNode(memberNode, "EnumStringMember"));
                    break;
                }
                case "invalid": {
                    throw this.flowEnumErrorInvalidMemberInitializer(init.loc, context);
                }
                case "none": {
                    switch (explicitType) {
                        case "boolean":
                            this.flowEnumErrorBooleanMemberNotInitialized(init.loc, context);
                            break;
                        case "number":
                            this.flowEnumErrorNumberMemberNotInitialized(init.loc, context);
                            break;
                        default:
                            members.defaultedMembers.push(this.finishNode(memberNode, "EnumDefaultedMember"));
                    }
                }
            }
            if (!this.match(tt.braceR)) {
                this.expect(tt.comma);
            }
        }
        return { members, hasUnknownMembers };
    }
    flowEnumStringMembers(initializedMembers, defaultedMembers, { enumName, }) {
        if (initializedMembers.length === 0) {
            return defaultedMembers;
        }
        else if (defaultedMembers.length === 0) {
            return initializedMembers;
        }
        else if (defaultedMembers.length > initializedMembers.length) {
            for (const member of initializedMembers) {
                this.flowEnumErrorStringMemberInconsistentlyInitialized(member, {
                    enumName,
                });
            }
            return defaultedMembers;
        }
        else {
            for (const member of defaultedMembers) {
                this.flowEnumErrorStringMemberInconsistentlyInitialized(member, {
                    enumName,
                });
            }
            return initializedMembers;
        }
    }
    flowEnumParseExplicitType({ enumName, }) {
        if (!this.eatContextual(tt._of))
            return null;
        if (!tokenIsIdentifier(this.state.type)) {
            throw this.raise(FlowErrors.EnumInvalidExplicitTypeUnknownSupplied, this.state.startLoc, {
                enumName,
            });
        }
        const { value } = this.state;
        this.next();
        if (value !== "boolean" &&
            value !== "number" &&
            value !== "string" &&
            value !== "symbol") {
            this.raise(FlowErrors.EnumInvalidExplicitType, this.state.startLoc, {
                enumName,
                invalidEnumType: value,
            });
        }
        return value;
    }
    flowEnumBody(node, id) {
        const enumName = id.name;
        const nameLoc = id.loc.start;
        const explicitType = this.flowEnumParseExplicitType({ enumName });
        this.expect(tt.braceL);
        const { members, hasUnknownMembers } = this.flowEnumMembers({
            enumName,
            explicitType,
        });
        node.hasUnknownMembers = hasUnknownMembers;
        switch (explicitType) {
            case "boolean":
                node.explicitType = true;
                node.members = members.booleanMembers;
                this.expect(tt.braceR);
                return this.finishNode(node, "EnumBooleanBody");
            case "number":
                node.explicitType = true;
                node.members = members.numberMembers;
                this.expect(tt.braceR);
                return this.finishNode(node, "EnumNumberBody");
            case "string":
                node.explicitType = true;
                node.members = this.flowEnumStringMembers(members.stringMembers, members.defaultedMembers, { enumName });
                this.expect(tt.braceR);
                return this.finishNode(node, "EnumStringBody");
            case "symbol":
                node.members = members.defaultedMembers;
                this.expect(tt.braceR);
                return this.finishNode(node, "EnumSymbolBody");
            default: {
                // `explicitType` is `null`
                const empty = () => {
                    node.members = [];
                    this.expect(tt.braceR);
                    return this.finishNode(node, "EnumStringBody");
                };
                node.explicitType = false;
                const boolsLen = members.booleanMembers.length;
                const numsLen = members.numberMembers.length;
                const strsLen = members.stringMembers.length;
                const defaultedLen = members.defaultedMembers.length;
                if (!boolsLen && !numsLen && !strsLen && !defaultedLen) {
                    return empty();
                }
                else if (!boolsLen && !numsLen) {
                    node.members = this.flowEnumStringMembers(members.stringMembers, members.defaultedMembers, { enumName });
                    this.expect(tt.braceR);
                    return this.finishNode(node, "EnumStringBody");
                }
                else if (!numsLen && !strsLen && boolsLen >= defaultedLen) {
                    for (const member of members.defaultedMembers) {
                        this.flowEnumErrorBooleanMemberNotInitialized(member.loc.start, {
                            enumName,
                            memberName: member.id.name,
                        });
                    }
                    node.members = members.booleanMembers;
                    this.expect(tt.braceR);
                    return this.finishNode(node, "EnumBooleanBody");
                }
                else if (!boolsLen && !strsLen && numsLen >= defaultedLen) {
                    for (const member of members.defaultedMembers) {
                        this.flowEnumErrorNumberMemberNotInitialized(member.loc.start, {
                            enumName,
                            memberName: member.id.name,
                        });
                    }
                    node.members = members.numberMembers;
                    this.expect(tt.braceR);
                    return this.finishNode(node, "EnumNumberBody");
                }
                else {
                    this.raise(FlowErrors.EnumInconsistentMemberValues, nameLoc, {
                        enumName,
                    });
                    return empty();
                }
            }
        }
    }
    flowParseEnumDeclaration(node) {
        const id = this.parseIdentifier();
        node.id = id;
        node.body = this.flowEnumBody(this.startNode(), id);
        return this.finishNode(node, "EnumDeclaration");
    }
    // check if the next token is a tt.lt
    isLookaheadToken_lt() {
        const next = this.nextTokenStart();
        if (this.input.charCodeAt(next) === charCodes.lessThan) {
            const afterNext = this.input.charCodeAt(next + 1);
            return (afterNext !== charCodes.lessThan && afterNext !== charCodes.equalsTo);
        }
        return false;
    }
    maybeUnwrapTypeCastExpression(node) {
        return node.type === "TypeCastExpression" ? node.expression : node;
    }
};
