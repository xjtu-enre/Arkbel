import gensync from "gensync";
import loadConfig from "./config/index.ts";
import { run } from "./transformation/index.ts";
import { beginHiddenCallStack } from "./errors/rewrite-stack-trace.ts";
const transformRunner = gensync(function* transform(code, opts) {
    const config = yield* loadConfig(opts);
    if (config === null)
        return null;
    return yield* run(config, code);
});
export const transform = function transform(code, optsOrCallback, maybeCallback) {
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
            throw new Error("Starting from Babel 8.0.0, the 'transform' function expects a callback. If you need to call it synchronously, please use 'transformSync'.");
        }
        else {
            // console.warn(
            //   "Starting from Babel 8.0.0, the 'transform' function will expect a callback. If you need to call it synchronously, please use 'transformSync'.",
            // );
            return beginHiddenCallStack(transformRunner.sync)(code, opts);
        }
    }
    beginHiddenCallStack(transformRunner.errback)(code, opts, callback);
};
export function transformSync(...args) {
    return beginHiddenCallStack(transformRunner.sync)(...args);
}
export function transformAsync(...args) {
    return beginHiddenCallStack(transformRunner.async)(...args);
}
