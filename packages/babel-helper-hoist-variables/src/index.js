import { assignmentExpression, expressionStatement, identifier, } from "@babel/types";
const visitor = {
    Scope(path, state) {
        if (state.kind === "let")
            path.skip();
    },
    FunctionParent(path) {
        path.skip();
    },
    VariableDeclaration(path, state) {
        if (state.kind && path.node.kind !== state.kind)
            return;
        const nodes = [];
        const declarations = path.get("declarations");
        let firstId;
        for (const declar of declarations) {
            firstId = declar.node.id;
            if (declar.node.init) {
                nodes.push(expressionStatement(assignmentExpression("=", declar.node.id, declar.node.init)));
            }
            for (const name of Object.keys(declar.getBindingIdentifiers())) {
                state.emit(identifier(name), name, declar.node.init !== null);
            }
        }
        // for (var i in test)
        if (path.parentPath.isFor({ left: path.node })) {
            path.replaceWith(firstId);
        }
        else {
            path.replaceWithMultiple(nodes);
        }
    },
};
export default function hoistVariables(path, emit, kind = "var") {
    path.traverse(visitor, { kind, emit });
}
