// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser
import { tokenCanStartExpression, tokenIsAssignment, tokenIsIdentifier, tokenIsKeywordOrIdentifier, tokenIsOperator, tokenIsPostfix, tokenIsPrefix, tokenIsRightAssociative, tokenIsTemplate, tokenKeywordOrIdentifierIsKeyword, tokenLabelName, tokenOperatorPrecedence, tt, } from "../tokenizer/types.ts";
import LValParser from "./lval.ts";
import { isKeyword, isReservedWord, isStrictReservedWord, isStrictBindReservedWord, isIdentifierStart, canBeReservedWord, } from "../util/identifier.ts";
import { createPositionWithColumnOffset, } from "../util/location.ts";
import * as charCodes from "charcodes";
import { ScopeFlag, BindingFlag } from "../util/scopeflags.ts";
import { ExpressionErrors } from "./util.ts";
import { ParamKind, functionFlags } from "../util/production-parameter.ts";
import { newArrowHeadScope, newAsyncArrowScope, newExpressionScope, } from "../util/expression-scope.ts";
import { Errors } from "../parse-error.ts";
import { UnparenthesizedPipeBodyDescriptions, } from "../parse-error/pipeline-operator-errors.ts";
import { setInnerComments } from "./comments.ts";
import { cloneIdentifier } from "./node.ts";
export default class ExpressionParser extends LValParser {
    // For object literal, check if property __proto__ has been used more than once.
    // If the expression is a destructuring assignment, then __proto__ may appear
    // multiple times. Otherwise, __proto__ is a duplicated key.
    // For record expression, check if property __proto__ exists
    checkProto(prop, isRecord, protoRef, refExpressionErrors) {
        if (prop.type === "SpreadElement" ||
            this.isObjectMethod(prop) ||
            prop.computed ||
            // @ts-expect-error prop must be an ObjectProperty
            prop.shorthand) {
            return;
        }
        const key = prop.key;
        // It is either an Identifier or a String/NumericLiteral
        const name = key.type === "Identifier" ? key.name : key.value;
        if (name === "__proto__") {
            if (isRecord) {
                this.raise(Errors.RecordNoProto, key);
                return;
            }
            if (protoRef.used) {
                if (refExpressionErrors) {
                    // Store the first redefinition's position, otherwise ignore because
                    // we are parsing ambiguous pattern
                    if (refExpressionErrors.doubleProtoLoc === null) {
                        refExpressionErrors.doubleProtoLoc = key.loc.start;
                    }
                }
                else {
                    this.raise(Errors.DuplicateProto, key);
                }
            }
            protoRef.used = true;
        }
    }
    shouldExitDescending(expr, potentialArrowAt) {
        return (expr.type === "ArrowFunctionExpression" && expr.start === potentialArrowAt);
    }
    // Convenience method to parse an Expression only
    getExpression() {
        this.enterInitialScopes();
        this.nextToken();
        const expr = this.parseExpression();
        if (!this.match(tt.eof)) {
            this.unexpected();
        }
        // Unlike parseTopLevel, we need to drain remaining commentStacks
        // because the top level node is _not_ Program.
        this.finalizeRemainingComments();
        expr.comments = this.comments;
        expr.errors = this.state.errors;
        if (this.options.tokens) {
            expr.tokens = this.tokens;
        }
        // @ts-expect-error fixme: refine types
        return expr;
    }
    // ### Expression parsing
    // These nest, from the most general expression type at the top to
    // 'atomic', nondivisible expression types at the bottom. Most of
    // the functions will simply let the function (s) below them parse,
    // and, *if* the syntactic construct they handle is present, wrap
    // the AST node that the inner parser gave them in another node.
    // Parse a full expression.
    // - `disallowIn`
    //   is used to forbid the `in` operator (in for loops initialization expressions)
    //   When `disallowIn` is true, the production parameter [In] is not present.
    // - `refExpressionErrors `
    //   provides reference for storing '=' operator inside shorthand
    //   property assignment in contexts where both object expression
    //   and object pattern might appear (so it's possible to raise
    //   delayed syntax error at correct position).
    parseExpression(disallowIn, refExpressionErrors) {
        if (disallowIn) {
            return this.disallowInAnd(() => this.parseExpressionBase(refExpressionErrors));
        }
        return this.allowInAnd(() => this.parseExpressionBase(refExpressionErrors));
    }
    // https://tc39.es/ecma262/#prod-Expression
    parseExpressionBase(refExpressionErrors) {
        const startLoc = this.state.startLoc;
        const expr = this.parseMaybeAssign(refExpressionErrors);
        if (this.match(tt.comma)) {
            const node = this.startNodeAt(startLoc);
            node.expressions = [expr];
            while (this.eat(tt.comma)) {
                node.expressions.push(this.parseMaybeAssign(refExpressionErrors));
            }
            this.toReferencedList(node.expressions);
            return this.finishNode(node, "SequenceExpression");
        }
        return expr;
    }
    // Set [~In] parameter for assignment expression
    parseMaybeAssignDisallowIn(refExpressionErrors, afterLeftParse) {
        return this.disallowInAnd(() => this.parseMaybeAssign(refExpressionErrors, afterLeftParse));
    }
    // Set [+In] parameter for assignment expression
    parseMaybeAssignAllowIn(refExpressionErrors, afterLeftParse) {
        return this.allowInAnd(() => this.parseMaybeAssign(refExpressionErrors, afterLeftParse));
    }
    // This method is only used by
    // the typescript and flow plugins.
    setOptionalParametersError(refExpressionErrors, resultError) {
        refExpressionErrors.optionalParametersLoc =
            resultError?.loc ?? this.state.startLoc;
    }
    // Parse an assignment expression. This includes applications of
    // operators like `+=`.
    // https://tc39.es/ecma262/#prod-AssignmentExpression
    parseMaybeAssign(refExpressionErrors, afterLeftParse) {
        const startLoc = this.state.startLoc;
        if (this.isContextual(tt._yield)) {
            if (this.prodParam.hasYield) {
                let left = this.parseYield();
                if (afterLeftParse) {
                    left = afterLeftParse.call(this, left, startLoc);
                }
                return left;
            }
        }
        let ownExpressionErrors;
        if (refExpressionErrors) {
            ownExpressionErrors = false;
        }
        else {
            refExpressionErrors = new ExpressionErrors();
            ownExpressionErrors = true;
        }
        const { type } = this.state;
        if (type === tt.parenL || tokenIsIdentifier(type)) {
            this.state.potentialArrowAt = this.state.start;
        }
        let left = this.parseMaybeConditional(refExpressionErrors);
        if (afterLeftParse) {
            left = afterLeftParse.call(this, left, startLoc);
        }
        if (tokenIsAssignment(this.state.type)) {
            const node = this.startNodeAt(startLoc);
            const operator = this.state.value;
            node.operator = operator;
            if (this.match(tt.eq)) {
                this.toAssignable(left, /* isLHS */ true);
                node.left = left;
                const startIndex = startLoc.index;
                if (refExpressionErrors.doubleProtoLoc != null &&
                    refExpressionErrors.doubleProtoLoc.index >= startIndex) {
                    refExpressionErrors.doubleProtoLoc = null; // reset because double __proto__ is valid in assignment expression
                }
                if (refExpressionErrors.shorthandAssignLoc != null &&
                    refExpressionErrors.shorthandAssignLoc.index >= startIndex) {
                    refExpressionErrors.shorthandAssignLoc = null; // reset because shorthand default was used correctly
                }
                if (refExpressionErrors.privateKeyLoc != null &&
                    refExpressionErrors.privateKeyLoc.index >= startIndex) {
                    this.checkDestructuringPrivate(refExpressionErrors);
                    refExpressionErrors.privateKeyLoc = null; // reset because `({ #x: x })` is an assignable pattern
                }
            }
            else {
                node.left = left;
            }
            this.next();
            node.right = this.parseMaybeAssign();
            this.checkLVal(left, {
                in: this.finishNode(node, "AssignmentExpression"),
            });
            // @ts-expect-error todo(flow->ts) improve node types
            return node;
        }
        else if (ownExpressionErrors) {
            this.checkExpressionErrors(refExpressionErrors, true);
        }
        return left;
    }
    // Parse a ternary conditional (`?:`) operator.
    // https://tc39.es/ecma262/#prod-ConditionalExpression
    parseMaybeConditional(refExpressionErrors) {
        const startLoc = this.state.startLoc;
        const potentialArrowAt = this.state.potentialArrowAt;
        const expr = this.parseExprOps(refExpressionErrors);
        if (this.shouldExitDescending(expr, potentialArrowAt)) {
            return expr;
        }
        return this.parseConditional(expr, startLoc, refExpressionErrors);
    }
    parseConditional(expr, startLoc, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refExpressionErrors) {
        if (this.eat(tt.question)) {
            const node = this.startNodeAt(startLoc);
            node.test = expr;
            node.consequent = this.parseMaybeAssignAllowIn();
            this.expect(tt.colon);
            node.alternate = this.parseMaybeAssign();
            return this.finishNode(node, "ConditionalExpression");
        }
        return expr;
    }
    parseMaybeUnaryOrPrivate(refExpressionErrors) {
        return this.match(tt.privateName)
            ? this.parsePrivateName()
            : this.parseMaybeUnary(refExpressionErrors);
    }
    // Start the precedence parser.
    // https://tc39.es/ecma262/#prod-ShortCircuitExpression
    parseExprOps(refExpressionErrors) {
        const startLoc = this.state.startLoc;
        const potentialArrowAt = this.state.potentialArrowAt;
        const expr = this.parseMaybeUnaryOrPrivate(refExpressionErrors);
        if (this.shouldExitDescending(expr, potentialArrowAt)) {
            return expr;
        }
        return this.parseExprOp(expr, startLoc, -1);
    }
    // Parse binary operators with the operator precedence parsing
    // algorithm. `left` is the left-hand side of the operator.
    // `minPrec` provides context that allows the function to stop and
    // defer further parser to one of its callers when it encounters an
    // operator that has a lower precedence than the set it is parsing.
    parseExprOp(left, leftStartLoc, minPrec) {
        if (this.isPrivateName(left)) {
            // https://tc39.es/ecma262/#prod-RelationalExpression
            // RelationalExpression [In, Yield, Await]
            //   [+In] PrivateIdentifier in ShiftExpression[?Yield, ?Await]
            const value = this.getPrivateNameSV(left);
            if (minPrec >= tokenOperatorPrecedence(tt._in) ||
                !this.prodParam.hasIn ||
                !this.match(tt._in)) {
                this.raise(Errors.PrivateInExpectedIn, left, {
                    identifierName: value,
                });
            }
            this.classScope.usePrivateName(value, left.loc.start);
        }
        const op = this.state.type;
        if (tokenIsOperator(op) && (this.prodParam.hasIn || !this.match(tt._in))) {
            let prec = tokenOperatorPrecedence(op);
            if (prec > minPrec) {
                if (op === tt.pipeline) {
                    this.expectPlugin("pipelineOperator");
                    if (this.state.inFSharpPipelineDirectBody) {
                        return left;
                    }
                    this.checkPipelineAtInfixOperator(left, leftStartLoc);
                }
                const node = this.startNodeAt(leftStartLoc);
                node.left = left;
                node.operator = this.state.value;
                const logical = op === tt.logicalOR || op === tt.logicalAND;
                const coalesce = op === tt.nullishCoalescing;
                if (coalesce) {
                    // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
                    // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
                    prec = tokenOperatorPrecedence(tt.logicalAND);
                }
                this.next();
                if (op === tt.pipeline &&
                    this.hasPlugin(["pipelineOperator", { proposal: "minimal" }])) {
                    if (this.state.type === tt._await && this.prodParam.hasAwait) {
                        throw this.raise(Errors.UnexpectedAwaitAfterPipelineBody, this.state.startLoc);
                    }
                }
                node.right = this.parseExprOpRightExpr(op, prec);
                const finishedNode = this.finishNode(node, logical || coalesce ? "LogicalExpression" : "BinaryExpression");
                /* this check is for all ?? operators
                 * a ?? b && c for this example
                 * when op is coalesce and nextOp is logical (&&), throw at the pos of nextOp that it can not be mixed.
                 * Symmetrically it also throws when op is logical and nextOp is coalesce
                 */
                const nextOp = this.state.type;
                if ((coalesce && (nextOp === tt.logicalOR || nextOp === tt.logicalAND)) ||
                    (logical && nextOp === tt.nullishCoalescing)) {
                    throw this.raise(Errors.MixingCoalesceWithLogical, this.state.startLoc);
                }
                return this.parseExprOp(finishedNode, leftStartLoc, minPrec);
            }
        }
        return left;
    }
    // Helper function for `parseExprOp`. Parse the right-hand side of binary-
    // operator expressions, then apply any operator-specific functions.
    parseExprOpRightExpr(op, prec) {
        const startLoc = this.state.startLoc;
        switch (op) {
            case tt.pipeline:
                switch (this.getPluginOption("pipelineOperator", "proposal")) {
                    case "hack":
                        return this.withTopicBindingContext(() => {
                            return this.parseHackPipeBody();
                        });
                    case "smart":
                        return this.withTopicBindingContext(() => {
                            if (this.prodParam.hasYield && this.isContextual(tt._yield)) {
                                throw this.raise(Errors.PipeBodyIsTighter, this.state.startLoc);
                            }
                            return this.parseSmartPipelineBodyInStyle(this.parseExprOpBaseRightExpr(op, prec), startLoc);
                        });
                    case "fsharp":
                        return this.withSoloAwaitPermittingContext(() => {
                            return this.parseFSharpPipelineBody(prec);
                        });
                }
            // Falls through.
            default:
                return this.parseExprOpBaseRightExpr(op, prec);
        }
    }
    // Helper function for `parseExprOpRightExpr`. Parse the right-hand side of
    // binary-operator expressions without applying any operator-specific functions.
    parseExprOpBaseRightExpr(op, prec) {
        const startLoc = this.state.startLoc;
        return this.parseExprOp(this.parseMaybeUnaryOrPrivate(), startLoc, tokenIsRightAssociative(op) ? prec - 1 : prec);
    }
    parseHackPipeBody() {
        const { startLoc } = this.state;
        const body = this.parseMaybeAssign();
        const requiredParentheses = UnparenthesizedPipeBodyDescriptions.has(
        // @ts-expect-error TS2345: Argument of type 'string' is not assignable to parameter of type '"ArrowFunctionExpression" | "YieldExpression" | "AssignmentExpression" | "ConditionalExpression"'.
        body.type);
        // TODO: Check how to handle type casts in Flow and TS once they are supported
        if (requiredParentheses && !body.extra?.parenthesized) {
            this.raise(Errors.PipeUnparenthesizedBody, startLoc, {
                type: body.type,
            });
        }
        if (!this.topicReferenceWasUsedInCurrentContext()) {
            // A Hack pipe body must use the topic reference at least once.
            this.raise(Errors.PipeTopicUnused, startLoc);
        }
        return body;
    }
    checkExponentialAfterUnary(node) {
        if (this.match(tt.exponent)) {
            this.raise(Errors.UnexpectedTokenUnaryExponentiation, node.argument);
        }
    }
    // Parse unary operators, both prefix and postfix.
    // https://tc39.es/ecma262/#prod-UnaryExpression
    parseMaybeUnary(refExpressionErrors, sawUnary) {
        const startLoc = this.state.startLoc;
        const isAwait = this.isContextual(tt._await);
        if (isAwait && this.isAwaitAllowed()) {
            this.next();
            const expr = this.parseAwait(startLoc);
            if (!sawUnary)
                this.checkExponentialAfterUnary(expr);
            return expr;
        }
        const update = this.match(tt.incDec);
        const node = this.startNode();
        if (tokenIsPrefix(this.state.type)) {
            node.operator = this.state.value;
            node.prefix = true;
            if (this.match(tt._throw)) {
                this.expectPlugin("throwExpressions");
            }
            const isDelete = this.match(tt._delete);
            this.next();
            node.argument = this.parseMaybeUnary(null, true);
            this.checkExpressionErrors(refExpressionErrors, true);
            if (this.state.strict && isDelete) {
                const arg = node.argument;
                if (arg.type === "Identifier") {
                    this.raise(Errors.StrictDelete, node);
                }
                else if (this.hasPropertyAsPrivateName(arg)) {
                    this.raise(Errors.DeletePrivateField, node);
                }
            }
            if (!update) {
                if (!sawUnary) {
                    this.checkExponentialAfterUnary(node);
                }
                return this.finishNode(node, "UnaryExpression");
            }
        }
        const expr = this.parseUpdate(
        // @ts-expect-error using "Undone" node as "done"
        node, update, refExpressionErrors);
        if (isAwait) {
            const { type } = this.state;
            const startsExpr = this.hasPlugin("v8intrinsic")
                ? tokenCanStartExpression(type)
                : tokenCanStartExpression(type) && !this.match(tt.modulo);
            if (startsExpr && !this.isAmbiguousAwait()) {
                this.raiseOverwrite(Errors.AwaitNotInAsyncContext, startLoc);
                return this.parseAwait(startLoc);
            }
        }
        return expr;
    }
    // https://tc39.es/ecma262/#prod-UpdateExpression
    parseUpdate(node, update, refExpressionErrors) {
        if (update) {
            // @ts-expect-error Type 'Node' is missing the following properties from type 'Undone<UpdateExpression>': prefix, operator, argument
            const updateExpressionNode = node;
            this.checkLVal(updateExpressionNode.argument, {
                in: this.finishNode(updateExpressionNode, "UpdateExpression"),
            });
            return node;
        }
        const startLoc = this.state.startLoc;
        let expr = this.parseExprSubscripts(refExpressionErrors);
        if (this.checkExpressionErrors(refExpressionErrors, false))
            return expr;
        while (tokenIsPostfix(this.state.type) && !this.canInsertSemicolon()) {
            const node = this.startNodeAt(startLoc);
            node.operator = this.state.value;
            node.prefix = false;
            node.argument = expr;
            this.next();
            this.checkLVal(expr, {
                in: (expr = this.finishNode(node, "UpdateExpression")),
            });
        }
        return expr;
    }
    // Parse call, dot, and `[]`-subscript expressions.
    // https://tc39.es/ecma262/#prod-LeftHandSideExpression
    parseExprSubscripts(refExpressionErrors) {
        const startLoc = this.state.startLoc;
        const potentialArrowAt = this.state.potentialArrowAt;
        const expr = this.parseExprAtom(refExpressionErrors);
        if (this.shouldExitDescending(expr, potentialArrowAt)) {
            return expr;
        }
        return this.parseSubscripts(expr, startLoc);
    }
    parseSubscripts(base, startLoc, noCalls) {
        const state = {
            optionalChainMember: false,
            maybeAsyncArrow: this.atPossibleAsyncArrow(base),
            stop: false,
        };
        do {
            base = this.parseSubscript(base, startLoc, noCalls, state);
            // After parsing a subscript, this isn't "async" for sure.
            state.maybeAsyncArrow = false;
        } while (!state.stop);
        return base;
    }
    /**
     * @param state Set 'state.stop = true' to indicate that we should stop parsing subscripts.
     *   state.optionalChainMember to indicate that the member is currently in OptionalChain
     */
    parseSubscript(base, startLoc, noCalls, state) {
        const { type } = this.state;
        if (!noCalls && type === tt.doubleColon) {
            return this.parseBind(base, startLoc, noCalls, state);
        }
        else if (tokenIsTemplate(type)) {
            return this.parseTaggedTemplateExpression(base, startLoc, state);
        }
        let optional = false;
        if (type === tt.questionDot) {
            if (noCalls) {
                this.raise(Errors.OptionalChainingNoNew, this.state.startLoc);
                if (this.lookaheadCharCode() === charCodes.leftParenthesis) {
                    // stop at `?.` when parsing `new a?.()`
                    state.stop = true;
                    return base;
                }
            }
            state.optionalChainMember = optional = true;
            this.next();
        }
        if (!noCalls && this.match(tt.parenL)) {
            return this.parseCoverCallAndAsyncArrowHead(base, startLoc, state, optional);
        }
        else {
            const computed = this.eat(tt.bracketL);
            if (computed || optional || this.eat(tt.dot)) {
                return this.parseMember(base, startLoc, state, computed, optional);
            }
            else {
                state.stop = true;
                return base;
            }
        }
    }
    // base[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
    // base[?Yield, ?Await] . IdentifierName
    // base[?Yield, ?Await] . PrivateIdentifier
    //   where `base` is one of CallExpression, MemberExpression and OptionalChain
    parseMember(base, startLoc, state, computed, optional) {
        const node = this.startNodeAt(startLoc);
        node.object = base;
        node.computed = computed;
        if (computed) {
            node.property = this.parseExpression();
            this.expect(tt.bracketR);
        }
        else if (this.match(tt.privateName)) {
            if (base.type === "Super") {
                this.raise(Errors.SuperPrivateField, startLoc);
            }
            this.classScope.usePrivateName(this.state.value, this.state.startLoc);
            node.property = this.parsePrivateName();
        }
        else {
            node.property = this.parseIdentifier(true);
        }
        if (state.optionalChainMember) {
            node.optional = optional;
            return this.finishNode(node, "OptionalMemberExpression");
        }
        else {
            return this.finishNode(node, "MemberExpression");
        }
    }
    // https://github.com/tc39/proposal-bind-operator#syntax
    parseBind(base, startLoc, noCalls, state) {
        const node = this.startNodeAt(startLoc);
        node.object = base;
        this.next(); // eat '::'
        node.callee = this.parseNoCallExpr();
        state.stop = true;
        return this.parseSubscripts(this.finishNode(node, "BindExpression"), startLoc, noCalls);
    }
    // https://tc39.es/ecma262/#prod-CoverCallExpressionAndAsyncArrowHead
    // CoverCallExpressionAndAsyncArrowHead
    // CallExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
    // OptionalChain[?Yield, ?Await] Arguments[?Yield, ?Await]
    parseCoverCallAndAsyncArrowHead(base, startLoc, state, optional) {
        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        let refExpressionErrors = null;
        this.state.maybeInArrowParameters = true;
        this.next(); // eat `(`
        const node = this.startNodeAt(startLoc);
        node.callee = base;
        const { maybeAsyncArrow, optionalChainMember } = state;
        if (maybeAsyncArrow) {
            this.expressionScope.enter(newAsyncArrowScope());
            refExpressionErrors = new ExpressionErrors();
        }
        if (optionalChainMember) {
            // @ts-expect-error when optionalChainMember is true, node must be an optional call
            node.optional = optional;
        }
        if (optional) {
            node.arguments = this.parseCallExpressionArguments(tt.parenR);
        }
        else {
            node.arguments = this.parseCallExpressionArguments(tt.parenR, base.type === "Import", base.type !== "Super", 
            // @ts-expect-error todo(flow->ts)
            node, refExpressionErrors);
        }
        let finishedNode = this.finishCallExpression(node, optionalChainMember);
        if (maybeAsyncArrow && this.shouldParseAsyncArrow() && !optional) {
            /*:: invariant(refExpressionErrors != null) */
            state.stop = true;
            this.checkDestructuringPrivate(refExpressionErrors);
            this.expressionScope.validateAsPattern();
            this.expressionScope.exit();
            finishedNode = this.parseAsyncArrowFromCallExpression(this.startNodeAt(startLoc), finishedNode);
        }
        else {
            if (maybeAsyncArrow) {
                this.checkExpressionErrors(refExpressionErrors, true);
                this.expressionScope.exit();
            }
            this.toReferencedArguments(finishedNode);
        }
        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        return finishedNode;
    }
    toReferencedArguments(node, isParenthesizedExpr) {
        this.toReferencedListDeep(node.arguments, isParenthesizedExpr);
    }
    // MemberExpression [?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
    // CallExpression [?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
    parseTaggedTemplateExpression(base, startLoc, state) {
        const node = this.startNodeAt(startLoc);
        node.tag = base;
        node.quasi = this.parseTemplate(true);
        if (state.optionalChainMember) {
            this.raise(Errors.OptionalChainingNoTemplate, startLoc);
        }
        return this.finishNode(node, "TaggedTemplateExpression");
    }
    atPossibleAsyncArrow(base) {
        return (base.type === "Identifier" &&
            base.name === "async" &&
            this.state.lastTokEndLoc.index === base.end &&
            !this.canInsertSemicolon() &&
            // check there are no escape sequences, such as \u{61}sync
            base.end - base.start === 5 &&
            base.start === this.state.potentialArrowAt);
    }
    expectImportAttributesPlugin() {
        if (!this.hasPlugin("importAssertions")) {
            this.expectPlugin("importAttributes");
        }
    }
    finishCallExpression(node, optional) {
        if (node.callee.type === "Import") {
            if (node.arguments.length === 2) {
                if (process.env.BABEL_8_BREAKING) {
                    this.expectImportAttributesPlugin();
                }
                else {
                    if (!this.hasPlugin("moduleAttributes")) {
                        this.expectImportAttributesPlugin();
                    }
                }
            }
            if (node.arguments.length === 0 || node.arguments.length > 2) {
                this.raise(Errors.ImportCallArity, node, {
                    maxArgumentCount: this.hasPlugin("importAttributes") ||
                        this.hasPlugin("importAssertions") ||
                        this.hasPlugin("moduleAttributes")
                        ? 2
                        : 1,
                });
            }
            else {
                for (const arg of node.arguments) {
                    if (arg.type === "SpreadElement") {
                        this.raise(Errors.ImportCallSpreadArgument, arg);
                    }
                }
            }
        }
        return this.finishNode(node, optional ? "OptionalCallExpression" : "CallExpression");
    }
    parseCallExpressionArguments(close, dynamicImport, allowPlaceholder, nodeForExtra, refExpressionErrors) {
        const elts = [];
        let first = true;
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = false;
        while (!this.eat(close)) {
            if (first) {
                first = false;
            }
            else {
                this.expect(tt.comma);
                if (this.match(close)) {
                    if (dynamicImport &&
                        !this.hasPlugin("importAttributes") &&
                        !this.hasPlugin("importAssertions") &&
                        !this.hasPlugin("moduleAttributes")) {
                        this.raise(Errors.ImportCallArgumentTrailingComma, this.state.lastTokStartLoc);
                    }
                    if (nodeForExtra) {
                        this.addTrailingCommaExtraToNode(nodeForExtra);
                    }
                    this.next();
                    break;
                }
            }
            elts.push(this.parseExprListItem(false, refExpressionErrors, allowPlaceholder));
        }
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        return elts;
    }
    shouldParseAsyncArrow() {
        return this.match(tt.arrow) && !this.canInsertSemicolon();
    }
    parseAsyncArrowFromCallExpression(node, call) {
        this.resetPreviousNodeTrailingComments(call);
        this.expect(tt.arrow);
        this.parseArrowExpression(node, call.arguments, true, call.extra?.trailingCommaLoc);
        // mark inner comments of `async()` as inner comments of `async () =>`
        if (call.innerComments) {
            setInnerComments(node, call.innerComments);
        }
        // mark trailing comments of `async` to be inner comments
        if (call.callee.trailingComments) {
            setInnerComments(node, call.callee.trailingComments);
        }
        return node;
    }
    // Parse a no-call expression (like argument of `new` or `::` operators).
    // https://tc39.es/ecma262/#prod-MemberExpression
    parseNoCallExpr() {
        const startLoc = this.state.startLoc;
        return this.parseSubscripts(this.parseExprAtom(), startLoc, true);
    }
    // Parse an atomic expression — either a single token that is an
    // expression, an expression started by a keyword like `function` or
    // `new`, or an expression wrapped in punctuation like `()`, `[]`,
    // or `{}`.
    // https://tc39.es/ecma262/#prod-PrimaryExpression
    // https://tc39.es/ecma262/#prod-AsyncArrowFunction
    // PrimaryExpression
    // Super
    // Import
    // AsyncArrowFunction
    parseExprAtom(refExpressionErrors) {
        let node;
        let decorators = null;
        const { type } = this.state;
        switch (type) {
            case tt._super:
                return this.parseSuper();
            case tt._import:
                node = this.startNode();
                this.next();
                if (this.match(tt.dot)) {
                    return this.parseImportMetaProperty(node);
                }
                if (this.match(tt.parenL)) {
                    if (this.options.createImportExpressions) {
                        return this.parseImportCall(node);
                    }
                    else {
                        return this.finishNode(node, "Import");
                    }
                }
                else {
                    this.raise(Errors.UnsupportedImport, this.state.lastTokStartLoc);
                    return this.finishNode(node, "Import");
                }
            case tt._this:
                node = this.startNode();
                this.next();
                return this.finishNode(node, "ThisExpression");
            case tt._do: {
                return this.parseDo(this.startNode(), false);
            }
            case tt.slash:
            case tt.slashAssign: {
                this.readRegexp();
                return this.parseRegExpLiteral(this.state.value);
            }
            case tt.num:
                return this.parseNumericLiteral(this.state.value);
            case tt.bigint:
                return this.parseBigIntLiteral(this.state.value);
            case tt.decimal:
                return this.parseDecimalLiteral(this.state.value);
            case tt.string:
                return this.parseStringLiteral(this.state.value);
            case tt._null:
                return this.parseNullLiteral();
            case tt._true:
                return this.parseBooleanLiteral(true);
            case tt._false:
                return this.parseBooleanLiteral(false);
            case tt.parenL: {
                const canBeArrow = this.state.potentialArrowAt === this.state.start;
                return this.parseParenAndDistinguishExpression(canBeArrow);
            }
            case tt.bracketBarL:
            case tt.bracketHashL: {
                return this.parseArrayLike(this.state.type === tt.bracketBarL ? tt.bracketBarR : tt.bracketR, 
                /* canBePattern */ false, 
                /* isTuple */ true);
            }
            case tt.bracketL: {
                return this.parseArrayLike(tt.bracketR, 
                /* canBePattern */ true, 
                /* isTuple */ false, refExpressionErrors);
            }
            case tt.braceBarL:
            case tt.braceHashL: {
                return this.parseObjectLike(this.state.type === tt.braceBarL ? tt.braceBarR : tt.braceR, 
                /* isPattern */ false, 
                /* isRecord */ true);
            }
            case tt.braceL: {
                return this.parseObjectLike(tt.braceR, 
                /* isPattern */ false, 
                /* isRecord */ false, refExpressionErrors);
            }
            case tt._function:
                return this.parseFunctionOrFunctionSent();
            case tt.at:
                decorators = this.parseDecorators();
            // fall through
            case tt._class:
                return this.parseClass(this.maybeTakeDecorators(decorators, this.startNode()), false);
            case tt._new:
                return this.parseNewOrNewTarget();
            case tt.templateNonTail:
            case tt.templateTail:
                return this.parseTemplate(false);
            // BindExpression[Yield]
            //   :: MemberExpression[?Yield]
            case tt.doubleColon: {
                node = this.startNode();
                this.next();
                node.object = null;
                const callee = (node.callee = this.parseNoCallExpr());
                if (callee.type === "MemberExpression") {
                    return this.finishNode(node, "BindExpression");
                }
                else {
                    throw this.raise(Errors.UnsupportedBind, callee);
                }
            }
            case tt.privateName: {
                // Standalone private names are only allowed in "#x in obj"
                // expressions, and they are directly handled by callers of
                // parseExprOp. If we reach this, the input is always invalid.
                // We can throw a better error message and recover, rather than
                // just throwing "Unexpected token" (which is the default
                // behavior of this big switch statement).
                this.raise(Errors.PrivateInExpectedIn, this.state.startLoc, {
                    identifierName: this.state.value,
                });
                return this.parsePrivateName();
            }
            case tt.moduloAssign: {
                return this.parseTopicReferenceThenEqualsSign(tt.modulo, "%");
            }
            case tt.xorAssign: {
                return this.parseTopicReferenceThenEqualsSign(tt.bitwiseXOR, "^");
            }
            case tt.doubleCaret:
            case tt.doubleAt: {
                return this.parseTopicReference("hack");
            }
            case tt.bitwiseXOR:
            case tt.modulo:
            case tt.hash: {
                const pipeProposal = this.getPluginOption("pipelineOperator", "proposal");
                if (pipeProposal) {
                    return this.parseTopicReference(pipeProposal);
                }
                this.unexpected();
                break;
            }
            case tt.lt: {
                const lookaheadCh = this.input.codePointAt(this.nextTokenStart());
                if (isIdentifierStart(lookaheadCh) || // Element/Type Parameter <foo>
                    lookaheadCh === charCodes.greaterThan // Fragment <>
                ) {
                    this.expectOnePlugin(["jsx", "flow", "typescript"]);
                }
                else {
                    this.unexpected();
                }
                break;
            }
            default:
                if (tokenIsIdentifier(type)) {
                    if (this.isContextual(tt._module) &&
                        this.lookaheadInLineCharCode() === charCodes.leftCurlyBrace) {
                        return this.parseModuleExpression();
                    }
                    const canBeArrow = this.state.potentialArrowAt === this.state.start;
                    const containsEsc = this.state.containsEsc;
                    const id = this.parseIdentifier();
                    if (!containsEsc &&
                        id.name === "async" &&
                        !this.canInsertSemicolon()) {
                        const { type } = this.state;
                        if (type === tt._function) {
                            this.resetPreviousNodeTrailingComments(id);
                            this.next();
                            return this.parseAsyncFunctionExpression(this.startNodeAtNode(id));
                        }
                        else if (tokenIsIdentifier(type)) {
                            // If the next token begins with "=", commit to parsing an async
                            // arrow function. (Peeking ahead for "=" lets us avoid a more
                            // expensive full-token lookahead on this common path.)
                            if (this.lookaheadCharCode() === charCodes.equalsTo) {
                                // although `id` is not used in async arrow unary function,
                                // we don't need to reset `async`'s trailing comments because
                                // it will be attached to the upcoming async arrow binding identifier
                                return this.parseAsyncArrowUnaryFunction(this.startNodeAtNode(id));
                            }
                            else {
                                // Otherwise, treat "async" as an identifier and let calling code
                                // deal with the current tt.name token.
                                return id;
                            }
                        }
                        else if (type === tt._do) {
                            this.resetPreviousNodeTrailingComments(id);
                            return this.parseDo(this.startNodeAtNode(id), true);
                        }
                    }
                    if (canBeArrow &&
                        this.match(tt.arrow) &&
                        !this.canInsertSemicolon()) {
                        this.next();
                        return this.parseArrowExpression(this.startNodeAtNode(id), [id], false);
                    }
                    return id;
                }
                else {
                    this.unexpected();
                }
        }
    }
    // This helper method should only be called
    // when the parser has reached a potential Hack pipe topic token
    // that is followed by an equals sign.
    // See <https://github.com/js-choi/proposal-hack-pipes>.
    // If we find ^= or %= in an expression position
    // (i.e., the tt.moduloAssign or tt.xorAssign token types), and if the
    // Hack-pipes proposal is active with ^ or % as its topicToken, then the ^ or
    // % could be the topic token (e.g., in x |> ^==y or x |> ^===y), and so we
    // reparse the current token as ^ or %.
    // Otherwise, this throws an unexpected-token error.
    parseTopicReferenceThenEqualsSign(topicTokenType, topicTokenValue) {
        const pipeProposal = this.getPluginOption("pipelineOperator", "proposal");
        if (pipeProposal) {
            // Set the most-recent token to be a topic token
            // given by the tokenType and tokenValue.
            // Now the next readToken() call (in parseTopicReference)
            // will consume that “topic token”.
            this.state.type = topicTokenType;
            this.state.value = topicTokenValue;
            // Rewind the tokenizer to the end of the “topic token”, so that the
            // following token starts at the equals sign after that topic token.
            this.state.pos--;
            this.state.end--;
            // This is safe to do since the preceding character was either ^ or %, and
            // thus not a newline.
            this.state.endLoc = createPositionWithColumnOffset(this.state.endLoc, -1);
            // Now actually consume the topic token.
            return this.parseTopicReference(pipeProposal);
        }
        else {
            this.unexpected();
        }
    }
    // This helper method should only be called
    // when the proposal-pipeline-operator plugin is active,
    // and when the parser has reached a potential Hack pipe topic token.
    // Although a pipe-operator proposal is assumed to be active,
    // its configuration might not match the current token’s type.
    // See <https://github.com/js-choi/proposal-hack-pipes>.
    parseTopicReference(pipeProposal) {
        const node = this.startNode();
        const startLoc = this.state.startLoc;
        const tokenType = this.state.type;
        // Consume the current token.
        this.next();
        // If the pipe-operator plugin’s configuration matches the current token’s type,
        // then this will return `node`, will have been finished as a topic reference.
        // Otherwise, this will throw a `PipeTopicUnconfiguredToken` error.
        return this.finishTopicReference(node, startLoc, pipeProposal, tokenType);
    }
    // This helper method attempts to finish the given `node`
    // into a topic-reference node for the given `pipeProposal`.
    // See <https://github.com/js-choi/proposal-hack-pipes>.
    //
    // The method assumes that any topic token was consumed before it was called.
    //
    // If the `pipelineOperator` plugin is active,
    // and if the given `tokenType` matches the plugin’s configuration,
    // then this method will return the finished `node`.
    //
    // If the `pipelineOperator` plugin is active,
    // but if the given `tokenType` does not match the plugin’s configuration,
    // then this method will throw a `PipeTopicUnconfiguredToken` error.
    finishTopicReference(node, startLoc, pipeProposal, tokenType) {
        if (this.testTopicReferenceConfiguration(pipeProposal, startLoc, tokenType)) {
            // The token matches the plugin’s configuration.
            // The token is therefore a topic reference.
            // Determine the node type for the topic reference
            // that is appropriate for the active pipe-operator proposal.
            const nodeType = pipeProposal === "smart"
                ? "PipelinePrimaryTopicReference"
                : // The proposal must otherwise be "hack",
                    // as enforced by testTopicReferenceConfiguration.
                    "TopicReference";
            if (!this.topicReferenceIsAllowedInCurrentContext()) {
                this.raise(
                // The topic reference is not allowed in the current context:
                // it is outside of a pipe body.
                // Raise recoverable errors.
                pipeProposal === "smart"
                    ? Errors.PrimaryTopicNotAllowed
                    : // In this case, `pipeProposal === "hack"` is true.
                        Errors.PipeTopicUnbound, startLoc);
            }
            // Register the topic reference so that its pipe body knows
            // that its topic was used at least once.
            this.registerTopicReference();
            return this.finishNode(node, nodeType);
        }
        else {
            // The token does not match the plugin’s configuration.
            throw this.raise(Errors.PipeTopicUnconfiguredToken, startLoc, {
                token: tokenLabelName(tokenType),
            });
        }
    }
    // This helper method tests whether the given token type
    // matches the pipelineOperator parser plugin’s configuration.
    // If the active pipe proposal is Hack style,
    // and if the given token is the same as the plugin configuration’s `topicToken`,
    // then this is a valid topic reference.
    // If the active pipe proposal is smart mix,
    // then the topic token must always be `#`.
    // If the active pipe proposal is neither (e.g., "minimal" or "fsharp"),
    // then an error is thrown.
    testTopicReferenceConfiguration(pipeProposal, startLoc, tokenType) {
        switch (pipeProposal) {
            case "hack": {
                return this.hasPlugin([
                    "pipelineOperator",
                    {
                        // @ts-expect-error token must have a label
                        topicToken: tokenLabelName(tokenType),
                    },
                ]);
            }
            case "smart":
                return tokenType === tt.hash;
            default:
                throw this.raise(Errors.PipeTopicRequiresHackPipes, startLoc);
        }
    }
    // async [no LineTerminator here] AsyncArrowBindingIdentifier[?Yield] [no LineTerminator here] => AsyncConciseBody[?In]
    parseAsyncArrowUnaryFunction(node) {
        // We don't need to push a new ParameterDeclarationScope here since we are sure
        // 1) it is an async arrow, 2) no biding pattern is allowed in params
        this.prodParam.enter(functionFlags(true, this.prodParam.hasYield));
        const params = [this.parseIdentifier()];
        this.prodParam.exit();
        if (this.hasPrecedingLineBreak()) {
            this.raise(Errors.LineTerminatorBeforeArrow, this.state.curPosition());
        }
        this.expect(tt.arrow);
        // let foo = async bar => {};
        return this.parseArrowExpression(node, params, true);
    }
    // https://github.com/tc39/proposal-do-expressions
    // https://github.com/tc39/proposal-async-do-expressions
    parseDo(node, isAsync) {
        this.expectPlugin("doExpressions");
        if (isAsync) {
            this.expectPlugin("asyncDoExpressions");
        }
        node.async = isAsync;
        this.next(); // eat `do`
        const oldLabels = this.state.labels;
        this.state.labels = [];
        if (isAsync) {
            // AsyncDoExpression :
            // async [no LineTerminator here] do Block[~Yield, +Await, ~Return]
            this.prodParam.enter(ParamKind.PARAM_AWAIT);
            node.body = this.parseBlock();
            this.prodParam.exit();
        }
        else {
            node.body = this.parseBlock();
        }
        this.state.labels = oldLabels;
        return this.finishNode(node, "DoExpression");
    }
    // Parse the `super` keyword
    parseSuper() {
        const node = this.startNode();
        this.next(); // eat `super`
        if (this.match(tt.parenL) &&
            !this.scope.allowDirectSuper &&
            !this.options.allowSuperOutsideMethod) {
            this.raise(Errors.SuperNotAllowed, node);
        }
        else if (!this.scope.allowSuper &&
            !this.options.allowSuperOutsideMethod) {
            this.raise(Errors.UnexpectedSuper, node);
        }
        if (!this.match(tt.parenL) &&
            !this.match(tt.bracketL) &&
            !this.match(tt.dot)) {
            this.raise(Errors.UnsupportedSuper, node);
        }
        return this.finishNode(node, "Super");
    }
    parsePrivateName() {
        const node = this.startNode();
        const id = this.startNodeAt(
        // The position is hardcoded because we merge `#` and name into a single
        // tt.privateName token
        createPositionWithColumnOffset(this.state.startLoc, 1));
        const name = this.state.value;
        this.next(); // eat #name;
        node.id = this.createIdentifier(id, name);
        return this.finishNode(node, "PrivateName");
    }
    parseFunctionOrFunctionSent() {
        const node = this.startNode();
        // We do not do parseIdentifier here because when parseFunctionOrFunctionSent
        // is called we already know that the current token is a "name" with the value "function"
        // This will improve perf a tiny little bit as we do not do validation but more importantly
        // here is that parseIdentifier will remove an item from the expression stack
        // if "function" or "class" is parsed as identifier (in objects e.g.), which should not happen here.
        this.next(); // eat `function`
        if (this.prodParam.hasYield && this.match(tt.dot)) {
            const meta = this.createIdentifier(this.startNodeAtNode(node), "function");
            this.next(); // eat `.`
            // https://github.com/tc39/proposal-function.sent#syntax-1
            if (this.match(tt._sent)) {
                this.expectPlugin("functionSent");
            }
            else if (!this.hasPlugin("functionSent")) {
                // The code wasn't `function.sent` but just `function.`, so a simple error is less confusing.
                this.unexpected();
            }
            return this.parseMetaProperty(node, meta, "sent");
        }
        return this.parseFunction(node);
    }
    parseMetaProperty(node, meta, propertyName) {
        node.meta = meta;
        const containsEsc = this.state.containsEsc;
        node.property = this.parseIdentifier(true);
        if (node.property.name !== propertyName || containsEsc) {
            this.raise(Errors.UnsupportedMetaProperty, node.property, {
                target: meta.name,
                onlyValidPropertyName: propertyName,
            });
        }
        return this.finishNode(node, "MetaProperty");
    }
    // https://tc39.es/ecma262/#prod-ImportMeta
    parseImportMetaProperty(node) {
        const id = this.createIdentifier(this.startNodeAtNode(node), "import");
        this.next(); // eat `.`
        if (this.isContextual(tt._meta)) {
            if (!this.inModule) {
                this.raise(Errors.ImportMetaOutsideModule, id);
            }
            this.sawUnambiguousESM = true;
        }
        else if (this.isContextual(tt._source) || this.isContextual(tt._defer)) {
            const isSource = this.isContextual(tt._source);
            // TODO: The proposal doesn't mention import.defer yet because it was
            // pending on a decision for import.source. Wait to enable it until it's
            // included in the proposal.
            if (!isSource)
                this.unexpected();
            this.expectPlugin(isSource ? "sourcePhaseImports" : "deferredImportEvaluation");
            if (!this.options.createImportExpressions) {
                throw this.raise(Errors.DynamicImportPhaseRequiresImportExpressions, this.state.startLoc, {
                    phase: this.state.value,
                });
            }
            this.next();
            node.phase = isSource
                ? "source"
                : "defer";
            return this.parseImportCall(node);
        }
        return this.parseMetaProperty(node, id, "meta");
    }
    parseLiteralAtNode(value, type, node) {
        this.addExtra(node, "rawValue", value);
        this.addExtra(node, "raw", this.input.slice(node.start, this.state.end));
        node.value = value;
        this.next();
        return this.finishNode(node, type);
    }
    parseLiteral(value, type) {
        const node = this.startNode();
        return this.parseLiteralAtNode(value, type, node);
    }
    parseStringLiteral(value) {
        return this.parseLiteral(value, "StringLiteral");
    }
    parseNumericLiteral(value) {
        return this.parseLiteral(value, "NumericLiteral");
    }
    parseBigIntLiteral(value) {
        return this.parseLiteral(value, "BigIntLiteral");
    }
    parseDecimalLiteral(value) {
        return this.parseLiteral(value, "DecimalLiteral");
    }
    parseRegExpLiteral(value) {
        const node = this.parseLiteral(value.value, "RegExpLiteral");
        node.pattern = value.pattern;
        node.flags = value.flags;
        return node;
    }
    parseBooleanLiteral(value) {
        const node = this.startNode();
        node.value = value;
        this.next();
        return this.finishNode(node, "BooleanLiteral");
    }
    parseNullLiteral() {
        const node = this.startNode();
        this.next();
        return this.finishNode(node, "NullLiteral");
    }
    // https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList
    parseParenAndDistinguishExpression(canBeArrow) {
        const startLoc = this.state.startLoc;
        let val;
        this.next(); // eat `(`
        this.expressionScope.enter(newArrowHeadScope());
        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.maybeInArrowParameters = true;
        this.state.inFSharpPipelineDirectBody = false;
        const innerStartLoc = this.state.startLoc;
        const exprList = [];
        const refExpressionErrors = new ExpressionErrors();
        let first = true;
        let spreadStartLoc;
        let optionalCommaStartLoc;
        while (!this.match(tt.parenR)) {
            if (first) {
                first = false;
            }
            else {
                this.expect(tt.comma, refExpressionErrors.optionalParametersLoc === null
                    ? null
                    : refExpressionErrors.optionalParametersLoc);
                if (this.match(tt.parenR)) {
                    optionalCommaStartLoc = this.state.startLoc;
                    break;
                }
            }
            if (this.match(tt.ellipsis)) {
                const spreadNodeStartLoc = this.state.startLoc;
                spreadStartLoc = this.state.startLoc;
                exprList.push(this.parseParenItem(this.parseRestBinding(), spreadNodeStartLoc));
                if (!this.checkCommaAfterRest(charCodes.rightParenthesis)) {
                    break;
                }
            }
            else {
                exprList.push(this.parseMaybeAssignAllowIn(refExpressionErrors, this.parseParenItem));
            }
        }
        const innerEndLoc = this.state.lastTokEndLoc;
        this.expect(tt.parenR);
        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        let arrowNode = this.startNodeAt(startLoc);
        if (canBeArrow &&
            this.shouldParseArrow(exprList) &&
            (arrowNode = this.parseArrow(arrowNode))) {
            this.checkDestructuringPrivate(refExpressionErrors);
            this.expressionScope.validateAsPattern();
            this.expressionScope.exit();
            this.parseArrowExpression(arrowNode, exprList, false);
            // @ts-expect-error todo(flow->ts) improve node types
            return arrowNode;
        }
        this.expressionScope.exit();
        if (!exprList.length) {
            this.unexpected(this.state.lastTokStartLoc);
        }
        if (optionalCommaStartLoc)
            this.unexpected(optionalCommaStartLoc);
        if (spreadStartLoc)
            this.unexpected(spreadStartLoc);
        this.checkExpressionErrors(refExpressionErrors, true);
        this.toReferencedListDeep(exprList, /* isParenthesizedExpr */ true);
        if (exprList.length > 1) {
            val = this.startNodeAt(innerStartLoc);
            val.expressions = exprList;
            // finish node at current location so it can pick up comments after `)`
            this.finishNode(val, "SequenceExpression");
            this.resetEndLocation(val, innerEndLoc);
        }
        else {
            val = exprList[0];
        }
        return this.wrapParenthesis(startLoc, 
        // @ts-expect-error todo(flow->ts)
        val);
    }
    wrapParenthesis(startLoc, expression) {
        if (!this.options.createParenthesizedExpressions) {
            this.addExtra(expression, "parenthesized", true);
            this.addExtra(expression, "parenStart", startLoc.index);
            this.takeSurroundingComments(expression, startLoc.index, this.state.lastTokEndLoc.index);
            return expression;
        }
        const parenExpression = this.startNodeAt(startLoc);
        parenExpression.expression = expression;
        return this.finishNode(parenExpression, "ParenthesizedExpression");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `params` is used in typescript plugin
    shouldParseArrow(params) {
        return !this.canInsertSemicolon();
    }
    parseArrow(node) {
        if (this.eat(tt.arrow)) {
            return node;
        }
    }
    parseParenItem(node, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startLoc) {
        return node;
    }
    parseNewOrNewTarget() {
        const node = this.startNode();
        this.next();
        if (this.match(tt.dot)) {
            // https://tc39.es/ecma262/#prod-NewTarget
            const meta = this.createIdentifier(this.startNodeAtNode(node), "new");
            this.next();
            const metaProp = this.parseMetaProperty(node, meta, "target");
            if (!this.scope.inNonArrowFunction &&
                !this.scope.inClass &&
                !this.options.allowNewTargetOutsideFunction) {
                this.raise(Errors.UnexpectedNewTarget, metaProp);
            }
            return metaProp;
        }
        return this.parseNew(node);
    }
    // New's precedence is slightly tricky. It must allow its argument to
    // be a `[]` or dot subscript expression, but not a call — at least,
    // not without wrapping it in parentheses. Thus, it uses the noCalls
    // argument to parseSubscripts to prevent it from consuming the
    // argument list.
    // https://tc39.es/ecma262/#prod-NewExpression
    parseNew(node) {
        this.parseNewCallee(node);
        if (this.eat(tt.parenL)) {
            const args = this.parseExprList(tt.parenR);
            this.toReferencedList(args);
            // (parseExprList should be all non-null in this case)
            node.arguments = args;
        }
        else {
            node.arguments = [];
        }
        return this.finishNode(node, "NewExpression");
    }
    parseNewCallee(node) {
        const isImport = this.match(tt._import);
        const callee = this.parseNoCallExpr();
        node.callee = callee;
        if (isImport &&
            (callee.type === "Import" || callee.type === "ImportExpression")) {
            this.raise(Errors.ImportCallNotNewExpression, callee);
        }
    }
    // Parse template expression.
    parseTemplateElement(isTagged) {
        const { start, startLoc, end, value } = this.state;
        const elemStart = start + 1;
        const elem = this.startNodeAt(createPositionWithColumnOffset(startLoc, 1));
        if (value === null) {
            if (!isTagged) {
                this.raise(Errors.InvalidEscapeSequenceTemplate, 
                // FIXME: Adding 1 is probably wrong.
                createPositionWithColumnOffset(this.state.firstInvalidTemplateEscapePos, 1));
            }
        }
        const isTail = this.match(tt.templateTail);
        const endOffset = isTail ? -1 : -2;
        const elemEnd = end + endOffset;
        elem.value = {
            raw: this.input.slice(elemStart, elemEnd).replace(/\r\n?/g, "\n"),
            cooked: value === null ? null : value.slice(1, endOffset),
        };
        elem.tail = isTail;
        this.next();
        const finishedNode = this.finishNode(elem, "TemplateElement");
        this.resetEndLocation(finishedNode, createPositionWithColumnOffset(this.state.lastTokEndLoc, endOffset));
        return finishedNode;
    }
    // https://tc39.es/ecma262/#prod-TemplateLiteral
    parseTemplate(isTagged) {
        const node = this.startNode();
        node.expressions = [];
        let curElt = this.parseTemplateElement(isTagged);
        node.quasis = [curElt];
        while (!curElt.tail) {
            node.expressions.push(this.parseTemplateSubstitution());
            this.readTemplateContinuation();
            node.quasis.push((curElt = this.parseTemplateElement(isTagged)));
        }
        return this.finishNode(node, "TemplateLiteral");
    }
    // This is overwritten by the TypeScript plugin to parse template types
    parseTemplateSubstitution() {
        return this.parseExpression();
    }
    parseObjectLike(close, isPattern, isRecord, refExpressionErrors) {
        if (isRecord) {
            this.expectPlugin("recordAndTuple");
        }
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = false;
        const propHash = Object.create(null);
        let first = true;
        const node = this.startNode();
        node.properties = [];
        this.next();
        while (!this.match(close)) {
            if (first) {
                first = false;
            }
            else {
                this.expect(tt.comma);
                if (this.match(close)) {
                    this.addTrailingCommaExtraToNode(
                    // @ts-expect-error todo(flow->ts) improve node types
                    node);
                    break;
                }
            }
            let prop;
            if (isPattern) {
                prop = this.parseBindingProperty();
            }
            else {
                prop = this.parsePropertyDefinition(refExpressionErrors);
                this.checkProto(prop, isRecord, propHash, refExpressionErrors);
            }
            if (isRecord &&
                !this.isObjectProperty(prop) &&
                prop.type !== "SpreadElement") {
                this.raise(Errors.InvalidRecordProperty, prop);
            }
            // @ts-expect-error shorthand may not index prop
            if (prop.shorthand) {
                this.addExtra(prop, "shorthand", true);
            }
            // @ts-expect-error Fixme: refine typings
            node.properties.push(prop);
        }
        this.next();
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        let type = "ObjectExpression";
        if (isPattern) {
            type = "ObjectPattern";
        }
        else if (isRecord) {
            type = "RecordExpression";
        }
        // @ts-expect-error type is well defined
        return this.finishNode(node, type);
    }
    addTrailingCommaExtraToNode(node) {
        this.addExtra(node, "trailingComma", this.state.lastTokStartLoc.index);
        this.addExtra(node, "trailingCommaLoc", this.state.lastTokStartLoc, false);
    }
    // Check grammar production:
    //   IdentifierName *_opt PropertyName
    // It is used in `parsePropertyDefinition` to detect AsyncMethod and Accessors
    maybeAsyncOrAccessorProp(prop) {
        return (!prop.computed &&
            prop.key.type === "Identifier" &&
            (this.isLiteralPropertyName() ||
                this.match(tt.bracketL) ||
                this.match(tt.star)));
    }
    // https://tc39.es/ecma262/#prod-PropertyDefinition
    parsePropertyDefinition(refExpressionErrors) {
        let decorators = [];
        if (this.match(tt.at)) {
            if (this.hasPlugin("decorators")) {
                this.raise(Errors.UnsupportedPropertyDecorator, this.state.startLoc);
            }
            // we needn't check if decorators (stage 0) plugin is enabled since it's checked by
            // the call to this.parseDecorator
            while (this.match(tt.at)) {
                decorators.push(this.parseDecorator());
            }
        }
        const prop = this.startNode();
        let isAsync = false;
        let isAccessor = false;
        let startLoc;
        if (this.match(tt.ellipsis)) {
            if (decorators.length)
                this.unexpected();
            return this.parseSpread();
        }
        if (decorators.length) {
            prop.decorators = decorators;
            decorators = [];
        }
        prop.method = false;
        if (refExpressionErrors) {
            startLoc = this.state.startLoc;
        }
        let isGenerator = this.eat(tt.star);
        this.parsePropertyNamePrefixOperator(prop);
        const containsEsc = this.state.containsEsc;
        const key = this.parsePropertyName(prop, refExpressionErrors);
        if (!isGenerator && !containsEsc && this.maybeAsyncOrAccessorProp(prop)) {
            const keyName = key.name;
            // https://tc39.es/ecma262/#prod-AsyncMethod
            // https://tc39.es/ecma262/#prod-AsyncGeneratorMethod
            if (keyName === "async" && !this.hasPrecedingLineBreak()) {
                isAsync = true;
                this.resetPreviousNodeTrailingComments(key);
                isGenerator = this.eat(tt.star);
                this.parsePropertyName(prop);
            }
            // get PropertyName[?Yield, ?Await] () { FunctionBody[~Yield, ~Await] }
            // set PropertyName[?Yield, ?Await] ( PropertySetParameterList ) { FunctionBody[~Yield, ~Await] }
            if (keyName === "get" || keyName === "set") {
                isAccessor = true;
                this.resetPreviousNodeTrailingComments(key);
                prop.kind = keyName;
                if (this.match(tt.star)) {
                    isGenerator = true;
                    this.raise(Errors.AccessorIsGenerator, this.state.curPosition(), {
                        kind: keyName,
                    });
                    this.next();
                }
                this.parsePropertyName(prop);
            }
        }
        return this.parseObjPropValue(prop, startLoc, isGenerator, isAsync, false /* isPattern */, isAccessor, refExpressionErrors);
    }
    getGetterSetterExpectedParamCount(method) {
        return method.kind === "get" ? 0 : 1;
    }
    // This exists so we can override within the ESTree plugin
    getObjectOrClassMethodParams(method) {
        return method.params;
    }
    // get methods aren't allowed to have any parameters
    // set methods must have exactly 1 parameter which is not a rest parameter
    checkGetterSetterParams(method) {
        const paramCount = this.getGetterSetterExpectedParamCount(method);
        const params = this.getObjectOrClassMethodParams(method);
        if (params.length !== paramCount) {
            this.raise(method.kind === "get" ? Errors.BadGetterArity : Errors.BadSetterArity, method);
        }
        if (method.kind === "set" &&
            params[params.length - 1]?.type === "RestElement") {
            this.raise(Errors.BadSetterRestParameter, method);
        }
    }
    // https://tc39.es/ecma262/#prod-MethodDefinition
    parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor) {
        if (isAccessor) {
            // isAccessor implies isAsync: false, isPattern: false, isGenerator: false
            const finishedProp = this.parseMethod(prop, 
            // This _should_ be false, but with error recovery, we allow it to be
            // set for informational purposes
            isGenerator, 
            /* isAsync */ false, 
            /* isConstructor */ false, false, "ObjectMethod");
            this.checkGetterSetterParams(finishedProp);
            return finishedProp;
        }
        if (isAsync || isGenerator || this.match(tt.parenL)) {
            if (isPattern)
                this.unexpected();
            prop.kind = "method";
            prop.method = true;
            return this.parseMethod(prop, isGenerator, isAsync, 
            /* isConstructor */ false, false, "ObjectMethod");
        }
    }
    // if `isPattern` is true, parse https://tc39.es/ecma262/#prod-BindingProperty
    // else https://tc39.es/ecma262/#prod-PropertyDefinition
    parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors) {
        prop.shorthand = false;
        if (this.eat(tt.colon)) {
            prop.value = isPattern
                ? this.parseMaybeDefault(this.state.startLoc)
                : this.parseMaybeAssignAllowIn(refExpressionErrors);
            return this.finishNode(prop, "ObjectProperty");
        }
        if (!prop.computed && prop.key.type === "Identifier") {
            // PropertyDefinition:
            //   IdentifierReference
            //   CoverInitializedName
            // Note: `{ eval } = {}` will be checked in `checkLVal` later.
            this.checkReservedWord(prop.key.name, prop.key.loc.start, true, false);
            if (isPattern) {
                prop.value = this.parseMaybeDefault(startLoc, cloneIdentifier(prop.key));
            }
            else if (this.match(tt.eq)) {
                const shorthandAssignLoc = this.state.startLoc;
                if (refExpressionErrors != null) {
                    if (refExpressionErrors.shorthandAssignLoc === null) {
                        refExpressionErrors.shorthandAssignLoc = shorthandAssignLoc;
                    }
                }
                else {
                    this.raise(Errors.InvalidCoverInitializedName, shorthandAssignLoc);
                }
                prop.value = this.parseMaybeDefault(startLoc, cloneIdentifier(prop.key));
            }
            else {
                prop.value = cloneIdentifier(prop.key);
            }
            prop.shorthand = true;
            return this.finishNode(prop, "ObjectProperty");
        }
    }
    parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
        const node = this.parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor) ||
            this.parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors);
        if (!node)
            this.unexpected();
        return node;
    }
    // https://tc39.es/ecma262/#prod-PropertyName
    // when refExpressionErrors presents, it will parse private name
    // and record the position of the first private name
    parsePropertyName(prop, refExpressionErrors) {
        if (this.eat(tt.bracketL)) {
            prop.computed = true;
            prop.key = this.parseMaybeAssignAllowIn();
            this.expect(tt.bracketR);
        }
        else {
            // We check if it's valid for it to be a private name when we push it.
            const { type, value } = this.state;
            let key;
            // most un-computed property names are identifiers
            if (tokenIsKeywordOrIdentifier(type)) {
                key = this.parseIdentifier(true);
            }
            else {
                switch (type) {
                    case tt.num:
                        key = this.parseNumericLiteral(value);
                        break;
                    case tt.string:
                        key = this.parseStringLiteral(value);
                        break;
                    case tt.bigint:
                        key = this.parseBigIntLiteral(value);
                        break;
                    case tt.decimal:
                        key = this.parseDecimalLiteral(value);
                        break;
                    case tt.privateName: {
                        // the class private key has been handled in parseClassElementName
                        const privateKeyLoc = this.state.startLoc;
                        if (refExpressionErrors != null) {
                            if (refExpressionErrors.privateKeyLoc === null) {
                                refExpressionErrors.privateKeyLoc = privateKeyLoc;
                            }
                        }
                        else {
                            this.raise(Errors.UnexpectedPrivateField, privateKeyLoc);
                        }
                        key = this.parsePrivateName();
                        break;
                    }
                    default:
                        this.unexpected();
                }
            }
            prop.key = key;
            if (type !== tt.privateName) {
                // ClassPrivateProperty is never computed, so we don't assign in that case.
                prop.computed = false;
            }
        }
        return prop.key;
    }
    // Initialize empty function node.
    initFunction(node, isAsync) {
        node.id = null;
        node.generator = false;
        node.async = isAsync;
    }
    // Parse object or class method.
    parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope = false) {
        this.initFunction(node, isAsync);
        node.generator = isGenerator;
        this.scope.enter(ScopeFlag.FUNCTION |
            ScopeFlag.SUPER |
            (inClassScope ? ScopeFlag.CLASS : 0) |
            (allowDirectSuper ? ScopeFlag.DIRECT_SUPER : 0));
        this.prodParam.enter(functionFlags(isAsync, node.generator));
        this.parseFunctionParams(node, isConstructor);
        const finishedNode = this.parseFunctionBodyAndFinish(node, type, true);
        this.prodParam.exit();
        this.scope.exit();
        return finishedNode;
    }
    // parse an array literal or tuple literal
    // https://tc39.es/ecma262/#prod-ArrayLiteral
    // https://tc39.es/proposal-record-tuple/#prod-TupleLiteral
    parseArrayLike(close, canBePattern, isTuple, refExpressionErrors) {
        if (isTuple) {
            this.expectPlugin("recordAndTuple");
        }
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = false;
        const node = this.startNode();
        this.next();
        node.elements = this.parseExprList(close, 
        /* allowEmpty */ !isTuple, refExpressionErrors, 
        // @ts-expect-error todo(flow->ts)
        node);
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        return this.finishNode(node, isTuple ? "TupleExpression" : "ArrayExpression");
    }
    // Parse arrow function expression.
    // If the parameters are provided, they will be converted to an
    // assignable list.
    parseArrowExpression(node, params, isAsync, trailingCommaLoc) {
        this.scope.enter(ScopeFlag.FUNCTION | ScopeFlag.ARROW);
        let flags = functionFlags(isAsync, false);
        // ConciseBody[In] :
        //   [lookahead ≠ {] ExpressionBody[?In, ~Await]
        //   { FunctionBody[~Yield, ~Await] }
        if (!this.match(tt.braceL) && this.prodParam.hasIn) {
            flags |= ParamKind.PARAM_IN;
        }
        this.prodParam.enter(flags);
        this.initFunction(node, isAsync);
        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        if (params) {
            this.state.maybeInArrowParameters = true;
            this.setArrowFunctionParameters(node, params, trailingCommaLoc);
        }
        this.state.maybeInArrowParameters = false;
        this.parseFunctionBody(node, true);
        this.prodParam.exit();
        this.scope.exit();
        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        return this.finishNode(node, "ArrowFunctionExpression");
    }
    setArrowFunctionParameters(node, params, trailingCommaLoc) {
        this.toAssignableList(params, trailingCommaLoc, false);
        node.params = params;
    }
    parseFunctionBodyAndFinish(node, type, isMethod = false) {
        // @ts-expect-error (node is not bodiless if we get here)
        this.parseFunctionBody(node, false, isMethod);
        return this.finishNode(node, type);
    }
    // Parse function body and check parameters.
    parseFunctionBody(node, allowExpression, isMethod = false) {
        const isExpression = allowExpression && !this.match(tt.braceL);
        this.expressionScope.enter(newExpressionScope());
        if (isExpression) {
            // https://tc39.es/ecma262/#prod-ExpressionBody
            node.body =
                this.parseMaybeAssign();
            this.checkParams(node, false, allowExpression, false);
        }
        else {
            const oldStrict = this.state.strict;
            // Start a new scope with regard to labels
            // flag (restore them to their old value afterwards).
            const oldLabels = this.state.labels;
            this.state.labels = [];
            // FunctionBody[Yield, Await]:
            //   StatementList[?Yield, ?Await, +Return] opt
            this.prodParam.enter(this.prodParam.currentFlags() | ParamKind.PARAM_RETURN);
            node.body = this.parseBlock(true, false, 
            // Strict mode function checks after we parse the statements in the function body.
            (hasStrictModeDirective) => {
                const nonSimple = !this.isSimpleParamList(node.params);
                if (hasStrictModeDirective && nonSimple) {
                    // This logic is here to align the error location with the ESTree plugin.
                    this.raise(Errors.IllegalLanguageModeDirective, 
                    // @ts-expect-error kind may not index node
                    (node.kind === "method" || node.kind === "constructor") &&
                        // @ts-expect-error key may not index node
                        !!node.key
                        ? // @ts-expect-error node.key has been guarded
                            node.key.loc.end
                        : node);
                }
                const strictModeChanged = !oldStrict && this.state.strict;
                // Add the params to varDeclaredNames to ensure that an error is thrown
                // if a let/const declaration in the function clashes with one of the params.
                this.checkParams(node, !this.state.strict && !allowExpression && !isMethod && !nonSimple, allowExpression, strictModeChanged);
                // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
                if (this.state.strict && node.id) {
                    this.checkIdentifier(node.id, BindingFlag.TYPE_OUTSIDE, strictModeChanged);
                }
            });
            this.prodParam.exit();
            this.state.labels = oldLabels;
        }
        this.expressionScope.exit();
    }
    isSimpleParameter(node) {
        return node.type === "Identifier";
    }
    isSimpleParamList(params) {
        for (let i = 0, len = params.length; i < len; i++) {
            if (!this.isSimpleParameter(params[i]))
                return false;
        }
        return true;
    }
    checkParams(node, allowDuplicates, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isArrowFunction, strictModeChanged = true) {
        const checkClashes = !allowDuplicates && new Set();
        // We create a fake node with the "ephemeral" type `FormalParameters`[1]
        // since we just store an array of parameters. Perhaps someday we can have
        // something like class FormalParameters extends Array { ... }, which would
        // also be helpful when traversing this node.
        //
        // 1. https://tc39.es/ecma262/#prod-FormalParameters
        const formalParameters = { type: "FormalParameters" };
        for (const param of node.params) {
            this.checkLVal(param, {
                in: formalParameters,
                binding: BindingFlag.TYPE_VAR,
                checkClashes,
                strictModeChanged,
            });
        }
    }
    // Parses a comma-separated list of expressions, and returns them as
    // an array. `close` is the token type that ends the list, and
    // `allowEmpty` can be turned on to allow subsequent commas with
    // nothing in between them to be parsed as `null` (which is needed
    // for array literals).
    parseExprList(close, allowEmpty, refExpressionErrors, nodeForExtra) {
        const elts = [];
        let first = true;
        while (!this.eat(close)) {
            if (first) {
                first = false;
            }
            else {
                this.expect(tt.comma);
                if (this.match(close)) {
                    if (nodeForExtra) {
                        this.addTrailingCommaExtraToNode(nodeForExtra);
                    }
                    this.next();
                    break;
                }
            }
            elts.push(this.parseExprListItem(allowEmpty, refExpressionErrors));
        }
        return elts;
    }
    parseExprListItem(allowEmpty, refExpressionErrors, allowPlaceholder) {
        let elt;
        if (this.match(tt.comma)) {
            if (!allowEmpty) {
                this.raise(Errors.UnexpectedToken, this.state.curPosition(), {
                    unexpected: ",",
                });
            }
            elt = null;
        }
        else if (this.match(tt.ellipsis)) {
            const spreadNodeStartLoc = this.state.startLoc;
            elt = this.parseParenItem(this.parseSpread(refExpressionErrors), spreadNodeStartLoc);
        }
        else if (this.match(tt.question)) {
            this.expectPlugin("partialApplication");
            if (!allowPlaceholder) {
                this.raise(Errors.UnexpectedArgumentPlaceholder, this.state.startLoc);
            }
            const node = this.startNode();
            this.next();
            elt = this.finishNode(node, "ArgumentPlaceholder");
        }
        else {
            elt = this.parseMaybeAssignAllowIn(refExpressionErrors, this.parseParenItem);
        }
        return elt;
    }
    // Parse the next token as an identifier. If `liberal` is true (used
    // when parsing properties), it will also convert keywords into
    // identifiers.
    // This shouldn't be used to parse the keywords of meta properties, since they
    // are not identifiers and cannot contain escape sequences.
    parseIdentifier(liberal) {
        const node = this.startNode();
        const name = this.parseIdentifierName(liberal);
        return this.createIdentifier(node, name);
    }
    createIdentifier(node, name) {
        node.name = name;
        node.loc.identifierName = name;
        return this.finishNode(node, "Identifier");
    }
    parseIdentifierName(liberal) {
        let name;
        const { startLoc, type } = this.state;
        if (tokenIsKeywordOrIdentifier(type)) {
            name = this.state.value;
        }
        else {
            this.unexpected();
        }
        const tokenIsKeyword = tokenKeywordOrIdentifierIsKeyword(type);
        if (liberal) {
            // If the current token is not used as a keyword, set its type to "tt.name".
            // This will prevent this.next() from throwing about unexpected escapes.
            if (tokenIsKeyword) {
                this.replaceToken(tt.name);
            }
        }
        else {
            this.checkReservedWord(name, startLoc, tokenIsKeyword, false);
        }
        this.next();
        return name;
    }
    checkReservedWord(word, startLoc, checkKeywords, isBinding) {
        // Every JavaScript reserved word is 10 characters or less.
        if (word.length > 10) {
            return;
        }
        // Most identifiers are not reservedWord-like, they don't need special
        // treatments afterward, which very likely ends up throwing errors
        if (!canBeReservedWord(word)) {
            return;
        }
        if (checkKeywords && isKeyword(word)) {
            this.raise(Errors.UnexpectedKeyword, startLoc, {
                keyword: word,
            });
            return;
        }
        const reservedTest = !this.state.strict
            ? isReservedWord
            : isBinding
                ? isStrictBindReservedWord
                : isStrictReservedWord;
        if (reservedTest(word, this.inModule)) {
            this.raise(Errors.UnexpectedReservedWord, startLoc, {
                reservedWord: word,
            });
            return;
        }
        else if (word === "yield") {
            if (this.prodParam.hasYield) {
                this.raise(Errors.YieldBindingIdentifier, startLoc);
                return;
            }
        }
        else if (word === "await") {
            if (this.prodParam.hasAwait) {
                this.raise(Errors.AwaitBindingIdentifier, startLoc);
                return;
            }
            if (this.scope.inStaticBlock) {
                this.raise(Errors.AwaitBindingIdentifierInStaticBlock, startLoc);
                return;
            }
            this.expressionScope.recordAsyncArrowParametersError(startLoc);
        }
        else if (word === "arguments") {
            if (this.scope.inClassAndNotInNonArrowFunction) {
                this.raise(Errors.ArgumentsInClass, startLoc);
                return;
            }
        }
    }
    isAwaitAllowed() {
        if (this.prodParam.hasAwait)
            return true;
        if (this.options.allowAwaitOutsideFunction && !this.scope.inFunction) {
            return true;
        }
        return false;
    }
    // Parses await expression inside async function.
    parseAwait(startLoc) {
        const node = this.startNodeAt(startLoc);
        this.expressionScope.recordParameterInitializerError(Errors.AwaitExpressionFormalParameter, 
        // @ts-expect-error todo(flow->ts)
        node);
        if (this.eat(tt.star)) {
            this.raise(Errors.ObsoleteAwaitStar, node);
        }
        if (!this.scope.inFunction && !this.options.allowAwaitOutsideFunction) {
            if (this.isAmbiguousAwait()) {
                this.ambiguousScriptDifferentAst = true;
            }
            else {
                this.sawUnambiguousESM = true;
            }
        }
        if (!this.state.soloAwait) {
            node.argument = this.parseMaybeUnary(null, true);
        }
        return this.finishNode(node, "AwaitExpression");
    }
    isAmbiguousAwait() {
        if (this.hasPrecedingLineBreak())
            return true;
        const { type } = this.state;
        return (
        // All the following expressions are ambiguous:
        //   await + 0, await - 0, await ( 0 ), await [ 0 ], await / 0 /u, await ``, await of []
        type === tt.plusMin ||
            type === tt.parenL ||
            type === tt.bracketL ||
            tokenIsTemplate(type) ||
            (type === tt._of && !this.state.containsEsc) ||
            // Sometimes the tokenizer generates tt.slash for regexps, and this is
            // handler by parseExprAtom
            type === tt.regexp ||
            type === tt.slash ||
            // This code could be parsed both as a modulo operator or as an intrinsic:
            //   await %x(0)
            (this.hasPlugin("v8intrinsic") && type === tt.modulo));
    }
    // Parses yield expression inside generator.
    parseYield() {
        const node = this.startNode();
        this.expressionScope.recordParameterInitializerError(Errors.YieldInParameter, 
        // @ts-expect-error todo(flow->ts)
        node);
        this.next();
        let delegating = false;
        let argument = null;
        if (!this.hasPrecedingLineBreak()) {
            delegating = this.eat(tt.star);
            switch (this.state.type) {
                case tt.semi:
                case tt.eof:
                case tt.braceR:
                case tt.parenR:
                case tt.bracketR:
                case tt.braceBarR:
                case tt.colon:
                case tt.comma:
                    // The above is the complete set of tokens that can
                    // follow an AssignmentExpression, and none of them
                    // can start an AssignmentExpression
                    if (!delegating)
                        break;
                /* fallthrough */
                default:
                    argument = this.parseMaybeAssign();
            }
        }
        node.delegate = delegating;
        node.argument = argument;
        return this.finishNode(node, "YieldExpression");
    }
    // https://tc39.es/ecma262/#prod-ImportCall
    parseImportCall(node) {
        this.next(); // eat tt.parenL
        node.source = this.parseMaybeAssignAllowIn();
        if (this.hasPlugin("importAttributes") ||
            this.hasPlugin("importAssertions")) {
            node.options = null;
        }
        if (this.eat(tt.comma)) {
            this.expectImportAttributesPlugin();
            if (!this.match(tt.parenR)) {
                node.options = this.parseMaybeAssignAllowIn();
                this.eat(tt.comma);
            }
        }
        this.expect(tt.parenR);
        return this.finishNode(node, "ImportExpression");
    }
    // Validates a pipeline (for any of the pipeline Babylon plugins) at the point
    // of the infix operator `|>`.
    checkPipelineAtInfixOperator(left, leftStartLoc) {
        if (this.hasPlugin(["pipelineOperator", { proposal: "smart" }])) {
            if (left.type === "SequenceExpression") {
                // Ensure that the pipeline head is not a comma-delimited
                // sequence expression.
                this.raise(Errors.PipelineHeadSequenceExpression, leftStartLoc);
            }
        }
    }
    parseSmartPipelineBodyInStyle(childExpr, startLoc) {
        if (this.isSimpleReference(childExpr)) {
            const bodyNode = this.startNodeAt(startLoc);
            bodyNode.callee = childExpr;
            return this.finishNode(bodyNode, "PipelineBareFunction");
        }
        else {
            const bodyNode = this.startNodeAt(startLoc);
            this.checkSmartPipeTopicBodyEarlyErrors(startLoc);
            bodyNode.expression = childExpr;
            return this.finishNode(bodyNode, "PipelineTopicExpression");
        }
    }
    isSimpleReference(expression) {
        switch (expression.type) {
            case "MemberExpression":
                return (!expression.computed && this.isSimpleReference(expression.object));
            case "Identifier":
                return true;
            default:
                return false;
        }
    }
    // This helper method is to be called immediately
    // after a topic-style smart-mix pipe body is parsed.
    // The `startLoc` is the starting position of the pipe body.
    checkSmartPipeTopicBodyEarlyErrors(startLoc) {
        // If the following token is invalidly `=>`, then throw a human-friendly error
        // instead of something like 'Unexpected token, expected ";"'.
        // For example, `x => x |> y => #` (assuming `#` is the topic reference)
        // groups into `x => (x |> y) => #`,
        // and `(x |> y) => #` is an invalid arrow function.
        // This is because smart-mix `|>` has tighter precedence than `=>`.
        if (this.match(tt.arrow)) {
            throw this.raise(Errors.PipelineBodyNoArrow, this.state.startLoc);
        }
        // A topic-style smart-mix pipe body must use the topic reference at least once.
        if (!this.topicReferenceWasUsedInCurrentContext()) {
            this.raise(Errors.PipelineTopicUnused, startLoc);
        }
    }
    // Enable topic references from outer contexts within Hack-style pipe bodies.
    // The function modifies the parser's topic-context state to enable or disable
    // the use of topic references.
    // The function then calls a callback, then resets the parser
    // to the old topic-context state that it had before the function was called.
    withTopicBindingContext(callback) {
        const outerContextTopicState = this.state.topicContext;
        this.state.topicContext = {
            // Enable the use of the primary topic reference.
            maxNumOfResolvableTopics: 1,
            // Hide the use of any topic references from outer contexts.
            maxTopicIndex: null,
        };
        try {
            return callback();
        }
        finally {
            this.state.topicContext = outerContextTopicState;
        }
    }
    // This helper method is used only with the deprecated smart-mix pipe proposal.
    // Disables topic references from outer contexts within syntax constructs
    // such as the bodies of iteration statements.
    // The function modifies the parser's topic-context state to enable or disable
    // the use of topic references with the smartPipelines plugin. They then run a
    // callback, then they reset the parser to the old topic-context state that it
    // had before the function was called.
    withSmartMixTopicForbiddingContext(callback) {
        if (this.hasPlugin(["pipelineOperator", { proposal: "smart" }])) {
            // Reset the parser’s topic context only if the smart-mix pipe proposal is active.
            const outerContextTopicState = this.state.topicContext;
            this.state.topicContext = {
                // Disable the use of the primary topic reference.
                maxNumOfResolvableTopics: 0,
                // Hide the use of any topic references from outer contexts.
                maxTopicIndex: null,
            };
            try {
                return callback();
            }
            finally {
                this.state.topicContext = outerContextTopicState;
            }
        }
        else {
            // If the pipe proposal is "minimal", "fsharp", or "hack",
            // or if no pipe proposal is active,
            // then the callback result is returned
            // without touching any extra parser state.
            return callback();
        }
    }
    withSoloAwaitPermittingContext(callback) {
        const outerContextSoloAwaitState = this.state.soloAwait;
        this.state.soloAwait = true;
        try {
            return callback();
        }
        finally {
            this.state.soloAwait = outerContextSoloAwaitState;
        }
    }
    allowInAnd(callback) {
        const flags = this.prodParam.currentFlags();
        const prodParamToSet = ParamKind.PARAM_IN & ~flags;
        if (prodParamToSet) {
            this.prodParam.enter(flags | ParamKind.PARAM_IN);
            try {
                return callback();
            }
            finally {
                this.prodParam.exit();
            }
        }
        return callback();
    }
    disallowInAnd(callback) {
        const flags = this.prodParam.currentFlags();
        const prodParamToClear = ParamKind.PARAM_IN & flags;
        if (prodParamToClear) {
            this.prodParam.enter(flags & ~ParamKind.PARAM_IN);
            try {
                return callback();
            }
            finally {
                this.prodParam.exit();
            }
        }
        return callback();
    }
    // Register the use of a topic reference within the current
    // topic-binding context.
    registerTopicReference() {
        this.state.topicContext.maxTopicIndex = 0;
    }
    topicReferenceIsAllowedInCurrentContext() {
        return this.state.topicContext.maxNumOfResolvableTopics >= 1;
    }
    topicReferenceWasUsedInCurrentContext() {
        return (this.state.topicContext.maxTopicIndex != null &&
            this.state.topicContext.maxTopicIndex >= 0);
    }
    parseFSharpPipelineBody(prec) {
        const startLoc = this.state.startLoc;
        this.state.potentialArrowAt = this.state.start;
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = true;
        const ret = this.parseExprOp(this.parseMaybeUnaryOrPrivate(), startLoc, prec);
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        return ret;
    }
    // https://github.com/tc39/proposal-js-module-blocks
    parseModuleExpression() {
        this.expectPlugin("moduleBlocks");
        const node = this.startNode();
        this.next(); // eat "module"
        if (!this.match(tt.braceL)) {
            this.unexpected(null, tt.braceL);
        }
        // start program node immediately after `{`
        const program = this.startNodeAt(this.state.endLoc);
        this.next(); // eat `{`
        const revertScopes = this.initializeScopes(/** inModule */ true);
        this.enterInitialScopes();
        try {
            node.body = this.parseProgram(program, tt.braceR, "module");
        }
        finally {
            revertScopes();
        }
        return this.finishNode(node, "ModuleExpression");
    }
    // Used in Flow plugin
    parsePropertyNamePrefixOperator(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prop) { }
}
