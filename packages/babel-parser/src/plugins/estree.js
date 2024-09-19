import { Errors } from "../parse-error.ts";
const { defineProperty } = Object;
const toUnenumerable = (object, key) => defineProperty(object, key, { enumerable: false, value: object[key] });
function toESTreeLocation(node) {
    node.loc.start && toUnenumerable(node.loc.start, "index");
    node.loc.end && toUnenumerable(node.loc.end, "index");
    return node;
}
export default (superClass) => class ESTreeParserMixin extends superClass {
    parse() {
        const file = toESTreeLocation(super.parse());
        if (this.options.tokens) {
            file.tokens = file.tokens.map(toESTreeLocation);
        }
        return file;
    }
    // @ts-expect-error ESTree plugin changes node types
    parseRegExpLiteral({ pattern, flags }) {
        let regex = null;
        try {
            regex = new RegExp(pattern, flags);
        }
        catch (e) {
            // In environments that don't support these flags value will
            // be null as the regex can't be represented natively.
        }
        const node = this.estreeParseLiteral(regex);
        node.regex = { pattern, flags };
        return node;
    }
    // @ts-expect-error ESTree plugin changes node types
    parseBigIntLiteral(value) {
        // https://github.com/estree/estree/blob/master/es2020.md#bigintliteral
        let bigInt;
        try {
            bigInt = BigInt(value);
        }
        catch {
            bigInt = null;
        }
        const node = this.estreeParseLiteral(bigInt);
        node.bigint = String(node.value || value);
        return node;
    }
    // @ts-expect-error ESTree plugin changes node types
    parseDecimalLiteral(value) {
        // https://github.com/estree/estree/blob/master/experimental/decimal.md
        // todo: use BigDecimal when node supports it.
        const decimal = null;
        const node = this.estreeParseLiteral(decimal);
        node.decimal = String(node.value || value);
        return node;
    }
    estreeParseLiteral(value) {
        // @ts-expect-error ESTree plugin changes node types
        return this.parseLiteral(value, "Literal");
    }
    // @ts-expect-error ESTree plugin changes node types
    parseStringLiteral(value) {
        return this.estreeParseLiteral(value);
    }
    parseNumericLiteral(value) {
        return this.estreeParseLiteral(value);
    }
    // @ts-expect-error ESTree plugin changes node types
    parseNullLiteral() {
        return this.estreeParseLiteral(null);
    }
    parseBooleanLiteral(value) {
        return this.estreeParseLiteral(value);
    }
    // Cast a Directive to an ExpressionStatement. Mutates the input Directive.
    directiveToStmt(directive) {
        const expression = directive.value;
        delete directive.value;
        expression.type = "Literal";
        // @ts-expect-error N.EstreeLiteral.raw is not defined.
        expression.raw = expression.extra.raw;
        expression.value = expression.extra.expressionValue;
        const stmt = directive;
        stmt.type = "ExpressionStatement";
        stmt.expression = expression;
        // @ts-expect-error N.ExpressionStatement.directive is not defined
        stmt.directive = expression.extra.rawValue;
        delete expression.extra;
        return stmt;
    }
    // ==================================
    // Overrides
    // ==================================
    initFunction(node, isAsync) {
        super.initFunction(node, isAsync);
        node.expression = false;
    }
    checkDeclaration(node) {
        if (node != null && this.isObjectProperty(node)) {
            // @ts-expect-error plugin typings
            this.checkDeclaration(node.value);
        }
        else {
            super.checkDeclaration(node);
        }
    }
    getObjectOrClassMethodParams(method) {
        return method
            .value.params;
    }
    isValidDirective(stmt) {
        return (stmt.type === "ExpressionStatement" &&
            stmt.expression.type === "Literal" &&
            typeof stmt.expression.value === "string" &&
            !stmt.expression.extra?.parenthesized);
    }
    parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse) {
        super.parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse);
        const directiveStatements = node.directives.map(d => this.directiveToStmt(d));
        // @ts-expect-error estree plugin typings
        node.body = directiveStatements.concat(node.body);
        delete node.directives;
    }
    pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
        this.parseMethod(method, isGenerator, isAsync, isConstructor, allowsDirectSuper, "ClassMethod", true);
        if (method.typeParameters) {
            // @ts-expect-error mutate AST types
            method.value.typeParameters = method.typeParameters;
            delete method.typeParameters;
        }
        classBody.body.push(method);
    }
    parsePrivateName() {
        const node = super.parsePrivateName();
        if (!process.env.BABEL_8_BREAKING) {
            if (!this.getPluginOption("estree", "classFeatures")) {
                return node;
            }
        }
        return this.convertPrivateNameToPrivateIdentifier(node);
    }
    convertPrivateNameToPrivateIdentifier(node) {
        const name = super.getPrivateNameSV(node);
        node = node;
        delete node.id;
        // @ts-expect-error mutate AST types
        node.name = name;
        // @ts-expect-error mutate AST types
        node.type = "PrivateIdentifier";
        return node;
    }
    isPrivateName(node) {
        if (!process.env.BABEL_8_BREAKING) {
            if (!this.getPluginOption("estree", "classFeatures")) {
                return super.isPrivateName(node);
            }
        }
        return node.type === "PrivateIdentifier";
    }
    getPrivateNameSV(node) {
        if (!process.env.BABEL_8_BREAKING) {
            if (!this.getPluginOption("estree", "classFeatures")) {
                return super.getPrivateNameSV(node);
            }
        }
        return node.name;
    }
    // @ts-expect-error plugin may override interfaces
    parseLiteral(value, type) {
        const node = super.parseLiteral(value, type);
        // @ts-expect-error mutating AST types
        node.raw = node.extra.raw;
        delete node.extra;
        return node;
    }
    parseFunctionBody(node, allowExpression, isMethod = false) {
        super.parseFunctionBody(node, allowExpression, isMethod);
        node.expression = node.body.type !== "BlockStatement";
    }
    // @ts-expect-error plugin may override interfaces
    parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope = false) {
        let funcNode = this.startNode();
        funcNode.kind = node.kind; // provide kind, so super method correctly sets state
        funcNode = super.parseMethod(
        // @ts-expect-error todo(flow->ts)
        funcNode, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope);
        // @ts-expect-error mutate AST types
        funcNode.type = "FunctionExpression";
        delete funcNode.kind;
        // @ts-expect-error mutate AST types
        node.value = funcNode;
        if (type === "ClassPrivateMethod") {
            node.computed = false;
        }
        return this.finishNode(
        // @ts-expect-error cast methods to estree types
        node, "MethodDefinition");
    }
    parseClassProperty(...args) {
        const propertyNode = super.parseClassProperty(...args);
        if (!process.env.BABEL_8_BREAKING) {
            if (!this.getPluginOption("estree", "classFeatures")) {
                return propertyNode;
            }
        }
        propertyNode.type = "PropertyDefinition";
        return propertyNode;
    }
    parseClassPrivateProperty(...args) {
        const propertyNode = super.parseClassPrivateProperty(...args);
        if (!process.env.BABEL_8_BREAKING) {
            if (!this.getPluginOption("estree", "classFeatures")) {
                return propertyNode;
            }
        }
        propertyNode.type = "PropertyDefinition";
        propertyNode.computed = false;
        return propertyNode;
    }
    parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor) {
        const node = super.parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor);
        if (node) {
            node.type = "Property";
            if (node.kind === "method") {
                node.kind = "init";
            }
            node.shorthand = false;
        }
        return node;
    }
    parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors) {
        const node = super.parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors);
        if (node) {
            node.kind = "init";
            node.type = "Property";
        }
        return node;
    }
    isValidLVal(type, isUnparenthesizedInAssign, binding) {
        return type === "Property"
            ? "value"
            : super.isValidLVal(type, isUnparenthesizedInAssign, binding);
    }
    isAssignable(node, isBinding) {
        if (node != null && this.isObjectProperty(node)) {
            return this.isAssignable(node.value, isBinding);
        }
        return super.isAssignable(node, isBinding);
    }
    toAssignable(node, isLHS = false) {
        if (node != null && this.isObjectProperty(node)) {
            const { key, value } = node;
            if (this.isPrivateName(key)) {
                this.classScope.usePrivateName(this.getPrivateNameSV(key), key.loc.start);
            }
            this.toAssignable(value, isLHS);
        }
        else {
            super.toAssignable(node, isLHS);
        }
    }
    toAssignableObjectExpressionProp(prop, isLast, isLHS) {
        if (prop.kind === "get" || prop.kind === "set") {
            this.raise(Errors.PatternHasAccessor, prop.key);
        }
        else if (prop.method) {
            this.raise(Errors.PatternHasMethod, prop.key);
        }
        else {
            super.toAssignableObjectExpressionProp(prop, isLast, isLHS);
        }
    }
    finishCallExpression(unfinished, optional) {
        const node = super.finishCallExpression(unfinished, optional);
        if (node.callee.type === "Import") {
            node.type = "ImportExpression";
            node.source = node.arguments[0];
            if (this.hasPlugin("importAttributes") ||
                this.hasPlugin("importAssertions")) {
                node.options =
                    node.arguments[1] ?? null;
                // compatibility with previous ESTree AST
                node.attributes =
                    node.arguments[1] ?? null;
            }
            // arguments isn't optional in the type definition
            delete node.arguments;
            // callee isn't optional in the type definition
            delete node.callee;
        }
        return node;
    }
    toReferencedArguments(node) {
        // ImportExpressions do not have an arguments array.
        if (node.type === "ImportExpression") {
            return;
        }
        super.toReferencedArguments(node);
    }
    parseExport(unfinished, decorators) {
        const exportStartLoc = this.state.lastTokStartLoc;
        const node = super.parseExport(unfinished, decorators);
        switch (node.type) {
            case "ExportAllDeclaration":
                // @ts-expect-error mutating AST types
                node.exported = null;
                break;
            case "ExportNamedDeclaration":
                if (node.specifiers.length === 1 &&
                    // @ts-expect-error mutating AST types
                    node.specifiers[0].type === "ExportNamespaceSpecifier") {
                    // @ts-expect-error mutating AST types
                    node.type = "ExportAllDeclaration";
                    // @ts-expect-error mutating AST types
                    node.exported = node.specifiers[0].exported;
                    delete node.specifiers;
                }
            // fallthrough
            case "ExportDefaultDeclaration":
                {
                    const { declaration } = node;
                    if ((declaration?.type === "ClassDeclaration" ||
                        declaration?.type === "ArkTSStructDeclaration") &&
                        declaration.decorators?.length > 0 &&
                        // decorator comes before export
                        declaration.start === node.start) {
                        this.resetStartLocation(node, 
                        // For compatibility with ESLint's keyword-spacing rule, which assumes that an
                        // export declaration must start with export.
                        // https://github.com/babel/babel/issues/15085
                        // Here we reset export declaration's start to be the start of the export token
                        exportStartLoc);
                    }
                }
                break;
        }
        return node;
    }
    parseSubscript(base, startLoc, noCalls, state) {
        const node = super.parseSubscript(base, startLoc, noCalls, state);
        if (state.optionalChainMember) {
            // https://github.com/estree/estree/blob/master/es2020.md#chainexpression
            if (node.type === "OptionalMemberExpression" ||
                node.type === "OptionalCallExpression") {
                node.type = node.type.substring(8); // strip Optional prefix
            }
            if (state.stop) {
                const chain = this.startNodeAtNode(node);
                chain.expression = node;
                return this.finishNode(chain, "ChainExpression");
            }
        }
        else if (node.type === "MemberExpression" ||
            node.type === "CallExpression") {
            node.optional = false;
        }
        return node;
    }
    isOptionalMemberExpression(node) {
        if (node.type === "ChainExpression") {
            return node.expression.type === "MemberExpression";
        }
        return super.isOptionalMemberExpression(node);
    }
    hasPropertyAsPrivateName(node) {
        if (node.type === "ChainExpression") {
            node = node.expression;
        }
        return super.hasPropertyAsPrivateName(node);
    }
    // @ts-expect-error override interfaces
    isObjectProperty(node) {
        return node.type === "Property" && node.kind === "init" && !node.method;
    }
    isObjectMethod(node) {
        return node.method || node.kind === "get" || node.kind === "set";
    }
    finishNodeAt(node, type, endLoc) {
        return toESTreeLocation(super.finishNodeAt(node, type, endLoc));
    }
    resetStartLocation(node, startLoc) {
        super.resetStartLocation(node, startLoc);
        toESTreeLocation(node);
    }
    resetEndLocation(node, endLoc = this.state.lastTokEndLoc) {
        super.resetEndLocation(node, endLoc);
        toESTreeLocation(node);
    }
};
