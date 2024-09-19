import Buffer from "./buffer.ts";
import * as n from "./node/index.ts";
import { isFunction, isStatement, isClassBody, isTSInterfaceBody, isTSEnumDeclaration, } from "@babel/types";
import * as generatorFunctions from "./generators/index.ts";
import * as charCodes from "charcodes";
const SCIENTIFIC_NOTATION = /e/i;
const ZERO_DECIMAL_INTEGER = /\.0+$/;
const HAS_NEWLINE = /[\n\r\u2028\u2029]/;
const HAS_NEWLINE_OR_BlOCK_COMMENT_END = /[\n\r\u2028\u2029]|\*\//;
const { needsParens } = n;
var COMMENT_TYPE;
(function (COMMENT_TYPE) {
    COMMENT_TYPE[COMMENT_TYPE["LEADING"] = 0] = "LEADING";
    COMMENT_TYPE[COMMENT_TYPE["INNER"] = 1] = "INNER";
    COMMENT_TYPE[COMMENT_TYPE["TRAILING"] = 2] = "TRAILING";
})(COMMENT_TYPE || (COMMENT_TYPE = {}));
var COMMENT_SKIP_NEWLINE;
(function (COMMENT_SKIP_NEWLINE) {
    COMMENT_SKIP_NEWLINE[COMMENT_SKIP_NEWLINE["DEFAULT"] = 0] = "DEFAULT";
    COMMENT_SKIP_NEWLINE[COMMENT_SKIP_NEWLINE["ALL"] = 1] = "ALL";
    COMMENT_SKIP_NEWLINE[COMMENT_SKIP_NEWLINE["LEADING"] = 2] = "LEADING";
    COMMENT_SKIP_NEWLINE[COMMENT_SKIP_NEWLINE["TRAILING"] = 3] = "TRAILING";
})(COMMENT_SKIP_NEWLINE || (COMMENT_SKIP_NEWLINE = {}));
var PRINT_COMMENT_HINT;
(function (PRINT_COMMENT_HINT) {
    PRINT_COMMENT_HINT[PRINT_COMMENT_HINT["SKIP"] = 0] = "SKIP";
    PRINT_COMMENT_HINT[PRINT_COMMENT_HINT["ALLOW"] = 1] = "ALLOW";
    PRINT_COMMENT_HINT[PRINT_COMMENT_HINT["DEFER"] = 2] = "DEFER";
})(PRINT_COMMENT_HINT || (PRINT_COMMENT_HINT = {}));
class Printer {
    constructor(format, map) {
        this.format = format;
        this._indentRepeat = format.indent.style.length;
        this._inputMap = map?._inputMap;
        this._buf = new Buffer(map, format.indent.style[0]);
    }
    inForStatementInitCounter = 0;
    _printStack = [];
    _indent = 0;
    _indentRepeat = 0;
    _insideAux = false;
    _parenPushNewlineState = null;
    _noLineTerminator = false;
    _printAuxAfterOnNextUserNode = false;
    _printedComments = new Set();
    _endsWithInteger = false;
    _endsWithWord = false;
    _lastCommentLine = 0;
    _endsWithInnerRaw = false;
    _indentInnerComments = true;
    generate(ast) {
        this.print(ast);
        this._maybeAddAuxComment();
        return this._buf.get();
    }
    /**
     * Increment indent size.
     */
    indent() {
        if (this.format.compact || this.format.concise)
            return;
        this._indent++;
    }
    /**
     * Decrement indent size.
     */
    dedent() {
        if (this.format.compact || this.format.concise)
            return;
        this._indent--;
    }
    /**
     * Add a semicolon to the buffer.
     */
    semicolon(force = false) {
        this._maybeAddAuxComment();
        if (force) {
            this._appendChar(charCodes.semicolon);
        }
        else {
            this._queue(charCodes.semicolon);
        }
        this._noLineTerminator = false;
    }
    /**
     * Add a right brace to the buffer.
     */
    rightBrace(node) {
        if (this.format.minified) {
            this._buf.removeLastSemicolon();
        }
        this.sourceWithOffset("end", node.loc, -1);
        this.token("}");
    }
    rightParens(node) {
        this.sourceWithOffset("end", node.loc, -1);
        this.token(")");
    }
    /**
     * Add a space to the buffer unless it is compact.
     */
    space(force = false) {
        if (this.format.compact)
            return;
        if (force) {
            this._space();
        }
        else if (this._buf.hasContent()) {
            const lastCp = this.getLastChar();
            if (lastCp !== charCodes.space && lastCp !== charCodes.lineFeed) {
                this._space();
            }
        }
    }
    /**
     * Writes a token that can't be safely parsed without taking whitespace into account.
     */
    word(str, noLineTerminatorAfter = false) {
        this._maybePrintInnerComments();
        // prevent concatenating words and creating // comment out of division and regex
        if (this._endsWithWord ||
            (str.charCodeAt(0) === charCodes.slash && this.endsWith(charCodes.slash))) {
            this._space();
        }
        this._maybeAddAuxComment();
        this._append(str, false);
        this._endsWithWord = true;
        this._noLineTerminator = noLineTerminatorAfter;
    }
    /**
     * Writes a number token so that we can validate if it is an integer.
     */
    number(str, number) {
        // const NON_DECIMAL_LITERAL = /^0[box]/;
        function isNonDecimalLiteral(str) {
            if (str.length > 2 && str.charCodeAt(0) === charCodes.digit0) {
                const secondChar = str.charCodeAt(1);
                return (secondChar === charCodes.lowercaseB ||
                    secondChar === charCodes.lowercaseO ||
                    secondChar === charCodes.lowercaseX);
            }
            return false;
        }
        this.word(str);
        // Integer tokens need special handling because they cannot have '.'s inserted
        // immediately after them.
        this._endsWithInteger =
            Number.isInteger(number) &&
                !isNonDecimalLiteral(str) &&
                !SCIENTIFIC_NOTATION.test(str) &&
                !ZERO_DECIMAL_INTEGER.test(str) &&
                str.charCodeAt(str.length - 1) !== charCodes.dot;
    }
    /**
     * Writes a simple token.
     */
    token(str, maybeNewline = false) {
        this._maybePrintInnerComments();
        const lastChar = this.getLastChar();
        const strFirst = str.charCodeAt(0);
        if ((lastChar === charCodes.exclamationMark &&
            // space is mandatory to avoid outputting <!--
            // http://javascript.spec.whatwg.org/#comment-syntax
            (str === "--" ||
                // Needs spaces to avoid changing a! == 0 to a!== 0
                strFirst === charCodes.equalsTo)) ||
            // Need spaces for operators of the same kind to avoid: `a+++b`
            (strFirst === charCodes.plusSign && lastChar === charCodes.plusSign) ||
            (strFirst === charCodes.dash && lastChar === charCodes.dash) ||
            // Needs spaces to avoid changing '34' to '34.', which would still be a valid number.
            (strFirst === charCodes.dot && this._endsWithInteger)) {
            this._space();
        }
        this._maybeAddAuxComment();
        this._append(str, maybeNewline);
        this._noLineTerminator = false;
    }
    tokenChar(char) {
        this._maybePrintInnerComments();
        const lastChar = this.getLastChar();
        if (
        // Need spaces for operators of the same kind to avoid: `a+++b`
        (char === charCodes.plusSign && lastChar === charCodes.plusSign) ||
            (char === charCodes.dash && lastChar === charCodes.dash) ||
            // Needs spaces to avoid changing '34' to '34.', which would still be a valid number.
            (char === charCodes.dot && this._endsWithInteger)) {
            this._space();
        }
        this._maybeAddAuxComment();
        this._appendChar(char);
        this._noLineTerminator = false;
    }
    /**
     * Add a newline (or many newlines), maintaining formatting.
     * This function checks the number of newlines in the queue and subtracts them.
     * It currently has some limitations.
     * @see {Buffer#getNewlineCount}
     */
    newline(i = 1, force) {
        if (i <= 0)
            return;
        if (!force) {
            if (this.format.retainLines || this.format.compact)
                return;
            if (this.format.concise) {
                this.space();
                return;
            }
        }
        if (i > 2)
            i = 2; // Max two lines
        i -= this._buf.getNewlineCount();
        for (let j = 0; j < i; j++) {
            this._newline();
        }
        return;
    }
    endsWith(char) {
        return this.getLastChar() === char;
    }
    getLastChar() {
        return this._buf.getLastChar();
    }
    endsWithCharAndNewline() {
        return this._buf.endsWithCharAndNewline();
    }
    removeTrailingNewline() {
        this._buf.removeTrailingNewline();
    }
    exactSource(loc, cb) {
        if (!loc) {
            cb();
            return;
        }
        this._catchUp("start", loc);
        this._buf.exactSource(loc, cb);
    }
    source(prop, loc) {
        if (!loc)
            return;
        this._catchUp(prop, loc);
        this._buf.source(prop, loc);
    }
    sourceWithOffset(prop, loc, columnOffset) {
        if (!loc)
            return;
        this._catchUp(prop, loc);
        this._buf.sourceWithOffset(prop, loc, columnOffset);
    }
    withSource(prop, loc, cb) {
        if (!loc) {
            cb();
            return;
        }
        this._catchUp(prop, loc);
        this._buf.withSource(prop, loc, cb);
    }
    sourceIdentifierName(identifierName, pos) {
        if (!this._buf._canMarkIdName)
            return;
        const sourcePosition = this._buf._sourcePosition;
        sourcePosition.identifierNamePos = pos;
        sourcePosition.identifierName = identifierName;
    }
    _space() {
        this._queue(charCodes.space);
    }
    _newline() {
        this._queue(charCodes.lineFeed);
    }
    _append(str, maybeNewline) {
        this._maybeAddParen(str);
        this._maybeIndent(str.charCodeAt(0));
        this._buf.append(str, maybeNewline);
        this._endsWithWord = false;
        this._endsWithInteger = false;
    }
    _appendChar(char) {
        this._maybeAddParenChar(char);
        this._maybeIndent(char);
        this._buf.appendChar(char);
        this._endsWithWord = false;
        this._endsWithInteger = false;
    }
    _queue(char) {
        this._maybeAddParenChar(char);
        this._maybeIndent(char);
        this._buf.queue(char);
        this._endsWithWord = false;
        this._endsWithInteger = false;
    }
    _maybeIndent(firstChar) {
        // we've got a newline before us so prepend on the indentation
        if (this._indent &&
            firstChar !== charCodes.lineFeed &&
            this.endsWith(charCodes.lineFeed)) {
            this._buf.queueIndentation(this._getIndent());
        }
    }
    _shouldIndent(firstChar) {
        // we've got a newline before us so prepend on the indentation
        if (this._indent &&
            firstChar !== charCodes.lineFeed &&
            this.endsWith(charCodes.lineFeed)) {
            return true;
        }
    }
    _maybeAddParenChar(char) {
        // see startTerminatorless() instance method
        const parenPushNewlineState = this._parenPushNewlineState;
        if (!parenPushNewlineState)
            return;
        // This function does two things:
        // - If needed, prints a parenthesis
        // - If the currently printed string removes the need for the paren,
        //   it resets the _parenPushNewlineState field.
        //   Almost everything removes the need for a paren, except for
        //   comments and whitespaces.
        if (char === charCodes.space) {
            // Whitespaces only, the parentheses might still be needed.
            return;
        }
        // Check for newline or comment.
        if (char !== charCodes.lineFeed) {
            this._parenPushNewlineState = null;
            return;
        }
        this.token("(");
        this.indent();
        parenPushNewlineState.printed = true;
    }
    _maybeAddParen(str) {
        // see startTerminatorless() instance method
        const parenPushNewlineState = this._parenPushNewlineState;
        if (!parenPushNewlineState)
            return;
        // This function does two things:
        // - If needed, prints a parenthesis
        // - If the currently printed string removes the need for the paren,
        //   it resets the _parenPushNewlineState field.
        //   Almost everything removes the need for a paren, except for
        //   comments and whitespaces.
        const len = str.length;
        let i;
        for (i = 0; i < len && str.charCodeAt(i) === charCodes.space; i++)
            continue;
        if (i === len) {
            // Whitespaces only, the parentheses might still be needed.
            return;
        }
        // Check for newline or comment.
        const cha = str.charCodeAt(i);
        if (cha !== charCodes.lineFeed) {
            if (
            // This is not a comment (it doesn't start with /)
            cha !== charCodes.slash ||
                // This is not a comment (it's a / operator)
                i + 1 === len) {
                // After a normal token, the parentheses aren't needed anymore
                this._parenPushNewlineState = null;
                return;
            }
            const chaPost = str.charCodeAt(i + 1);
            if (chaPost === charCodes.asterisk) {
                // This is a block comment
                return;
            }
            else if (chaPost !== charCodes.slash) {
                // This is neither a block comment, nor a line comment.
                // After a normal token, the parentheses aren't needed anymore
                this._parenPushNewlineState = null;
                return;
            }
        }
        this.token("(");
        this.indent();
        parenPushNewlineState.printed = true;
    }
    catchUp(line) {
        if (!this.format.retainLines)
            return;
        // catch up to this nodes newline if we're behind
        const count = line - this._buf.getCurrentLine();
        for (let i = 0; i < count; i++) {
            this._newline();
        }
    }
    _catchUp(prop, loc) {
        if (!this.format.retainLines)
            return;
        // catch up to this nodes newline if we're behind
        const line = loc?.[prop]?.line;
        if (line != null) {
            const count = line - this._buf.getCurrentLine();
            for (let i = 0; i < count; i++) {
                this._newline();
            }
        }
    }
    /**
     * Get the current indent.
     */
    _getIndent() {
        return this._indentRepeat * this._indent;
    }
    printTerminatorless(node, parent, isLabel) {
        /**
         * Set some state that will be modified if a newline has been inserted before any
         * non-space characters.
         *
         * This is to prevent breaking semantics for terminatorless separator nodes. eg:
         *
         *   return foo;
         *
         * returns `foo`. But if we do:
         *
         *   return
         *   foo;
         *
         *  `undefined` will be returned and not `foo` due to the terminator.
         */
        if (isLabel) {
            this._noLineTerminator = true;
            this.print(node, parent);
        }
        else {
            const terminatorState = {
                printed: false,
            };
            this._parenPushNewlineState = terminatorState;
            this.print(node, parent);
            /**
             * Print an ending parentheses if a starting one has been printed.
             */
            if (terminatorState.printed) {
                this.dedent();
                this.newline();
                this.token(")");
            }
        }
    }
    print(node, parent, noLineTerminatorAfter, 
    // trailingCommentsLineOffset also used to check if called from printJoin
    // it will be ignored if `noLineTerminatorAfter||this._noLineTerminator`
    trailingCommentsLineOffset, forceParens) {
        if (!node)
            return;
        this._endsWithInnerRaw = false;
        const nodeType = node.type;
        const format = this.format;
        const oldConcise = format.concise;
        if (
        // @ts-expect-error document _compact AST properties
        node._compact) {
            format.concise = true;
        }
        const printMethod = this[nodeType];
        if (printMethod === undefined) {
            throw new ReferenceError(`unknown node of type ${JSON.stringify(nodeType)} with constructor ${JSON.stringify(node.constructor.name)}`);
        }
        this._printStack.push(node);
        const oldInAux = this._insideAux;
        this._insideAux = node.loc == undefined;
        this._maybeAddAuxComment(this._insideAux && !oldInAux);
        const parenthesized = node.extra?.parenthesized;
        let shouldPrintParens = forceParens ||
            (parenthesized &&
                format.retainFunctionParens &&
                nodeType === "FunctionExpression") ||
            needsParens(node, parent, this._printStack);
        if (!shouldPrintParens &&
            parenthesized &&
            node.leadingComments?.length &&
            node.leadingComments[0].type === "CommentBlock") {
            const parentType = parent?.type;
            switch (parentType) {
                case "ExpressionStatement":
                case "VariableDeclarator":
                case "AssignmentExpression":
                case "ReturnStatement":
                    break;
                case "CallExpression":
                case "OptionalCallExpression":
                case "NewExpression":
                    if (parent.callee !== node)
                        break;
                // falls through
                default:
                    shouldPrintParens = true;
            }
        }
        if (shouldPrintParens) {
            this.token("(");
            this._endsWithInnerRaw = false;
        }
        this._lastCommentLine = 0;
        this._printLeadingComments(node, parent);
        const loc = nodeType === "Program" || nodeType === "File" ? null : node.loc;
        this.exactSource(loc, printMethod.bind(this, node, parent));
        if (shouldPrintParens) {
            this._printTrailingComments(node, parent);
            this.token(")");
            this._noLineTerminator = noLineTerminatorAfter;
        }
        else if (noLineTerminatorAfter && !this._noLineTerminator) {
            this._noLineTerminator = true;
            this._printTrailingComments(node, parent);
        }
        else {
            this._printTrailingComments(node, parent, trailingCommentsLineOffset);
        }
        // end
        this._printStack.pop();
        format.concise = oldConcise;
        this._insideAux = oldInAux;
        this._endsWithInnerRaw = false;
    }
    _maybeAddAuxComment(enteredPositionlessNode) {
        if (enteredPositionlessNode)
            this._printAuxBeforeComment();
        if (!this._insideAux)
            this._printAuxAfterComment();
    }
    _printAuxBeforeComment() {
        if (this._printAuxAfterOnNextUserNode)
            return;
        this._printAuxAfterOnNextUserNode = true;
        const comment = this.format.auxiliaryCommentBefore;
        if (comment) {
            this._printComment({
                type: "CommentBlock",
                value: comment,
            }, COMMENT_SKIP_NEWLINE.DEFAULT);
        }
    }
    _printAuxAfterComment() {
        if (!this._printAuxAfterOnNextUserNode)
            return;
        this._printAuxAfterOnNextUserNode = false;
        const comment = this.format.auxiliaryCommentAfter;
        if (comment) {
            this._printComment({
                type: "CommentBlock",
                value: comment,
            }, COMMENT_SKIP_NEWLINE.DEFAULT);
        }
    }
    getPossibleRaw(node) {
        const extra = node.extra;
        if (extra?.raw != null &&
            extra.rawValue != null &&
            node.value === extra.rawValue) {
            // @ts-expect-error: The extra.raw of these AST node types must be a string
            return extra.raw;
        }
    }
    printJoin(nodes, parent, opts = {}) {
        if (!nodes?.length)
            return;
        let { indent } = opts;
        if (indent == null && this.format.retainLines) {
            const startLine = nodes[0].loc?.start.line;
            if (startLine != null && startLine !== this._buf.getCurrentLine()) {
                indent = true;
            }
        }
        if (indent)
            this.indent();
        const newlineOpts = {
            addNewlines: opts.addNewlines,
            nextNodeStartLine: 0,
        };
        const separator = opts.separator ? opts.separator.bind(this) : null;
        const len = nodes.length;
        for (let i = 0; i < len; i++) {
            const node = nodes[i];
            if (!node)
                continue;
            if (opts.statement)
                this._printNewline(i === 0, newlineOpts);
            this.print(node, parent, undefined, opts.trailingCommentsLineOffset || 0);
            opts.iterator?.(node, i);
            if (i < len - 1)
                separator?.();
            if (opts.statement) {
                if (!node.trailingComments?.length) {
                    this._lastCommentLine = 0;
                }
                if (i + 1 === len) {
                    this.newline(1);
                }
                else {
                    const nextNode = nodes[i + 1];
                    newlineOpts.nextNodeStartLine = nextNode.loc?.start.line || 0;
                    this._printNewline(true, newlineOpts);
                }
            }
        }
        if (indent)
            this.dedent();
    }
    printAndIndentOnComments(node, parent) {
        const indent = node.leadingComments && node.leadingComments.length > 0;
        if (indent)
            this.indent();
        this.print(node, parent);
        if (indent)
            this.dedent();
    }
    printBlock(parent) {
        const node = parent.body;
        if (node.type !== "EmptyStatement") {
            this.space();
        }
        this.print(node, parent);
    }
    _printTrailingComments(node, parent, lineOffset) {
        const { innerComments, trailingComments } = node;
        // We print inner comments here, so that if for some reason they couldn't
        // be printed in earlier locations they are still printed *somewhere*,
        // even if at the end of the node.
        if (innerComments?.length) {
            this._printComments(COMMENT_TYPE.TRAILING, innerComments, node, parent, lineOffset);
        }
        if (trailingComments?.length) {
            this._printComments(COMMENT_TYPE.TRAILING, trailingComments, node, parent, lineOffset);
        }
    }
    _printLeadingComments(node, parent) {
        const comments = node.leadingComments;
        if (!comments?.length)
            return;
        this._printComments(COMMENT_TYPE.LEADING, comments, node, parent);
    }
    _maybePrintInnerComments() {
        if (this._endsWithInnerRaw)
            this.printInnerComments();
        this._endsWithInnerRaw = true;
        this._indentInnerComments = true;
    }
    printInnerComments() {
        const node = this._printStack[this._printStack.length - 1];
        const comments = node.innerComments;
        if (!comments?.length)
            return;
        const hasSpace = this.endsWith(charCodes.space);
        const indent = this._indentInnerComments;
        const printedCommentsCount = this._printedComments.size;
        if (indent)
            this.indent();
        this._printComments(COMMENT_TYPE.INNER, comments, node);
        if (hasSpace && printedCommentsCount !== this._printedComments.size) {
            this.space();
        }
        if (indent)
            this.dedent();
    }
    noIndentInnerCommentsHere() {
        this._indentInnerComments = false;
    }
    printSequence(nodes, parent, opts = {}) {
        opts.statement = true;
        opts.indent ??= false;
        this.printJoin(nodes, parent, opts);
    }
    printList(items, parent, opts = {}) {
        if (opts.separator == null) {
            opts.separator = commaSeparator;
        }
        this.printJoin(items, parent, opts);
    }
    _printNewline(newLine, opts) {
        const format = this.format;
        // Fast path since 'this.newline' does nothing when not tracking lines.
        if (format.retainLines || format.compact)
            return;
        // Fast path for concise since 'this.newline' just inserts a space when
        // concise formatting is in use.
        if (format.concise) {
            this.space();
            return;
        }
        if (!newLine) {
            return;
        }
        const startLine = opts.nextNodeStartLine;
        const lastCommentLine = this._lastCommentLine;
        if (startLine > 0 && lastCommentLine > 0) {
            const offset = startLine - lastCommentLine;
            if (offset >= 0) {
                this.newline(offset || 1);
                return;
            }
        }
        // don't add newlines at the beginning of the file
        if (this._buf.hasContent()) {
            // Here is the logic of the original line wrapping according to the node layout, we are not using it now.
            // We currently add at most one newline to each node in the list, ignoring `opts.addNewlines`.
            // let lines = 0;
            // if (!leading) lines++; // always include at least a single line after
            // if (opts.addNewlines) lines += opts.addNewlines(leading, node) || 0;
            // const needs = leading ? needsWhitespaceBefore : needsWhitespaceAfter;
            // if (needs(node, parent)) lines++;
            // this.newline(Math.min(2, lines));
            this.newline(1);
        }
    }
    // Returns `PRINT_COMMENT_HINT.DEFER` if the comment cannot be printed in this position due to
    // line terminators, signaling that the print comments loop can stop and
    // resume printing comments at the next possible position. This happens when
    // printing inner comments, since if we have an inner comment with a multiline
    // there is at least one inner position where line terminators are allowed.
    _shouldPrintComment(comment) {
        // Some plugins (such as flow-strip-types) use this to mark comments as removed using the AST-root 'comments' property,
        // where they can't manually mutate the AST node comment lists.
        if (comment.ignore)
            return PRINT_COMMENT_HINT.SKIP;
        if (this._printedComments.has(comment))
            return PRINT_COMMENT_HINT.SKIP;
        if (this._noLineTerminator &&
            HAS_NEWLINE_OR_BlOCK_COMMENT_END.test(comment.value)) {
            return PRINT_COMMENT_HINT.DEFER;
        }
        this._printedComments.add(comment);
        if (!this.format.shouldPrintComment(comment.value)) {
            return PRINT_COMMENT_HINT.SKIP;
        }
        return PRINT_COMMENT_HINT.ALLOW;
    }
    _printComment(comment, skipNewLines) {
        const noLineTerminator = this._noLineTerminator;
        const isBlockComment = comment.type === "CommentBlock";
        // Add a newline before and after a block comment, unless explicitly
        // disallowed
        const printNewLines = isBlockComment &&
            skipNewLines !== COMMENT_SKIP_NEWLINE.ALL &&
            !this._noLineTerminator;
        if (printNewLines &&
            this._buf.hasContent() &&
            skipNewLines !== COMMENT_SKIP_NEWLINE.LEADING) {
            this.newline(1);
        }
        const lastCharCode = this.getLastChar();
        if (lastCharCode !== charCodes.leftSquareBracket &&
            lastCharCode !== charCodes.leftCurlyBrace) {
            this.space();
        }
        let val;
        if (isBlockComment) {
            const { _parenPushNewlineState } = this;
            if (_parenPushNewlineState?.printed === false &&
                HAS_NEWLINE.test(comment.value)) {
                this.token("(");
                this.indent();
                _parenPushNewlineState.printed = true;
            }
            val = `/*${comment.value}*/`;
            if (this.format.indent.adjustMultilineComment) {
                const offset = comment.loc?.start.column;
                if (offset) {
                    const newlineRegex = new RegExp("\\n\\s{1," + offset + "}", "g");
                    val = val.replace(newlineRegex, "\n");
                }
                if (this.format.concise) {
                    val = val.replace(/\n(?!$)/g, `\n`);
                }
                else {
                    let indentSize = this.format.retainLines
                        ? 0
                        : this._buf.getCurrentColumn();
                    if (this._shouldIndent(charCodes.slash) || this.format.retainLines) {
                        indentSize += this._getIndent();
                    }
                    val = val.replace(/\n(?!$)/g, `\n${" ".repeat(indentSize)}`);
                }
            }
        }
        else if (!noLineTerminator) {
            val = `//${comment.value}`;
        }
        else {
            // It was a single-line comment, so it's guaranteed to not
            // contain newlines and it can be safely printed as a block
            // comment.
            val = `/*${comment.value}*/`;
        }
        // Avoid creating //* comments
        if (this.endsWith(charCodes.slash))
            this._space();
        this.source("start", comment.loc);
        this._append(val, isBlockComment);
        if (!isBlockComment && !noLineTerminator) {
            this.newline(1, true);
        }
        if (printNewLines && skipNewLines !== COMMENT_SKIP_NEWLINE.TRAILING) {
            this.newline(1);
        }
    }
    _printComments(type, comments, node, parent, lineOffset = 0) {
        const nodeLoc = node.loc;
        const len = comments.length;
        let hasLoc = !!nodeLoc;
        const nodeStartLine = hasLoc ? nodeLoc.start.line : 0;
        const nodeEndLine = hasLoc ? nodeLoc.end.line : 0;
        let lastLine = 0;
        let leadingCommentNewline = 0;
        const maybeNewline = this._noLineTerminator
            ? function () { }
            : this.newline.bind(this);
        for (let i = 0; i < len; i++) {
            const comment = comments[i];
            const shouldPrint = this._shouldPrintComment(comment);
            if (shouldPrint === PRINT_COMMENT_HINT.DEFER) {
                hasLoc = false;
                break;
            }
            if (hasLoc && comment.loc && shouldPrint === PRINT_COMMENT_HINT.ALLOW) {
                const commentStartLine = comment.loc.start.line;
                const commentEndLine = comment.loc.end.line;
                if (type === COMMENT_TYPE.LEADING) {
                    let offset = 0;
                    if (i === 0) {
                        // Because currently we cannot handle blank lines before leading comments,
                        // we always wrap before and after multi-line comments.
                        if (this._buf.hasContent() &&
                            (comment.type === "CommentLine" ||
                                commentStartLine != commentEndLine)) {
                            offset = leadingCommentNewline = 1;
                        }
                    }
                    else {
                        offset = commentStartLine - lastLine;
                    }
                    lastLine = commentEndLine;
                    maybeNewline(offset);
                    this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);
                    if (i + 1 === len) {
                        maybeNewline(Math.max(nodeStartLine - lastLine, leadingCommentNewline));
                        lastLine = nodeStartLine;
                    }
                }
                else if (type === COMMENT_TYPE.INNER) {
                    const offset = commentStartLine - (i === 0 ? nodeStartLine : lastLine);
                    lastLine = commentEndLine;
                    maybeNewline(offset);
                    this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);
                    if (i + 1 === len) {
                        maybeNewline(Math.min(1, nodeEndLine - lastLine)); // TODO: Improve here when inner comments processing is stronger
                        lastLine = nodeEndLine;
                    }
                }
                else {
                    const offset = commentStartLine - (i === 0 ? nodeEndLine - lineOffset : lastLine);
                    lastLine = commentEndLine;
                    maybeNewline(offset);
                    this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);
                }
            }
            else {
                hasLoc = false;
                if (shouldPrint !== PRINT_COMMENT_HINT.ALLOW) {
                    continue;
                }
                if (len === 1) {
                    const singleLine = comment.loc
                        ? comment.loc.start.line === comment.loc.end.line
                        : !HAS_NEWLINE.test(comment.value);
                    const shouldSkipNewline = singleLine &&
                        !isStatement(node) &&
                        !isClassBody(parent) &&
                        !isTSInterfaceBody(parent) &&
                        !isTSEnumDeclaration(parent);
                    if (type === COMMENT_TYPE.LEADING) {
                        this._printComment(comment, (shouldSkipNewline && node.type !== "ObjectExpression") ||
                            (singleLine && isFunction(parent, { body: node }))
                            ? COMMENT_SKIP_NEWLINE.ALL
                            : COMMENT_SKIP_NEWLINE.DEFAULT);
                    }
                    else if (shouldSkipNewline && type === COMMENT_TYPE.TRAILING) {
                        this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);
                    }
                    else {
                        this._printComment(comment, COMMENT_SKIP_NEWLINE.DEFAULT);
                    }
                }
                else if (type === COMMENT_TYPE.INNER &&
                    !(node.type === "ObjectExpression" && node.properties.length > 1) &&
                    node.type !== "ClassBody" &&
                    node.type !== "TSInterfaceBody") {
                    // class X {
                    //   /*:: a: number*/
                    //   /*:: b: ?string*/
                    // }
                    this._printComment(comment, i === 0
                        ? COMMENT_SKIP_NEWLINE.LEADING
                        : i === len - 1
                            ? COMMENT_SKIP_NEWLINE.TRAILING
                            : COMMENT_SKIP_NEWLINE.DEFAULT);
                }
                else {
                    this._printComment(comment, COMMENT_SKIP_NEWLINE.DEFAULT);
                }
            }
        }
        if (type === COMMENT_TYPE.TRAILING && hasLoc && lastLine) {
            this._lastCommentLine = lastLine;
        }
    }
}
// Expose the node type functions and helpers on the prototype for easy usage.
Object.assign(Printer.prototype, generatorFunctions);
if (!process.env.BABEL_8_BREAKING) {
    // @ts-ignore(Babel 7 vs Babel 8) Babel 7 has Noop print method
    Printer.prototype.Noop = function Noop() { };
}
export default Printer;
function commaSeparator() {
    this.token(",");
    this.space();
}
