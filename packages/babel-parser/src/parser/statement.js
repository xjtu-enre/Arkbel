import { tokenIsIdentifier, tokenIsKeywordOrIdentifier, tokenIsLoop, tokenIsTemplate, tt, getExportedToken, } from "../tokenizer/types.ts";
import ExpressionParser from "./expression.ts";
import { Errors } from "../parse-error.ts";
import { isIdentifierChar, isIdentifierStart } from "../util/identifier.ts";
import * as charCodes from "charcodes";
import { ScopeFlag, ClassElementType, BindingFlag, } from "../util/scopeflags.ts";
import { ExpressionErrors } from "./util.ts";
import { ParamKind, functionFlags } from "../util/production-parameter.ts";
import { newExpressionScope, newParameterDeclarationScope, } from "../util/expression-scope.ts";
import { Token } from "../tokenizer/index.ts";
import { createPositionWithColumnOffset } from "../util/location.ts";
import { cloneStringLiteral, cloneIdentifier } from "./node.ts";
import { ParseBindingListFlags } from "./lval.ts";
import { LoopLabelKind } from "../tokenizer/state.ts";
const loopLabel = { kind: LoopLabelKind.Loop }, switchLabel = { kind: LoopLabelKind.Switch };
export var ParseFunctionFlag;
(function (ParseFunctionFlag) {
    ParseFunctionFlag[ParseFunctionFlag["Expression"] = 0] = "Expression";
    ParseFunctionFlag[ParseFunctionFlag["Declaration"] = 1] = "Declaration";
    ParseFunctionFlag[ParseFunctionFlag["HangingDeclaration"] = 2] = "HangingDeclaration";
    ParseFunctionFlag[ParseFunctionFlag["NullableId"] = 4] = "NullableId";
    ParseFunctionFlag[ParseFunctionFlag["Async"] = 8] = "Async";
})(ParseFunctionFlag || (ParseFunctionFlag = {}));
export var ParseStatementFlag;
(function (ParseStatementFlag) {
    ParseStatementFlag[ParseStatementFlag["StatementOnly"] = 0] = "StatementOnly";
    ParseStatementFlag[ParseStatementFlag["AllowImportExport"] = 1] = "AllowImportExport";
    ParseStatementFlag[ParseStatementFlag["AllowDeclaration"] = 2] = "AllowDeclaration";
    ParseStatementFlag[ParseStatementFlag["AllowFunctionDeclaration"] = 4] = "AllowFunctionDeclaration";
    ParseStatementFlag[ParseStatementFlag["AllowLabeledFunction"] = 8] = "AllowLabeledFunction";
})(ParseStatementFlag || (ParseStatementFlag = {}));
const loneSurrogate = /[\uD800-\uDFFF]/u;
const keywordRelationalOperator = /in(?:stanceof)?/y;
/**
 * Convert tokens for backward Babel 7 compat.
 * tt.privateName => tt.hash + tt.name
 * tt.templateTail => tt.backquote/tt.braceR + tt.template + tt.backquote
 * tt.templateNonTail => tt.backquote/tt.braceR + tt.template + tt.dollarBraceL
 * For performance reasons this routine mutates `tokens`, it is okay
 * here since we execute `parseTopLevel` once for every file.
 */
function babel7CompatTokens(tokens, input) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const { type } = token;
        if (typeof type === "number") {
            if (!process.env.BABEL_8_BREAKING) {
                if (type === tt.privateName) {
                    const { loc, start, value, end } = token;
                    const hashEndPos = start + 1;
                    const hashEndLoc = createPositionWithColumnOffset(loc.start, 1);
                    tokens.splice(i, 1, new Token({
                        // @ts-expect-error: hacky way to create token
                        type: getExportedToken(tt.hash),
                        value: "#",
                        start: start,
                        end: hashEndPos,
                        startLoc: loc.start,
                        endLoc: hashEndLoc,
                    }), new Token({
                        // @ts-expect-error: hacky way to create token
                        type: getExportedToken(tt.name),
                        value: value,
                        start: hashEndPos,
                        end: end,
                        startLoc: hashEndLoc,
                        endLoc: loc.end,
                    }));
                    i++;
                    continue;
                }
                if (tokenIsTemplate(type)) {
                    const { loc, start, value, end } = token;
                    const backquoteEnd = start + 1;
                    const backquoteEndLoc = createPositionWithColumnOffset(loc.start, 1);
                    let startToken;
                    if (input.charCodeAt(start) === charCodes.graveAccent) {
                        startToken = new Token({
                            // @ts-expect-error: hacky way to create token
                            type: getExportedToken(tt.backQuote),
                            value: "`",
                            start: start,
                            end: backquoteEnd,
                            startLoc: loc.start,
                            endLoc: backquoteEndLoc,
                        });
                    }
                    else {
                        startToken = new Token({
                            // @ts-expect-error: hacky way to create token
                            type: getExportedToken(tt.braceR),
                            value: "}",
                            start: start,
                            end: backquoteEnd,
                            startLoc: loc.start,
                            endLoc: backquoteEndLoc,
                        });
                    }
                    let templateValue, templateElementEnd, templateElementEndLoc, endToken;
                    if (type === tt.templateTail) {
                        // ends with '`'
                        templateElementEnd = end - 1;
                        templateElementEndLoc = createPositionWithColumnOffset(loc.end, -1);
                        templateValue = value === null ? null : value.slice(1, -1);
                        endToken = new Token({
                            // @ts-expect-error: hacky way to create token
                            type: getExportedToken(tt.backQuote),
                            value: "`",
                            start: templateElementEnd,
                            end: end,
                            startLoc: templateElementEndLoc,
                            endLoc: loc.end,
                        });
                    }
                    else {
                        // ends with `${`
                        templateElementEnd = end - 2;
                        templateElementEndLoc = createPositionWithColumnOffset(loc.end, -2);
                        templateValue = value === null ? null : value.slice(1, -2);
                        endToken = new Token({
                            // @ts-expect-error: hacky way to create token
                            type: getExportedToken(tt.dollarBraceL),
                            value: "${",
                            start: templateElementEnd,
                            end: end,
                            startLoc: templateElementEndLoc,
                            endLoc: loc.end,
                        });
                    }
                    tokens.splice(i, 1, startToken, new Token({
                        // @ts-expect-error: hacky way to create token
                        type: getExportedToken(tt.template),
                        value: templateValue,
                        start: backquoteEnd,
                        end: templateElementEnd,
                        startLoc: backquoteEndLoc,
                        endLoc: templateElementEndLoc,
                    }), endToken);
                    i += 2;
                    continue;
                }
            }
            // @ts-expect-error: we manipulate `token` for performance reasons
            token.type = getExportedToken(type);
        }
    }
    return tokens;
}
export default class StatementParser extends ExpressionParser {
    // ### Statement parsing
    // Parse a program. Initializes the parser, reads any number of
    // statements, and wraps them in a Program node.  Optionally takes a
    // `program` argument.  If present, the statements will be appended
    // to its body instead of creating a new node.
    parseTopLevel(file, program) {
        file.program = this.parseProgram(program);
        file.comments = this.comments;
        if (this.options.tokens) {
            file.tokens = babel7CompatTokens(this.tokens, this.input);
        }
        return this.finishNode(file, "File");
    }
    parseProgram(program, end = tt.eof, sourceType = this.options.sourceType) {
        program.sourceType = sourceType;
        program.interpreter = this.parseInterpreterDirective();
        this.parseBlockBody(program, true, true, end);
        if (this.inModule &&
            !this.options.allowUndeclaredExports &&
            this.scope.undefinedExports.size > 0) {
            for (const [localName, at] of Array.from(this.scope.undefinedExports)) {
                this.raise(Errors.ModuleExportUndefined, at, { localName });
            }
        }
        let finishedProgram;
        if (end === tt.eof) {
            // finish at eof for top level program
            finishedProgram = this.finishNode(program, "Program");
        }
        else {
            // finish immediately before the end token
            finishedProgram = this.finishNodeAt(program, "Program", createPositionWithColumnOffset(this.state.startLoc, -1));
        }
        return finishedProgram;
    }
    /**
     * cast a Statement to a Directive. This method mutates input statement.
     */
    stmtToDirective(stmt) {
        const directive = stmt;
        directive.type = "Directive";
        directive.value = directive.expression;
        delete directive.expression;
        const directiveLiteral = directive.value;
        const expressionValue = directiveLiteral.value;
        const raw = this.input.slice(directiveLiteral.start, directiveLiteral.end);
        const val = (directiveLiteral.value = raw.slice(1, -1)); // remove quotes
        this.addExtra(directiveLiteral, "raw", raw);
        this.addExtra(directiveLiteral, "rawValue", val);
        this.addExtra(directiveLiteral, "expressionValue", expressionValue);
        directiveLiteral.type = "DirectiveLiteral";
        return directive;
    }
    parseInterpreterDirective() {
        if (!this.match(tt.interpreterDirective)) {
            return null;
        }
        const node = this.startNode();
        node.value = this.state.value;
        this.next();
        return this.finishNode(node, "InterpreterDirective");
    }
    isLet() {
        if (!this.isContextual(tt._let)) {
            return false;
        }
        return this.hasFollowingBindingAtom();
    }
    chStartsBindingIdentifier(ch, pos) {
        if (isIdentifierStart(ch)) {
            keywordRelationalOperator.lastIndex = pos;
            if (keywordRelationalOperator.test(this.input)) {
                // We have seen `in` or `instanceof` so far, now check if the identifier
                // ends here
                const endCh = this.codePointAtPos(keywordRelationalOperator.lastIndex);
                if (!isIdentifierChar(endCh) && endCh !== charCodes.backslash) {
                    return false;
                }
            }
            return true;
        }
        else if (ch === charCodes.backslash) {
            return true;
        }
        else {
            return false;
        }
    }
    chStartsBindingPattern(ch) {
        return (ch === charCodes.leftSquareBracket || ch === charCodes.leftCurlyBrace);
    }
    /**
     * Assuming we have seen a contextual `let` and declaration is allowed, check if it
     * starts a variable declaration so that it should be interpreted as a keyword.
     */
    hasFollowingBindingAtom() {
        const next = this.nextTokenStart();
        const nextCh = this.codePointAtPos(next);
        return (this.chStartsBindingPattern(nextCh) ||
            this.chStartsBindingIdentifier(nextCh, next));
    }
    /**
     * Assuming we have seen a contextual `using` and declaration is allowed, check if it
     * starts a variable declaration in the same line so that it should be interpreted as
     * a keyword.
     */
    hasInLineFollowingBindingIdentifier() {
        const next = this.nextTokenInLineStart();
        const nextCh = this.codePointAtPos(next);
        return this.chStartsBindingIdentifier(nextCh, next);
    }
    startsUsingForOf() {
        const { type, containsEsc } = this.lookahead();
        if (type === tt._of && !containsEsc) {
            // `using of` must start a for-lhs-of statement
            return false;
        }
        else if (tokenIsIdentifier(type) && !this.hasFollowingLineBreak()) {
            this.expectPlugin("explicitResourceManagement");
            return true;
        }
    }
    startsAwaitUsing() {
        let next = this.nextTokenInLineStart();
        if (this.isUnparsedContextual(next, "using")) {
            next = this.nextTokenInLineStartSince(next + 5);
            const nextCh = this.codePointAtPos(next);
            if (this.chStartsBindingIdentifier(nextCh, next)) {
                this.expectPlugin("explicitResourceManagement");
                return true;
            }
        }
        return false;
    }
    // https://tc39.es/ecma262/#prod-ModuleItem
    parseModuleItem() {
        return this.parseStatementLike(ParseStatementFlag.AllowImportExport |
            ParseStatementFlag.AllowDeclaration |
            ParseStatementFlag.AllowFunctionDeclaration |
            // This function is actually also used to parse StatementItems,
            // which with Annex B enabled allows labeled functions.
            ParseStatementFlag.AllowLabeledFunction);
    }
    // https://tc39.es/ecma262/#prod-StatementListItem
    parseStatementListItem() {
        return this.parseStatementLike(ParseStatementFlag.AllowDeclaration |
            ParseStatementFlag.AllowFunctionDeclaration |
            (!this.options.annexB || this.state.strict
                ? 0
                : ParseStatementFlag.AllowLabeledFunction));
    }
    parseStatementOrSloppyAnnexBFunctionDeclaration(allowLabeledFunction = false) {
        let flags = ParseStatementFlag.StatementOnly;
        if (this.options.annexB && !this.state.strict) {
            flags |= ParseStatementFlag.AllowFunctionDeclaration;
            if (allowLabeledFunction) {
                flags |= ParseStatementFlag.AllowLabeledFunction;
            }
        }
        return this.parseStatementLike(flags);
    }
    // Parse a single statement.
    //
    // If expecting a statement and finding a slash operator, parse a
    // regular expression literal. This is to handle cases like
    // `if (foo) /blah/.exec(foo)`, where looking at the previous token
    // does not help.
    // https://tc39.es/ecma262/#prod-Statement
    parseStatement() {
        return this.parseStatementLike(ParseStatementFlag.StatementOnly);
    }
    // ImportDeclaration and ExportDeclaration are also handled here so we can throw recoverable errors
    // when they are not at the top level
    parseStatementLike(flags) {
        let decorators = null;
        if (this.match(tt.at)) {
            decorators = this.parseDecorators(true);
        }
        return this.parseStatementContent(flags, decorators);
    }
    parseStatementContent(flags, decorators) {
        const starttype = this.state.type;
        const node = this.startNode();
        const allowDeclaration = !!(flags & ParseStatementFlag.AllowDeclaration);
        const allowFunctionDeclaration = !!(flags & ParseStatementFlag.AllowFunctionDeclaration);
        const topLevel = flags & ParseStatementFlag.AllowImportExport;
        // Most types of statements are recognized by the keyword they
        // start with. Many are trivial to parse, some require a bit of
        // complexity.
        switch (starttype) {
            case tt._break:
                return this.parseBreakContinueStatement(node, /* isBreak */ true);
            case tt._continue:
                return this.parseBreakContinueStatement(node, /* isBreak */ false);
            case tt._debugger:
                return this.parseDebuggerStatement(node);
            case tt._do:
                return this.parseDoWhileStatement(node);
            case tt._for:
                return this.parseForStatement(node);
            case tt._function:
                if (this.lookaheadCharCode() === charCodes.dot)
                    break;
                if (!allowFunctionDeclaration) {
                    this.raise(this.state.strict
                        ? Errors.StrictFunction
                        : this.options.annexB
                            ? Errors.SloppyFunctionAnnexB
                            : Errors.SloppyFunction, this.state.startLoc);
                }
                return this.parseFunctionStatement(node, false, !allowDeclaration && allowFunctionDeclaration);
            case tt._class:
                if (!allowDeclaration)
                    this.unexpected();
                return this.parseClass(this.maybeTakeDecorators(decorators, node), true);
            case tt._if:
                return this.parseIfStatement(node);
            case tt._return:
                return this.parseReturnStatement(node);
            case tt._switch:
                return this.parseSwitchStatement(node);
            case tt._throw:
                return this.parseThrowStatement(node);
            case tt._try:
                return this.parseTryStatement(node);
            case tt._await:
                // [+Await] await [no LineTerminator here] using [no LineTerminator here] BindingList[+Using]
                if (!this.state.containsEsc && this.startsAwaitUsing()) {
                    if (!this.isAwaitAllowed()) {
                        this.raise(Errors.AwaitUsingNotInAsyncContext, node);
                    }
                    else if (!allowDeclaration) {
                        this.raise(Errors.UnexpectedLexicalDeclaration, node);
                    }
                    this.next(); // eat 'await'
                    return this.parseVarStatement(node, "await using");
                }
                break;
            case tt._using:
                // using [no LineTerminator here] BindingList[+Using]
                if (this.state.containsEsc ||
                    !this.hasInLineFollowingBindingIdentifier()) {
                    break;
                }
                this.expectPlugin("explicitResourceManagement");
                if (!this.scope.inModule && this.scope.inTopLevel) {
                    this.raise(Errors.UnexpectedUsingDeclaration, this.state.startLoc);
                }
                else if (!allowDeclaration) {
                    this.raise(Errors.UnexpectedLexicalDeclaration, this.state.startLoc);
                }
                return this.parseVarStatement(node, "using");
            case tt._let: {
                if (this.state.containsEsc) {
                    break;
                }
                // `let [` is an explicit negative lookahead for
                // ExpressionStatement, so special-case it first.
                const next = this.nextTokenStart();
                const nextCh = this.codePointAtPos(next);
                if (nextCh !== charCodes.leftSquareBracket) {
                    if (!allowDeclaration && this.hasFollowingLineBreak())
                        break;
                    if (!this.chStartsBindingIdentifier(nextCh, next) &&
                        nextCh !== charCodes.leftCurlyBrace) {
                        break;
                    }
                }
            }
            // fall through
            case tt._const: {
                if (!allowDeclaration) {
                    this.raise(Errors.UnexpectedLexicalDeclaration, this.state.startLoc);
                }
            }
            // fall through
            case tt._var: {
                const kind = this.state.value;
                return this.parseVarStatement(node, kind);
            }
            case tt._while:
                return this.parseWhileStatement(node);
            case tt._with:
                return this.parseWithStatement(node);
            case tt.braceL:
                return this.parseBlock();
            case tt.semi:
                return this.parseEmptyStatement(node);
            case tt._import: {
                const nextTokenCharCode = this.lookaheadCharCode();
                if (nextTokenCharCode === charCodes.leftParenthesis || // import()
                    nextTokenCharCode === charCodes.dot // import.meta
                ) {
                    break;
                }
            }
            // fall through
            case tt._export: {
                if (!this.options.allowImportExportEverywhere && !topLevel) {
                    this.raise(Errors.UnexpectedImportExport, this.state.startLoc);
                }
                this.next(); // eat `import`/`export`
                let result;
                if (starttype === tt._import) {
                    result = this.parseImport(node);
                    if (result.type === "ImportDeclaration" &&
                        (!result.importKind || result.importKind === "value")) {
                        this.sawUnambiguousESM = true;
                    }
                }
                else {
                    result = this.parseExport(node, decorators);
                    if ((result.type === "ExportNamedDeclaration" &&
                        (!result.exportKind || result.exportKind === "value")) ||
                        (result.type === "ExportAllDeclaration" &&
                            (!result.exportKind || result.exportKind === "value")) ||
                        result.type === "ExportDefaultDeclaration") {
                        this.sawUnambiguousESM = true;
                    }
                }
                this.assertModuleNodeAllowed(result);
                return result;
            }
            default: {
                if (this.isAsyncFunction()) {
                    if (!allowDeclaration) {
                        this.raise(Errors.AsyncFunctionInSingleStatementContext, this.state.startLoc);
                    }
                    this.next(); // eat 'async'
                    return this.parseFunctionStatement(node, true, !allowDeclaration && allowFunctionDeclaration);
                }
            }
        }
        // If the statement does not start with a statement keyword or a
        // brace, it's an ExpressionStatement or LabeledStatement. We
        // simply start parsing an expression, and afterwards, if the
        // next token is a colon and the expression was a simple
        // Identifier node, we switch to interpreting it as a label.
        const maybeName = this.state.value;
        const expr = this.parseExpression();
        if (tokenIsIdentifier(starttype) &&
            expr.type === "Identifier" &&
            this.eat(tt.colon)) {
            return this.parseLabeledStatement(node, maybeName, 
            // @ts-expect-error migrate to Babel types
            expr, flags);
        }
        else {
            return this.parseExpressionStatement(node, expr, decorators);
        }
    }
    assertModuleNodeAllowed(node) {
        if (!this.options.allowImportExportEverywhere && !this.inModule) {
            this.raise(Errors.ImportOutsideModule, node);
        }
    }
    decoratorsEnabledBeforeExport() {
        if (this.hasPlugin("decorators-legacy"))
            return true;
        return (this.hasPlugin("decorators") &&
            this.getPluginOption("decorators", "decoratorsBeforeExport") !== false);
    }
    // Attach the decorators to the given class.
    // NOTE: This method changes the .start location of the class, and thus
    // can affect comment attachment. Calling it before or after finalizing
    // the class node (and thus finalizing its comments) changes how comments
    // before the `class` keyword or before the final .start location of the
    // class are attached.
    maybeTakeDecorators(maybeDecorators, classNode, exportNode) {
        if (maybeDecorators) {
            if (classNode.decorators && classNode.decorators.length > 0) {
                // Note: decorators attachment is only attempred multiple times
                // when the class is part of an export declaration.
                if (typeof this.getPluginOption("decorators", "decoratorsBeforeExport") !== "boolean") {
                    // If `decoratorsBeforeExport` was set to `true` or `false`, we
                    // already threw an error about decorators not being in a valid
                    // position.
                    this.raise(Errors.DecoratorsBeforeAfterExport, classNode.decorators[0]);
                }
                classNode.decorators.unshift(...maybeDecorators);
            }
            else {
                classNode.decorators = maybeDecorators;
            }
            this.resetStartLocationFromNode(classNode, maybeDecorators[0]);
            if (exportNode)
                this.resetStartLocationFromNode(exportNode, classNode);
        }
        return classNode;
    }
    canHaveLeadingDecorator() {
        return this.match(tt._class);
    }
    parseDecorators(allowExport) {
        const decorators = [];
        do {
            decorators.push(this.parseDecorator());
        } while (this.match(tt.at));
        if (this.match(tt._export)) {
            if (!allowExport) {
                this.unexpected();
            }
            if (!this.decoratorsEnabledBeforeExport()) {
                this.raise(Errors.DecoratorExportClass, this.state.startLoc);
            }
        }
        else if (!this.canHaveLeadingDecorator()) {
            throw this.raise(Errors.UnexpectedLeadingDecorator, this.state.startLoc);
        }
        return decorators;
    }
    parseDecorator() {
        this.expectOnePlugin(["decorators", "decorators-legacy"]);
        const node = this.startNode();
        this.next();
        if (this.hasPlugin("decorators")) {
            const startLoc = this.state.startLoc;
            let expr;
            if (this.match(tt.parenL)) {
                const startLoc = this.state.startLoc;
                this.next(); // eat '('
                expr = this.parseExpression();
                this.expect(tt.parenR);
                expr = this.wrapParenthesis(startLoc, expr);
                const paramsStartLoc = this.state.startLoc;
                node.expression = this.parseMaybeDecoratorArguments(expr);
                if (this.getPluginOption("decorators", "allowCallParenthesized") ===
                    false &&
                    node.expression !== expr) {
                    this.raise(Errors.DecoratorArgumentsOutsideParentheses, paramsStartLoc);
                }
            }
            else {
                expr = this.parseIdentifier(false);
                while (this.eat(tt.dot)) {
                    const node = this.startNodeAt(startLoc);
                    node.object = expr;
                    if (this.match(tt.privateName)) {
                        this.classScope.usePrivateName(this.state.value, this.state.startLoc);
                        node.property = this.parsePrivateName();
                    }
                    else {
                        node.property = this.parseIdentifier(true);
                    }
                    node.computed = false;
                    expr = this.finishNode(node, "MemberExpression");
                }
                node.expression = this.parseMaybeDecoratorArguments(expr);
            }
        }
        else {
            node.expression = this.parseExprSubscripts();
        }
        return this.finishNode(node, "Decorator");
    }
    parseMaybeDecoratorArguments(expr) {
        if (this.eat(tt.parenL)) {
            const node = this.startNodeAtNode(expr);
            node.callee = expr;
            node.arguments = this.parseCallExpressionArguments(tt.parenR, false);
            this.toReferencedList(node.arguments);
            return this.finishNode(node, "CallExpression");
        }
        return expr;
    }
    parseBreakContinueStatement(node, isBreak) {
        this.next();
        if (this.isLineTerminator()) {
            node.label = null;
        }
        else {
            node.label = this.parseIdentifier();
            this.semicolon();
        }
        this.verifyBreakContinue(node, isBreak);
        return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
    }
    verifyBreakContinue(node, isBreak) {
        let i;
        for (i = 0; i < this.state.labels.length; ++i) {
            const lab = this.state.labels[i];
            if (node.label == null || lab.name === node.label.name) {
                if (lab.kind != null && (isBreak || lab.kind === LoopLabelKind.Loop)) {
                    break;
                }
                if (node.label && isBreak)
                    break;
            }
        }
        if (i === this.state.labels.length) {
            const type = isBreak ? "BreakStatement" : "ContinueStatement";
            this.raise(Errors.IllegalBreakContinue, node, { type });
        }
    }
    parseDebuggerStatement(node) {
        this.next();
        this.semicolon();
        return this.finishNode(node, "DebuggerStatement");
    }
    parseHeaderExpression() {
        this.expect(tt.parenL);
        const val = this.parseExpression();
        this.expect(tt.parenR);
        return val;
    }
    // https://tc39.es/ecma262/#prod-DoWhileStatement
    parseDoWhileStatement(node) {
        this.next();
        this.state.labels.push(loopLabel);
        // Parse the loop body's body.
        node.body =
            // For the smartPipelines plugin: Disable topic references from outer
            // contexts within the loop body. They are permitted in test expressions,
            // outside of the loop body.
            this.withSmartMixTopicForbiddingContext(() => 
            // Parse the loop body's body.
            this.parseStatement());
        this.state.labels.pop();
        this.expect(tt._while);
        node.test = this.parseHeaderExpression();
        this.eat(tt.semi);
        return this.finishNode(node, "DoWhileStatement");
    }
    // Disambiguating between a `for` and a `for`/`in` or `for`/`of`
    // loop is non-trivial. Basically, we have to parse the init `var`
    // statement or expression, disallowing the `in` operator (see
    // the second parameter to `parseExpression`), and then check
    // whether the next token is `in` or `of`. When there is no init
    // part (semicolon immediately after the opening parenthesis), it
    // is a regular `for` loop.
    parseForStatement(node) {
        this.next();
        this.state.labels.push(loopLabel);
        let awaitAt = null;
        if (this.isAwaitAllowed() && this.eatContextual(tt._await)) {
            awaitAt = this.state.lastTokStartLoc;
        }
        this.scope.enter(ScopeFlag.OTHER);
        this.expect(tt.parenL);
        if (this.match(tt.semi)) {
            if (awaitAt !== null) {
                this.unexpected(awaitAt);
            }
            return this.parseFor(node, null);
        }
        const startsWithLet = this.isContextual(tt._let);
        {
            const startsWithAwaitUsing = this.isContextual(tt._await) && this.startsAwaitUsing();
            const starsWithUsingDeclaration = startsWithAwaitUsing ||
                (this.isContextual(tt._using) && this.startsUsingForOf());
            const isLetOrUsing = (startsWithLet && this.hasFollowingBindingAtom()) ||
                starsWithUsingDeclaration;
            if (this.match(tt._var) || this.match(tt._const) || isLetOrUsing) {
                const initNode = this.startNode();
                let kind;
                if (startsWithAwaitUsing) {
                    kind = "await using";
                    if (!this.isAwaitAllowed()) {
                        this.raise(Errors.AwaitUsingNotInAsyncContext, this.state.startLoc);
                    }
                    this.next(); // eat 'await'
                }
                else {
                    kind = this.state.value;
                }
                this.next();
                this.parseVar(initNode, true, kind);
                const init = this.finishNode(initNode, "VariableDeclaration");
                const isForIn = this.match(tt._in);
                if (isForIn && starsWithUsingDeclaration) {
                    this.raise(Errors.ForInUsing, init);
                }
                if ((isForIn || this.isContextual(tt._of)) &&
                    init.declarations.length === 1) {
                    return this.parseForIn(node, init, awaitAt);
                }
                if (awaitAt !== null) {
                    this.unexpected(awaitAt);
                }
                return this.parseFor(node, init);
            }
        }
        // Check whether the first token is possibly a contextual keyword, so that
        // we can forbid `for (async of` if this turns out to be a for-of loop.
        const startsWithAsync = this.isContextual(tt._async);
        const refExpressionErrors = new ExpressionErrors();
        const init = this.parseExpression(true, refExpressionErrors);
        const isForOf = this.isContextual(tt._of);
        if (isForOf) {
            // Check for leading tokens that are forbidden in for-of loops:
            if (startsWithLet) {
                this.raise(Errors.ForOfLet, init);
            }
            if (
            // `for await (async of []);` is allowed.
            awaitAt === null &&
                startsWithAsync &&
                init.type === "Identifier") {
                // This catches the case where the `async` in `for (async of` was
                // parsed as an identifier. If it was parsed as the start of an async
                // arrow function (e.g. `for (async of => {} of []);`), the LVal check
                // further down will raise a more appropriate error.
                this.raise(Errors.ForOfAsync, init);
            }
        }
        if (isForOf || this.match(tt._in)) {
            this.checkDestructuringPrivate(refExpressionErrors);
            this.toAssignable(init, /* isLHS */ true);
            const type = isForOf ? "ForOfStatement" : "ForInStatement";
            this.checkLVal(init, { in: { type } });
            return this.parseForIn(node, 
            // @ts-expect-error init has been transformed to an assignable
            init, awaitAt);
        }
        else {
            this.checkExpressionErrors(refExpressionErrors, true);
        }
        if (awaitAt !== null) {
            this.unexpected(awaitAt);
        }
        return this.parseFor(node, init);
    }
    // https://tc39.es/ecma262/#prod-HoistableDeclaration
    parseFunctionStatement(node, isAsync, isHangingDeclaration) {
        this.next(); // eat 'function'
        return this.parseFunction(node, ParseFunctionFlag.Declaration |
            (isHangingDeclaration ? ParseFunctionFlag.HangingDeclaration : 0) |
            (isAsync ? ParseFunctionFlag.Async : 0));
    }
    // https://tc39.es/ecma262/#prod-IfStatement
    parseIfStatement(node) {
        this.next();
        node.test = this.parseHeaderExpression();
        // Annex B.3.3
        // https://tc39.es/ecma262/#sec-functiondeclarations-in-ifstatement-statement-clauses
        node.consequent = this.parseStatementOrSloppyAnnexBFunctionDeclaration();
        node.alternate = this.eat(tt._else)
            ? this.parseStatementOrSloppyAnnexBFunctionDeclaration()
            : null;
        return this.finishNode(node, "IfStatement");
    }
    parseReturnStatement(node) {
        if (!this.prodParam.hasReturn && !this.options.allowReturnOutsideFunction) {
            this.raise(Errors.IllegalReturn, this.state.startLoc);
        }
        this.next();
        // In `return` (and `break`/`continue`), the keywords with
        // optional arguments, we eagerly look for a semicolon or the
        // possibility to insert one.
        if (this.isLineTerminator()) {
            node.argument = null;
        }
        else {
            node.argument = this.parseExpression();
            this.semicolon();
        }
        return this.finishNode(node, "ReturnStatement");
    }
    // https://tc39.es/ecma262/#prod-SwitchStatement
    parseSwitchStatement(node) {
        this.next();
        node.discriminant = this.parseHeaderExpression();
        const cases = (node.cases = []);
        this.expect(tt.braceL);
        this.state.labels.push(switchLabel);
        this.scope.enter(ScopeFlag.OTHER);
        // Statements under must be grouped (by label) in SwitchCase
        // nodes. `cur` is used to keep the node that we are currently
        // adding statements to.
        let cur;
        for (let sawDefault; !this.match(tt.braceR);) {
            if (this.match(tt._case) || this.match(tt._default)) {
                const isCase = this.match(tt._case);
                if (cur)
                    this.finishNode(cur, "SwitchCase");
                // @ts-expect-error Fixme
                cases.push((cur = this.startNode()));
                cur.consequent = [];
                this.next();
                if (isCase) {
                    cur.test = this.parseExpression();
                }
                else {
                    if (sawDefault) {
                        this.raise(Errors.MultipleDefaultsInSwitch, this.state.lastTokStartLoc);
                    }
                    sawDefault = true;
                    cur.test = null;
                }
                this.expect(tt.colon);
            }
            else {
                if (cur) {
                    cur.consequent.push(this.parseStatementListItem());
                }
                else {
                    this.unexpected();
                }
            }
        }
        this.scope.exit();
        if (cur)
            this.finishNode(cur, "SwitchCase");
        this.next(); // Closing brace
        this.state.labels.pop();
        return this.finishNode(node, "SwitchStatement");
    }
    parseThrowStatement(node) {
        this.next();
        if (this.hasPrecedingLineBreak()) {
            this.raise(Errors.NewlineAfterThrow, this.state.lastTokEndLoc);
        }
        node.argument = this.parseExpression();
        this.semicolon();
        return this.finishNode(node, "ThrowStatement");
    }
    parseCatchClauseParam() {
        const param = this.parseBindingAtom();
        this.scope.enter(this.options.annexB && param.type === "Identifier"
            ? ScopeFlag.SIMPLE_CATCH
            : 0);
        this.checkLVal(param, {
            in: { type: "CatchClause" },
            binding: BindingFlag.TYPE_CATCH_PARAM,
        });
        return param;
    }
    parseTryStatement(node) {
        this.next();
        node.block = this.parseBlock();
        node.handler = null;
        if (this.match(tt._catch)) {
            const clause = this.startNode();
            this.next();
            if (this.match(tt.parenL)) {
                this.expect(tt.parenL);
                clause.param = this.parseCatchClauseParam();
                this.expect(tt.parenR);
            }
            else {
                clause.param = null;
                this.scope.enter(ScopeFlag.OTHER);
            }
            // Parse the catch clause's body.
            clause.body =
                // For the smartPipelines plugin: Disable topic references from outer
                // contexts within the catch clause's body.
                this.withSmartMixTopicForbiddingContext(() => 
                // Parse the catch clause's body.
                this.parseBlock(false, false));
            this.scope.exit();
            node.handler = this.finishNode(clause, "CatchClause");
        }
        node.finalizer = this.eat(tt._finally) ? this.parseBlock() : null;
        if (!node.handler && !node.finalizer) {
            this.raise(Errors.NoCatchOrFinally, node);
        }
        return this.finishNode(node, "TryStatement");
    }
    // https://tc39.es/ecma262/#prod-VariableStatement
    // https://tc39.es/ecma262/#prod-LexicalDeclaration
    parseVarStatement(node, kind, allowMissingInitializer = false) {
        this.next();
        this.parseVar(node, false, kind, allowMissingInitializer);
        this.semicolon();
        return this.finishNode(node, "VariableDeclaration");
    }
    // https://tc39.es/ecma262/#prod-WhileStatement
    parseWhileStatement(node) {
        this.next();
        node.test = this.parseHeaderExpression();
        this.state.labels.push(loopLabel);
        // Parse the loop body.
        node.body =
            // For the smartPipelines plugin:
            // Disable topic references from outer contexts within the loop body.
            // They are permitted in test expressions, outside of the loop body.
            this.withSmartMixTopicForbiddingContext(() => 
            // Parse loop body.
            this.parseStatement());
        this.state.labels.pop();
        return this.finishNode(node, "WhileStatement");
    }
    parseWithStatement(node) {
        if (this.state.strict) {
            this.raise(Errors.StrictWith, this.state.startLoc);
        }
        this.next();
        node.object = this.parseHeaderExpression();
        // Parse the statement body.
        node.body =
            // For the smartPipelines plugin:
            // Disable topic references from outer contexts within the with statement's body.
            // They are permitted in function default-parameter expressions, which are
            // part of the outer context, outside of the with statement's body.
            this.withSmartMixTopicForbiddingContext(() => 
            // Parse the statement body.
            this.parseStatement());
        return this.finishNode(node, "WithStatement");
    }
    parseEmptyStatement(node) {
        this.next();
        return this.finishNode(node, "EmptyStatement");
    }
    // https://tc39.es/ecma262/#prod-LabelledStatement
    parseLabeledStatement(node, maybeName, expr, flags) {
        for (const label of this.state.labels) {
            if (label.name === maybeName) {
                this.raise(Errors.LabelRedeclaration, expr, {
                    labelName: maybeName,
                });
            }
        }
        const kind = tokenIsLoop(this.state.type)
            ? LoopLabelKind.Loop
            : this.match(tt._switch)
                ? LoopLabelKind.Switch
                : null;
        for (let i = this.state.labels.length - 1; i >= 0; i--) {
            const label = this.state.labels[i];
            if (label.statementStart === node.start) {
                label.statementStart = this.state.start;
                label.kind = kind;
            }
            else {
                break;
            }
        }
        this.state.labels.push({
            name: maybeName,
            kind: kind,
            statementStart: this.state.start,
        });
        // https://tc39.es/ecma262/#prod-LabelledItem
        node.body =
            flags & ParseStatementFlag.AllowLabeledFunction
                ? this.parseStatementOrSloppyAnnexBFunctionDeclaration(true)
                : this.parseStatement();
        this.state.labels.pop();
        node.label = expr;
        return this.finishNode(node, "LabeledStatement");
    }
    parseExpressionStatement(node, expr, 
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in TypeScript parser */
    decorators) {
        node.expression = expr;
        this.semicolon();
        return this.finishNode(node, "ExpressionStatement");
    }
    // Parse a semicolon-enclosed block of statements, handling `"use
    // strict"` declarations when `allowDirectives` is true (used for
    // function bodies).
    parseBlock(allowDirectives = false, createNewLexicalScope = true, afterBlockParse) {
        const node = this.startNode();
        if (allowDirectives) {
            this.state.strictErrors.clear();
        }
        this.expect(tt.braceL);
        if (createNewLexicalScope) {
            this.scope.enter(ScopeFlag.OTHER);
        }
        this.parseBlockBody(node, allowDirectives, false, tt.braceR, afterBlockParse);
        if (createNewLexicalScope) {
            this.scope.exit();
        }
        return this.finishNode(node, "BlockStatement");
    }
    isValidDirective(stmt) {
        return (stmt.type === "ExpressionStatement" &&
            stmt.expression.type === "StringLiteral" &&
            !stmt.expression.extra.parenthesized);
    }
    parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse) {
        const body = (node.body = []);
        const directives = (node.directives =
            []);
        this.parseBlockOrModuleBlockBody(body, allowDirectives ? directives : undefined, topLevel, end, afterBlockParse);
    }
    // Undefined directives means that directives are not allowed.
    // https://tc39.es/ecma262/#prod-Block
    // https://tc39.es/ecma262/#prod-ModuleBody
    parseBlockOrModuleBlockBody(body, directives, topLevel, end, afterBlockParse) {
        const oldStrict = this.state.strict;
        let hasStrictModeDirective = false;
        let parsedNonDirective = false;
        while (!this.match(end)) {
            const stmt = topLevel
                ? this.parseModuleItem()
                : this.parseStatementListItem();
            if (directives && !parsedNonDirective) {
                if (this.isValidDirective(stmt)) {
                    const directive = this.stmtToDirective(stmt);
                    directives.push(directive);
                    if (!hasStrictModeDirective &&
                        directive.value.value === "use strict") {
                        hasStrictModeDirective = true;
                        this.setStrict(true);
                    }
                    continue;
                }
                parsedNonDirective = true;
                // clear strict errors since the strict mode will not change within the block
                this.state.strictErrors.clear();
            }
            body.push(stmt);
        }
        afterBlockParse?.call(this, hasStrictModeDirective);
        if (!oldStrict) {
            this.setStrict(false);
        }
        this.next();
    }
    // Parse a regular `for` loop. The disambiguation code in
    // `parseStatement` will already have parsed the init statement or
    // expression.
    parseFor(node, init) {
        node.init = init;
        this.semicolon(/* allowAsi */ false);
        node.test = this.match(tt.semi) ? null : this.parseExpression();
        this.semicolon(/* allowAsi */ false);
        node.update = this.match(tt.parenR) ? null : this.parseExpression();
        this.expect(tt.parenR);
        // Parse the loop body.
        node.body =
            // For the smartPipelines plugin: Disable topic references from outer
            // contexts within the loop body. They are permitted in test expressions,
            // outside of the loop body.
            this.withSmartMixTopicForbiddingContext(() => 
            // Parse the loop body.
            this.parseStatement());
        this.scope.exit();
        this.state.labels.pop();
        return this.finishNode(node, "ForStatement");
    }
    // Parse a `for`/`in` and `for`/`of` loop, which are almost
    // same from parser's perspective.
    parseForIn(node, init, awaitAt) {
        const isForIn = this.match(tt._in);
        this.next();
        if (isForIn) {
            if (awaitAt !== null)
                this.unexpected(awaitAt);
        }
        else {
            node.await = awaitAt !== null;
        }
        if (init.type === "VariableDeclaration" &&
            init.declarations[0].init != null &&
            (!isForIn ||
                !this.options.annexB ||
                this.state.strict ||
                init.kind !== "var" ||
                init.declarations[0].id.type !== "Identifier")) {
            this.raise(Errors.ForInOfLoopInitializer, init, {
                type: isForIn ? "ForInStatement" : "ForOfStatement",
            });
        }
        if (init.type === "AssignmentPattern") {
            this.raise(Errors.InvalidLhs, init, {
                ancestor: { type: "ForStatement" },
            });
        }
        node.left = init;
        node.right = isForIn
            ? this.parseExpression()
            : this.parseMaybeAssignAllowIn();
        this.expect(tt.parenR);
        // Parse the loop body.
        node.body =
            // For the smartPipelines plugin:
            // Disable topic references from outer contexts within the loop body.
            // They are permitted in test expressions, outside of the loop body.
            this.withSmartMixTopicForbiddingContext(() => 
            // Parse loop body.
            this.parseStatement());
        this.scope.exit();
        this.state.labels.pop();
        return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
    }
    // Parse a list of variable declarations.
    parseVar(node, isFor, kind, allowMissingInitializer = false) {
        const declarations = (node.declarations = []);
        node.kind = kind;
        for (;;) {
            const decl = this.startNode();
            this.parseVarId(decl, kind);
            decl.init = !this.eat(tt.eq)
                ? null
                : isFor
                    ? this.parseMaybeAssignDisallowIn()
                    : this.parseMaybeAssignAllowIn();
            if (decl.init === null && !allowMissingInitializer) {
                if (decl.id.type !== "Identifier" &&
                    !(isFor && (this.match(tt._in) || this.isContextual(tt._of)))) {
                    this.raise(Errors.DeclarationMissingInitializer, this.state.lastTokEndLoc, {
                        kind: "destructuring",
                    });
                }
                else if (kind === "const" &&
                    !(this.match(tt._in) || this.isContextual(tt._of))) {
                    this.raise(Errors.DeclarationMissingInitializer, this.state.lastTokEndLoc, {
                        kind: "const",
                    });
                }
            }
            declarations.push(this.finishNode(decl, "VariableDeclarator"));
            if (!this.eat(tt.comma))
                break;
        }
        return node;
    }
    parseVarId(decl, kind) {
        const id = this.parseBindingAtom();
        this.checkLVal(id, {
            in: { type: "VariableDeclarator" },
            binding: kind === "var" ? BindingFlag.TYPE_VAR : BindingFlag.TYPE_LEXICAL,
        });
        decl.id = id;
    }
    // https://tc39.es/ecma262/#prod-AsyncFunctionExpression
    parseAsyncFunctionExpression(node) {
        return this.parseFunction(node, ParseFunctionFlag.Async);
    }
    // Parse a function declaration or expression (depending on the
    // ParseFunctionFlag.Declaration flag).
    parseFunction(node, flags = ParseFunctionFlag.Expression) {
        const hangingDeclaration = flags & ParseFunctionFlag.HangingDeclaration;
        const isDeclaration = !!(flags & ParseFunctionFlag.Declaration);
        const requireId = isDeclaration && !(flags & ParseFunctionFlag.NullableId);
        const isAsync = !!(flags & ParseFunctionFlag.Async);
        this.initFunction(node, isAsync);
        if (this.match(tt.star)) {
            if (hangingDeclaration) {
                this.raise(Errors.GeneratorInSingleStatementContext, this.state.startLoc);
            }
            this.next(); // eat *
            node.generator = true;
        }
        if (isDeclaration) {
            node.id = this.parseFunctionId(requireId);
        }
        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        this.state.maybeInArrowParameters = false;
        this.scope.enter(ScopeFlag.FUNCTION);
        this.prodParam.enter(functionFlags(isAsync, node.generator));
        if (!isDeclaration) {
            node.id = this.parseFunctionId();
        }
        this.parseFunctionParams(node, /* isConstructor */ false);
        // For the smartPipelines plugin: Disable topic references from outer
        // contexts within the function body. They are permitted in function
        // default-parameter expressions, outside of the function body.
        this.withSmartMixTopicForbiddingContext(() => {
            // Parse the function body.
            this.parseFunctionBodyAndFinish(node, isDeclaration ? "FunctionDeclaration" : "FunctionExpression");
        });
        this.prodParam.exit();
        this.scope.exit();
        if (isDeclaration && !hangingDeclaration) {
            // We need to register this _after_ parsing the function body
            // because of TypeScript body-less function declarations,
            // which shouldn't be added to the scope.
            this.registerFunctionStatementId(node);
        }
        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        return node;
    }
    parseFunctionId(requireId) {
        return requireId || tokenIsIdentifier(this.state.type)
            ? this.parseIdentifier()
            : null;
    }
    parseFunctionParams(node, isConstructor) {
        this.expect(tt.parenL);
        this.expressionScope.enter(newParameterDeclarationScope());
        node.params = this.parseBindingList(tt.parenR, charCodes.rightParenthesis, ParseBindingListFlags.IS_FUNCTION_PARAMS |
            (isConstructor ? ParseBindingListFlags.IS_CONSTRUCTOR_PARAMS : 0));
        this.expressionScope.exit();
    }
    registerFunctionStatementId(node) {
        if (!node.id)
            return;
        // If it is a regular function declaration in sloppy mode, then it is
        // subject to Annex B semantics (BindingFlag.TYPE_FUNCTION). Otherwise, the binding
        // mode depends on properties of the current scope (see
        // treatFunctionsAsVar).
        this.scope.declareName(node.id.name, !this.options.annexB || this.state.strict || node.generator || node.async
            ? this.scope.treatFunctionsAsVar
                ? BindingFlag.TYPE_VAR
                : BindingFlag.TYPE_LEXICAL
            : BindingFlag.TYPE_FUNCTION, node.id.loc.start);
    }
    // Parse a class declaration or literal (depending on the
    // `isStatement` parameter).
    parseClass(node, isStatement, optionalId) {
        this.next(); // 'class'
        // A class definition is always strict mode code.
        const oldStrict = this.state.strict;
        this.state.strict = true;
        this.parseClassId(node, isStatement, optionalId);
        this.parseClassSuper(node);
        // this.state.strict is restored in parseClassBody
        node.body = this.parseClassBody(!!node.superClass, oldStrict);
        return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
    }
    isClassProperty() {
        return this.match(tt.eq) || this.match(tt.semi) || this.match(tt.braceR);
    }
    isClassMethod() {
        return this.match(tt.parenL);
    }
    isNonstaticConstructor(method) {
        return (!method.computed &&
            !method.static &&
            (method.key.name === "constructor" || // Identifier
                method.key.value === "constructor") // String literal
        );
    }
    // https://tc39.es/ecma262/#prod-ClassBody
    parseClassBody(hadSuperClass, oldStrict) {
        this.classScope.enter();
        const state = {
            hadConstructor: false,
            hadSuperClass,
        };
        let decorators = [];
        const classBody = this.startNode();
        classBody.body = [];
        this.expect(tt.braceL);
        // For the smartPipelines plugin: Disable topic references from outer
        // contexts within the class body.
        this.withSmartMixTopicForbiddingContext(() => {
            // Parse the contents within the braces.
            while (!this.match(tt.braceR)) {
                if (this.eat(tt.semi)) {
                    if (decorators.length > 0) {
                        throw this.raise(Errors.DecoratorSemicolon, this.state.lastTokEndLoc);
                    }
                    continue;
                }
                if (this.match(tt.at)) {
                    decorators.push(this.parseDecorator());
                    continue;
                }
                const member = this.startNode();
                // steal the decorators if there are any
                if (decorators.length) {
                    // @ts-expect-error Fixme
                    member.decorators = decorators;
                    this.resetStartLocationFromNode(member, decorators[0]);
                    decorators = [];
                }
                this.parseClassMember(classBody, member, state);
                if (
                // @ts-expect-error Fixme
                member.kind === "constructor" &&
                    // @ts-expect-error Fixme
                    member.decorators &&
                    // @ts-expect-error Fixme
                    member.decorators.length > 0) {
                    this.raise(Errors.DecoratorConstructor, member);
                }
            }
        });
        this.state.strict = oldStrict;
        this.next(); // eat `}`
        if (decorators.length) {
            throw this.raise(Errors.TrailingDecorator, this.state.startLoc);
        }
        this.classScope.exit();
        return this.finishNode(classBody, "ClassBody");
    }
    // returns true if the current identifier is a method/field name,
    // false if it is a modifier
    parseClassMemberFromModifier(classBody, member) {
        const key = this.parseIdentifier(true); // eats the modifier
        if (this.isClassMethod()) {
            const method = member;
            // a method named like the modifier
            method.kind = "method";
            method.computed = false;
            method.key = key;
            method.static = false;
            this.pushClassMethod(classBody, method, false, false, 
            /* isConstructor */ false, false);
            return true;
        }
        else if (this.isClassProperty()) {
            const prop = member;
            // a property named like the modifier
            prop.computed = false;
            prop.key = key;
            prop.static = false;
            classBody.body.push(this.parseClassProperty(prop));
            return true;
        }
        this.resetPreviousNodeTrailingComments(key);
        return false;
    }
    parseClassMember(classBody, member, state) {
        const isStatic = this.isContextual(tt._static);
        if (isStatic) {
            if (this.parseClassMemberFromModifier(classBody, member)) {
                // a class element named 'static'
                return;
            }
            if (this.eat(tt.braceL)) {
                this.parseClassStaticBlock(classBody, member);
                return;
            }
        }
        this.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
    }
    parseClassMemberWithIsStatic(classBody, member, state, isStatic) {
        const publicMethod = member;
        const privateMethod = member;
        const publicProp = member;
        const privateProp = member;
        const accessorProp = member;
        const method = publicMethod;
        const publicMember = publicMethod;
        member.static = isStatic;
        this.parsePropertyNamePrefixOperator(member);
        if (this.eat(tt.star)) {
            // a generator
            method.kind = "method";
            const isPrivateName = this.match(tt.privateName);
            this.parseClassElementName(method);
            if (isPrivateName) {
                // Private generator method
                this.pushClassPrivateMethod(classBody, privateMethod, true, false);
                return;
            }
            if (this.isNonstaticConstructor(publicMethod)) {
                this.raise(Errors.ConstructorIsGenerator, publicMethod.key);
            }
            this.pushClassMethod(classBody, publicMethod, true, false, 
            /* isConstructor */ false, false);
            return;
        }
        const isContextual = tokenIsIdentifier(this.state.type) && !this.state.containsEsc;
        const isPrivate = this.match(tt.privateName);
        const key = this.parseClassElementName(member);
        const maybeQuestionTokenStartLoc = this.state.startLoc;
        this.parsePostMemberNameModifiers(publicMember);
        if (this.isClassMethod()) {
            method.kind = "method";
            if (isPrivate) {
                this.pushClassPrivateMethod(classBody, privateMethod, false, false);
                return;
            }
            // a normal method
            const isConstructor = this.isNonstaticConstructor(publicMethod);
            let allowsDirectSuper = false;
            if (isConstructor) {
                publicMethod.kind = "constructor";
                // TypeScript allows multiple overloaded constructor declarations.
                if (state.hadConstructor && !this.hasPlugin("typescript")) {
                    this.raise(Errors.DuplicateConstructor, key);
                }
                if (isConstructor && this.hasPlugin("typescript") && member.override) {
                    this.raise(Errors.OverrideOnConstructor, key);
                }
                state.hadConstructor = true;
                allowsDirectSuper = state.hadSuperClass;
            }
            this.pushClassMethod(classBody, publicMethod, false, false, isConstructor, allowsDirectSuper);
        }
        else if (this.isClassProperty()) {
            if (isPrivate) {
                this.pushClassPrivateProperty(classBody, privateProp);
            }
            else {
                this.pushClassProperty(classBody, publicProp);
            }
        }
        else if (isContextual &&
            key.name === "async" &&
            !this.isLineTerminator()) {
            // an async method
            this.resetPreviousNodeTrailingComments(key);
            const isGenerator = this.eat(tt.star);
            if (publicMember.optional) {
                this.unexpected(maybeQuestionTokenStartLoc);
            }
            method.kind = "method";
            // The so-called parsed name would have been "async": get the real name.
            const isPrivate = this.match(tt.privateName);
            this.parseClassElementName(method);
            this.parsePostMemberNameModifiers(publicMember);
            if (isPrivate) {
                // private async method
                this.pushClassPrivateMethod(classBody, privateMethod, isGenerator, true);
            }
            else {
                if (this.isNonstaticConstructor(publicMethod)) {
                    this.raise(Errors.ConstructorIsAsync, publicMethod.key);
                }
                this.pushClassMethod(classBody, publicMethod, isGenerator, true, 
                /* isConstructor */ false, false);
            }
        }
        else if (isContextual &&
            (key.name === "get" || key.name === "set") &&
            !(this.match(tt.star) && this.isLineTerminator())) {
            // `get\n*` is an uninitialized property named 'get' followed by a generator.
            // a getter or setter
            this.resetPreviousNodeTrailingComments(key);
            method.kind = key.name;
            // The so-called parsed name would have been "get/set": get the real name.
            const isPrivate = this.match(tt.privateName);
            this.parseClassElementName(publicMethod);
            if (isPrivate) {
                // private getter/setter
                this.pushClassPrivateMethod(classBody, privateMethod, false, false);
            }
            else {
                if (this.isNonstaticConstructor(publicMethod)) {
                    this.raise(Errors.ConstructorIsAccessor, publicMethod.key);
                }
                this.pushClassMethod(classBody, publicMethod, false, false, 
                /* isConstructor */ false, false);
            }
            this.checkGetterSetterParams(publicMethod);
        }
        else if (isContextual &&
            key.name === "accessor" &&
            !this.isLineTerminator()) {
            this.expectPlugin("decoratorAutoAccessors");
            this.resetPreviousNodeTrailingComments(key);
            // The so-called parsed name would have been "accessor": get the real name.
            const isPrivate = this.match(tt.privateName);
            this.parseClassElementName(publicProp);
            this.pushClassAccessorProperty(classBody, accessorProp, isPrivate);
        }
        else if (this.isLineTerminator()) {
            // an uninitialized class property (due to ASI, since we don't otherwise recognize the next token)
            if (isPrivate) {
                this.pushClassPrivateProperty(classBody, privateProp);
            }
            else {
                this.pushClassProperty(classBody, publicProp);
            }
        }
        else {
            this.unexpected();
        }
    }
    // https://tc39.es/ecma262/#prod-ClassElementName
    parseClassElementName(member) {
        const { type, value } = this.state;
        if ((type === tt.name || type === tt.string) &&
            member.static &&
            value === "prototype") {
            this.raise(Errors.StaticPrototype, this.state.startLoc);
        }
        if (type === tt.privateName) {
            if (value === "constructor") {
                this.raise(Errors.ConstructorClassPrivateField, this.state.startLoc);
            }
            const key = this.parsePrivateName();
            member.key = key;
            return key;
        }
        return this.parsePropertyName(member);
    }
    parseClassStaticBlock(classBody, member) {
        // Start a new lexical scope
        this.scope.enter(ScopeFlag.CLASS | ScopeFlag.STATIC_BLOCK | ScopeFlag.SUPER);
        // Start a new scope with regard to loop labels
        const oldLabels = this.state.labels;
        this.state.labels = [];
        // ClassStaticBlockStatementList:
        //   StatementList[~Yield, ~Await, ~Return] opt
        this.prodParam.enter(ParamKind.PARAM);
        const body = (member.body = []);
        this.parseBlockOrModuleBlockBody(body, undefined, false, tt.braceR);
        this.prodParam.exit();
        this.scope.exit();
        this.state.labels = oldLabels;
        classBody.body.push(this.finishNode(member, "StaticBlock"));
        if (member.decorators?.length) {
            this.raise(Errors.DecoratorStaticBlock, member);
        }
    }
    pushClassProperty(classBody, prop) {
        if (!prop.computed &&
            (prop.key.name === "constructor" || prop.key.value === "constructor")) {
            // Non-computed field, which is either an identifier named "constructor"
            // or a string literal named "constructor"
            this.raise(Errors.ConstructorClassField, prop.key);
        }
        classBody.body.push(this.parseClassProperty(prop));
    }
    pushClassPrivateProperty(classBody, prop) {
        const node = this.parseClassPrivateProperty(prop);
        classBody.body.push(node);
        this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), ClassElementType.OTHER, node.key.loc.start);
    }
    pushClassAccessorProperty(classBody, prop, isPrivate) {
        if (!isPrivate && !prop.computed) {
            // Not private, so not node is not a PrivateName and we can safely cast
            const key = prop.key;
            if (key.name === "constructor" || key.value === "constructor") {
                // Non-computed field, which is either an identifier named "constructor"
                // or a string literal named "constructor"
                this.raise(Errors.ConstructorClassField, key);
            }
        }
        const node = this.parseClassAccessorProperty(prop);
        classBody.body.push(node);
        if (isPrivate) {
            this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), ClassElementType.OTHER, node.key.loc.start);
        }
    }
    pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
        classBody.body.push(this.parseMethod(method, isGenerator, isAsync, isConstructor, allowsDirectSuper, "ClassMethod", true));
    }
    pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
        const node = this.parseMethod(method, isGenerator, isAsync, 
        /* isConstructor */ false, false, "ClassPrivateMethod", true);
        classBody.body.push(node);
        const kind = node.kind === "get"
            ? node.static
                ? ClassElementType.STATIC_GETTER
                : ClassElementType.INSTANCE_GETTER
            : node.kind === "set"
                ? node.static
                    ? ClassElementType.STATIC_SETTER
                    : ClassElementType.INSTANCE_SETTER
                : ClassElementType.OTHER;
        this.declareClassPrivateMethodInScope(node, kind);
    }
    declareClassPrivateMethodInScope(node, kind) {
        this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), kind, node.key.loc.start);
    }
    // Overridden in typescript.js
    parsePostMemberNameModifiers(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    methodOrProp) { }
    // https://tc39.es/ecma262/#prod-FieldDefinition
    parseClassPrivateProperty(node) {
        this.parseInitializer(node);
        this.semicolon();
        return this.finishNode(node, "ClassPrivateProperty");
    }
    // https://tc39.es/ecma262/#prod-FieldDefinition
    parseClassProperty(node) {
        this.parseInitializer(node);
        this.semicolon();
        return this.finishNode(node, "ClassProperty");
    }
    parseClassAccessorProperty(node) {
        this.parseInitializer(node);
        this.semicolon();
        return this.finishNode(node, "ClassAccessorProperty");
    }
    // https://tc39.es/ecma262/#prod-Initializer
    parseInitializer(node) {
        this.scope.enter(ScopeFlag.CLASS | ScopeFlag.SUPER);
        this.expressionScope.enter(newExpressionScope());
        this.prodParam.enter(ParamKind.PARAM);
        node.value = this.eat(tt.eq) ? this.parseMaybeAssignAllowIn() : null;
        this.expressionScope.exit();
        this.prodParam.exit();
        this.scope.exit();
    }
    parseClassId(node, isStatement, optionalId, bindingType = BindingFlag.TYPE_CLASS) {
        if (tokenIsIdentifier(this.state.type)) {
            node.id = this.parseIdentifier();
            if (isStatement) {
                this.declareNameFromIdentifier(node.id, bindingType);
            }
        }
        else {
            if (optionalId || !isStatement) {
                node.id = null;
            }
            else {
                throw this.raise(Errors.MissingClassName, this.state.startLoc);
            }
        }
    }
    // https://tc39.es/ecma262/#prod-ClassHeritage
    parseClassSuper(node) {
        node.superClass = this.eat(tt._extends) ? this.parseExprSubscripts() : null;
    }
    // Parses module export declaration.
    // https://tc39.es/ecma262/#prod-ExportDeclaration
    parseExport(node, decorators) {
        const maybeDefaultIdentifier = this.parseMaybeImportPhase(node, 
        /* isExport */ true);
        const hasDefault = this.maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier);
        const parseAfterDefault = !hasDefault || this.eat(tt.comma);
        const hasStar = parseAfterDefault &&
            this.eatExportStar(
            // @ts-expect-error todo(flow->ts)
            node);
        const hasNamespace = hasStar &&
            this.maybeParseExportNamespaceSpecifier(
            // @ts-expect-error todo(flow->ts)
            node);
        const parseAfterNamespace = parseAfterDefault && (!hasNamespace || this.eat(tt.comma));
        const isFromRequired = hasDefault || hasStar;
        if (hasStar && !hasNamespace) {
            if (hasDefault)
                this.unexpected();
            if (decorators) {
                throw this.raise(Errors.UnsupportedDecoratorExport, node);
            }
            this.parseExportFrom(node, true);
            return this.finishNode(node, "ExportAllDeclaration");
        }
        const hasSpecifiers = this.maybeParseExportNamedSpecifiers(
        // @ts-expect-error todo(flow->ts)
        node);
        if (hasDefault && parseAfterDefault && !hasStar && !hasSpecifiers) {
            this.unexpected(null, tt.braceL);
        }
        if (hasNamespace && parseAfterNamespace) {
            this.unexpected(null, tt._from);
        }
        let hasDeclaration;
        if (isFromRequired || hasSpecifiers) {
            hasDeclaration = false;
            if (decorators) {
                throw this.raise(Errors.UnsupportedDecoratorExport, node);
            }
            this.parseExportFrom(node, isFromRequired);
        }
        else {
            hasDeclaration = this.maybeParseExportDeclaration(node);
        }
        if (isFromRequired || hasSpecifiers || hasDeclaration) {
            const node2 = node;
            this.checkExport(node2, true, false, !!node2.source);
            if (node2.declaration?.type === "ClassDeclaration") {
                this.maybeTakeDecorators(decorators, node2.declaration, node2);
            }
            else if (node2.declaration?.type === "ArkTSStructDeclaration") {
                this.maybeTakeDecorators(decorators, 
                // @ts-ignore
                node2.declaration, node2);
            }
            else if (decorators) {
                throw this.raise(Errors.UnsupportedDecoratorExport, node);
            }
            return this.finishNode(node2, "ExportNamedDeclaration");
        }
        if (this.eat(tt._default)) {
            const node2 = node;
            // export default ...
            const decl = this.parseExportDefaultExpression();
            node2.declaration = decl;
            if (decl.type === "ClassDeclaration") {
                this.maybeTakeDecorators(decorators, decl, node2);
            }
            else if (decl.type === "ArkTSStructDeclaration") {
                // @ts-ignore
                this.maybeTakeDecorators(decorators, decl, node2);
            }
            else if (decorators) {
                throw this.raise(Errors.UnsupportedDecoratorExport, node);
            }
            this.checkExport(node2, true, true);
            return this.finishNode(node2, "ExportDefaultDeclaration");
        }
        this.unexpected(null, tt.braceL);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eatExportStar(node) {
        return this.eat(tt.star);
    }
    maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier) {
        if (maybeDefaultIdentifier || this.isExportDefaultSpecifier()) {
            // export defaultObj ...
            this.expectPlugin("exportDefaultFrom", maybeDefaultIdentifier?.loc.start);
            const id = maybeDefaultIdentifier || this.parseIdentifier(true);
            const specifier = this.startNodeAtNode(id);
            specifier.exported = id;
            node.specifiers = [
                this.finishNode(specifier, "ExportDefaultSpecifier"),
            ];
            return true;
        }
        return false;
    }
    maybeParseExportNamespaceSpecifier(node) {
        if (this.isContextual(tt._as)) {
            if (!node.specifiers)
                node.specifiers = [];
            const specifier = this.startNodeAt(this.state.lastTokStartLoc);
            this.next();
            specifier.exported = this.parseModuleExportName();
            node.specifiers.push(this.finishNode(specifier, "ExportNamespaceSpecifier"));
            return true;
        }
        return false;
    }
    maybeParseExportNamedSpecifiers(node) {
        if (this.match(tt.braceL)) {
            if (!node.specifiers)
                node.specifiers = [];
            const isTypeExport = node.exportKind === "type";
            node.specifiers.push(...this.parseExportSpecifiers(isTypeExport));
            node.source = null;
            node.declaration = null;
            if (this.hasPlugin("importAssertions")) {
                node.assertions = [];
            }
            return true;
        }
        return false;
    }
    maybeParseExportDeclaration(node) {
        if (this.shouldParseExportDeclaration()) {
            node.specifiers = [];
            node.source = null;
            if (this.hasPlugin("importAssertions")) {
                node.assertions = [];
            }
            node.declaration = this.parseExportDeclaration(node);
            return true;
        }
        return false;
    }
    isAsyncFunction() {
        if (!this.isContextual(tt._async))
            return false;
        const next = this.nextTokenInLineStart();
        return this.isUnparsedContextual(next, "function");
    }
    parseExportDefaultExpression() {
        const expr = this.startNode();
        if (this.match(tt._function)) {
            this.next();
            return this.parseFunction(expr, ParseFunctionFlag.Declaration | ParseFunctionFlag.NullableId);
        }
        else if (this.isAsyncFunction()) {
            this.next(); // eat 'async'
            this.next(); // eat 'function'
            return this.parseFunction(expr, ParseFunctionFlag.Declaration |
                ParseFunctionFlag.NullableId |
                ParseFunctionFlag.Async);
        }
        if (this.match(tt._class)) {
            return this.parseClass(expr, true, true);
        }
        if (this.match(tt._struct)) {
            //@ts-ignore
            return this.arktsParseStruct(expr);
        } //my do
        if (this.match(tt.at)) {
            if (this.hasPlugin("decorators") &&
                this.getPluginOption("decorators", "decoratorsBeforeExport") === true) {
                this.raise(Errors.DecoratorBeforeExport, this.state.startLoc);
            }
            return this.parseClass(this.maybeTakeDecorators(this.parseDecorators(false), this.startNode()), true, true);
        }
        if (this.match(tt._const) || this.match(tt._var) || this.isLet()) {
            throw this.raise(Errors.UnsupportedDefaultExport, this.state.startLoc);
        }
        const res = this.parseMaybeAssignAllowIn();
        this.semicolon();
        return res;
    }
    // https://tc39.es/ecma262/#prod-ExportDeclaration
    parseExportDeclaration(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    node) {
        if (this.match(tt._class)) {
            const node = this.parseClass(this.startNode(), true, false);
            return node;
        }
        if (this.match(tt._struct)) {
            //@ts-ignore
            const node = this.arktsParseStruct(this.startNode());
            return node;
        }
        return this.parseStatementListItem();
    }
    isExportDefaultSpecifier() {
        const { type } = this.state;
        if (tokenIsIdentifier(type)) {
            if ((type === tt._async && !this.state.containsEsc) || type === tt._let) {
                return false;
            }
            if ((type === tt._type || type === tt._interface) &&
                !this.state.containsEsc) {
                const { type: nextType } = this.lookahead();
                // If we see any variable name other than `from` after `type` keyword,
                // we consider it as flow/typescript type exports
                // note that this approach may fail on some pedantic cases
                // export type from = number
                if ((tokenIsIdentifier(nextType) && nextType !== tt._from) ||
                    nextType === tt.braceL) {
                    this.expectOnePlugin(["flow", "typescript"]);
                    return false;
                }
            }
        }
        else if (!this.match(tt._default)) {
            return false;
        }
        const next = this.nextTokenStart();
        const hasFrom = this.isUnparsedContextual(next, "from");
        if (this.input.charCodeAt(next) === charCodes.comma ||
            (tokenIsIdentifier(this.state.type) && hasFrom)) {
            return true;
        }
        // lookahead again when `export default from` is seen
        if (this.match(tt._default) && hasFrom) {
            const nextAfterFrom = this.input.charCodeAt(this.nextTokenStartSince(next + 4));
            return (nextAfterFrom === charCodes.quotationMark ||
                nextAfterFrom === charCodes.apostrophe);
        }
        return false;
    }
    parseExportFrom(node, expect) {
        if (this.eatContextual(tt._from)) {
            node.source = this.parseImportSource();
            this.checkExport(node);
            this.maybeParseImportAttributes(node);
            this.checkJSONModuleImport(node);
        }
        else if (expect) {
            this.unexpected();
        }
        this.semicolon();
    }
    shouldParseExportDeclaration() {
        const { type } = this.state;
        if (type === tt.at) {
            this.expectOnePlugin(["decorators", "decorators-legacy"]);
            if (this.hasPlugin("decorators")) {
                if (this.getPluginOption("decorators", "decoratorsBeforeExport") === true) {
                    this.raise(Errors.DecoratorBeforeExport, this.state.startLoc);
                }
                return true;
            }
        }
        return (type === tt._var ||
            type === tt._const ||
            type === tt._function ||
            type === tt._class ||
            type === tt._struct ||
            this.isLet() ||
            this.isAsyncFunction());
    }
    checkExport(node, checkNames, isDefault, isFrom) {
        if (checkNames) {
            // Check for duplicate exports
            if (isDefault) {
                // Default exports
                this.checkDuplicateExports(node, "default");
                if (this.hasPlugin("exportDefaultFrom")) {
                    const declaration = node
                        .declaration;
                    if (declaration.type === "Identifier" &&
                        declaration.name === "from" &&
                        declaration.end - declaration.start === 4 && // does not contain escape
                        !declaration.extra?.parenthesized) {
                        this.raise(Errors.ExportDefaultFromAsIdentifier, declaration);
                    }
                }
                // @ts-expect-error node.specifiers may not exist
            }
            else if (node.specifiers?.length) {
                // Named exports
                // @ts-expect-error node.specifiers may not exist
                for (const specifier of node.specifiers) {
                    const { exported } = specifier;
                    const exportName = exported.type === "Identifier" ? exported.name : exported.value;
                    this.checkDuplicateExports(specifier, exportName);
                    if (!isFrom && specifier.local) {
                        const { local } = specifier;
                        if (local.type !== "Identifier") {
                            this.raise(Errors.ExportBindingIsString, specifier, {
                                localName: local.value,
                                exportName,
                            });
                        }
                        else {
                            // check for keywords used as local names
                            this.checkReservedWord(local.name, local.loc.start, true, false);
                            // check if export is defined
                            this.scope.checkLocalExport(local);
                        }
                    }
                }
            }
            else if (node.declaration) {
                // Exported declarations
                if (node.declaration.type === "FunctionDeclaration" ||
                    node.declaration.type === "ClassDeclaration") {
                    const id = node.declaration.id;
                    if (!id)
                        throw new Error("Assertion failure");
                    this.checkDuplicateExports(node, id.name);
                }
                else if (node.declaration.type === "VariableDeclaration") {
                    for (const declaration of node.declaration.declarations) {
                        this.checkDeclaration(declaration.id);
                    }
                }
            }
        }
    }
    checkDeclaration(node) {
        if (node.type === "Identifier") {
            this.checkDuplicateExports(node, node.name);
        }
        else if (node.type === "ObjectPattern") {
            for (const prop of node.properties) {
                this.checkDeclaration(prop);
            }
        }
        else if (node.type === "ArrayPattern") {
            for (const elem of node.elements) {
                if (elem) {
                    this.checkDeclaration(elem);
                }
            }
        }
        else if (node.type === "ObjectProperty") {
            // @ts-expect-error migrate to Babel types
            this.checkDeclaration(node.value);
        }
        else if (node.type === "RestElement") {
            this.checkDeclaration(node.argument);
        }
        else if (node.type === "AssignmentPattern") {
            this.checkDeclaration(node.left);
        }
    }
    checkDuplicateExports(node, exportName) {
        if (this.exportedIdentifiers.has(exportName)) {
            if (exportName === "default") {
                this.raise(Errors.DuplicateDefaultExport, node);
            }
            else {
                this.raise(Errors.DuplicateExport, node, { exportName });
            }
        }
        this.exportedIdentifiers.add(exportName);
    }
    // Parses a comma-separated list of module exports.
    parseExportSpecifiers(isInTypeExport) {
        const nodes = [];
        let first = true;
        // export { x, y as z } [from '...']
        this.expect(tt.braceL);
        while (!this.eat(tt.braceR)) {
            if (first) {
                first = false;
            }
            else {
                this.expect(tt.comma);
                if (this.eat(tt.braceR))
                    break;
            }
            const isMaybeTypeOnly = this.isContextual(tt._type);
            const isString = this.match(tt.string);
            const node = this.startNode();
            node.local = this.parseModuleExportName();
            nodes.push(this.parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly));
        }
        return nodes;
    }
    parseExportSpecifier(node, isString, 
    /* eslint-disable @typescript-eslint/no-unused-vars -- used in TypeScript parser */
    isInTypeExport, isMaybeTypeOnly) {
        if (this.eatContextual(tt._as)) {
            node.exported = this.parseModuleExportName();
        }
        else if (isString) {
            node.exported = cloneStringLiteral(node.local);
        }
        else if (!node.exported) {
            node.exported = cloneIdentifier(node.local);
        }
        return this.finishNode(node, "ExportSpecifier");
    }
    // https://tc39.es/ecma262/#prod-ModuleExportName
    parseModuleExportName() {
        if (this.match(tt.string)) {
            const result = this.parseStringLiteral(this.state.value);
            const surrogate = result.value.match(loneSurrogate);
            if (surrogate) {
                this.raise(Errors.ModuleExportNameHasLoneSurrogate, result, {
                    surrogateCharCode: surrogate[0].charCodeAt(0),
                });
            }
            return result;
        }
        return this.parseIdentifier(true);
    }
    isJSONModuleImport(node) {
        if (node.assertions != null) {
            return node.assertions.some(({ key, value }) => {
                return (value.value === "json" &&
                    (key.type === "Identifier"
                        ? key.name === "type"
                        : key.value === "type"));
            });
        }
        return false;
    }
    checkImportReflection(node) {
        const { specifiers } = node;
        const singleBindingType = specifiers.length === 1 ? specifiers[0].type : null;
        if (node.phase === "source") {
            if (singleBindingType !== "ImportDefaultSpecifier") {
                this.raise(Errors.SourcePhaseImportRequiresDefault, specifiers[0].loc.start);
            }
        }
        else if (node.phase === "defer") {
            if (singleBindingType !== "ImportNamespaceSpecifier") {
                this.raise(Errors.DeferImportRequiresNamespace, specifiers[0].loc.start);
            }
        }
        else if (node.module) {
            if (singleBindingType !== "ImportDefaultSpecifier") {
                this.raise(Errors.ImportReflectionNotBinding, specifiers[0].loc.start);
            }
            if (node.assertions?.length > 0) {
                this.raise(Errors.ImportReflectionHasAssertion, specifiers[0].loc.start);
            }
        }
    }
    checkJSONModuleImport(node) {
        // @ts-expect-error Fixme: node.type must be undefined because they are undone
        if (this.isJSONModuleImport(node) && node.type !== "ExportAllDeclaration") {
            // @ts-expect-error specifiers may not index node
            const { specifiers } = node;
            if (specifiers != null) {
                // @ts-expect-error refine specifier types
                const nonDefaultNamedSpecifier = specifiers.find(specifier => {
                    let imported;
                    if (specifier.type === "ExportSpecifier") {
                        imported = specifier.local;
                    }
                    else if (specifier.type === "ImportSpecifier") {
                        imported = specifier.imported;
                    }
                    if (imported !== undefined) {
                        return imported.type === "Identifier"
                            ? imported.name !== "default"
                            : imported.value !== "default";
                    }
                });
                if (nonDefaultNamedSpecifier !== undefined) {
                    this.raise(Errors.ImportJSONBindingNotDefault, nonDefaultNamedSpecifier.loc.start);
                }
            }
        }
    }
    isPotentialImportPhase(isExport) {
        if (isExport)
            return false;
        return (this.isContextual(tt._source) ||
            this.isContextual(tt._defer) ||
            this.isContextual(tt._module));
    }
    applyImportPhase(node, isExport, phase, loc) {
        if (isExport) {
            if (!process.env.IS_PUBLISH) {
                if (phase === "module" || phase === "source") {
                    throw new Error(`Assertion failure: export declarations do not support the '${phase}' phase.`);
                }
            }
            return;
        }
        if (phase === "module") {
            this.expectPlugin("importReflection", loc);
            node.module = true;
        }
        else if (this.hasPlugin("importReflection")) {
            node.module = false;
        }
        if (phase === "source") {
            this.expectPlugin("sourcePhaseImports", loc);
            node.phase = "source";
        }
        else if (phase === "defer") {
            this.expectPlugin("deferredImportEvaluation", loc);
            node.phase = "defer";
        }
        else if (this.hasPlugin("sourcePhaseImports")) {
            node.phase = null;
        }
    }
    /*
     * Parse `module` in `import module x from "x"`, disambiguating
     * `import module from "x"` and `import module from from "x"`.
     *
     * This function might return an identifier representing the `module`
     * if it eats `module` and then discovers that it was the default import
     * binding and not the import reflection.
     *
     * This function is also used to parse `import type` and `import typeof`
     * in the TS and Flow plugins.
     *
     * Note: the proposal has been updated to use `source` instead of `module`,
     * but it has not been implemented yet.
     */
    parseMaybeImportPhase(node, isExport) {
        if (!this.isPotentialImportPhase(isExport)) {
            this.applyImportPhase(node, isExport, null);
            return null;
        }
        const phaseIdentifier = this.parseIdentifier(true);
        const { type } = this.state;
        const isImportPhase = tokenIsKeywordOrIdentifier(type)
            ? // OK: import <phase> x from "foo";
                // OK: import <phase> from from "foo";
                // NO: import <phase> from "foo";
                // NO: import <phase> from 'foo';
                // With the module declarations proposals, we will need further disambiguation
                // for `import module from from;`.
                type !== tt._from || this.lookaheadCharCode() === charCodes.lowercaseF
            : // OK: import <phase> { x } from "foo";
                // OK: import <phase> x from "foo";
                // OK: import <phase> * as T from "foo";
                // NO: import <phase> from "foo";
                // OK: import <phase> "foo";
                // The last one is invalid, we will continue parsing and throw
                // an error later
                type !== tt.comma;
        if (isImportPhase) {
            this.resetPreviousIdentifierLeadingComments(phaseIdentifier);
            this.applyImportPhase(node, isExport, phaseIdentifier.name, phaseIdentifier.loc.start);
            return null;
        }
        else {
            this.applyImportPhase(node, isExport, null);
            // `<phase>` is a default binding, return it to the main import declaration parser
            return phaseIdentifier;
        }
    }
    isPrecedingIdImportPhase(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    phase) {
        const { type } = this.state;
        return tokenIsIdentifier(type)
            ? // OK: import <phase> x from "foo";
                // OK: import <phase> from from "foo";
                // NO: import <phase> from "foo";
                // NO: import <phase> from 'foo';
                // With the module declarations proposals, we will need further disambiguation
                // for `import module from from;`.
                type !== tt._from || this.lookaheadCharCode() === charCodes.lowercaseF
            : // OK: import <phase> { x } from "foo";
                // OK: import <phase> x from "foo";
                // OK: import <phase> * as T from "foo";
                // NO: import <phase> from "foo";
                // OK: import <phase> "foo";
                // The last one is invalid, we will continue parsing and throw
                // an error later
                type !== tt.comma;
    }
    // Parses import declaration.
    // https://tc39.es/ecma262/#prod-ImportDeclaration
    parseImport(node) {
        if (this.match(tt.string)) {
            // import '...'
            return this.parseImportSourceAndAttributes(node);
        }
        return this.parseImportSpecifiersAndAfter(node, this.parseMaybeImportPhase(node, /* isExport */ false));
    }
    parseImportSpecifiersAndAfter(node, maybeDefaultIdentifier) {
        node.specifiers = [];
        // check if we have a default import like
        // import React from "react";
        const hasDefault = this.maybeParseDefaultImportSpecifier(node, maybeDefaultIdentifier);
        /* we are checking if we do not have a default import, then it is obvious that we need named imports
         * import { get } from "axios";
         * but if we do have a default import
         * we need to check if we have a comma after that and
         * that is where this `|| this.eat` condition comes into play
         */
        const parseNext = !hasDefault || this.eat(tt.comma);
        // if we do have to parse the next set of specifiers, we first check for star imports
        // import React, * from "react";
        const hasStar = parseNext && this.maybeParseStarImportSpecifier(node);
        // now we check if we need to parse the next imports
        // but only if they are not importing * (everything)
        if (parseNext && !hasStar)
            this.parseNamedImportSpecifiers(node);
        this.expectContextual(tt._from);
        return this.parseImportSourceAndAttributes(node);
    }
    parseImportSourceAndAttributes(node) {
        node.specifiers ??= [];
        node.source = this.parseImportSource();
        this.maybeParseImportAttributes(node);
        this.checkImportReflection(node);
        this.checkJSONModuleImport(node);
        this.semicolon();
        return this.finishNode(node, "ImportDeclaration");
    }
    parseImportSource() {
        if (!this.match(tt.string))
            this.unexpected();
        return this.parseExprAtom();
    }
    parseImportSpecifierLocal(node, specifier, type) {
        specifier.local = this.parseIdentifier();
        node.specifiers.push(this.finishImportSpecifier(specifier, type));
    }
    finishImportSpecifier(specifier, type, bindingType = BindingFlag.TYPE_LEXICAL) {
        this.checkLVal(specifier.local, {
            in: { type },
            binding: bindingType,
        });
        return this.finishNode(specifier, type);
    }
    /**
     * parse assert entries
     *
     * @see {@link https://tc39.es/proposal-import-attributes/#prod-WithEntries WithEntries}
     */
    parseImportAttributes() {
        this.expect(tt.braceL);
        const attrs = [];
        const attrNames = new Set();
        do {
            if (this.match(tt.braceR)) {
                break;
            }
            const node = this.startNode();
            // parse AssertionKey : IdentifierName, StringLiteral
            const keyName = this.state.value;
            // check if we already have an entry for an attribute
            // if a duplicate entry is found, throw an error
            // for now this logic will come into play only when someone declares `type` twice
            if (attrNames.has(keyName)) {
                this.raise(Errors.ModuleAttributesWithDuplicateKeys, this.state.startLoc, {
                    key: keyName,
                });
            }
            attrNames.add(keyName);
            if (this.match(tt.string)) {
                node.key = this.parseStringLiteral(keyName);
            }
            else {
                node.key = this.parseIdentifier(true);
            }
            this.expect(tt.colon);
            if (!this.match(tt.string)) {
                throw this.raise(Errors.ModuleAttributeInvalidValue, this.state.startLoc);
            }
            node.value = this.parseStringLiteral(this.state.value);
            attrs.push(this.finishNode(node, "ImportAttribute"));
        } while (this.eat(tt.comma));
        this.expect(tt.braceR);
        return attrs;
    }
    /**
     * parse module attributes
     * @deprecated It will be removed in Babel 8
     */
    parseModuleAttributes() {
        const attrs = [];
        const attributes = new Set();
        do {
            const node = this.startNode();
            node.key = this.parseIdentifier(true);
            if (node.key.name !== "type") {
                this.raise(Errors.ModuleAttributeDifferentFromType, node.key);
            }
            if (attributes.has(node.key.name)) {
                this.raise(Errors.ModuleAttributesWithDuplicateKeys, node.key, {
                    key: node.key.name,
                });
            }
            attributes.add(node.key.name);
            this.expect(tt.colon);
            if (!this.match(tt.string)) {
                throw this.raise(Errors.ModuleAttributeInvalidValue, this.state.startLoc);
            }
            node.value = this.parseStringLiteral(this.state.value);
            attrs.push(this.finishNode(node, "ImportAttribute"));
        } while (this.eat(tt.comma));
        return attrs;
    }
    maybeParseImportAttributes(node) {
        let attributes;
        let useWith = false;
        // https://tc39.es/proposal-import-attributes/#prod-WithClause
        if (this.match(tt._with)) {
            if (this.hasPrecedingLineBreak() &&
                this.lookaheadCharCode() === charCodes.leftParenthesis) {
                // This will be parsed as a with statement, and we will throw a
                // better error about it not being supported in strict mode.
                return;
            }
            this.next(); // eat `with`
            if (!process.env.BABEL_8_BREAKING) {
                if (this.hasPlugin("moduleAttributes")) {
                    attributes = this.parseModuleAttributes();
                }
                else {
                    this.expectImportAttributesPlugin();
                    attributes = this.parseImportAttributes();
                }
            }
            else {
                this.expectImportAttributesPlugin();
                attributes = this.parseImportAttributes();
            }
            useWith = true;
        }
        else if (this.isContextual(tt._assert) && !this.hasPrecedingLineBreak()) {
            if (this.hasPlugin("importAttributes")) {
                if (this.getPluginOption("importAttributes", "deprecatedAssertSyntax") !==
                    true) {
                    this.raise(Errors.ImportAttributesUseAssert, this.state.startLoc);
                }
                this.addExtra(node, "deprecatedAssertSyntax", true);
            }
            else {
                this.expectOnePlugin(["importAttributes", "importAssertions"]);
            }
            this.next(); // eat `assert`
            attributes = this.parseImportAttributes();
        }
        else if (this.hasPlugin("importAttributes") ||
            this.hasPlugin("importAssertions")) {
            attributes = [];
        }
        else if (!process.env.BABEL_8_BREAKING) {
            if (this.hasPlugin("moduleAttributes")) {
                attributes = [];
            }
            else
                return;
        }
        else
            return;
        if (!useWith && this.hasPlugin("importAssertions")) {
            node.assertions = attributes;
        }
        else {
            node.attributes = attributes;
        }
    }
    maybeParseDefaultImportSpecifier(node, maybeDefaultIdentifier) {
        // import defaultObj, { x, y as z } from '...'
        if (maybeDefaultIdentifier) {
            const specifier = this.startNodeAtNode(maybeDefaultIdentifier);
            specifier.local = maybeDefaultIdentifier;
            node.specifiers.push(this.finishImportSpecifier(specifier, "ImportDefaultSpecifier"));
            return true;
        }
        else if (
        // We allow keywords, and parseImportSpecifierLocal will report a recoverable error
        tokenIsKeywordOrIdentifier(this.state.type)) {
            this.parseImportSpecifierLocal(node, this.startNode(), "ImportDefaultSpecifier");
            return true;
        }
        return false;
    }
    maybeParseStarImportSpecifier(node) {
        if (this.match(tt.star)) {
            const specifier = this.startNode();
            this.next();
            this.expectContextual(tt._as);
            this.parseImportSpecifierLocal(node, specifier, "ImportNamespaceSpecifier");
            return true;
        }
        return false;
    }
    parseNamedImportSpecifiers(node) {
        let first = true;
        this.expect(tt.braceL);
        while (!this.eat(tt.braceR)) {
            if (first) {
                first = false;
            }
            else {
                // Detect an attempt to deep destructure
                if (this.eat(tt.colon)) {
                    throw this.raise(Errors.DestructureNamedImport, this.state.startLoc);
                }
                this.expect(tt.comma);
                if (this.eat(tt.braceR))
                    break;
            }
            const specifier = this.startNode();
            const importedIsString = this.match(tt.string);
            const isMaybeTypeOnly = this.isContextual(tt._type);
            specifier.imported = this.parseModuleExportName();
            const importSpecifier = this.parseImportSpecifier(specifier, importedIsString, node.importKind === "type" || node.importKind === "typeof", isMaybeTypeOnly, undefined);
            node.specifiers.push(importSpecifier);
        }
    }
    // https://tc39.es/ecma262/#prod-ImportSpecifier
    parseImportSpecifier(specifier, importedIsString, 
    /* eslint-disable @typescript-eslint/no-unused-vars -- used in TypeScript and Flow parser */
    isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
        if (this.eatContextual(tt._as)) {
            specifier.local = this.parseIdentifier();
        }
        else {
            const { imported } = specifier;
            if (importedIsString) {
                throw this.raise(Errors.ImportBindingIsString, specifier, {
                    importName: imported.value,
                });
            }
            this.checkReservedWord(imported.name, specifier.loc.start, true, true);
            if (!specifier.local) {
                specifier.local = cloneIdentifier(imported);
            }
        }
        return this.finishImportSpecifier(specifier, "ImportSpecifier", bindingType);
    }
    // This is used in flow and typescript plugin
    // Determine whether a parameter is a this param
    isThisParam(param) {
        return param.type === "Identifier" && param.name === "this";
    }
}
