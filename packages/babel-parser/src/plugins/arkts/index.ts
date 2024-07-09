import type typescript from "../typescript/index.ts";
import type { ParseStatementFlag } from "../../parser/statement.ts";
import type * as N from "../../types.ts";
import { tt } from "../../tokenizer/types.ts";
import type { Undone } from "../../parser/node.ts";
import { cloneIdentifier } from "../../parser/node.ts";
import { ScopeFlag } from "../../util/scopeflags.ts";
import type Parser from "../../parser";
import { Errors } from "../../parse-error.ts";
import type { ExpressionErrors } from "../../parser/util.ts";
import type { Position } from "../../util/location.ts";

const enum ArkTSParseContext {
  TOP_FIRST,
  TOP,
  CLOSURE,
}

export default (superClass: ReturnType<typeof typescript>) =>
  class ArkTSParserMixin extends superClass {
    // Assuming ArkTS struct cannot be nested
    declare inStructContext: boolean;
    declare inForEach: boolean;
    declare inLazyForeach: boolean;
    declare inBuilderFunction: boolean;
    declare inExtendFunction: boolean;
    declare ExtendComponent: N.Node;
    declare inStylesFunction: boolean;

    // Only change super method's signature to additional allow ArkTS decoratable entities to be decorated
    maybeTakeDecorators<T extends Undone<N.ArkTSDecoratable>>(
      maybeDecorators: N.Decorator[] | null,
      node: T,
      exportNode?: Undone<
        N.ExportDefaultDeclaration | N.ExportNamedDeclaration
      >,
    ): T {
      return super.maybeTakeDecorators(
        maybeDecorators,
        node as Undone<N.Class>,
        exportNode,
      ) as T;
    }

    // ==================================
    // Overrides
    // ==================================

    canHaveLeadingDecorator(): boolean {
      return (
        super.canHaveLeadingDecorator() ||
        // ArkTS struct can have decorators
        this.match(tt._struct) ||
        // ArkTS top-level function can have decorators (that change the function body lexical environment
        this.match(tt._function)
      );
    }

    parseStatementContent(
      flags: ParseStatementFlag,
      decorators?: N.Decorator[] | null,
    ): N.Statement {
      if (this.isContextual(tt._struct)) {
        return this.arktsParseStruct(
          this.maybeTakeDecorators(
            decorators,
            // Since we don't want to modify the original method signature (which was designed exclusively for classes),
            // we have to cast the return type to the expected type.
            this.startNode<N.ArkTSStructDeclaration>(),
          ),
        );
      }
      return super.parseStatementContent(flags, decorators);
    }

    arktsParseStruct(
      node: Undone<N.ArkTSStructDeclaration>,
    ): N.ArkTSStructDeclaration {
      this.next();

      node.id = this.parseIdentifier();

      this.inStructContext = true;

      node.body = this.parseClassBody(false, true);
      this.inStructContext = false;

      return this.finishNode(node, "ArkTSStructDeclaration");
    }
    parseImport(
      this: Parser,
      node: Undone<N.ArkTSImportDeclaration>,
    ): N.AnyImport {
      if (this.match(tt.string)) {
        // import '...'
        return this.parseImportSourceAndAttributes(node);
      }
      return this.parseImportSpecifiersAndAfter(
        node,
        this.parseMaybeImportPhase(node, /* isExport */ false),
      );
    }
    parseObjectProperty(
      this: Parser,
      prop: Undone<N.ObjectProperty>,
      startLoc: Position | undefined | null,
      isPattern: boolean,
      refExpressionErrors?: ExpressionErrors | null,
    ): N.ObjectProperty | undefined | null {
      prop.shorthand = false;

      if (this.eat(tt.colon)) {
        let f = false;
        if (this.eat(tt.braceL)) {
          if (!this.eat(tt.dot)) {
            this.raise(Errors.UnexpectedToken, this.state.curPosition(), {
              unexpected: ".",
            });
          }
          f = true;
        }
        prop.value = isPattern
          ? this.parseMaybeDefault(this.state.startLoc)
          : this.parseMaybeAssignAllowIn(refExpressionErrors);
        if (f) {
          this.eat(tt.braceR);
        }
        return this.finishNode(prop, "ObjectProperty");
      }

      if (!prop.computed && prop.key.type === "Identifier") {
        // PropertyDefinition:
        //   IdentifierReference
        //   CoverInitializedName
        // Note: `{ eval } = {}` will be checked in `checkLVal` later.
        this.checkReservedWord(prop.key.name, prop.key.loc.start, true, false);

        if (isPattern) {
          prop.value = this.parseMaybeDefault(
            startLoc,
            cloneIdentifier(prop.key),
          );
        } else if (this.match(tt.eq)) {
          const shorthandAssignLoc = this.state.startLoc;
          if (refExpressionErrors != null) {
            if (refExpressionErrors.shorthandAssignLoc === null) {
              refExpressionErrors.shorthandAssignLoc = shorthandAssignLoc;
            }
          } else {
            this.raise(Errors.InvalidCoverInitializedName, shorthandAssignLoc);
          }
          prop.value = this.parseMaybeDefault(
            startLoc,
            cloneIdentifier(prop.key),
          );
        } else {
          prop.value = cloneIdentifier(prop.key);
        }
        prop.shorthand = true;

        return this.finishNode(prop, "ObjectProperty");
      }
    }
    parseDecorator(this: Parser): N.Decorator {
      this.expectOnePlugin(["decorators", "decorators-legacy"]);

      const node = this.startNode<N.Decorator>();
      this.next();

      if (this.hasPlugin("decorators")) {
        const startLoc = this.state.startLoc;
        let expr: N.Expression;

        if (this.match(tt.parenL)) {
          const startLoc = this.state.startLoc;
          this.next(); // eat '('
          expr = this.parseExpression();
          this.expect(tt.parenR);
          expr = this.wrapParenthesis(startLoc, expr);
          const paramsStartLoc = this.state.startLoc;
          node.expression = this.parseMaybeDecoratorArguments(expr);
          if (
            this.getPluginOption("decorators", "allowCallParenthesized") ===
              false &&
            node.expression !== expr
          ) {
            this.raise(
              Errors.DecoratorArgumentsOutsideParentheses,
              paramsStartLoc,
            );
          }
        } else {
          expr = this.parseIdentifier(false);

          while (this.eat(tt.dot)) {
            const node = this.startNodeAt(startLoc);
            node.object = expr;
            if (this.match(tt.privateName)) {
              this.classScope.usePrivateName(
                this.state.value,
                this.state.startLoc,
              );
              node.property = this.parsePrivateName();
            } else {
              node.property = this.parseIdentifier(true);
            }
            node.computed = false;
            expr = this.finishNode(node, "MemberExpression");
          }

          node.expression = this.parseMaybeDecoratorArguments(expr);
        }
      }
      //have decorators plugin
      if (node.expression.name === "Builder") {
        this.inBuilderFunction = true;
        //To Delete
        // this.BuilderFunction++;
        // console.log(`Builder:${this.BuilderFunction}`);
      }
      if (node.expression.name === "Styles") {
        this.inStylesFunction = true;
        //To Delete
        // this.SytleFunction++;
        // console.log(`Style:${this.StyleFunction}`);
      }
      return this.finishNode(node, "Decorator");
    }
    parseMaybeDecoratorArguments(
      this: Parser,
      expr: N.Expression,
    ): N.Expression {
      if (this.eat(tt.parenL)) {
        const node = this.startNodeAtNode(expr);
        node.callee = expr;
        node.arguments = this.parseCallExpressionArguments(tt.parenR, false);
        this.toReferencedList(node.arguments);
        if (node.callee.name === "Extend") {
          this.inExtendFunction = true;
          this.ExtendComponent = node.arguments[0];
          //To Delete
          // this.ExtendFunction++;
          // console.log(`extend:${this.ExtendFunction}`);
        }
        return this.finishNode(node, "CallExpression");
      }

      return expr;
    }
    // Intercept the parsing of struct method `build`
    parseFunctionBody(
      node: Undone<N.Function>,
      allowExpression?: boolean | null,
      isMethod: boolean = false,
    ) {
      if (this.inStylesFunction) {
        const bodyNode = this.startNode<N.BlockStatement>();
        this.expect(tt.braceL);
        this.scope.enter(ScopeFlag.FUNCTION);

        // Theoretically the body of `build` can only be one element (a UIComponent call),
        // however for coherence with other function body parsing, we still parse it as an array.
        bodyNode.body = [];

        this.arktsParseExtendExpression(
          bodyNode,
          false,
          ArkTSParseContext.TOP_FIRST,
        );
        this.scope.exit();
        this.expect(tt.braceR);
        node.body = this.finishNode(bodyNode, "BlockStatement");
        return;
      }
      if (this.inExtendFunction && !this.inStructContext) {
        const bodyNode = this.startNode<N.BlockStatement>();
        this.expect(tt.braceL);
        this.scope.enter(ScopeFlag.FUNCTION);

        // Theoretically the body of `build` can only be one element (a UIComponent call),
        // however for coherence with other function body parsing, we still parse it as an array.
        bodyNode.body = [];

        this.arktsParseExtendExpression(
          bodyNode,
          false,
          ArkTSParseContext.TOP_FIRST,
        );
        this.scope.exit();
        this.expect(tt.braceR);
        node.body = this.finishNode(bodyNode, "BlockStatement");
        return;
      }
      if (this.inStructContext && this.inBuilderFunction) {
        this.inBuilderFunction = false;
        const bodyNode = this.startNode<N.BlockStatement>();
        this.expect(tt.braceL);
        this.scope.enter(ScopeFlag.FUNCTION);

        // Theoretically the body of `build` can only be one element (a UIComponent call),
        // however for coherence with other function body parsing, we still parse it as an array.
        bodyNode.body = [];

        this.arktsParseBuildExpression(
          bodyNode,
          false,
          ArkTSParseContext.TOP_FIRST,
        );
        this.scope.exit();
        this.expect(tt.braceR);
        node.body = this.finishNode(bodyNode, "BlockStatement");
        return;
      }
      if (!this.inStructContext && this.inBuilderFunction) {
        this.inBuilderFunction = false;
        const bodyNode = this.startNode<N.BlockStatement>();
        this.expect(tt.braceL);
        this.scope.enter(ScopeFlag.FUNCTION);

        // Theoretically the body of `build` can only be one element (a UIComponent call),
        // however for coherence with other function body parsing, we still parse it as an array.
        bodyNode.body = [];

        this.arktsParseBuildExpression(
          bodyNode,
          false,
          ArkTSParseContext.TOP_FIRST,
        );
        this.scope.exit();
        this.expect(tt.braceR);
        node.body = this.finishNode(bodyNode, "BlockStatement");
        return;
      }
      if (this.inStructContext && (this.inForEach || this.inLazyForeach)) {
        //foreach
        if (this.inForEach) this.inForEach = false; // to avoid 嵌套 Foreach
        else this.inLazyForeach = false;
        const bodyNode = this.startNode<N.BlockStatement>();
        this.expect(tt.braceL);
        this.scope.enter(ScopeFlag.FUNCTION || ScopeFlag.ARROW); //?

        // however for coherence with other function body parsing, we still parse it as an array.
        bodyNode.body = [];

        this.arktsParseForeachExpression(
          bodyNode,
          false,
          ArkTSParseContext.TOP_FIRST,
        );
        this.scope.exit();
        this.expect(tt.braceR);
        node.body = this.finishNode(bodyNode, "BlockStatement");
        return;
      }
      if (!this.inStructContext || node.key?.name !== "build") {
        super.parseFunctionBody(node, allowExpression, isMethod);
        return;
      }

      const bodyNode = this.startNode<N.BlockStatement>();
      this.expect(tt.braceL);
      this.scope.enter(ScopeFlag.FUNCTION);

      // Theoretically the body of `build` can only be one element (a UIComponent call),
      // however for coherence with other function body parsing, we still parse it as an array.
      bodyNode.body = [];

      this.arktsParseBuildExpression(
        bodyNode,
        false,
        ArkTSParseContext.TOP_FIRST,
      );
      this.scope.exit();
      this.expect(tt.braceR);
      node.body = this.finishNode(bodyNode, "BlockStatement");
    }

    /**
     * Possible first tokens:
     *
     * * `name` (identifier) - Function call (Also handle trailing closure)
     *
     * * `.` - Member expression
     *
     * * `(` - Call after member access
     */

    arktsParseBuildExpression(
      node?,
      allowMultipleExpressions: boolean,
      context: ArkTSParseContext,
    ) {
      //console.log(node);
      if (node === undefined) {
        return node;
      } else if (this.match(tt._this)) {
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }

        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const thisNode = this.startNode();
        this.next();
        this.finishNode(thisNode, "ThisExpression");

        const MemberNode = this.arktsParseBuildExpression(
          thisNode,
          allowMultipleExpressions,
          context,
        );

        const expNode = this.startNodeAtNode<N.ExpressionStatement>(MemberNode);
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = MemberNode;
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseBuildExpression(node, allowMultipleExpressions, context);
      } else if (this.match(tt.name)) {
        //             v
        // { A(){}.B() C() }
        // A new ExpressionStatement should start, but parameter `node` is not BlockStatement,
        // so we have to go back (by returning undefined) to where `node` is a BlockStatement.
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }

        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const callNode = this.startNode<N.ArkTSCallExpression>();
        callNode.callee = this.parseIdentifier();
        if (callNode.callee.name == "ForEach") {
          this.inForEach = true;
        }
        if (callNode.callee.name == "LazyForEach") this.inLazyForeach = true;
        this.expect(tt.parenL);
        callNode.arguments = this.parseCallExpressionArguments(tt.parenR);

        // Trailing closure
        const closureNode = this.startNode<N.BlockStatement>();
        closureNode.body = [];
        if (this.match(tt.braceL)) {
          callNode.trailingClosure = this.arktsParseBuildExpression(
            closureNode,
            true,
            ArkTSParseContext.CLOSURE,
          );
        }

        this.finishNode(callNode, "ArkTSCallExpression");

        // Below creates an ExpressionStatement that wraps CallExpression
        // This does not reject multiple calls at top level, which is invalid in ArkTS
        // but for extensibility reason, the rejection is done by previous if statement
        const expNode = this.startNodeAtNode<N.ExpressionStatement>(callNode);
        const maybeNode = this.arktsParseBuildExpression(
          callNode,
          allowMultipleExpressions,
          context,
        );
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = maybeNode ?? callNode;
        // console.log("in Name");
        // console.log(node);
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseBuildExpression(node, allowMultipleExpressions, context);
      } else if (this.eat(tt.dot)) {
        const memberNode = this.startNodeAtNode<N.MemberExpression>(node);
        memberNode.object = node;
        memberNode.property = this.parseIdentifier();
        this.finishNode(memberNode, "MemberExpression");
        if (node.type == "ThisExpression") {
          return memberNode;
        }
        // MemberExpression is for sure to be appended with CallExpression, or syntax error
        return this.arktsParseBuildExpression(
          memberNode,
          allowMultipleExpressions,
          context,
        );
        // return this.arktsParseBuildExpression(
        //   node,
        //   allowMultipleExpressions,
        //   context,
        // );
      } else if (this.eat(tt.parenL)) {
        const callNode = this.startNodeAtNode<N.ArkTSCallExpression>(node);
        callNode.callee = node;
        callNode.arguments = this.parseCallExpressionArguments(tt.parenR);
        this.finishNode(callNode, "ArkTSCallExpression");

        const maybeNode = this.arktsParseBuildExpression(
          callNode,
          allowMultipleExpressions,
          context,
        ) as N.CallExpression;
        if (maybeNode) {
          return maybeNode;
        }

        //         v
        // { A().b() C() }
        // Parameter `node` was used to build a new node, where the new node should be returned,
        // at the same time, this information "a new expression is met (by returning undefined)" should be returned.
        // In this case, the updated node is returned with top priority.
        return callNode;
      } else if (context === ArkTSParseContext.CLOSURE && this.match(tt._if)) {
        // (Syntactically) if statement is only allowed in closure (rather than top level of build method)
        // (Semantically) should also under container component, but parser does not validate it
        const ifNode = this.startNode<N.IfStatement>();
        this.next(); // eat `if`
        ifNode.test = this.parseHeaderExpression();

        const consequentNode = this.startNode<N.BlockStatement>();
        consequentNode.body = [];
        if (this.match(tt.braceL)) {
          ifNode.consequent = this.arktsParseBuildExpression(
            consequentNode,
            true,
            ArkTSParseContext.CLOSURE,
          );
        } else {
          this.unexpected(null, tt.braceL);
        }

        ifNode.alternate = this.eat(tt._else)
          ? this.arktsParseBuildExpression(
              null,
              true,
              ArkTSParseContext.CLOSURE,
            )
          : null;

        node.body.push(this.finishNode(ifNode, "IfStatement"));
      } else if (this.match(tt.braceL)) {
        let blockNode;
        if (node === null) {
          blockNode = this.startNode<N.BlockStatement>();
          blockNode.body = [];
        }

        this.next(); // eat `{`
        this.scope.enter(ScopeFlag.FUNCTION);

        this.arktsParseBuildExpression(
          node ?? blockNode,
          true,
          ArkTSParseContext.CLOSURE,
        );

        this.scope.exit();
        this.expect(tt.braceR);

        if (node === null) {
          return blockNode;
        } else {
          this.finishNode(node, "BlockStatement");
        }
      }

      return node;
    }

    //TODOL
    arktsParseExtendExpression(
      node?,
      allowMultipleExpressions: boolean,
      context: ArkTSParseContext,
    ) {
      if (node === undefined) {
        return node;
      } else if (this.match(tt._this)) {
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }
        if(!this.inStructContext){
          this.raise(Errors.UnexpectedToken, this.state.curPosition(), {
            unexpected: "this",
          });
        }
        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const thisNode = this.startNode();
        this.next();
        this.finishNode(thisNode, "ThisExpression");

        const MemberNode = this.arktsParseExtendExpression(
          thisNode,
          allowMultipleExpressions,
          context,
        );

        const expNode = this.startNodeAtNode<N.ExpressionStatement>(MemberNode);
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = MemberNode;
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseExtendExpression(node, allowMultipleExpressions, context);
      } else if (this.inStylesFunction) {
        this.inStylesFunction = false;
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }

        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const callNode = this.startNode<N.ArkTSCallExpression>();
        //TO be Notice in Enre-ArkTS,there create a artificial callee for use
        //TO more show this @Styles feature
        const calleenode = this.startNode<N.Identifier>();
        const name = "Styles_use";

        callNode.callee = this.createIdentifier(calleenode, name);
        callNode.arguments = [];

        // Trailing closure
        const closureNode = this.startNode<N.BlockStatement>();
        closureNode.body = [];

        this.finishNode(callNode, "ArkTSCallExpression");

        // Below creates an ExpressionStatement that wraps CallExpression
        // This does not reject multiple calls at top level, which is invalid in ArkTS
        // but for extensibility reason, the rejection is done by previous if statement
        const expNode = this.startNodeAtNode<N.ExpressionStatement>(callNode);
        const maybeNode = this.arktsParseExtendExpression(
          callNode,
          allowMultipleExpressions,
          context,
        );
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = maybeNode ?? callNode;
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseExtendExpression(
          node,
          allowMultipleExpressions,
          context,
        );
      } else if (this.inExtendFunction) {
        this.inExtendFunction = false;
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }

        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const callNode = this.startNode<N.ArkTSCallExpression>();
        callNode.callee = this.ExtendComponent;
        callNode.arguments = [];

        // Trailing closure
        const closureNode = this.startNode<N.BlockStatement>();
        closureNode.body = [];

        this.finishNode(callNode, "ArkTSCallExpression");

        // Below creates an ExpressionStatement that wraps CallExpression
        // This does not reject multiple calls at top level, which is invalid in ArkTS
        // but for extensibility reason, the rejection is done by previous if statement
        const expNode = this.startNodeAtNode<N.ExpressionStatement>(callNode);
        const maybeNode = this.arktsParseExtendExpression(
          callNode,
          allowMultipleExpressions,
          context,
        );
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = maybeNode ?? callNode;
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseExtendExpression(
          node,
          allowMultipleExpressions,
          context,
        );
      } else if (this.eat(tt.dot)) {
        const memberNode = this.startNodeAtNode<N.MemberExpression>(node);
        memberNode.object = node;
        memberNode.property = this.parseIdentifier();
        this.finishNode(memberNode, "MemberExpression");

        return this.arktsParseExtendExpression(
          memberNode,
          allowMultipleExpressions,
          context,
        );
      } else if (this.eat(tt.parenL)) {
        const callNode = this.startNodeAtNode<N.ArkTSCallExpression>(node);
        callNode.callee = node;
        callNode.arguments = this.parseCallExpressionArguments(tt.parenR);
        this.finishNode(callNode, "ArkTSCallExpression");

        const maybeNode = this.arktsParseExtendExpression(
          callNode,
          allowMultipleExpressions,
          context,
        ) as N.CallExpression;
        if (maybeNode) {
          return maybeNode;
        }

        //         v
        // { A().b() C() }
        // Parameter `node` was used to build a new node, where the new node should be returned,
        // at the same time, this information "a new expression is met (by returning undefined)" should be returned.
        // In this case, the updated node is returned with top priority.
        return callNode;
      }
      return node;
    }

    arktsParseForeachExpression(
      node?,
      allowMultipleExpressions: boolean,
      context: ArkTSParseContext,
    ) {
      if (node === undefined) {
        return node;
      } else if (this.match(tt._this)) {
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }
        if (!this.inStructContext){
          this.raise(Errors.UnexpectedToken, this.state.curPosition(), {
            unexpected: "this",
          });
        }
        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const thisNode = this.startNode();
        this.next();
        this.finishNode(thisNode, "ThisExpression");

        const MemberNode = this.arktsParseForeachExpression(
          thisNode,
          allowMultipleExpressions,
          context,
        );

        const expNode = this.startNodeAtNode<N.ExpressionStatement>(MemberNode);
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = MemberNode;
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseForeachExpression(node, allowMultipleExpressions, context);
      }else if (this.match(tt.name)) {
        //             v
        // { A(){}.B() C() }
        // A new ExpressionStatement should start, but parameter `node` is not BlockStatement,
        // so we have to go back (by returning undefined) to where `node` is a BlockStatement.
        if (node.type !== "" && node.type !== "MemberExpression") {
          return undefined;
        }

        if (context === ArkTSParseContext.TOP && !allowMultipleExpressions) {
          this.unexpected();
        }

        const callNode = this.startNode<N.ArkTSCallExpression>();
        callNode.callee = this.parseIdentifier();
        if (callNode.callee.name == "Foreach") this.inForEach = true;
        if (callNode.callee.name == "LazyForEach") this.inLazyForeach = true;
        this.expect(tt.parenL);
        callNode.arguments = this.parseCallExpressionArguments(tt.parenR);

        // Trailing closure
        const closureNode = this.startNode<N.BlockStatement>();
        closureNode.body = [];
        if (this.match(tt.braceL)) {
          callNode.trailingClosure = this.arktsParseForeachExpression(
            closureNode,
            true,
            ArkTSParseContext.CLOSURE,
          );
        }

        this.finishNode(callNode, "ArkTSCallExpression");

        // Below creates an ExpressionStatement that wraps CallExpression
        // This does not reject multiple calls at top level, which is invalid in ArkTS
        // but for extensibility reason, the rejection is done by previous if statement
        const expNode = this.startNodeAtNode<N.ExpressionStatement>(callNode);
        const maybeNode = this.arktsParseForeachExpression(
          callNode,
          allowMultipleExpressions,
          context,
        );
        this.finishNode(expNode, "ExpressionStatement");

        expNode.expression = maybeNode ?? callNode;
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseForeachExpression(
          node,
          allowMultipleExpressions,
          context,
        );
      } else if (this.eat(tt.dot)) {
        const memberNode = this.startNodeAtNode<N.MemberExpression>(node);
        memberNode.object = node;
        memberNode.property = this.parseIdentifier();
        this.finishNode(memberNode, "MemberExpression");

        // MemberExpression is for sure to be appended with CallExpression, or syntax error
        return this.arktsParseForeachExpression(
          memberNode,
          allowMultipleExpressions,
          context,
        );
      } else if (this.eat(tt.parenL)) {
        const callNode = this.startNodeAtNode<N.ArkTSCallExpression>(node);
        callNode.callee = node;
        callNode.arguments = this.parseCallExpressionArguments(tt.parenR);
        this.finishNode(callNode, "ArkTSCallExpression");

        const maybeNode = this.arktsParseForeachExpression(
          callNode,
          allowMultipleExpressions,
          context,
        ) as N.CallExpression;
        if (maybeNode) {
          return maybeNode;
        }

        //         v
        // { A().b() C() }
        // Parameter `node` was used to build a new node, where the new node should be returned,
        // at the same time, this information "a new expression is met (by returning undefined)" should be returned.
        // In this case, the updated node is returned with top priority.
        return callNode;
      } else if (context === ArkTSParseContext.CLOSURE && this.match(tt._if)) {
        // (Syntactically) if statement is only allowed in closure (rather than top level of build method)
        // (Semantically) should also under container component, but parser does not validate it
        const ifNode = this.startNode<N.IfStatement>();
        this.next(); // eat `if`
        ifNode.test = this.parseHeaderExpression();

        const consequentNode = this.startNode<N.BlockStatement>();
        consequentNode.body = [];
        if (this.match(tt.braceL)) {
          ifNode.consequent = this.arktsParseForeachExpression(
            consequentNode,
            true,
            ArkTSParseContext.CLOSURE,
          );
        } else {
          this.unexpected(null, tt.braceL);
        }

        ifNode.alternate = this.eat(tt._else)
          ? this.arktsParseForeachExpression(
              null,
              true,
              ArkTSParseContext.CLOSURE,
            )
          : null;

        node.body.push(this.finishNode(ifNode, "IfStatement"));
      } else if (this.match(tt.braceL)) {
        let blockNode;
        if (node === null) {
          blockNode = this.startNode<N.BlockStatement>();
          blockNode.body = [];
        }

        this.next(); // eat `{`
        this.scope.enter(ScopeFlag.FUNCTION);

        this.arktsParseForeachExpression(
          node ?? blockNode,
          true,
          ArkTSParseContext.CLOSURE,
        );

        this.scope.exit();
        this.expect(tt.braceR);

        if (node === null) {
          return blockNode;
        } else {
          this.finishNode(node, "BlockStatement");
        }
      }

      return node;
    }
    viewTokenType() {
      return [
        Object.keys(tt)[this.state.type],
        Object.keys(tt)[this.lookahead().type],
      ];
    }
  };
