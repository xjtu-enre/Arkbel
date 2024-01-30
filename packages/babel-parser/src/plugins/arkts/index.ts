import type typescript from "../typescript/index.ts";
import type { ParseStatementFlag } from "../../parser/statement.ts";
import type * as N from "../../types.ts";
import { tt } from "../../tokenizer/types.ts";
import type { Undone } from "../../parser/node.ts";
import { ScopeFlag } from "../../util/scopeflags.ts";

const enum ArkTSParseContext {
  TOP_FIRST,
  TOP,
  CLOSURE,
}

export default (superClass: ReturnType<typeof typescript>) =>
  class ArkTSParserMixin extends superClass {
    // Assuming ArkTS struct cannot be nested
    declare inStructContext: boolean;

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

    // Intercept the parsing of struct method `build`
    parseFunctionBody(
      node: Undone<N.Function>,
      allowExpression?: boolean | null,
      isMethod: boolean = false,
    ) {
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
      if (node === undefined) {
        return node;
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
        node.body.push(expNode);

        // Pass BlockStatement node in so that new nodes can be pushed into
        this.arktsParseBuildExpression(node, allowMultipleExpressions, context);
      } else if (this.eat(tt.dot)) {
        const memberNode = this.startNodeAtNode<N.MemberExpression>(node);
        memberNode.object = node;
        memberNode.property = this.parseIdentifier();
        this.finishNode(memberNode, "MemberExpression");

        // MemberExpression is for sure to be appended with CallExpression, or syntax error
        return this.arktsParseBuildExpression(
          memberNode,
          allowMultipleExpressions,
          context,
        );
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
        // at the same time, thes information "a new expression is met (by returning undefined)" should be returned.
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

    viewTokenType() {
      return [
        Object.keys(tt)[this.state.type],
        Object.keys(tt)[this.lookahead().type],
      ];
    }
  };
