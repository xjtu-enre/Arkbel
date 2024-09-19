import { tokenIsIdentifier, tt } from "../tokenizer/types.ts";
export default (superClass) => class V8IntrinsicMixin extends superClass {
    parseV8Intrinsic() {
        if (this.match(tt.modulo)) {
            const v8IntrinsicStartLoc = this.state.startLoc;
            // let the `loc` of Identifier starts from `%`
            const node = this.startNode();
            this.next(); // eat '%'
            if (tokenIsIdentifier(this.state.type)) {
                const name = this.parseIdentifierName();
                const identifier = this.createIdentifier(node, name);
                // @ts-expect-error: avoid mutating AST types
                identifier.type = "V8IntrinsicIdentifier";
                if (this.match(tt.parenL)) {
                    return identifier;
                }
            }
            this.unexpected(v8IntrinsicStartLoc);
        }
    }
    /* ============================================================ *
     * parser/expression.js                                         *
     * ============================================================ */
    parseExprAtom(refExpressionErrors) {
        return (this.parseV8Intrinsic() || super.parseExprAtom(refExpressionErrors));
    }
};
