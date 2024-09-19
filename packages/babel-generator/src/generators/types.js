import { isAssignmentPattern, isIdentifier } from "@babel/types";
import jsesc from "jsesc";
export function Identifier(node) {
    this.sourceIdentifierName(node.loc?.identifierName || node.name);
    this.word(node.name);
}
export function ArgumentPlaceholder() {
    this.token("?");
}
export function RestElement(node) {
    this.token("...");
    this.print(node.argument, node);
}
export { RestElement as SpreadElement };
export function ObjectExpression(node) {
    const props = node.properties;
    this.token("{");
    if (props.length) {
        this.space();
        this.printList(props, node, { indent: true, statement: true });
        this.space();
    }
    this.sourceWithOffset("end", node.loc, -1);
    this.token("}");
}
export { ObjectExpression as ObjectPattern };
export function ObjectMethod(node) {
    this.printJoin(node.decorators, node);
    this._methodHead(node);
    this.space();
    this.print(node.body, node);
}
export function ObjectProperty(node) {
    this.printJoin(node.decorators, node);
    if (node.computed) {
        this.token("[");
        this.print(node.key, node);
        this.token("]");
    }
    else {
        // print `({ foo: foo = 5 } = {})` as `({ foo = 5 } = {});`
        if (isAssignmentPattern(node.value) &&
            isIdentifier(node.key) &&
            // @ts-expect-error todo(flow->ts) `.name` does not exist on some types in union
            node.key.name === node.value.left.name) {
            this.print(node.value, node);
            return;
        }
        this.print(node.key, node);
        // shorthand!
        if (node.shorthand &&
            isIdentifier(node.key) &&
            isIdentifier(node.value) &&
            node.key.name === node.value.name) {
            return;
        }
    }
    this.token(":");
    this.space();
    this.print(node.value, node);
}
export function ArrayExpression(node) {
    const elems = node.elements;
    const len = elems.length;
    this.token("[");
    for (let i = 0; i < elems.length; i++) {
        const elem = elems[i];
        if (elem) {
            if (i > 0)
                this.space();
            this.print(elem, node);
            if (i < len - 1)
                this.token(",");
        }
        else {
            // If the array expression ends with a hole, that hole
            // will be ignored by the interpreter, but if it ends with
            // two (or more) holes, we need to write out two (or more)
            // commas so that the resulting code is interpreted with
            // both (all) of the holes.
            this.token(",");
        }
    }
    this.token("]");
}
export { ArrayExpression as ArrayPattern };
export function RecordExpression(node) {
    const props = node.properties;
    let startToken;
    let endToken;
    if (this.format.recordAndTupleSyntaxType === "bar") {
        startToken = "{|";
        endToken = "|}";
    }
    else if (this.format.recordAndTupleSyntaxType !== "hash" &&
        this.format.recordAndTupleSyntaxType != null) {
        throw new Error(`The "recordAndTupleSyntaxType" generator option must be "bar" or "hash" (${JSON.stringify(this.format.recordAndTupleSyntaxType)} received).`);
    }
    else {
        startToken = "#{";
        endToken = "}";
    }
    this.token(startToken);
    if (props.length) {
        this.space();
        this.printList(props, node, { indent: true, statement: true });
        this.space();
    }
    this.token(endToken);
}
export function TupleExpression(node) {
    const elems = node.elements;
    const len = elems.length;
    let startToken;
    let endToken;
    if (this.format.recordAndTupleSyntaxType === "bar") {
        startToken = "[|";
        endToken = "|]";
    }
    else if (this.format.recordAndTupleSyntaxType === "hash") {
        startToken = "#[";
        endToken = "]";
    }
    else {
        throw new Error(`${this.format.recordAndTupleSyntaxType} is not a valid recordAndTuple syntax type`);
    }
    this.token(startToken);
    for (let i = 0; i < elems.length; i++) {
        const elem = elems[i];
        if (elem) {
            if (i > 0)
                this.space();
            this.print(elem, node);
            if (i < len - 1)
                this.token(",");
        }
    }
    this.token(endToken);
}
export function RegExpLiteral(node) {
    this.word(`/${node.pattern}/${node.flags}`);
}
export function BooleanLiteral(node) {
    this.word(node.value ? "true" : "false");
}
export function NullLiteral() {
    this.word("null");
}
export function NumericLiteral(node) {
    const raw = this.getPossibleRaw(node);
    const opts = this.format.jsescOption;
    const value = node.value;
    const str = value + "";
    if (opts.numbers) {
        this.number(jsesc(value, opts), value);
    }
    else if (raw == null) {
        this.number(str, value); // normalize
    }
    else if (this.format.minified) {
        this.number(raw.length < str.length ? raw : str, value);
    }
    else {
        this.number(raw, value);
    }
}
export function StringLiteral(node) {
    const raw = this.getPossibleRaw(node);
    if (!this.format.minified && raw !== undefined) {
        this.token(raw);
        return;
    }
    const val = jsesc(node.value, this.format.jsescOption);
    this.token(val);
}
export function BigIntLiteral(node) {
    const raw = this.getPossibleRaw(node);
    if (!this.format.minified && raw !== undefined) {
        this.word(raw);
        return;
    }
    this.word(node.value + "n");
}
export function DecimalLiteral(node) {
    const raw = this.getPossibleRaw(node);
    if (!this.format.minified && raw !== undefined) {
        this.word(raw);
        return;
    }
    this.word(node.value + "m");
}
// Hack pipe operator
const validTopicTokenSet = new Set(["^^", "@@", "^", "%", "#"]);
export function TopicReference() {
    const { topicToken } = this.format;
    if (validTopicTokenSet.has(topicToken)) {
        this.token(topicToken);
    }
    else {
        const givenTopicTokenJSON = JSON.stringify(topicToken);
        const validTopics = Array.from(validTopicTokenSet, v => JSON.stringify(v));
        throw new Error(`The "topicToken" generator option must be one of ` +
            `${validTopics.join(", ")} (${givenTopicTokenJSON} received instead).`);
    }
}
// Smart-mix pipe operator
export function PipelineTopicExpression(node) {
    this.print(node.expression, node);
}
export function PipelineBareFunction(node) {
    this.print(node.callee, node);
}
export function PipelinePrimaryTopicReference() {
    this.token("#");
}
