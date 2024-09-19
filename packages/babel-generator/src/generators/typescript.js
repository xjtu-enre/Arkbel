export function TSTypeAnnotation(node) {
    this.token(":");
    this.space();
    // @ts-expect-error todo(flow->ts) can this be removed? `.optional` looks to be not existing property
    if (node.optional)
        this.token("?");
    this.print(node.typeAnnotation, node);
}
export function TSTypeParameterInstantiation(node, parent) {
    this.token("<");
    this.printList(node.params, node, {});
    if (parent.type === "ArrowFunctionExpression" && node.params.length === 1) {
        this.token(",");
    }
    this.token(">");
}
export { TSTypeParameterInstantiation as TSTypeParameterDeclaration };
export function TSTypeParameter(node) {
    if (node.in) {
        this.word("in");
        this.space();
    }
    if (node.out) {
        this.word("out");
        this.space();
    }
    this.word(!process.env.BABEL_8_BREAKING
        ? node.name
        : node.name.name);
    if (node.constraint) {
        this.space();
        this.word("extends");
        this.space();
        this.print(node.constraint, node);
    }
    if (node.default) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.default, node);
    }
}
export function TSParameterProperty(node) {
    if (node.accessibility) {
        this.word(node.accessibility);
        this.space();
    }
    if (node.readonly) {
        this.word("readonly");
        this.space();
    }
    this._param(node.parameter);
}
export function TSDeclareFunction(node, parent) {
    if (node.declare) {
        this.word("declare");
        this.space();
    }
    this._functionHead(node, parent);
    this.token(";");
}
export function TSDeclareMethod(node) {
    this._classMethodHead(node);
    this.token(";");
}
export function TSQualifiedName(node) {
    this.print(node.left, node);
    this.token(".");
    this.print(node.right, node);
}
export function TSCallSignatureDeclaration(node) {
    this.tsPrintSignatureDeclarationBase(node);
    this.token(";");
}
export function TSConstructSignatureDeclaration(node) {
    this.word("new");
    this.space();
    this.tsPrintSignatureDeclarationBase(node);
    this.token(";");
}
export function TSPropertySignature(node) {
    const { readonly } = node;
    if (readonly) {
        this.word("readonly");
        this.space();
    }
    this.tsPrintPropertyOrMethodName(node);
    this.print(node.typeAnnotation, node);
    this.token(";");
}
export function tsPrintPropertyOrMethodName(node) {
    if (node.computed) {
        this.token("[");
    }
    this.print(node.key, node);
    if (node.computed) {
        this.token("]");
    }
    if (node.optional) {
        this.token("?");
    }
}
export function TSMethodSignature(node) {
    const { kind } = node;
    if (kind === "set" || kind === "get") {
        this.word(kind);
        this.space();
    }
    this.tsPrintPropertyOrMethodName(node);
    this.tsPrintSignatureDeclarationBase(node);
    this.token(";");
}
export function TSIndexSignature(node) {
    const { readonly, static: isStatic } = node;
    if (isStatic) {
        this.word("static");
        this.space();
    }
    if (readonly) {
        this.word("readonly");
        this.space();
    }
    this.token("[");
    this._parameters(node.parameters, node);
    this.token("]");
    this.print(node.typeAnnotation, node);
    this.token(";");
}
export function TSAnyKeyword() {
    this.word("any");
}
export function TSBigIntKeyword() {
    this.word("bigint");
}
export function TSUnknownKeyword() {
    this.word("unknown");
}
export function TSNumberKeyword() {
    this.word("number");
}
export function TSObjectKeyword() {
    this.word("object");
}
export function TSBooleanKeyword() {
    this.word("boolean");
}
export function TSStringKeyword() {
    this.word("string");
}
export function TSSymbolKeyword() {
    this.word("symbol");
}
export function TSVoidKeyword() {
    this.word("void");
}
export function TSUndefinedKeyword() {
    this.word("undefined");
}
export function TSNullKeyword() {
    this.word("null");
}
export function TSNeverKeyword() {
    this.word("never");
}
export function TSIntrinsicKeyword() {
    this.word("intrinsic");
}
export function TSThisType() {
    this.word("this");
}
export function TSFunctionType(node) {
    this.tsPrintFunctionOrConstructorType(node);
}
export function TSConstructorType(node) {
    if (node.abstract) {
        this.word("abstract");
        this.space();
    }
    this.word("new");
    this.space();
    this.tsPrintFunctionOrConstructorType(node);
}
export function tsPrintFunctionOrConstructorType(node) {
    const { typeParameters } = node;
    const parameters = process.env.BABEL_8_BREAKING
        ? // @ts-ignore(Babel 7 vs Babel 8) Babel 8 AST shape
            node.params
        : // @ts-ignore(Babel 7 vs Babel 8) Babel 7 AST shape
            node.parameters;
    this.print(typeParameters, node);
    this.token("(");
    this._parameters(parameters, node);
    this.token(")");
    this.space();
    this.token("=>");
    this.space();
    const returnType = process.env.BABEL_8_BREAKING
        ? // @ts-ignore(Babel 7 vs Babel 8) Babel 8 AST shape
            node.returnType
        : // @ts-ignore(Babel 7 vs Babel 8) Babel 7 AST shape
            node.typeAnnotation;
    this.print(returnType.typeAnnotation, node);
}
export function TSTypeReference(node) {
    this.print(node.typeName, node, true);
    this.print(node.typeParameters, node, true);
}
export function TSTypePredicate(node) {
    if (node.asserts) {
        this.word("asserts");
        this.space();
    }
    this.print(node.parameterName);
    if (node.typeAnnotation) {
        this.space();
        this.word("is");
        this.space();
        this.print(node.typeAnnotation.typeAnnotation);
    }
}
export function TSTypeQuery(node) {
    this.word("typeof");
    this.space();
    this.print(node.exprName);
    if (node.typeParameters) {
        this.print(node.typeParameters, node);
    }
}
export function TSTypeLiteral(node) {
    this.tsPrintTypeLiteralOrInterfaceBody(node.members, node);
}
export function tsPrintTypeLiteralOrInterfaceBody(members, node) {
    tsPrintBraced(this, members, node);
}
function tsPrintBraced(printer, members, node) {
    printer.token("{");
    if (members.length) {
        printer.indent();
        printer.newline();
        for (const member of members) {
            printer.print(member, node);
            //this.token(sep);
            printer.newline();
        }
        printer.dedent();
    }
    printer.rightBrace(node);
}
export function TSArrayType(node) {
    this.print(node.elementType, node, true);
    this.token("[]");
}
export function TSTupleType(node) {
    this.token("[");
    this.printList(node.elementTypes, node);
    this.token("]");
}
export function TSOptionalType(node) {
    this.print(node.typeAnnotation, node);
    this.token("?");
}
export function TSRestType(node) {
    this.token("...");
    this.print(node.typeAnnotation, node);
}
export function TSNamedTupleMember(node) {
    this.print(node.label, node);
    if (node.optional)
        this.token("?");
    this.token(":");
    this.space();
    this.print(node.elementType, node);
}
export function TSUnionType(node) {
    tsPrintUnionOrIntersectionType(this, node, "|");
}
export function TSIntersectionType(node) {
    tsPrintUnionOrIntersectionType(this, node, "&");
}
function tsPrintUnionOrIntersectionType(printer, node, sep) {
    printer.printJoin(node.types, node, {
        separator() {
            this.space();
            this.token(sep);
            this.space();
        },
    });
}
export function TSConditionalType(node) {
    this.print(node.checkType);
    this.space();
    this.word("extends");
    this.space();
    this.print(node.extendsType);
    this.space();
    this.token("?");
    this.space();
    this.print(node.trueType);
    this.space();
    this.token(":");
    this.space();
    this.print(node.falseType);
}
export function TSInferType(node) {
    this.token("infer");
    this.space();
    this.print(node.typeParameter);
}
export function TSParenthesizedType(node) {
    this.token("(");
    this.print(node.typeAnnotation, node);
    this.token(")");
}
export function TSTypeOperator(node) {
    this.word(node.operator);
    this.space();
    this.print(node.typeAnnotation, node);
}
export function TSIndexedAccessType(node) {
    this.print(node.objectType, node, true);
    this.token("[");
    this.print(node.indexType, node);
    this.token("]");
}
export function TSMappedType(node) {
    const { nameType, optional, readonly, typeParameter } = node;
    this.token("{");
    this.space();
    if (readonly) {
        tokenIfPlusMinus(this, readonly);
        this.word("readonly");
        this.space();
    }
    this.token("[");
    this.word(!process.env.BABEL_8_BREAKING
        ? typeParameter.name
        : typeParameter.name.name);
    this.space();
    this.word("in");
    this.space();
    this.print(typeParameter.constraint, typeParameter);
    if (nameType) {
        this.space();
        this.word("as");
        this.space();
        this.print(nameType, node);
    }
    this.token("]");
    if (optional) {
        tokenIfPlusMinus(this, optional);
        this.token("?");
    }
    this.token(":");
    this.space();
    this.print(node.typeAnnotation, node);
    this.space();
    this.token("}");
}
function tokenIfPlusMinus(self, tok) {
    if (tok !== true) {
        self.token(tok);
    }
}
export function TSLiteralType(node) {
    this.print(node.literal, node);
}
export function TSExpressionWithTypeArguments(node) {
    this.print(node.expression, node);
    this.print(node.typeParameters, node);
}
export function TSInterfaceDeclaration(node) {
    const { declare, id, typeParameters, extends: extendz, body } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    this.word("interface");
    this.space();
    this.print(id, node);
    this.print(typeParameters, node);
    if (extendz?.length) {
        this.space();
        this.word("extends");
        this.space();
        this.printList(extendz, node);
    }
    this.space();
    this.print(body, node);
}
export function TSInterfaceBody(node) {
    this.tsPrintTypeLiteralOrInterfaceBody(node.body, node);
}
export function TSTypeAliasDeclaration(node) {
    const { declare, id, typeParameters, typeAnnotation } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    this.word("type");
    this.space();
    this.print(id, node);
    this.print(typeParameters, node);
    this.space();
    this.token("=");
    this.space();
    this.print(typeAnnotation, node);
    this.token(";");
}
function TSTypeExpression(node) {
    const { type, expression, typeAnnotation } = node;
    const forceParens = !!expression.trailingComments?.length;
    this.print(expression, node, true, undefined, forceParens);
    this.space();
    this.word(type === "TSAsExpression" ? "as" : "satisfies");
    this.space();
    this.print(typeAnnotation, node);
}
export { TSTypeExpression as TSAsExpression, TSTypeExpression as TSSatisfiesExpression, };
export function TSTypeAssertion(node) {
    const { typeAnnotation, expression } = node;
    this.token("<");
    this.print(typeAnnotation, node);
    this.token(">");
    this.space();
    this.print(expression, node);
}
export function TSInstantiationExpression(node) {
    this.print(node.expression, node);
    this.print(node.typeParameters, node);
}
export function TSEnumDeclaration(node) {
    const { declare, const: isConst, id, members } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    if (isConst) {
        this.word("const");
        this.space();
    }
    this.word("enum");
    this.space();
    this.print(id, node);
    this.space();
    tsPrintBraced(this, members, node);
}
export function TSEnumMember(node) {
    const { id, initializer } = node;
    this.print(id, node);
    if (initializer) {
        this.space();
        this.token("=");
        this.space();
        this.print(initializer, node);
    }
    this.token(",");
}
export function TSModuleDeclaration(node) {
    const { declare, id } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    if (!node.global) {
        this.word(id.type === "Identifier" ? "namespace" : "module");
        this.space();
    }
    this.print(id, node);
    if (!node.body) {
        this.token(";");
        return;
    }
    let body = node.body;
    while (body.type === "TSModuleDeclaration") {
        this.token(".");
        this.print(body.id, body);
        body = body.body;
    }
    this.space();
    this.print(body, node);
}
export function TSModuleBlock(node) {
    tsPrintBraced(this, node.body, node);
}
export function TSImportType(node) {
    const { argument, qualifier, typeParameters } = node;
    this.word("import");
    this.token("(");
    this.print(argument, node);
    this.token(")");
    if (qualifier) {
        this.token(".");
        this.print(qualifier, node);
    }
    if (typeParameters) {
        this.print(typeParameters, node);
    }
}
export function TSImportEqualsDeclaration(node) {
    const { isExport, id, moduleReference } = node;
    if (isExport) {
        this.word("export");
        this.space();
    }
    this.word("import");
    this.space();
    this.print(id, node);
    this.space();
    this.token("=");
    this.space();
    this.print(moduleReference, node);
    this.token(";");
}
export function TSExternalModuleReference(node) {
    this.token("require(");
    this.print(node.expression, node);
    this.token(")");
}
export function TSNonNullExpression(node) {
    this.print(node.expression, node);
    this.token("!");
}
export function TSExportAssignment(node) {
    this.word("export");
    this.space();
    this.token("=");
    this.space();
    this.print(node.expression, node);
    this.token(";");
}
export function TSNamespaceExportDeclaration(node) {
    this.word("export");
    this.space();
    this.word("as");
    this.space();
    this.word("namespace");
    this.space();
    this.print(node.id, node);
}
export function tsPrintSignatureDeclarationBase(node) {
    const { typeParameters } = node;
    const parameters = process.env.BABEL_8_BREAKING
        ? node.params
        : node.parameters;
    this.print(typeParameters, node);
    this.token("(");
    this._parameters(parameters, node);
    this.token(")");
    const returnType = process.env.BABEL_8_BREAKING
        ? node.returnType
        : node.typeAnnotation;
    this.print(returnType, node);
}
export function tsPrintClassMemberModifiers(node) {
    const isField = node.type === "ClassAccessorProperty" || node.type === "ClassProperty";
    if (isField && node.declare) {
        this.word("declare");
        this.space();
    }
    if (node.accessibility) {
        this.word(node.accessibility);
        this.space();
    }
    if (node.static) {
        this.word("static");
        this.space();
    }
    if (node.override) {
        this.word("override");
        this.space();
    }
    if (node.abstract) {
        this.word("abstract");
        this.space();
    }
    if (isField && node.readonly) {
        this.word("readonly");
        this.space();
    }
}
