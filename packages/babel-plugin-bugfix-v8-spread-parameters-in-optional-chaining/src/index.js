import { declare } from "@babel/helper-plugin-utils";
import { transform } from "@babel/plugin-transform-optional-chaining";
import { shouldTransform } from "./util.ts";
export default declare(api => {
    api.assertVersion(process.env.BABEL_8_BREAKING && process.env.IS_PUBLISH
        ? PACKAGE_JSON.version
        : 7);
    const noDocumentAll = api.assumption("noDocumentAll") ?? false;
    const pureGetters = api.assumption("pureGetters") ?? false;
    return {
        name: "bugfix-v8-spread-parameters-in-optional-chaining",
        visitor: {
            "OptionalCallExpression|OptionalMemberExpression"(path) {
                if (shouldTransform(path)) {
                    transform(path, { noDocumentAll, pureGetters });
                }
            },
        },
    };
});
