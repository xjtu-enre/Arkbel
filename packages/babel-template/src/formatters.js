import { assertExpressionStatement } from "@babel/types";
function makeStatementFormatter(fn) {
    return {
        // We need to prepend a ";" to force statement parsing so that
        // ExpressionStatement strings won't be parsed as directives.
        // Alongside that, we also prepend a comment so that when a syntax error
        // is encountered, the user will be less likely to get confused about
        // where the random semicolon came from.
        code: str => `/* @babel/template */;\n${str}`,
        validate: () => { },
        unwrap: (ast) => {
            return fn(ast.program.body.slice(1));
        },
    };
}
export const smart = makeStatementFormatter(body => {
    if (body.length > 1) {
        return body;
    }
    else {
        return body[0];
    }
});
export const statements = makeStatementFormatter(body => body);
export const statement = makeStatementFormatter(body => {
    // We do this validation when unwrapping since the replacement process
    // could have added or removed statements.
    if (body.length === 0) {
        throw new Error("Found nothing to return.");
    }
    if (body.length > 1) {
        throw new Error("Found multiple statements but wanted one");
    }
    return body[0];
});
export const expression = {
    code: str => `(\n${str}\n)`,
    validate: ast => {
        if (ast.program.body.length > 1) {
            throw new Error("Found multiple statements but wanted one");
        }
        if (expression.unwrap(ast).start === 0) {
            throw new Error("Parse result included parens.");
        }
    },
    unwrap: ({ program }) => {
        const [stmt] = program.body;
        assertExpressionStatement(stmt);
        return stmt.expression;
    },
};
export const program = {
    code: str => str,
    validate: () => { },
    unwrap: ast => ast.program,
};
