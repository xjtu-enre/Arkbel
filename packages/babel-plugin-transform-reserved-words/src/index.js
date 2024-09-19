import { declare } from "@babel/helper-plugin-utils";
import { types as t } from "@babel/core";
export default declare(api => {
    api.assertVersion(process.env.BABEL_8_BREAKING && process.env.IS_PUBLISH
        ? PACKAGE_JSON.version
        : 7);
    return {
        name: "transform-reserved-words",
        visitor: {
            "BindingIdentifier|ReferencedIdentifier"(path) {
                if (!t.isValidES3Identifier(path.node.name)) {
                    path.scope.rename(path.node.name);
                }
            },
        },
    };
});
