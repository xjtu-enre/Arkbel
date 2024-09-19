import gensync from "gensync";
import loadConfig from "./config/index.ts";
import parser from "./parser/index.ts";
import normalizeOptions from "./transformation/normalize-opts.ts";
import { beginHiddenCallStack } from "./errors/rewrite-stack-trace.ts";
const parseRunner = gensync(function* parse(code, opts) {
    const config = yield* loadConfig(opts);
    if (config === null) {
        return null;
    }
    return yield* parser(config.passes, normalizeOptions(config), code);
});
export const parse = function parse(code, opts, callback) {
    if (typeof opts === "function") {
        callback = opts;
        opts = undefined;
    }
    if (callback === undefined) {
        if (process.env.BABEL_8_BREAKING) {
            throw new Error("Starting from Babel 8.0.0, the 'parse' function expects a callback. If you need to call it synchronously, please use 'parseSync'.");
        }
        else {
            // console.warn(
            //   "Starting from Babel 8.0.0, the 'parse' function will expect a callback. If you need to call it synchronously, please use 'parseSync'.",
            // );
            return beginHiddenCallStack(parseRunner.sync)(code, opts);
        }
    }
    beginHiddenCallStack(parseRunner.errback)(code, opts, callback);
};
export function parseSync(...args) {
    return beginHiddenCallStack(parseRunner.sync)(...args);
}
export function parseAsync(...args) {
    return beginHiddenCallStack(parseRunner.async)(...args);
}
