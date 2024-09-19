import { types as t } from "@babel/core";
import { declare } from "@babel/helper-plugin-utils";
import { getPotentiallyBuggyFieldsIndexes, getNameOrLengthStaticFieldsIndexes, toRanges, } from "./util.ts";
function buildFieldsReplacement(fields, scope, file) {
    return t.staticBlock(fields.map(field => {
        const key = field.computed || !t.isIdentifier(field.key)
            ? field.key
            : t.stringLiteral(field.key.name);
        return t.expressionStatement(t.callExpression(file.addHelper("defineProperty"), [
            t.thisExpression(),
            key,
            field.value || scope.buildUndefinedNode(),
        ]));
    }));
}
export default declare(api => {
    api.assertVersion(process.env.BABEL_8_BREAKING && process.env.IS_PUBLISH
        ? PACKAGE_JSON.version
        : 7);
    const setPublicClassFields = api.assumption("setPublicClassFields");
    return {
        name: "bugfix-v8-static-class-fields-redefine-readonly",
        visitor: {
            Class(path) {
                const ranges = toRanges(setPublicClassFields
                    ? getNameOrLengthStaticFieldsIndexes(path)
                    : getPotentiallyBuggyFieldsIndexes(path));
                for (let i = ranges.length - 1; i >= 0; i--) {
                    const [start, end] = ranges[i];
                    const startPath = path.get("body.body")[start];
                    startPath.replaceWith(buildFieldsReplacement(path.node.body.body.slice(start, end), path.scope, this.file));
                    for (let j = end - 1; j > start; j--) {
                        path.get("body.body")[j].remove();
                    }
                }
            },
        },
    };
});
