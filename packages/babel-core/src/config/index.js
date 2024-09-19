import gensync from "gensync";
import loadFullConfig from "./full.ts";
import { loadPartialConfig as loadPartialConfigImpl, } from "./partial.ts";
export { loadFullConfig as default };
import { createConfigItem as createConfigItemImpl } from "./item.ts";
import { beginHiddenCallStack } from "../errors/rewrite-stack-trace.ts";
const loadPartialConfigRunner = gensync(loadPartialConfigImpl);
export function loadPartialConfigAsync(...args) {
    return beginHiddenCallStack(loadPartialConfigRunner.async)(...args);
}
export function loadPartialConfigSync(...args) {
    return beginHiddenCallStack(loadPartialConfigRunner.sync)(...args);
}
export function loadPartialConfig(opts, callback) {
    if (callback !== undefined) {
        beginHiddenCallStack(loadPartialConfigRunner.errback)(opts, callback);
    }
    else if (typeof opts === "function") {
        beginHiddenCallStack(loadPartialConfigRunner.errback)(undefined, opts);
    }
    else {
        if (process.env.BABEL_8_BREAKING) {
            throw new Error("Starting from Babel 8.0.0, the 'loadPartialConfig' function expects a callback. If you need to call it synchronously, please use 'loadPartialConfigSync'.");
        }
        else {
            return loadPartialConfigSync(opts);
        }
    }
}
function* loadOptionsImpl(opts) {
    const config = yield* loadFullConfig(opts);
    // NOTE: We want to return "null" explicitly, while ?. alone returns undefined
    return config?.options ?? null;
}
const loadOptionsRunner = gensync(loadOptionsImpl);
export function loadOptionsAsync(...args) {
    return beginHiddenCallStack(loadOptionsRunner.async)(...args);
}
export function loadOptionsSync(...args) {
    return beginHiddenCallStack(loadOptionsRunner.sync)(...args);
}
export function loadOptions(opts, callback) {
    if (callback !== undefined) {
        beginHiddenCallStack(loadOptionsRunner.errback)(opts, callback);
    }
    else if (typeof opts === "function") {
        beginHiddenCallStack(loadOptionsRunner.errback)(undefined, opts);
    }
    else {
        if (process.env.BABEL_8_BREAKING) {
            throw new Error("Starting from Babel 8.0.0, the 'loadOptions' function expects a callback. If you need to call it synchronously, please use 'loadOptionsSync'.");
        }
        else {
            return loadOptionsSync(opts);
        }
    }
}
const createConfigItemRunner = gensync(createConfigItemImpl);
export function createConfigItemAsync(...args) {
    return beginHiddenCallStack(createConfigItemRunner.async)(...args);
}
export function createConfigItemSync(...args) {
    return beginHiddenCallStack(createConfigItemRunner.sync)(...args);
}
export function createConfigItem(target, options, callback) {
    if (callback !== undefined) {
        beginHiddenCallStack(createConfigItemRunner.errback)(target, options, callback);
    }
    else if (typeof options === "function") {
        beginHiddenCallStack(createConfigItemRunner.errback)(target, undefined, callback);
    }
    else {
        if (process.env.BABEL_8_BREAKING) {
            throw new Error("Starting from Babel 8.0.0, the 'createConfigItem' function expects a callback. If you need to call it synchronously, please use 'createConfigItemSync'.");
        }
        else {
            return createConfigItemSync(target, options);
        }
    }
}
