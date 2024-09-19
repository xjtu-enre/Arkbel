export function File(node) {
    if (node.program) {
        // Print this here to ensure that Program node 'leadingComments' still
        // get printed after the hashbang.
        this.print(node.program.interpreter, node);
    }
    this.print(node.program, node);
}
export function Program(node) {
    // An empty Program doesn't have any inner tokens, so
    // we must explicitly print its inner comments.
    this.noIndentInnerCommentsHere();
    this.printInnerComments();
    const directivesLen = node.directives?.length;
    if (directivesLen) {
        const newline = node.body.length ? 2 : 1;
        this.printSequence(node.directives, node, {
            trailingCommentsLineOffset: newline,
        });
        if (!node.directives[directivesLen - 1].trailingComments?.length) {
            this.newline(newline);
        }
    }
    this.printSequence(node.body, node);
}
export function BlockStatement(node) {
    this.token("{");
    const directivesLen = node.directives?.length;
    if (directivesLen) {
        const newline = node.body.length ? 2 : 1;
        this.printSequence(node.directives, node, {
            indent: true,
            trailingCommentsLineOffset: newline,
        });
        if (!node.directives[directivesLen - 1].trailingComments?.length) {
            this.newline(newline);
        }
    }
    this.printSequence(node.body, node, { indent: true });
    this.rightBrace(node);
}
export function Directive(node) {
    this.print(node.value, node);
    this.semicolon();
}
// These regexes match an even number of \ followed by a quote
const unescapedSingleQuoteRE = /(?:^|[^\\])(?:\\\\)*'/;
const unescapedDoubleQuoteRE = /(?:^|[^\\])(?:\\\\)*"/;
export function DirectiveLiteral(node) {
    const raw = this.getPossibleRaw(node);
    if (!this.format.minified && raw !== undefined) {
        this.token(raw);
        return;
    }
    const { value } = node;
    // NOTE: In directives we can't change escapings,
    // because they change the behavior.
    // e.g. "us\x65 strict" (\x65 is e) is not a "use strict" directive.
    if (!unescapedDoubleQuoteRE.test(value)) {
        this.token(`"${value}"`);
    }
    else if (!unescapedSingleQuoteRE.test(value)) {
        this.token(`'${value}'`);
    }
    else {
        throw new Error("Malformed AST: it is not possible to print a directive containing" +
            " both unescaped single and double quotes.");
    }
}
export function InterpreterDirective(node) {
    this.token(`#!${node.value}`);
    this.newline(1, true);
}
export function Placeholder(node) {
    this.token("%%");
    this.print(node.name);
    this.token("%%");
    if (node.expectedNode === "Statement") {
        this.semicolon();
    }
}
