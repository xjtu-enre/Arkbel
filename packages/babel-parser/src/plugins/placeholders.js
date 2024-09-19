import * as charCodes from "charcodes";
import { tokenLabelName, tt } from "../tokenizer/types.ts";
import { ParseErrorEnum } from "../parse-error.ts";
/* eslint sort-keys: "error" */
const PlaceholderErrors = ParseErrorEnum `placeholders`({
    ClassNameIsRequired: "A class name is required.",
    UnexpectedSpace: "Unexpected space in placeholder.",
});
/* eslint-disable sort-keys */
export default (superClass) => class PlaceholdersParserMixin extends superClass {
    parsePlaceholder(expectedNode) {
        if (this.match(tt.placeholder)) {
            const node = this.startNode();
            this.next();
            this.assertNoSpace();
            // We can't use this.parseIdentifier because
            // we don't want nested placeholders.
            node.name = super.parseIdentifier(/* liberal */ true);
            this.assertNoSpace();
            this.expect(tt.placeholder);
            // @ts-expect-error placeholder typings
            return this.finishPlaceholder(node, expectedNode);
        }
    }
    finishPlaceholder(node, expectedNode) {
        const isFinished = !!(node.expectedNode && node.type === "Placeholder");
        node.expectedNode = expectedNode;
        // @ts-expect-error todo(flow->ts)
        return isFinished ? node : this.finishNode(node, "Placeholder");
    }
    /* ============================================================ *
     * tokenizer/index.js                                           *
     * ============================================================ */
    getTokenFromCode(code) {
        if (code === charCodes.percentSign &&
            this.input.charCodeAt(this.state.pos + 1) === charCodes.percentSign) {
            this.finishOp(tt.placeholder, 2);
        }
        else {
            super.getTokenFromCode(code);
        }
    }
    /* ============================================================ *
     * parser/expression.js                                         *
     * ============================================================ */
    parseExprAtom(refExpressionErrors) {
        return (this.parsePlaceholder("Expression") ||
            super.parseExprAtom(refExpressionErrors));
    }
    parseIdentifier(liberal) {
        // NOTE: This function only handles identifiers outside of
        // expressions and binding patterns, since they are already
        // handled by the parseExprAtom and parseBindingAtom functions.
        // This is needed, for example, to parse "class %%NAME%% {}".
        return (this.parsePlaceholder("Identifier") || super.parseIdentifier(liberal));
    }
    checkReservedWord(word, startLoc, checkKeywords, isBinding) {
        // Sometimes we call #checkReservedWord(node.name), expecting
        // that node is an Identifier. If it is a Placeholder, name
        // will be undefined.
        if (word !== undefined) {
            super.checkReservedWord(word, startLoc, checkKeywords, isBinding);
        }
    }
    /* ============================================================ *
     * parser/lval.js                                               *
     * ============================================================ */
    parseBindingAtom() {
        return this.parsePlaceholder("Pattern") || super.parseBindingAtom();
    }
    isValidLVal(type, isParenthesized, binding) {
        return (type === "Placeholder" ||
            super.isValidLVal(type, isParenthesized, binding));
    }
    toAssignable(node, isLHS) {
        if (node &&
            node.type === "Placeholder" &&
            node.expectedNode === "Expression") {
            node.expectedNode = "Pattern";
        }
        else {
            super.toAssignable(node, isLHS);
        }
    }
    /* ============================================================ *
     * parser/statement.js                                          *
     * ============================================================ */
    chStartsBindingIdentifier(ch, pos) {
        if (super.chStartsBindingIdentifier(ch, pos)) {
            return true;
        }
        // Accept "let %%" as the start of "let %%placeholder%%", as though the
        // placeholder were an identifier.
        const nextToken = this.lookahead();
        if (nextToken.type === tt.placeholder) {
            return true;
        }
        return false;
    }
    verifyBreakContinue(node, isBreak) {
        // @ts-expect-error: node.label could be Placeholder
        if (node.label && node.label.type === "Placeholder")
            return;
        super.verifyBreakContinue(node, isBreak);
    }
    // @ts-expect-error Plugin will override parser interface
    parseExpressionStatement(node, expr) {
        if (expr.type !== "Placeholder" || expr.extra?.parenthesized) {
            // @ts-expect-error placeholder typings
            return super.parseExpressionStatement(node, expr);
        }
        if (this.match(tt.colon)) {
            // @ts-expect-error placeholder typings
            const stmt = node;
            stmt.label = this.finishPlaceholder(expr, "Identifier");
            this.next();
            stmt.body = super.parseStatementOrSloppyAnnexBFunctionDeclaration();
            return this.finishNode(stmt, "LabeledStatement");
        }
        this.semicolon();
        node.name = expr.name;
        return this.finishPlaceholder(node, "Statement");
    }
    parseBlock(allowDirectives, createNewLexicalScope, afterBlockParse) {
        return (this.parsePlaceholder("BlockStatement") ||
            super.parseBlock(allowDirectives, createNewLexicalScope, afterBlockParse));
    }
    parseFunctionId(requireId) {
        return (this.parsePlaceholder("Identifier") || super.parseFunctionId(requireId));
    }
    // @ts-expect-error Plugin will override parser interface
    parseClass(node, isStatement, optionalId) {
        const type = isStatement ? "ClassDeclaration" : "ClassExpression";
        this.next();
        const oldStrict = this.state.strict;
        const placeholder = this.parsePlaceholder("Identifier");
        if (placeholder) {
            if (this.match(tt._extends) ||
                this.match(tt.placeholder) ||
                this.match(tt.braceL)) {
                node.id = placeholder;
            }
            else if (optionalId || !isStatement) {
                node.id = null;
                node.body = this.finishPlaceholder(placeholder, "ClassBody");
                return this.finishNode(node, type);
            }
            else {
                throw this.raise(PlaceholderErrors.ClassNameIsRequired, this.state.startLoc);
            }
        }
        else {
            this.parseClassId(node, isStatement, optionalId);
        }
        super.parseClassSuper(node);
        node.body =
            this.parsePlaceholder("ClassBody") ||
                super.parseClassBody(!!node.superClass, oldStrict);
        return this.finishNode(node, type);
    }
    parseExport(node, decorators) {
        const placeholder = this.parsePlaceholder("Identifier");
        if (!placeholder)
            return super.parseExport(node, decorators);
        if (!this.isContextual(tt._from) && !this.match(tt.comma)) {
            // export %%DECL%%;
            node.specifiers = [];
            node.source = null;
            node.declaration = this.finishPlaceholder(placeholder, "Declaration");
            return this.finishNode(node, "ExportNamedDeclaration");
        }
        // export %%NAME%% from "foo";
        this.expectPlugin("exportDefaultFrom");
        const specifier = this.startNode();
        specifier.exported = placeholder;
        node.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")];
        return super.parseExport(node, decorators);
    }
    isExportDefaultSpecifier() {
        if (this.match(tt._default)) {
            const next = this.nextTokenStart();
            if (this.isUnparsedContextual(next, "from")) {
                if (this.input.startsWith(tokenLabelName(tt.placeholder), this.nextTokenStartSince(next + 4))) {
                    return true;
                }
            }
        }
        return super.isExportDefaultSpecifier();
    }
    maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier) {
        if (node.specifiers?.length) {
            // "export %%NAME%%" has already been parsed by #parseExport.
            return true;
        }
        return super.maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier);
    }
    checkExport(node) {
        const { specifiers } = node;
        if (specifiers?.length) {
            node.specifiers = specifiers.filter(
            // @ts-expect-error placeholder typings
            node => node.exported.type === "Placeholder");
        }
        super.checkExport(node);
        node.specifiers = specifiers;
    }
    parseImport(node) {
        const placeholder = this.parsePlaceholder("Identifier");
        if (!placeholder)
            return super.parseImport(node);
        node.specifiers = [];
        if (!this.isContextual(tt._from) && !this.match(tt.comma)) {
            // import %%STRING%%;
            node.source = this.finishPlaceholder(placeholder, "StringLiteral");
            this.semicolon();
            return this.finishNode(node, "ImportDeclaration");
        }
        // import %%DEFAULT%% ...
        const specifier = this.startNodeAtNode(placeholder);
        specifier.local = placeholder;
        node.specifiers.push(this.finishNode(specifier, "ImportDefaultSpecifier"));
        if (this.eat(tt.comma)) {
            // import %%DEFAULT%%, * as ...
            const hasStarImport = this.maybeParseStarImportSpecifier(node);
            // import %%DEFAULT%%, { ...
            if (!hasStarImport)
                this.parseNamedImportSpecifiers(node);
        }
        this.expectContextual(tt._from);
        node.source = this.parseImportSource();
        this.semicolon();
        return this.finishNode(node, "ImportDeclaration");
    }
    parseImportSource() {
        // import ... from %%STRING%%;
        return (this.parsePlaceholder("StringLiteral") || super.parseImportSource());
    }
    // Throws if the current token and the prev one are separated by a space.
    assertNoSpace() {
        if (this.state.start > this.state.lastTokEndLoc.index) {
            this.raise(PlaceholderErrors.UnexpectedSpace, this.state.lastTokEndLoc);
        }
    }
};
