import { declarePreset } from "@babel/helper-plugin-utils";
import transformReactJSX from "@babel/plugin-transform-react-jsx";
import transformReactJSXDevelopment from "@babel/plugin-transform-react-jsx-development";
import transformReactDisplayName from "@babel/plugin-transform-react-display-name";
import transformReactPure from "@babel/plugin-transform-react-pure-annotations";
import normalizeOptions from "./normalize-options.ts";
export default declarePreset((api, opts) => {
    api.assertVersion(process.env.BABEL_8_BREAKING && process.env.IS_PUBLISH
        ? PACKAGE_JSON.version
        : 7);
    const { development, importSource, pragma, pragmaFrag, pure, runtime, throwIfNamespace, } = normalizeOptions(opts);
    return {
        plugins: [
            [
                development ? transformReactJSXDevelopment : transformReactJSX,
                process.env.BABEL_8_BREAKING
                    ? {
                        importSource,
                        pragma,
                        pragmaFrag,
                        runtime,
                        throwIfNamespace,
                        pure,
                    }
                    : {
                        importSource,
                        pragma,
                        pragmaFrag,
                        runtime,
                        throwIfNamespace,
                        pure,
                        useBuiltIns: !!opts.useBuiltIns,
                        useSpread: opts.useSpread,
                    },
            ],
            transformReactDisplayName,
            pure !== false && transformReactPure,
        ].filter(Boolean),
    };
});
