import { declare } from "@babel/helper-plugin-utils";
import { pushAccessor, toDefineObject } from "./define-map.ts";
import { types as t } from "@babel/core";
export default declare(api => {
    api.assertVersion(process.env.BABEL_8_BREAKING && process.env.IS_PUBLISH
        ? PACKAGE_JSON.version
        : 7);
    return {
        name: "transform-property-mutators",
        visitor: {
            ObjectExpression(path) {
                const { node } = path;
                let mutatorMap;
                const newProperties = node.properties.filter(function (prop) {
                    if (t.isObjectMethod(prop) &&
                        !prop.computed &&
                        (prop.kind === "get" || prop.kind === "set")) {
                        pushAccessor((mutatorMap ??= {}), prop);
                        return false;
                    }
                    return true;
                });
                if (mutatorMap === undefined) {
                    return;
                }
                node.properties = newProperties;
                path.replaceWith(t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("defineProperties")), [node, toDefineObject(mutatorMap)]));
            },
        },
    };
});
