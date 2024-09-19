import gensync from "gensync";
import loadConfig from "./config/index.ts";
import { run } from "./transformation/index.ts";
import { beginHiddenCallStack } from "./errors/rewrite-stack-trace.ts";
const transformFromAstRunner = gensync(function* (ast, code, opts) {
    const config = yield* loadConfig(opts);
    if (config === null)
        return null;
    if (!ast)
        throw new Error("No AST given");
    return yield* run(config, code, ast);
});
export const transformFromAst = function transformFromAst(ast, code, optsOrCallback, maybeCallback) {
    let opts;
    let callback;
    if (typeof optsOrCallback === "function") {
        callback = optsOrCallback;
        opts = undefined;
    }
    else {
        opts = optsOrCallback;
        callback = maybeCallback;
    }
    if (callback === undefined) {
        if (process.env.BABEL_8_BREAKING) {
            throw new Error("Starting from Babel 8.0.0, the 'transformFromAst' function expects a callback. If you need to call it synchronously, please use 'transformFromAstSync'.");
        }
        else {
            // console.warn(
            //   "Starting from Babel 8.0.0, the 'transformFromAst' function will expect a callback. If you need to call it synchronously, please use 'transformFromAstSync'.",
            // );
            return beginHiddenCallStack(transformFromAstRunner.sync)(ast, code, opts);
        }
    }
    beginHiddenCallStack(transformFromAstRunner.errback)(ast, code, opts, callback);
};
export function transformFromAstSync(...args) {
    return beginHiddenCallStack(transformFromAstRunner.sync)(...args);
}
export function transformFromAstAsync(...args) {
    return beginHiddenCallStack(transformFromAstRunner.async)(...args);
}
