/*
 * This file is auto-generated! Do not modify it directly.
 * To re-generate run 'make build'
 */
import is from "../../validators/is.ts";
import deprecationWarning from "../../utils/deprecationWarning.ts";
function assert(type, node, opts) {
    if (!is(type, node, opts)) {
        throw new Error(`Expected type "${type}" with option ${JSON.stringify(opts)}, ` +
            `but instead got "${node.type}".`);
    }
}
export function assertArrayExpression(node, opts) {
    assert("ArrayExpression", node, opts);
}
export function assertAssignmentExpression(node, opts) {
    assert("AssignmentExpression", node, opts);
}
export function assertBinaryExpression(node, opts) {
    assert("BinaryExpression", node, opts);
}
export function assertInterpreterDirective(node, opts) {
    assert("InterpreterDirective", node, opts);
}
export function assertDirective(node, opts) {
    assert("Directive", node, opts);
}
export function assertDirectiveLiteral(node, opts) {
    assert("DirectiveLiteral", node, opts);
}
export function assertBlockStatement(node, opts) {
    assert("BlockStatement", node, opts);
}
export function assertBreakStatement(node, opts) {
    assert("BreakStatement", node, opts);
}
export function assertCallExpression(node, opts) {
    assert("CallExpression", node, opts);
}
export function assertArkTSCallExpression(node, opts) {
    assert("ArkTSCallExpression", node, opts);
}
export function assertCatchClause(node, opts) {
    assert("CatchClause", node, opts);
}
export function assertConditionalExpression(node, opts) {
    assert("ConditionalExpression", node, opts);
}
export function assertContinueStatement(node, opts) {
    assert("ContinueStatement", node, opts);
}
export function assertDebuggerStatement(node, opts) {
    assert("DebuggerStatement", node, opts);
}
export function assertDoWhileStatement(node, opts) {
    assert("DoWhileStatement", node, opts);
}
export function assertEmptyStatement(node, opts) {
    assert("EmptyStatement", node, opts);
}
export function assertExpressionStatement(node, opts) {
    assert("ExpressionStatement", node, opts);
}
export function assertFile(node, opts) {
    assert("File", node, opts);
}
export function assertForInStatement(node, opts) {
    assert("ForInStatement", node, opts);
}
export function assertForStatement(node, opts) {
    assert("ForStatement", node, opts);
}
export function assertFunctionDeclaration(node, opts) {
    assert("FunctionDeclaration", node, opts);
}
export function assertFunctionExpression(node, opts) {
    assert("FunctionExpression", node, opts);
}
export function assertIdentifier(node, opts) {
    assert("Identifier", node, opts);
}
export function assertIfStatement(node, opts) {
    assert("IfStatement", node, opts);
}
export function assertLabeledStatement(node, opts) {
    assert("LabeledStatement", node, opts);
}
export function assertStringLiteral(node, opts) {
    assert("StringLiteral", node, opts);
}
export function assertNumericLiteral(node, opts) {
    assert("NumericLiteral", node, opts);
}
export function assertNullLiteral(node, opts) {
    assert("NullLiteral", node, opts);
}
export function assertBooleanLiteral(node, opts) {
    assert("BooleanLiteral", node, opts);
}
export function assertRegExpLiteral(node, opts) {
    assert("RegExpLiteral", node, opts);
}
export function assertLogicalExpression(node, opts) {
    assert("LogicalExpression", node, opts);
}
export function assertMemberExpression(node, opts) {
    assert("MemberExpression", node, opts);
}
export function assertNewExpression(node, opts) {
    assert("NewExpression", node, opts);
}
export function assertProgram(node, opts) {
    assert("Program", node, opts);
}
export function assertObjectExpression(node, opts) {
    assert("ObjectExpression", node, opts);
}
export function assertObjectMethod(node, opts) {
    assert("ObjectMethod", node, opts);
}
export function assertObjectProperty(node, opts) {
    assert("ObjectProperty", node, opts);
}
export function assertRestElement(node, opts) {
    assert("RestElement", node, opts);
}
export function assertReturnStatement(node, opts) {
    assert("ReturnStatement", node, opts);
}
export function assertSequenceExpression(node, opts) {
    assert("SequenceExpression", node, opts);
}
export function assertParenthesizedExpression(node, opts) {
    assert("ParenthesizedExpression", node, opts);
}
export function assertSwitchCase(node, opts) {
    assert("SwitchCase", node, opts);
}
export function assertSwitchStatement(node, opts) {
    assert("SwitchStatement", node, opts);
}
export function assertThisExpression(node, opts) {
    assert("ThisExpression", node, opts);
}
export function assertThrowStatement(node, opts) {
    assert("ThrowStatement", node, opts);
}
export function assertTryStatement(node, opts) {
    assert("TryStatement", node, opts);
}
export function assertUnaryExpression(node, opts) {
    assert("UnaryExpression", node, opts);
}
export function assertUpdateExpression(node, opts) {
    assert("UpdateExpression", node, opts);
}
export function assertVariableDeclaration(node, opts) {
    assert("VariableDeclaration", node, opts);
}
export function assertVariableDeclarator(node, opts) {
    assert("VariableDeclarator", node, opts);
}
export function assertWhileStatement(node, opts) {
    assert("WhileStatement", node, opts);
}
export function assertWithStatement(node, opts) {
    assert("WithStatement", node, opts);
}
export function assertAssignmentPattern(node, opts) {
    assert("AssignmentPattern", node, opts);
}
export function assertArrayPattern(node, opts) {
    assert("ArrayPattern", node, opts);
}
export function assertArrowFunctionExpression(node, opts) {
    assert("ArrowFunctionExpression", node, opts);
}
export function assertClassBody(node, opts) {
    assert("ClassBody", node, opts);
}
export function assertClassExpression(node, opts) {
    assert("ClassExpression", node, opts);
}
export function assertClassDeclaration(node, opts) {
    assert("ClassDeclaration", node, opts);
}
export function assertArkTSStructDeclaration(node, opts) {
    assert("ArkTSStructDeclaration", node, opts);
}
export function assertExportAllDeclaration(node, opts) {
    assert("ExportAllDeclaration", node, opts);
}
export function assertExportDefaultDeclaration(node, opts) {
    assert("ExportDefaultDeclaration", node, opts);
}
export function assertExportNamedDeclaration(node, opts) {
    assert("ExportNamedDeclaration", node, opts);
}
export function assertExportSpecifier(node, opts) {
    assert("ExportSpecifier", node, opts);
}
export function assertForOfStatement(node, opts) {
    assert("ForOfStatement", node, opts);
}
export function assertImportDeclaration(node, opts) {
    assert("ImportDeclaration", node, opts);
}
export function assertImportDefaultSpecifier(node, opts) {
    assert("ImportDefaultSpecifier", node, opts);
}
export function assertImportNamespaceSpecifier(node, opts) {
    assert("ImportNamespaceSpecifier", node, opts);
}
export function assertImportSpecifier(node, opts) {
    assert("ImportSpecifier", node, opts);
}
export function assertImportExpression(node, opts) {
    assert("ImportExpression", node, opts);
}
export function assertMetaProperty(node, opts) {
    assert("MetaProperty", node, opts);
}
export function assertClassMethod(node, opts) {
    assert("ClassMethod", node, opts);
}
export function assertObjectPattern(node, opts) {
    assert("ObjectPattern", node, opts);
}
export function assertSpreadElement(node, opts) {
    assert("SpreadElement", node, opts);
}
export function assertSuper(node, opts) {
    assert("Super", node, opts);
}
export function assertTaggedTemplateExpression(node, opts) {
    assert("TaggedTemplateExpression", node, opts);
}
export function assertTemplateElement(node, opts) {
    assert("TemplateElement", node, opts);
}
export function assertTemplateLiteral(node, opts) {
    assert("TemplateLiteral", node, opts);
}
export function assertYieldExpression(node, opts) {
    assert("YieldExpression", node, opts);
}
export function assertAwaitExpression(node, opts) {
    assert("AwaitExpression", node, opts);
}
export function assertImport(node, opts) {
    assert("Import", node, opts);
}
export function assertBigIntLiteral(node, opts) {
    assert("BigIntLiteral", node, opts);
}
export function assertExportNamespaceSpecifier(node, opts) {
    assert("ExportNamespaceSpecifier", node, opts);
}
export function assertOptionalMemberExpression(node, opts) {
    assert("OptionalMemberExpression", node, opts);
}
export function assertOptionalCallExpression(node, opts) {
    assert("OptionalCallExpression", node, opts);
}
export function assertClassProperty(node, opts) {
    assert("ClassProperty", node, opts);
}
export function assertClassAccessorProperty(node, opts) {
    assert("ClassAccessorProperty", node, opts);
}
export function assertClassPrivateProperty(node, opts) {
    assert("ClassPrivateProperty", node, opts);
}
export function assertClassPrivateMethod(node, opts) {
    assert("ClassPrivateMethod", node, opts);
}
export function assertPrivateName(node, opts) {
    assert("PrivateName", node, opts);
}
export function assertStaticBlock(node, opts) {
    assert("StaticBlock", node, opts);
}
export function assertAnyTypeAnnotation(node, opts) {
    assert("AnyTypeAnnotation", node, opts);
}
export function assertArrayTypeAnnotation(node, opts) {
    assert("ArrayTypeAnnotation", node, opts);
}
export function assertBooleanTypeAnnotation(node, opts) {
    assert("BooleanTypeAnnotation", node, opts);
}
export function assertBooleanLiteralTypeAnnotation(node, opts) {
    assert("BooleanLiteralTypeAnnotation", node, opts);
}
export function assertNullLiteralTypeAnnotation(node, opts) {
    assert("NullLiteralTypeAnnotation", node, opts);
}
export function assertClassImplements(node, opts) {
    assert("ClassImplements", node, opts);
}
export function assertDeclareClass(node, opts) {
    assert("DeclareClass", node, opts);
}
export function assertDeclareFunction(node, opts) {
    assert("DeclareFunction", node, opts);
}
export function assertDeclareInterface(node, opts) {
    assert("DeclareInterface", node, opts);
}
export function assertDeclareModule(node, opts) {
    assert("DeclareModule", node, opts);
}
export function assertDeclareModuleExports(node, opts) {
    assert("DeclareModuleExports", node, opts);
}
export function assertDeclareTypeAlias(node, opts) {
    assert("DeclareTypeAlias", node, opts);
}
export function assertDeclareOpaqueType(node, opts) {
    assert("DeclareOpaqueType", node, opts);
}
export function assertDeclareVariable(node, opts) {
    assert("DeclareVariable", node, opts);
}
export function assertDeclareExportDeclaration(node, opts) {
    assert("DeclareExportDeclaration", node, opts);
}
export function assertDeclareExportAllDeclaration(node, opts) {
    assert("DeclareExportAllDeclaration", node, opts);
}
export function assertDeclaredPredicate(node, opts) {
    assert("DeclaredPredicate", node, opts);
}
export function assertExistsTypeAnnotation(node, opts) {
    assert("ExistsTypeAnnotation", node, opts);
}
export function assertFunctionTypeAnnotation(node, opts) {
    assert("FunctionTypeAnnotation", node, opts);
}
export function assertFunctionTypeParam(node, opts) {
    assert("FunctionTypeParam", node, opts);
}
export function assertGenericTypeAnnotation(node, opts) {
    assert("GenericTypeAnnotation", node, opts);
}
export function assertInferredPredicate(node, opts) {
    assert("InferredPredicate", node, opts);
}
export function assertInterfaceExtends(node, opts) {
    assert("InterfaceExtends", node, opts);
}
export function assertInterfaceDeclaration(node, opts) {
    assert("InterfaceDeclaration", node, opts);
}
export function assertInterfaceTypeAnnotation(node, opts) {
    assert("InterfaceTypeAnnotation", node, opts);
}
export function assertIntersectionTypeAnnotation(node, opts) {
    assert("IntersectionTypeAnnotation", node, opts);
}
export function assertMixedTypeAnnotation(node, opts) {
    assert("MixedTypeAnnotation", node, opts);
}
export function assertEmptyTypeAnnotation(node, opts) {
    assert("EmptyTypeAnnotation", node, opts);
}
export function assertNullableTypeAnnotation(node, opts) {
    assert("NullableTypeAnnotation", node, opts);
}
export function assertNumberLiteralTypeAnnotation(node, opts) {
    assert("NumberLiteralTypeAnnotation", node, opts);
}
export function assertNumberTypeAnnotation(node, opts) {
    assert("NumberTypeAnnotation", node, opts);
}
export function assertObjectTypeAnnotation(node, opts) {
    assert("ObjectTypeAnnotation", node, opts);
}
export function assertObjectTypeInternalSlot(node, opts) {
    assert("ObjectTypeInternalSlot", node, opts);
}
export function assertObjectTypeCallProperty(node, opts) {
    assert("ObjectTypeCallProperty", node, opts);
}
export function assertObjectTypeIndexer(node, opts) {
    assert("ObjectTypeIndexer", node, opts);
}
export function assertObjectTypeProperty(node, opts) {
    assert("ObjectTypeProperty", node, opts);
}
export function assertObjectTypeSpreadProperty(node, opts) {
    assert("ObjectTypeSpreadProperty", node, opts);
}
export function assertOpaqueType(node, opts) {
    assert("OpaqueType", node, opts);
}
export function assertQualifiedTypeIdentifier(node, opts) {
    assert("QualifiedTypeIdentifier", node, opts);
}
export function assertStringLiteralTypeAnnotation(node, opts) {
    assert("StringLiteralTypeAnnotation", node, opts);
}
export function assertStringTypeAnnotation(node, opts) {
    assert("StringTypeAnnotation", node, opts);
}
export function assertSymbolTypeAnnotation(node, opts) {
    assert("SymbolTypeAnnotation", node, opts);
}
export function assertThisTypeAnnotation(node, opts) {
    assert("ThisTypeAnnotation", node, opts);
}
export function assertTupleTypeAnnotation(node, opts) {
    assert("TupleTypeAnnotation", node, opts);
}
export function assertTypeofTypeAnnotation(node, opts) {
    assert("TypeofTypeAnnotation", node, opts);
}
export function assertTypeAlias(node, opts) {
    assert("TypeAlias", node, opts);
}
export function assertTypeAnnotation(node, opts) {
    assert("TypeAnnotation", node, opts);
}
export function assertTypeCastExpression(node, opts) {
    assert("TypeCastExpression", node, opts);
}
export function assertTypeParameter(node, opts) {
    assert("TypeParameter", node, opts);
}
export function assertTypeParameterDeclaration(node, opts) {
    assert("TypeParameterDeclaration", node, opts);
}
export function assertTypeParameterInstantiation(node, opts) {
    assert("TypeParameterInstantiation", node, opts);
}
export function assertUnionTypeAnnotation(node, opts) {
    assert("UnionTypeAnnotation", node, opts);
}
export function assertVariance(node, opts) {
    assert("Variance", node, opts);
}
export function assertVoidTypeAnnotation(node, opts) {
    assert("VoidTypeAnnotation", node, opts);
}
export function assertEnumDeclaration(node, opts) {
    assert("EnumDeclaration", node, opts);
}
export function assertEnumBooleanBody(node, opts) {
    assert("EnumBooleanBody", node, opts);
}
export function assertEnumNumberBody(node, opts) {
    assert("EnumNumberBody", node, opts);
}
export function assertEnumStringBody(node, opts) {
    assert("EnumStringBody", node, opts);
}
export function assertEnumSymbolBody(node, opts) {
    assert("EnumSymbolBody", node, opts);
}
export function assertEnumBooleanMember(node, opts) {
    assert("EnumBooleanMember", node, opts);
}
export function assertEnumNumberMember(node, opts) {
    assert("EnumNumberMember", node, opts);
}
export function assertEnumStringMember(node, opts) {
    assert("EnumStringMember", node, opts);
}
export function assertEnumDefaultedMember(node, opts) {
    assert("EnumDefaultedMember", node, opts);
}
export function assertIndexedAccessType(node, opts) {
    assert("IndexedAccessType", node, opts);
}
export function assertOptionalIndexedAccessType(node, opts) {
    assert("OptionalIndexedAccessType", node, opts);
}
export function assertJSXAttribute(node, opts) {
    assert("JSXAttribute", node, opts);
}
export function assertJSXClosingElement(node, opts) {
    assert("JSXClosingElement", node, opts);
}
export function assertJSXElement(node, opts) {
    assert("JSXElement", node, opts);
}
export function assertJSXEmptyExpression(node, opts) {
    assert("JSXEmptyExpression", node, opts);
}
export function assertJSXExpressionContainer(node, opts) {
    assert("JSXExpressionContainer", node, opts);
}
export function assertJSXSpreadChild(node, opts) {
    assert("JSXSpreadChild", node, opts);
}
export function assertJSXIdentifier(node, opts) {
    assert("JSXIdentifier", node, opts);
}
export function assertJSXMemberExpression(node, opts) {
    assert("JSXMemberExpression", node, opts);
}
export function assertJSXNamespacedName(node, opts) {
    assert("JSXNamespacedName", node, opts);
}
export function assertJSXOpeningElement(node, opts) {
    assert("JSXOpeningElement", node, opts);
}
export function assertJSXSpreadAttribute(node, opts) {
    assert("JSXSpreadAttribute", node, opts);
}
export function assertJSXText(node, opts) {
    assert("JSXText", node, opts);
}
export function assertJSXFragment(node, opts) {
    assert("JSXFragment", node, opts);
}
export function assertJSXOpeningFragment(node, opts) {
    assert("JSXOpeningFragment", node, opts);
}
export function assertJSXClosingFragment(node, opts) {
    assert("JSXClosingFragment", node, opts);
}
export function assertNoop(node, opts) {
    assert("Noop", node, opts);
}
export function assertPlaceholder(node, opts) {
    assert("Placeholder", node, opts);
}
export function assertV8IntrinsicIdentifier(node, opts) {
    assert("V8IntrinsicIdentifier", node, opts);
}
export function assertArgumentPlaceholder(node, opts) {
    assert("ArgumentPlaceholder", node, opts);
}
export function assertBindExpression(node, opts) {
    assert("BindExpression", node, opts);
}
export function assertImportAttribute(node, opts) {
    assert("ImportAttribute", node, opts);
}
export function assertDecorator(node, opts) {
    assert("Decorator", node, opts);
}
export function assertDoExpression(node, opts) {
    assert("DoExpression", node, opts);
}
export function assertExportDefaultSpecifier(node, opts) {
    assert("ExportDefaultSpecifier", node, opts);
}
export function assertRecordExpression(node, opts) {
    assert("RecordExpression", node, opts);
}
export function assertTupleExpression(node, opts) {
    assert("TupleExpression", node, opts);
}
export function assertDecimalLiteral(node, opts) {
    assert("DecimalLiteral", node, opts);
}
export function assertModuleExpression(node, opts) {
    assert("ModuleExpression", node, opts);
}
export function assertTopicReference(node, opts) {
    assert("TopicReference", node, opts);
}
export function assertPipelineTopicExpression(node, opts) {
    assert("PipelineTopicExpression", node, opts);
}
export function assertPipelineBareFunction(node, opts) {
    assert("PipelineBareFunction", node, opts);
}
export function assertPipelinePrimaryTopicReference(node, opts) {
    assert("PipelinePrimaryTopicReference", node, opts);
}
export function assertTSParameterProperty(node, opts) {
    assert("TSParameterProperty", node, opts);
}
export function assertTSDeclareFunction(node, opts) {
    assert("TSDeclareFunction", node, opts);
}
export function assertTSDeclareMethod(node, opts) {
    assert("TSDeclareMethod", node, opts);
}
export function assertTSQualifiedName(node, opts) {
    assert("TSQualifiedName", node, opts);
}
export function assertTSCallSignatureDeclaration(node, opts) {
    assert("TSCallSignatureDeclaration", node, opts);
}
export function assertTSConstructSignatureDeclaration(node, opts) {
    assert("TSConstructSignatureDeclaration", node, opts);
}
export function assertTSPropertySignature(node, opts) {
    assert("TSPropertySignature", node, opts);
}
export function assertTSMethodSignature(node, opts) {
    assert("TSMethodSignature", node, opts);
}
export function assertTSIndexSignature(node, opts) {
    assert("TSIndexSignature", node, opts);
}
export function assertTSAnyKeyword(node, opts) {
    assert("TSAnyKeyword", node, opts);
}
export function assertTSBooleanKeyword(node, opts) {
    assert("TSBooleanKeyword", node, opts);
}
export function assertTSBigIntKeyword(node, opts) {
    assert("TSBigIntKeyword", node, opts);
}
export function assertTSIntrinsicKeyword(node, opts) {
    assert("TSIntrinsicKeyword", node, opts);
}
export function assertTSNeverKeyword(node, opts) {
    assert("TSNeverKeyword", node, opts);
}
export function assertTSNullKeyword(node, opts) {
    assert("TSNullKeyword", node, opts);
}
export function assertTSNumberKeyword(node, opts) {
    assert("TSNumberKeyword", node, opts);
}
export function assertTSObjectKeyword(node, opts) {
    assert("TSObjectKeyword", node, opts);
}
export function assertTSStringKeyword(node, opts) {
    assert("TSStringKeyword", node, opts);
}
export function assertTSSymbolKeyword(node, opts) {
    assert("TSSymbolKeyword", node, opts);
}
export function assertTSUndefinedKeyword(node, opts) {
    assert("TSUndefinedKeyword", node, opts);
}
export function assertTSUnknownKeyword(node, opts) {
    assert("TSUnknownKeyword", node, opts);
}
export function assertTSVoidKeyword(node, opts) {
    assert("TSVoidKeyword", node, opts);
}
export function assertTSThisType(node, opts) {
    assert("TSThisType", node, opts);
}
export function assertTSFunctionType(node, opts) {
    assert("TSFunctionType", node, opts);
}
export function assertTSConstructorType(node, opts) {
    assert("TSConstructorType", node, opts);
}
export function assertTSTypeReference(node, opts) {
    assert("TSTypeReference", node, opts);
}
export function assertTSTypePredicate(node, opts) {
    assert("TSTypePredicate", node, opts);
}
export function assertTSTypeQuery(node, opts) {
    assert("TSTypeQuery", node, opts);
}
export function assertTSTypeLiteral(node, opts) {
    assert("TSTypeLiteral", node, opts);
}
export function assertTSArrayType(node, opts) {
    assert("TSArrayType", node, opts);
}
export function assertTSTupleType(node, opts) {
    assert("TSTupleType", node, opts);
}
export function assertTSOptionalType(node, opts) {
    assert("TSOptionalType", node, opts);
}
export function assertTSRestType(node, opts) {
    assert("TSRestType", node, opts);
}
export function assertTSNamedTupleMember(node, opts) {
    assert("TSNamedTupleMember", node, opts);
}
export function assertTSUnionType(node, opts) {
    assert("TSUnionType", node, opts);
}
export function assertTSIntersectionType(node, opts) {
    assert("TSIntersectionType", node, opts);
}
export function assertTSConditionalType(node, opts) {
    assert("TSConditionalType", node, opts);
}
export function assertTSInferType(node, opts) {
    assert("TSInferType", node, opts);
}
export function assertTSParenthesizedType(node, opts) {
    assert("TSParenthesizedType", node, opts);
}
export function assertTSTypeOperator(node, opts) {
    assert("TSTypeOperator", node, opts);
}
export function assertTSIndexedAccessType(node, opts) {
    assert("TSIndexedAccessType", node, opts);
}
export function assertTSMappedType(node, opts) {
    assert("TSMappedType", node, opts);
}
export function assertTSLiteralType(node, opts) {
    assert("TSLiteralType", node, opts);
}
export function assertTSExpressionWithTypeArguments(node, opts) {
    assert("TSExpressionWithTypeArguments", node, opts);
}
export function assertTSInterfaceDeclaration(node, opts) {
    assert("TSInterfaceDeclaration", node, opts);
}
export function assertTSInterfaceBody(node, opts) {
    assert("TSInterfaceBody", node, opts);
}
export function assertTSTypeAliasDeclaration(node, opts) {
    assert("TSTypeAliasDeclaration", node, opts);
}
export function assertTSInstantiationExpression(node, opts) {
    assert("TSInstantiationExpression", node, opts);
}
export function assertTSAsExpression(node, opts) {
    assert("TSAsExpression", node, opts);
}
export function assertTSSatisfiesExpression(node, opts) {
    assert("TSSatisfiesExpression", node, opts);
}
export function assertTSTypeAssertion(node, opts) {
    assert("TSTypeAssertion", node, opts);
}
export function assertTSEnumDeclaration(node, opts) {
    assert("TSEnumDeclaration", node, opts);
}
export function assertTSEnumMember(node, opts) {
    assert("TSEnumMember", node, opts);
}
export function assertTSModuleDeclaration(node, opts) {
    assert("TSModuleDeclaration", node, opts);
}
export function assertTSModuleBlock(node, opts) {
    assert("TSModuleBlock", node, opts);
}
export function assertTSImportType(node, opts) {
    assert("TSImportType", node, opts);
}
export function assertTSImportEqualsDeclaration(node, opts) {
    assert("TSImportEqualsDeclaration", node, opts);
}
export function assertTSExternalModuleReference(node, opts) {
    assert("TSExternalModuleReference", node, opts);
}
export function assertTSNonNullExpression(node, opts) {
    assert("TSNonNullExpression", node, opts);
}
export function assertTSExportAssignment(node, opts) {
    assert("TSExportAssignment", node, opts);
}
export function assertTSNamespaceExportDeclaration(node, opts) {
    assert("TSNamespaceExportDeclaration", node, opts);
}
export function assertTSTypeAnnotation(node, opts) {
    assert("TSTypeAnnotation", node, opts);
}
export function assertTSTypeParameterInstantiation(node, opts) {
    assert("TSTypeParameterInstantiation", node, opts);
}
export function assertTSTypeParameterDeclaration(node, opts) {
    assert("TSTypeParameterDeclaration", node, opts);
}
export function assertTSTypeParameter(node, opts) {
    assert("TSTypeParameter", node, opts);
}
export function assertStandardized(node, opts) {
    assert("Standardized", node, opts);
}
export function assertExpression(node, opts) {
    assert("Expression", node, opts);
}
export function assertBinary(node, opts) {
    assert("Binary", node, opts);
}
export function assertScopable(node, opts) {
    assert("Scopable", node, opts);
}
export function assertBlockParent(node, opts) {
    assert("BlockParent", node, opts);
}
export function assertBlock(node, opts) {
    assert("Block", node, opts);
}
export function assertStatement(node, opts) {
    assert("Statement", node, opts);
}
export function assertTerminatorless(node, opts) {
    assert("Terminatorless", node, opts);
}
export function assertCompletionStatement(node, opts) {
    assert("CompletionStatement", node, opts);
}
export function assertConditional(node, opts) {
    assert("Conditional", node, opts);
}
export function assertLoop(node, opts) {
    assert("Loop", node, opts);
}
export function assertWhile(node, opts) {
    assert("While", node, opts);
}
export function assertExpressionWrapper(node, opts) {
    assert("ExpressionWrapper", node, opts);
}
export function assertFor(node, opts) {
    assert("For", node, opts);
}
export function assertForXStatement(node, opts) {
    assert("ForXStatement", node, opts);
}
export function assertFunction(node, opts) {
    assert("Function", node, opts);
}
export function assertFunctionParent(node, opts) {
    assert("FunctionParent", node, opts);
}
export function assertPureish(node, opts) {
    assert("Pureish", node, opts);
}
export function assertDeclaration(node, opts) {
    assert("Declaration", node, opts);
}
export function assertPatternLike(node, opts) {
    assert("PatternLike", node, opts);
}
export function assertLVal(node, opts) {
    assert("LVal", node, opts);
}
export function assertTSEntityName(node, opts) {
    assert("TSEntityName", node, opts);
}
export function assertLiteral(node, opts) {
    assert("Literal", node, opts);
}
export function assertImmutable(node, opts) {
    assert("Immutable", node, opts);
}
export function assertUserWhitespacable(node, opts) {
    assert("UserWhitespacable", node, opts);
}
export function assertMethod(node, opts) {
    assert("Method", node, opts);
}
export function assertObjectMember(node, opts) {
    assert("ObjectMember", node, opts);
}
export function assertProperty(node, opts) {
    assert("Property", node, opts);
}
export function assertUnaryLike(node, opts) {
    assert("UnaryLike", node, opts);
}
export function assertPattern(node, opts) {
    assert("Pattern", node, opts);
}
export function assertClass(node, opts) {
    assert("Class", node, opts);
}
export function assertImportOrExportDeclaration(node, opts) {
    assert("ImportOrExportDeclaration", node, opts);
}
export function assertExportDeclaration(node, opts) {
    assert("ExportDeclaration", node, opts);
}
export function assertModuleSpecifier(node, opts) {
    assert("ModuleSpecifier", node, opts);
}
export function assertAccessor(node, opts) {
    assert("Accessor", node, opts);
}
export function assertPrivate(node, opts) {
    assert("Private", node, opts);
}
export function assertFlow(node, opts) {
    assert("Flow", node, opts);
}
export function assertFlowType(node, opts) {
    assert("FlowType", node, opts);
}
export function assertFlowBaseAnnotation(node, opts) {
    assert("FlowBaseAnnotation", node, opts);
}
export function assertFlowDeclaration(node, opts) {
    assert("FlowDeclaration", node, opts);
}
export function assertFlowPredicate(node, opts) {
    assert("FlowPredicate", node, opts);
}
export function assertEnumBody(node, opts) {
    assert("EnumBody", node, opts);
}
export function assertEnumMember(node, opts) {
    assert("EnumMember", node, opts);
}
export function assertJSX(node, opts) {
    assert("JSX", node, opts);
}
export function assertMiscellaneous(node, opts) {
    assert("Miscellaneous", node, opts);
}
export function assertTypeScript(node, opts) {
    assert("TypeScript", node, opts);
}
export function assertTSTypeElement(node, opts) {
    assert("TSTypeElement", node, opts);
}
export function assertTSType(node, opts) {
    assert("TSType", node, opts);
}
export function assertTSBaseType(node, opts) {
    assert("TSBaseType", node, opts);
}
export function assertNumberLiteral(node, opts) {
    deprecationWarning("assertNumberLiteral", "assertNumericLiteral");
    assert("NumberLiteral", node, opts);
}
export function assertRegexLiteral(node, opts) {
    deprecationWarning("assertRegexLiteral", "assertRegExpLiteral");
    assert("RegexLiteral", node, opts);
}
export function assertRestProperty(node, opts) {
    deprecationWarning("assertRestProperty", "assertRestElement");
    assert("RestProperty", node, opts);
}
export function assertSpreadProperty(node, opts) {
    deprecationWarning("assertSpreadProperty", "assertSpreadElement");
    assert("SpreadProperty", node, opts);
}
export function assertModuleDeclaration(node, opts) {
    deprecationWarning("assertModuleDeclaration", "assertImportOrExportDeclaration");
    assert("ModuleDeclaration", node, opts);
}
