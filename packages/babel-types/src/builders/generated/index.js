/*
 * This file is auto-generated! Do not modify it directly.
 * To re-generate run 'make build'
 */
import validateNode from "../validateNode.ts";
import deprecationWarning from "../../utils/deprecationWarning.ts";
export function arrayExpression(elements = []) {
    return validateNode({
        type: "ArrayExpression",
        elements,
    });
}
export function assignmentExpression(operator, left, right) {
    return validateNode({
        type: "AssignmentExpression",
        operator,
        left,
        right,
    });
}
export function binaryExpression(operator, left, right) {
    return validateNode({
        type: "BinaryExpression",
        operator,
        left,
        right,
    });
}
export function interpreterDirective(value) {
    return validateNode({
        type: "InterpreterDirective",
        value,
    });
}
export function directive(value) {
    return validateNode({
        type: "Directive",
        value,
    });
}
export function directiveLiteral(value) {
    return validateNode({
        type: "DirectiveLiteral",
        value,
    });
}
export function blockStatement(body, directives = []) {
    return validateNode({
        type: "BlockStatement",
        body,
        directives,
    });
}
export function breakStatement(label = null) {
    return validateNode({
        type: "BreakStatement",
        label,
    });
}
export function callExpression(callee, _arguments) {
    return validateNode({
        type: "CallExpression",
        callee,
        arguments: _arguments,
    });
}
export function arkTSCallExpression(callee, _arguments, trailingClosure = null) {
    return validateNode({
        type: "ArkTSCallExpression",
        callee,
        arguments: _arguments,
        trailingClosure,
    });
}
export function catchClause(param = null, body) {
    return validateNode({
        type: "CatchClause",
        param,
        body,
    });
}
export function conditionalExpression(test, consequent, alternate) {
    return validateNode({
        type: "ConditionalExpression",
        test,
        consequent,
        alternate,
    });
}
export function continueStatement(label = null) {
    return validateNode({
        type: "ContinueStatement",
        label,
    });
}
export function debuggerStatement() {
    return {
        type: "DebuggerStatement",
    };
}
export function doWhileStatement(test, body) {
    return validateNode({
        type: "DoWhileStatement",
        test,
        body,
    });
}
export function emptyStatement() {
    return {
        type: "EmptyStatement",
    };
}
export function expressionStatement(expression) {
    return validateNode({
        type: "ExpressionStatement",
        expression,
    });
}
export function file(program, comments = null, tokens = null) {
    return validateNode({
        type: "File",
        program,
        comments,
        tokens,
    });
}
export function forInStatement(left, right, body) {
    return validateNode({
        type: "ForInStatement",
        left,
        right,
        body,
    });
}
export function forStatement(init = null, test = null, update = null, body) {
    return validateNode({
        type: "ForStatement",
        init,
        test,
        update,
        body,
    });
}
export function functionDeclaration(id = null, params, body, generator = false, async = false) {
    return validateNode({
        type: "FunctionDeclaration",
        id,
        params,
        body,
        generator,
        async,
    });
}
export function functionExpression(id = null, params, body, generator = false, async = false) {
    return validateNode({
        type: "FunctionExpression",
        id,
        params,
        body,
        generator,
        async,
    });
}
export function identifier(name) {
    return validateNode({
        type: "Identifier",
        name,
    });
}
export function ifStatement(test, consequent, alternate = null) {
    return validateNode({
        type: "IfStatement",
        test,
        consequent,
        alternate,
    });
}
export function labeledStatement(label, body) {
    return validateNode({
        type: "LabeledStatement",
        label,
        body,
    });
}
export function stringLiteral(value) {
    return validateNode({
        type: "StringLiteral",
        value,
    });
}
export function numericLiteral(value) {
    return validateNode({
        type: "NumericLiteral",
        value,
    });
}
export function nullLiteral() {
    return {
        type: "NullLiteral",
    };
}
export function booleanLiteral(value) {
    return validateNode({
        type: "BooleanLiteral",
        value,
    });
}
export function regExpLiteral(pattern, flags = "") {
    return validateNode({
        type: "RegExpLiteral",
        pattern,
        flags,
    });
}
export function logicalExpression(operator, left, right) {
    return validateNode({
        type: "LogicalExpression",
        operator,
        left,
        right,
    });
}
export function memberExpression(object, property, computed = false, optional = null) {
    return validateNode({
        type: "MemberExpression",
        object,
        property,
        computed,
        optional,
    });
}
export function newExpression(callee, _arguments) {
    return validateNode({
        type: "NewExpression",
        callee,
        arguments: _arguments,
    });
}
export function program(body, directives = [], sourceType = "script", interpreter = null) {
    return validateNode({
        type: "Program",
        body,
        directives,
        sourceType,
        interpreter,
        sourceFile: null,
    });
}
export function objectExpression(properties) {
    return validateNode({
        type: "ObjectExpression",
        properties,
    });
}
export function objectMethod(kind = "method", key, params, body, computed = false, generator = false, async = false) {
    return validateNode({
        type: "ObjectMethod",
        kind,
        key,
        params,
        body,
        computed,
        generator,
        async,
    });
}
export function objectProperty(key, value, computed = false, shorthand = false, decorators = null) {
    return validateNode({
        type: "ObjectProperty",
        key,
        value,
        computed,
        shorthand,
        decorators,
    });
}
export function restElement(argument) {
    return validateNode({
        type: "RestElement",
        argument,
    });
}
export function returnStatement(argument = null) {
    return validateNode({
        type: "ReturnStatement",
        argument,
    });
}
export function sequenceExpression(expressions) {
    return validateNode({
        type: "SequenceExpression",
        expressions,
    });
}
export function parenthesizedExpression(expression) {
    return validateNode({
        type: "ParenthesizedExpression",
        expression,
    });
}
export function switchCase(test = null, consequent) {
    return validateNode({
        type: "SwitchCase",
        test,
        consequent,
    });
}
export function switchStatement(discriminant, cases) {
    return validateNode({
        type: "SwitchStatement",
        discriminant,
        cases,
    });
}
export function thisExpression() {
    return {
        type: "ThisExpression",
    };
}
export function throwStatement(argument) {
    return validateNode({
        type: "ThrowStatement",
        argument,
    });
}
export function tryStatement(block, handler = null, finalizer = null) {
    return validateNode({
        type: "TryStatement",
        block,
        handler,
        finalizer,
    });
}
export function unaryExpression(operator, argument, prefix = true) {
    return validateNode({
        type: "UnaryExpression",
        operator,
        argument,
        prefix,
    });
}
export function updateExpression(operator, argument, prefix = false) {
    return validateNode({
        type: "UpdateExpression",
        operator,
        argument,
        prefix,
    });
}
export function variableDeclaration(kind, declarations) {
    return validateNode({
        type: "VariableDeclaration",
        kind,
        declarations,
    });
}
export function variableDeclarator(id, init = null) {
    return validateNode({
        type: "VariableDeclarator",
        id,
        init,
    });
}
export function whileStatement(test, body) {
    return validateNode({
        type: "WhileStatement",
        test,
        body,
    });
}
export function withStatement(object, body) {
    return validateNode({
        type: "WithStatement",
        object,
        body,
    });
}
export function assignmentPattern(left, right) {
    return validateNode({
        type: "AssignmentPattern",
        left,
        right,
    });
}
export function arrayPattern(elements) {
    return validateNode({
        type: "ArrayPattern",
        elements,
    });
}
export function arrowFunctionExpression(params, body, async = false) {
    return validateNode({
        type: "ArrowFunctionExpression",
        params,
        body,
        async,
        expression: null,
    });
}
export function classBody(body) {
    return validateNode({
        type: "ClassBody",
        body,
    });
}
export function classExpression(id = null, superClass = null, body, decorators = null) {
    return validateNode({
        type: "ClassExpression",
        id,
        superClass,
        body,
        decorators,
    });
}
export function classDeclaration(id = null, superClass = null, body, decorators = null) {
    return validateNode({
        type: "ClassDeclaration",
        id,
        superClass,
        body,
        decorators,
    });
}
export function arkTSStructDeclaration(id = null, body, decorators = null) {
    return validateNode({
        type: "ArkTSStructDeclaration",
        id,
        body,
        decorators,
    });
}
export function exportAllDeclaration(source) {
    return validateNode({
        type: "ExportAllDeclaration",
        source,
    });
}
export function exportDefaultDeclaration(declaration) {
    return validateNode({
        type: "ExportDefaultDeclaration",
        declaration,
    });
}
export function exportNamedDeclaration(declaration = null, specifiers = [], source = null) {
    return validateNode({
        type: "ExportNamedDeclaration",
        declaration,
        specifiers,
        source,
    });
}
export function exportSpecifier(local, exported) {
    return validateNode({
        type: "ExportSpecifier",
        local,
        exported,
    });
}
export function forOfStatement(left, right, body, _await = false) {
    return validateNode({
        type: "ForOfStatement",
        left,
        right,
        body,
        await: _await,
    });
}
export function importDeclaration(specifiers, source) {
    return validateNode({
        type: "ImportDeclaration",
        specifiers,
        source,
    });
}
export function importDefaultSpecifier(local) {
    return validateNode({
        type: "ImportDefaultSpecifier",
        local,
    });
}
export function importNamespaceSpecifier(local) {
    return validateNode({
        type: "ImportNamespaceSpecifier",
        local,
    });
}
export function importSpecifier(local, imported) {
    return validateNode({
        type: "ImportSpecifier",
        local,
        imported,
    });
}
export function importExpression(source, options = null) {
    return validateNode({
        type: "ImportExpression",
        source,
        options,
    });
}
export function metaProperty(meta, property) {
    return validateNode({
        type: "MetaProperty",
        meta,
        property,
    });
}
export function classMethod(kind = "method", key, params, body, computed = false, _static = false, generator = false, async = false) {
    return validateNode({
        type: "ClassMethod",
        kind,
        key,
        params,
        body,
        computed,
        static: _static,
        generator,
        async,
    });
}
export function objectPattern(properties) {
    return validateNode({
        type: "ObjectPattern",
        properties,
    });
}
export function spreadElement(argument) {
    return validateNode({
        type: "SpreadElement",
        argument,
    });
}
function _super() {
    return {
        type: "Super",
    };
}
export { _super as super };
export function taggedTemplateExpression(tag, quasi) {
    return validateNode({
        type: "TaggedTemplateExpression",
        tag,
        quasi,
    });
}
export function templateElement(value, tail = false) {
    return validateNode({
        type: "TemplateElement",
        value,
        tail,
    });
}
export function templateLiteral(quasis, expressions) {
    return validateNode({
        type: "TemplateLiteral",
        quasis,
        expressions,
    });
}
export function yieldExpression(argument = null, delegate = false) {
    return validateNode({
        type: "YieldExpression",
        argument,
        delegate,
    });
}
export function awaitExpression(argument) {
    return validateNode({
        type: "AwaitExpression",
        argument,
    });
}
function _import() {
    return {
        type: "Import",
    };
}
export { _import as import };
export function bigIntLiteral(value) {
    return validateNode({
        type: "BigIntLiteral",
        value,
    });
}
export function exportNamespaceSpecifier(exported) {
    return validateNode({
        type: "ExportNamespaceSpecifier",
        exported,
    });
}
export function optionalMemberExpression(object, property, computed = false, optional) {
    return validateNode({
        type: "OptionalMemberExpression",
        object,
        property,
        computed,
        optional,
    });
}
export function optionalCallExpression(callee, _arguments, optional) {
    return validateNode({
        type: "OptionalCallExpression",
        callee,
        arguments: _arguments,
        optional,
    });
}
export function classProperty(key, value = null, typeAnnotation = null, decorators = null, computed = false, _static = false) {
    return validateNode({
        type: "ClassProperty",
        key,
        value,
        typeAnnotation,
        decorators,
        computed,
        static: _static,
    });
}
export function classAccessorProperty(key, value = null, typeAnnotation = null, decorators = null, computed = false, _static = false) {
    return validateNode({
        type: "ClassAccessorProperty",
        key,
        value,
        typeAnnotation,
        decorators,
        computed,
        static: _static,
    });
}
export function classPrivateProperty(key, value = null, decorators = null, _static = false) {
    return validateNode({
        type: "ClassPrivateProperty",
        key,
        value,
        decorators,
        static: _static,
    });
}
export function classPrivateMethod(kind = "method", key, params, body, _static = false) {
    return validateNode({
        type: "ClassPrivateMethod",
        kind,
        key,
        params,
        body,
        static: _static,
    });
}
export function privateName(id) {
    return validateNode({
        type: "PrivateName",
        id,
    });
}
export function staticBlock(body) {
    return validateNode({
        type: "StaticBlock",
        body,
    });
}
export function anyTypeAnnotation() {
    return {
        type: "AnyTypeAnnotation",
    };
}
export function arrayTypeAnnotation(elementType) {
    return validateNode({
        type: "ArrayTypeAnnotation",
        elementType,
    });
}
export function booleanTypeAnnotation() {
    return {
        type: "BooleanTypeAnnotation",
    };
}
export function booleanLiteralTypeAnnotation(value) {
    return validateNode({
        type: "BooleanLiteralTypeAnnotation",
        value,
    });
}
export function nullLiteralTypeAnnotation() {
    return {
        type: "NullLiteralTypeAnnotation",
    };
}
export function classImplements(id, typeParameters = null) {
    return validateNode({
        type: "ClassImplements",
        id,
        typeParameters,
    });
}
export function declareClass(id, typeParameters = null, _extends = null, body) {
    return validateNode({
        type: "DeclareClass",
        id,
        typeParameters,
        extends: _extends,
        body,
    });
}
export function declareFunction(id) {
    return validateNode({
        type: "DeclareFunction",
        id,
    });
}
export function declareInterface(id, typeParameters = null, _extends = null, body) {
    return validateNode({
        type: "DeclareInterface",
        id,
        typeParameters,
        extends: _extends,
        body,
    });
}
export function declareModule(id, body, kind = null) {
    return validateNode({
        type: "DeclareModule",
        id,
        body,
        kind,
    });
}
export function declareModuleExports(typeAnnotation) {
    return validateNode({
        type: "DeclareModuleExports",
        typeAnnotation,
    });
}
export function declareTypeAlias(id, typeParameters = null, right) {
    return validateNode({
        type: "DeclareTypeAlias",
        id,
        typeParameters,
        right,
    });
}
export function declareOpaqueType(id, typeParameters = null, supertype = null) {
    return validateNode({
        type: "DeclareOpaqueType",
        id,
        typeParameters,
        supertype,
    });
}
export function declareVariable(id) {
    return validateNode({
        type: "DeclareVariable",
        id,
    });
}
export function declareExportDeclaration(declaration = null, specifiers = null, source = null) {
    return validateNode({
        type: "DeclareExportDeclaration",
        declaration,
        specifiers,
        source,
    });
}
export function declareExportAllDeclaration(source) {
    return validateNode({
        type: "DeclareExportAllDeclaration",
        source,
    });
}
export function declaredPredicate(value) {
    return validateNode({
        type: "DeclaredPredicate",
        value,
    });
}
export function existsTypeAnnotation() {
    return {
        type: "ExistsTypeAnnotation",
    };
}
export function functionTypeAnnotation(typeParameters = null, params, rest = null, returnType) {
    return validateNode({
        type: "FunctionTypeAnnotation",
        typeParameters,
        params,
        rest,
        returnType,
    });
}
export function functionTypeParam(name = null, typeAnnotation) {
    return validateNode({
        type: "FunctionTypeParam",
        name,
        typeAnnotation,
    });
}
export function genericTypeAnnotation(id, typeParameters = null) {
    return validateNode({
        type: "GenericTypeAnnotation",
        id,
        typeParameters,
    });
}
export function inferredPredicate() {
    return {
        type: "InferredPredicate",
    };
}
export function interfaceExtends(id, typeParameters = null) {
    return validateNode({
        type: "InterfaceExtends",
        id,
        typeParameters,
    });
}
export function interfaceDeclaration(id, typeParameters = null, _extends = null, body) {
    return validateNode({
        type: "InterfaceDeclaration",
        id,
        typeParameters,
        extends: _extends,
        body,
    });
}
export function interfaceTypeAnnotation(_extends = null, body) {
    return validateNode({
        type: "InterfaceTypeAnnotation",
        extends: _extends,
        body,
    });
}
export function intersectionTypeAnnotation(types) {
    return validateNode({
        type: "IntersectionTypeAnnotation",
        types,
    });
}
export function mixedTypeAnnotation() {
    return {
        type: "MixedTypeAnnotation",
    };
}
export function emptyTypeAnnotation() {
    return {
        type: "EmptyTypeAnnotation",
    };
}
export function nullableTypeAnnotation(typeAnnotation) {
    return validateNode({
        type: "NullableTypeAnnotation",
        typeAnnotation,
    });
}
export function numberLiteralTypeAnnotation(value) {
    return validateNode({
        type: "NumberLiteralTypeAnnotation",
        value,
    });
}
export function numberTypeAnnotation() {
    return {
        type: "NumberTypeAnnotation",
    };
}
export function objectTypeAnnotation(properties, indexers = [], callProperties = [], internalSlots = [], exact = false) {
    return validateNode({
        type: "ObjectTypeAnnotation",
        properties,
        indexers,
        callProperties,
        internalSlots,
        exact,
    });
}
export function objectTypeInternalSlot(id, value, optional, _static, method) {
    return validateNode({
        type: "ObjectTypeInternalSlot",
        id,
        value,
        optional,
        static: _static,
        method,
    });
}
export function objectTypeCallProperty(value) {
    return validateNode({
        type: "ObjectTypeCallProperty",
        value,
        static: null,
    });
}
export function objectTypeIndexer(id = null, key, value, variance = null) {
    return validateNode({
        type: "ObjectTypeIndexer",
        id,
        key,
        value,
        variance,
        static: null,
    });
}
export function objectTypeProperty(key, value, variance = null) {
    return validateNode({
        type: "ObjectTypeProperty",
        key,
        value,
        variance,
        kind: null,
        method: null,
        optional: null,
        proto: null,
        static: null,
    });
}
export function objectTypeSpreadProperty(argument) {
    return validateNode({
        type: "ObjectTypeSpreadProperty",
        argument,
    });
}
export function opaqueType(id, typeParameters = null, supertype = null, impltype) {
    return validateNode({
        type: "OpaqueType",
        id,
        typeParameters,
        supertype,
        impltype,
    });
}
export function qualifiedTypeIdentifier(id, qualification) {
    return validateNode({
        type: "QualifiedTypeIdentifier",
        id,
        qualification,
    });
}
export function stringLiteralTypeAnnotation(value) {
    return validateNode({
        type: "StringLiteralTypeAnnotation",
        value,
    });
}
export function stringTypeAnnotation() {
    return {
        type: "StringTypeAnnotation",
    };
}
export function symbolTypeAnnotation() {
    return {
        type: "SymbolTypeAnnotation",
    };
}
export function thisTypeAnnotation() {
    return {
        type: "ThisTypeAnnotation",
    };
}
export function tupleTypeAnnotation(types) {
    return validateNode({
        type: "TupleTypeAnnotation",
        types,
    });
}
export function typeofTypeAnnotation(argument) {
    return validateNode({
        type: "TypeofTypeAnnotation",
        argument,
    });
}
export function typeAlias(id, typeParameters = null, right) {
    return validateNode({
        type: "TypeAlias",
        id,
        typeParameters,
        right,
    });
}
export function typeAnnotation(typeAnnotation) {
    return validateNode({
        type: "TypeAnnotation",
        typeAnnotation,
    });
}
export function typeCastExpression(expression, typeAnnotation) {
    return validateNode({
        type: "TypeCastExpression",
        expression,
        typeAnnotation,
    });
}
export function typeParameter(bound = null, _default = null, variance = null) {
    return validateNode({
        type: "TypeParameter",
        bound,
        default: _default,
        variance,
        name: null,
    });
}
export function typeParameterDeclaration(params) {
    return validateNode({
        type: "TypeParameterDeclaration",
        params,
    });
}
export function typeParameterInstantiation(params) {
    return validateNode({
        type: "TypeParameterInstantiation",
        params,
    });
}
export function unionTypeAnnotation(types) {
    return validateNode({
        type: "UnionTypeAnnotation",
        types,
    });
}
export function variance(kind) {
    return validateNode({
        type: "Variance",
        kind,
    });
}
export function voidTypeAnnotation() {
    return {
        type: "VoidTypeAnnotation",
    };
}
export function enumDeclaration(id, body) {
    return validateNode({
        type: "EnumDeclaration",
        id,
        body,
    });
}
export function enumBooleanBody(members) {
    return validateNode({
        type: "EnumBooleanBody",
        members,
        explicitType: null,
        hasUnknownMembers: null,
    });
}
export function enumNumberBody(members) {
    return validateNode({
        type: "EnumNumberBody",
        members,
        explicitType: null,
        hasUnknownMembers: null,
    });
}
export function enumStringBody(members) {
    return validateNode({
        type: "EnumStringBody",
        members,
        explicitType: null,
        hasUnknownMembers: null,
    });
}
export function enumSymbolBody(members) {
    return validateNode({
        type: "EnumSymbolBody",
        members,
        hasUnknownMembers: null,
    });
}
export function enumBooleanMember(id) {
    return validateNode({
        type: "EnumBooleanMember",
        id,
        init: null,
    });
}
export function enumNumberMember(id, init) {
    return validateNode({
        type: "EnumNumberMember",
        id,
        init,
    });
}
export function enumStringMember(id, init) {
    return validateNode({
        type: "EnumStringMember",
        id,
        init,
    });
}
export function enumDefaultedMember(id) {
    return validateNode({
        type: "EnumDefaultedMember",
        id,
    });
}
export function indexedAccessType(objectType, indexType) {
    return validateNode({
        type: "IndexedAccessType",
        objectType,
        indexType,
    });
}
export function optionalIndexedAccessType(objectType, indexType) {
    return validateNode({
        type: "OptionalIndexedAccessType",
        objectType,
        indexType,
        optional: null,
    });
}
export function jsxAttribute(name, value = null) {
    return validateNode({
        type: "JSXAttribute",
        name,
        value,
    });
}
export { jsxAttribute as jSXAttribute };
export function jsxClosingElement(name) {
    return validateNode({
        type: "JSXClosingElement",
        name,
    });
}
export { jsxClosingElement as jSXClosingElement };
export function jsxElement(openingElement, closingElement = null, children, selfClosing = null) {
    return validateNode({
        type: "JSXElement",
        openingElement,
        closingElement,
        children,
        selfClosing,
    });
}
export { jsxElement as jSXElement };
export function jsxEmptyExpression() {
    return {
        type: "JSXEmptyExpression",
    };
}
export { jsxEmptyExpression as jSXEmptyExpression };
export function jsxExpressionContainer(expression) {
    return validateNode({
        type: "JSXExpressionContainer",
        expression,
    });
}
export { jsxExpressionContainer as jSXExpressionContainer };
export function jsxSpreadChild(expression) {
    return validateNode({
        type: "JSXSpreadChild",
        expression,
    });
}
export { jsxSpreadChild as jSXSpreadChild };
export function jsxIdentifier(name) {
    return validateNode({
        type: "JSXIdentifier",
        name,
    });
}
export { jsxIdentifier as jSXIdentifier };
export function jsxMemberExpression(object, property) {
    return validateNode({
        type: "JSXMemberExpression",
        object,
        property,
    });
}
export { jsxMemberExpression as jSXMemberExpression };
export function jsxNamespacedName(namespace, name) {
    return validateNode({
        type: "JSXNamespacedName",
        namespace,
        name,
    });
}
export { jsxNamespacedName as jSXNamespacedName };
export function jsxOpeningElement(name, attributes, selfClosing = false) {
    return validateNode({
        type: "JSXOpeningElement",
        name,
        attributes,
        selfClosing,
    });
}
export { jsxOpeningElement as jSXOpeningElement };
export function jsxSpreadAttribute(argument) {
    return validateNode({
        type: "JSXSpreadAttribute",
        argument,
    });
}
export { jsxSpreadAttribute as jSXSpreadAttribute };
export function jsxText(value) {
    return validateNode({
        type: "JSXText",
        value,
    });
}
export { jsxText as jSXText };
export function jsxFragment(openingFragment, closingFragment, children) {
    return validateNode({
        type: "JSXFragment",
        openingFragment,
        closingFragment,
        children,
    });
}
export { jsxFragment as jSXFragment };
export function jsxOpeningFragment() {
    return {
        type: "JSXOpeningFragment",
    };
}
export { jsxOpeningFragment as jSXOpeningFragment };
export function jsxClosingFragment() {
    return {
        type: "JSXClosingFragment",
    };
}
export { jsxClosingFragment as jSXClosingFragment };
export function noop() {
    return {
        type: "Noop",
    };
}
export function placeholder(expectedNode, name) {
    return validateNode({
        type: "Placeholder",
        expectedNode,
        name,
    });
}
export function v8IntrinsicIdentifier(name) {
    return validateNode({
        type: "V8IntrinsicIdentifier",
        name,
    });
}
export function argumentPlaceholder() {
    return {
        type: "ArgumentPlaceholder",
    };
}
export function bindExpression(object, callee) {
    return validateNode({
        type: "BindExpression",
        object,
        callee,
    });
}
export function importAttribute(key, value) {
    return validateNode({
        type: "ImportAttribute",
        key,
        value,
    });
}
export function decorator(expression) {
    return validateNode({
        type: "Decorator",
        expression,
    });
}
export function doExpression(body, async = false) {
    return validateNode({
        type: "DoExpression",
        body,
        async,
    });
}
export function exportDefaultSpecifier(exported) {
    return validateNode({
        type: "ExportDefaultSpecifier",
        exported,
    });
}
export function recordExpression(properties) {
    return validateNode({
        type: "RecordExpression",
        properties,
    });
}
export function tupleExpression(elements = []) {
    return validateNode({
        type: "TupleExpression",
        elements,
    });
}
export function decimalLiteral(value) {
    return validateNode({
        type: "DecimalLiteral",
        value,
    });
}
export function moduleExpression(body) {
    return validateNode({
        type: "ModuleExpression",
        body,
    });
}
export function topicReference() {
    return {
        type: "TopicReference",
    };
}
export function pipelineTopicExpression(expression) {
    return validateNode({
        type: "PipelineTopicExpression",
        expression,
    });
}
export function pipelineBareFunction(callee) {
    return validateNode({
        type: "PipelineBareFunction",
        callee,
    });
}
export function pipelinePrimaryTopicReference() {
    return {
        type: "PipelinePrimaryTopicReference",
    };
}
export function tsParameterProperty(parameter) {
    return validateNode({
        type: "TSParameterProperty",
        parameter,
    });
}
export { tsParameterProperty as tSParameterProperty };
export function tsDeclareFunction(id = null, typeParameters = null, params, returnType = null) {
    return validateNode({
        type: "TSDeclareFunction",
        id,
        typeParameters,
        params,
        returnType,
    });
}
export { tsDeclareFunction as tSDeclareFunction };
export function tsDeclareMethod(decorators = null, key, typeParameters = null, params, returnType = null) {
    return validateNode({
        type: "TSDeclareMethod",
        decorators,
        key,
        typeParameters,
        params,
        returnType,
    });
}
export { tsDeclareMethod as tSDeclareMethod };
export function tsQualifiedName(left, right) {
    return validateNode({
        type: "TSQualifiedName",
        left,
        right,
    });
}
export { tsQualifiedName as tSQualifiedName };
export function tsCallSignatureDeclaration(typeParameters = null, parameters, typeAnnotation = null) {
    return validateNode({
        type: "TSCallSignatureDeclaration",
        typeParameters,
        parameters,
        typeAnnotation,
    });
}
export { tsCallSignatureDeclaration as tSCallSignatureDeclaration };
export function tsConstructSignatureDeclaration(typeParameters = null, parameters, typeAnnotation = null) {
    return validateNode({
        type: "TSConstructSignatureDeclaration",
        typeParameters,
        parameters,
        typeAnnotation,
    });
}
export { tsConstructSignatureDeclaration as tSConstructSignatureDeclaration };
export function tsPropertySignature(key, typeAnnotation = null) {
    return validateNode({
        type: "TSPropertySignature",
        key,
        typeAnnotation,
        kind: null,
    });
}
export { tsPropertySignature as tSPropertySignature };
export function tsMethodSignature(key, typeParameters = null, parameters, typeAnnotation = null) {
    return validateNode({
        type: "TSMethodSignature",
        key,
        typeParameters,
        parameters,
        typeAnnotation,
        kind: null,
    });
}
export { tsMethodSignature as tSMethodSignature };
export function tsIndexSignature(parameters, typeAnnotation = null) {
    return validateNode({
        type: "TSIndexSignature",
        parameters,
        typeAnnotation,
    });
}
export { tsIndexSignature as tSIndexSignature };
export function tsAnyKeyword() {
    return {
        type: "TSAnyKeyword",
    };
}
export { tsAnyKeyword as tSAnyKeyword };
export function tsBooleanKeyword() {
    return {
        type: "TSBooleanKeyword",
    };
}
export { tsBooleanKeyword as tSBooleanKeyword };
export function tsBigIntKeyword() {
    return {
        type: "TSBigIntKeyword",
    };
}
export { tsBigIntKeyword as tSBigIntKeyword };
export function tsIntrinsicKeyword() {
    return {
        type: "TSIntrinsicKeyword",
    };
}
export { tsIntrinsicKeyword as tSIntrinsicKeyword };
export function tsNeverKeyword() {
    return {
        type: "TSNeverKeyword",
    };
}
export { tsNeverKeyword as tSNeverKeyword };
export function tsNullKeyword() {
    return {
        type: "TSNullKeyword",
    };
}
export { tsNullKeyword as tSNullKeyword };
export function tsNumberKeyword() {
    return {
        type: "TSNumberKeyword",
    };
}
export { tsNumberKeyword as tSNumberKeyword };
export function tsObjectKeyword() {
    return {
        type: "TSObjectKeyword",
    };
}
export { tsObjectKeyword as tSObjectKeyword };
export function tsStringKeyword() {
    return {
        type: "TSStringKeyword",
    };
}
export { tsStringKeyword as tSStringKeyword };
export function tsSymbolKeyword() {
    return {
        type: "TSSymbolKeyword",
    };
}
export { tsSymbolKeyword as tSSymbolKeyword };
export function tsUndefinedKeyword() {
    return {
        type: "TSUndefinedKeyword",
    };
}
export { tsUndefinedKeyword as tSUndefinedKeyword };
export function tsUnknownKeyword() {
    return {
        type: "TSUnknownKeyword",
    };
}
export { tsUnknownKeyword as tSUnknownKeyword };
export function tsVoidKeyword() {
    return {
        type: "TSVoidKeyword",
    };
}
export { tsVoidKeyword as tSVoidKeyword };
export function tsThisType() {
    return {
        type: "TSThisType",
    };
}
export { tsThisType as tSThisType };
export function tsFunctionType(typeParameters = null, parameters, typeAnnotation = null) {
    return validateNode({
        type: "TSFunctionType",
        typeParameters,
        parameters,
        typeAnnotation,
    });
}
export { tsFunctionType as tSFunctionType };
export function tsConstructorType(typeParameters = null, parameters, typeAnnotation = null) {
    return validateNode({
        type: "TSConstructorType",
        typeParameters,
        parameters,
        typeAnnotation,
    });
}
export { tsConstructorType as tSConstructorType };
export function tsTypeReference(typeName, typeParameters = null) {
    return validateNode({
        type: "TSTypeReference",
        typeName,
        typeParameters,
    });
}
export { tsTypeReference as tSTypeReference };
export function tsTypePredicate(parameterName, typeAnnotation = null, asserts = null) {
    return validateNode({
        type: "TSTypePredicate",
        parameterName,
        typeAnnotation,
        asserts,
    });
}
export { tsTypePredicate as tSTypePredicate };
export function tsTypeQuery(exprName, typeParameters = null) {
    return validateNode({
        type: "TSTypeQuery",
        exprName,
        typeParameters,
    });
}
export { tsTypeQuery as tSTypeQuery };
export function tsTypeLiteral(members) {
    return validateNode({
        type: "TSTypeLiteral",
        members,
    });
}
export { tsTypeLiteral as tSTypeLiteral };
export function tsArrayType(elementType) {
    return validateNode({
        type: "TSArrayType",
        elementType,
    });
}
export { tsArrayType as tSArrayType };
export function tsTupleType(elementTypes) {
    return validateNode({
        type: "TSTupleType",
        elementTypes,
    });
}
export { tsTupleType as tSTupleType };
export function tsOptionalType(typeAnnotation) {
    return validateNode({
        type: "TSOptionalType",
        typeAnnotation,
    });
}
export { tsOptionalType as tSOptionalType };
export function tsRestType(typeAnnotation) {
    return validateNode({
        type: "TSRestType",
        typeAnnotation,
    });
}
export { tsRestType as tSRestType };
export function tsNamedTupleMember(label, elementType, optional = false) {
    return validateNode({
        type: "TSNamedTupleMember",
        label,
        elementType,
        optional,
    });
}
export { tsNamedTupleMember as tSNamedTupleMember };
export function tsUnionType(types) {
    return validateNode({
        type: "TSUnionType",
        types,
    });
}
export { tsUnionType as tSUnionType };
export function tsIntersectionType(types) {
    return validateNode({
        type: "TSIntersectionType",
        types,
    });
}
export { tsIntersectionType as tSIntersectionType };
export function tsConditionalType(checkType, extendsType, trueType, falseType) {
    return validateNode({
        type: "TSConditionalType",
        checkType,
        extendsType,
        trueType,
        falseType,
    });
}
export { tsConditionalType as tSConditionalType };
export function tsInferType(typeParameter) {
    return validateNode({
        type: "TSInferType",
        typeParameter,
    });
}
export { tsInferType as tSInferType };
export function tsParenthesizedType(typeAnnotation) {
    return validateNode({
        type: "TSParenthesizedType",
        typeAnnotation,
    });
}
export { tsParenthesizedType as tSParenthesizedType };
export function tsTypeOperator(typeAnnotation) {
    return validateNode({
        type: "TSTypeOperator",
        typeAnnotation,
        operator: null,
    });
}
export { tsTypeOperator as tSTypeOperator };
export function tsIndexedAccessType(objectType, indexType) {
    return validateNode({
        type: "TSIndexedAccessType",
        objectType,
        indexType,
    });
}
export { tsIndexedAccessType as tSIndexedAccessType };
export function tsMappedType(typeParameter, typeAnnotation = null, nameType = null) {
    return validateNode({
        type: "TSMappedType",
        typeParameter,
        typeAnnotation,
        nameType,
    });
}
export { tsMappedType as tSMappedType };
export function tsLiteralType(literal) {
    return validateNode({
        type: "TSLiteralType",
        literal,
    });
}
export { tsLiteralType as tSLiteralType };
export function tsExpressionWithTypeArguments(expression, typeParameters = null) {
    return validateNode({
        type: "TSExpressionWithTypeArguments",
        expression,
        typeParameters,
    });
}
export { tsExpressionWithTypeArguments as tSExpressionWithTypeArguments };
export function tsInterfaceDeclaration(id, typeParameters = null, _extends = null, body) {
    return validateNode({
        type: "TSInterfaceDeclaration",
        id,
        typeParameters,
        extends: _extends,
        body,
    });
}
export { tsInterfaceDeclaration as tSInterfaceDeclaration };
export function tsInterfaceBody(body) {
    return validateNode({
        type: "TSInterfaceBody",
        body,
    });
}
export { tsInterfaceBody as tSInterfaceBody };
export function tsTypeAliasDeclaration(id, typeParameters = null, typeAnnotation) {
    return validateNode({
        type: "TSTypeAliasDeclaration",
        id,
        typeParameters,
        typeAnnotation,
    });
}
export { tsTypeAliasDeclaration as tSTypeAliasDeclaration };
export function tsInstantiationExpression(expression, typeParameters = null) {
    return validateNode({
        type: "TSInstantiationExpression",
        expression,
        typeParameters,
    });
}
export { tsInstantiationExpression as tSInstantiationExpression };
export function tsAsExpression(expression, typeAnnotation) {
    return validateNode({
        type: "TSAsExpression",
        expression,
        typeAnnotation,
    });
}
export { tsAsExpression as tSAsExpression };
export function tsSatisfiesExpression(expression, typeAnnotation) {
    return validateNode({
        type: "TSSatisfiesExpression",
        expression,
        typeAnnotation,
    });
}
export { tsSatisfiesExpression as tSSatisfiesExpression };
export function tsTypeAssertion(typeAnnotation, expression) {
    return validateNode({
        type: "TSTypeAssertion",
        typeAnnotation,
        expression,
    });
}
export { tsTypeAssertion as tSTypeAssertion };
export function tsEnumDeclaration(id, members) {
    return validateNode({
        type: "TSEnumDeclaration",
        id,
        members,
    });
}
export { tsEnumDeclaration as tSEnumDeclaration };
export function tsEnumMember(id, initializer = null) {
    return validateNode({
        type: "TSEnumMember",
        id,
        initializer,
    });
}
export { tsEnumMember as tSEnumMember };
export function tsModuleDeclaration(id, body) {
    return validateNode({
        type: "TSModuleDeclaration",
        id,
        body,
    });
}
export { tsModuleDeclaration as tSModuleDeclaration };
export function tsModuleBlock(body) {
    return validateNode({
        type: "TSModuleBlock",
        body,
    });
}
export { tsModuleBlock as tSModuleBlock };
export function tsImportType(argument, qualifier = null, typeParameters = null) {
    return validateNode({
        type: "TSImportType",
        argument,
        qualifier,
        typeParameters,
    });
}
export { tsImportType as tSImportType };
export function tsImportEqualsDeclaration(id, moduleReference) {
    return validateNode({
        type: "TSImportEqualsDeclaration",
        id,
        moduleReference,
        isExport: null,
    });
}
export { tsImportEqualsDeclaration as tSImportEqualsDeclaration };
export function tsExternalModuleReference(expression) {
    return validateNode({
        type: "TSExternalModuleReference",
        expression,
    });
}
export { tsExternalModuleReference as tSExternalModuleReference };
export function tsNonNullExpression(expression) {
    return validateNode({
        type: "TSNonNullExpression",
        expression,
    });
}
export { tsNonNullExpression as tSNonNullExpression };
export function tsExportAssignment(expression) {
    return validateNode({
        type: "TSExportAssignment",
        expression,
    });
}
export { tsExportAssignment as tSExportAssignment };
export function tsNamespaceExportDeclaration(id) {
    return validateNode({
        type: "TSNamespaceExportDeclaration",
        id,
    });
}
export { tsNamespaceExportDeclaration as tSNamespaceExportDeclaration };
export function tsTypeAnnotation(typeAnnotation) {
    return validateNode({
        type: "TSTypeAnnotation",
        typeAnnotation,
    });
}
export { tsTypeAnnotation as tSTypeAnnotation };
export function tsTypeParameterInstantiation(params) {
    return validateNode({
        type: "TSTypeParameterInstantiation",
        params,
    });
}
export { tsTypeParameterInstantiation as tSTypeParameterInstantiation };
export function tsTypeParameterDeclaration(params) {
    return validateNode({
        type: "TSTypeParameterDeclaration",
        params,
    });
}
export { tsTypeParameterDeclaration as tSTypeParameterDeclaration };
export function tsTypeParameter(constraint = null, _default = null, name) {
    return validateNode({
        type: "TSTypeParameter",
        constraint,
        default: _default,
        name,
    });
}
export { tsTypeParameter as tSTypeParameter };
/** @deprecated */
function NumberLiteral(value) {
    deprecationWarning("NumberLiteral", "NumericLiteral", "The node type ");
    return numericLiteral(value);
}
export { NumberLiteral as numberLiteral };
/** @deprecated */
function RegexLiteral(pattern, flags = "") {
    deprecationWarning("RegexLiteral", "RegExpLiteral", "The node type ");
    return regExpLiteral(pattern, flags);
}
export { RegexLiteral as regexLiteral };
/** @deprecated */
function RestProperty(argument) {
    deprecationWarning("RestProperty", "RestElement", "The node type ");
    return restElement(argument);
}
export { RestProperty as restProperty };
/** @deprecated */
function SpreadProperty(argument) {
    deprecationWarning("SpreadProperty", "SpreadElement", "The node type ");
    return spreadElement(argument);
}
export { SpreadProperty as spreadProperty };
