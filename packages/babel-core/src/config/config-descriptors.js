import gensync from "gensync";
import { once } from "../gensync-utils/functional.ts";
import { loadPlugin, loadPreset } from "./files/index.ts";
import { getItemDescriptor } from "./item.ts";
import { makeWeakCacheSync, makeStrongCacheSync, makeStrongCache, } from "./caching.ts";
import { resolveBrowserslistConfigFile } from "./resolve-targets.ts";
function isEqualDescriptor(a, b) {
    return (a.name === b.name &&
        a.value === b.value &&
        a.options === b.options &&
        a.dirname === b.dirname &&
        a.alias === b.alias &&
        a.ownPass === b.ownPass &&
        a.file?.request === b.file?.request &&
        a.file?.resolved === b.file?.resolved);
}
// eslint-disable-next-line require-yield
function* handlerOf(value) {
    return value;
}
function optionsWithResolvedBrowserslistConfigFile(options, dirname) {
    if (typeof options.browserslistConfigFile === "string") {
        options.browserslistConfigFile = resolveBrowserslistConfigFile(options.browserslistConfigFile, dirname);
    }
    return options;
}
/**
 * Create a set of descriptors from a given options object, preserving
 * descriptor identity based on the identity of the plugin/preset arrays
 * themselves, and potentially on the identity of the plugins/presets + options.
 */
export function createCachedDescriptors(dirname, options, alias) {
    const { plugins, presets, passPerPreset } = options;
    return {
        options: optionsWithResolvedBrowserslistConfigFile(options, dirname),
        plugins: plugins
            ? () => 
            // @ts-expect-error todo(flow->ts) ts complains about incorrect arguments
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            createCachedPluginDescriptors(plugins, dirname)(alias)
            : () => handlerOf([]),
        presets: presets
            ? () => 
            // @ts-expect-error todo(flow->ts) ts complains about incorrect arguments
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            createCachedPresetDescriptors(presets, dirname)(alias)(!!passPerPreset)
            : () => handlerOf([]),
    };
}
/**
 * Create a set of descriptors from a given options object, with consistent
 * identity for the descriptors, but not caching based on any specific identity.
 */
export function createUncachedDescriptors(dirname, options, alias) {
    return {
        options: optionsWithResolvedBrowserslistConfigFile(options, dirname),
        // The returned result here is cached to represent a config object in
        // memory, so we build and memoize the descriptors to ensure the same
        // values are returned consistently.
        plugins: once(() => createPluginDescriptors(options.plugins || [], dirname, alias)),
        presets: once(() => createPresetDescriptors(options.presets || [], dirname, alias, !!options.passPerPreset)),
    };
}
const PRESET_DESCRIPTOR_CACHE = new WeakMap();
const createCachedPresetDescriptors = makeWeakCacheSync((items, cache) => {
    const dirname = cache.using(dir => dir);
    return makeStrongCacheSync((alias) => makeStrongCache(function* (passPerPreset) {
        const descriptors = yield* createPresetDescriptors(items, dirname, alias, passPerPreset);
        return descriptors.map(
        // Items are cached using the overall preset array identity when
        // possibly, but individual descriptors are also cached if a match
        // can be found in the previously-used descriptor lists.
        desc => loadCachedDescriptor(PRESET_DESCRIPTOR_CACHE, desc));
    }));
});
const PLUGIN_DESCRIPTOR_CACHE = new WeakMap();
const createCachedPluginDescriptors = makeWeakCacheSync((items, cache) => {
    const dirname = cache.using(dir => dir);
    return makeStrongCache(function* (alias) {
        const descriptors = yield* createPluginDescriptors(items, dirname, alias);
        return descriptors.map(
        // Items are cached using the overall plugin array identity when
        // possibly, but individual descriptors are also cached if a match
        // can be found in the previously-used descriptor lists.
        desc => loadCachedDescriptor(PLUGIN_DESCRIPTOR_CACHE, desc));
    });
});
/**
 * When no options object is given in a descriptor, this object is used
 * as a WeakMap key in order to have consistent identity.
 */
const DEFAULT_OPTIONS = {};
/**
 * Given the cache and a descriptor, returns a matching descriptor from the
 * cache, or else returns the input descriptor and adds it to the cache for
 * next time.
 */
function loadCachedDescriptor(cache, desc) {
    const { value, options = DEFAULT_OPTIONS } = desc;
    if (options === false)
        return desc;
    let cacheByOptions = cache.get(value);
    if (!cacheByOptions) {
        cacheByOptions = new WeakMap();
        cache.set(value, cacheByOptions);
    }
    let possibilities = cacheByOptions.get(options);
    if (!possibilities) {
        possibilities = [];
        cacheByOptions.set(options, possibilities);
    }
    if (possibilities.indexOf(desc) === -1) {
        const matches = possibilities.filter(possibility => isEqualDescriptor(possibility, desc));
        if (matches.length > 0) {
            return matches[0];
        }
        possibilities.push(desc);
    }
    return desc;
}
function* createPresetDescriptors(items, dirname, alias, passPerPreset) {
    return yield* createDescriptors("preset", items, dirname, alias, passPerPreset);
}
function* createPluginDescriptors(items, dirname, alias) {
    return yield* createDescriptors("plugin", items, dirname, alias);
}
function* createDescriptors(type, items, dirname, alias, ownPass) {
    const descriptors = yield* gensync.all(items.map((item, index) => createDescriptor(item, dirname, {
        type,
        alias: `${alias}$${index}`,
        ownPass: !!ownPass,
    })));
    assertNoDuplicates(descriptors);
    return descriptors;
}
/**
 * Given a plugin/preset item, resolve it into a standard format.
 */
export function* createDescriptor(pair, dirname, { type, alias, ownPass, }) {
    const desc = getItemDescriptor(pair);
    if (desc) {
        return desc;
    }
    let name;
    let options;
    // todo(flow->ts) better type annotation
    let value = pair;
    if (Array.isArray(value)) {
        if (value.length === 3) {
            [value, options, name] = value;
        }
        else {
            [value, options] = value;
        }
    }
    let file = undefined;
    let filepath = null;
    if (typeof value === "string") {
        if (typeof type !== "string") {
            throw new Error("To resolve a string-based item, the type of item must be given");
        }
        const resolver = type === "plugin" ? loadPlugin : loadPreset;
        const request = value;
        ({ filepath, value } = yield* resolver(value, dirname));
        file = {
            request,
            resolved: filepath,
        };
    }
    if (!value) {
        throw new Error(`Unexpected falsy value: ${String(value)}`);
    }
    if (typeof value === "object" && value.__esModule) {
        if (value.default) {
            value = value.default;
        }
        else {
            throw new Error("Must export a default export when using ES6 modules.");
        }
    }
    if (typeof value !== "object" && typeof value !== "function") {
        throw new Error(`Unsupported format: ${typeof value}. Expected an object or a function.`);
    }
    if (filepath !== null && typeof value === "object" && value) {
        // We allow object values for plugins/presets nested directly within a
        // config object, because it can be useful to define them in nested
        // configuration contexts.
        throw new Error(`Plugin/Preset files are not allowed to export objects, only functions. In ${filepath}`);
    }
    return {
        name,
        alias: filepath || alias,
        value,
        options,
        dirname,
        ownPass,
        file,
    };
}
function assertNoDuplicates(items) {
    const map = new Map();
    for (const item of items) {
        if (typeof item.value !== "function")
            continue;
        let nameMap = map.get(item.value);
        if (!nameMap) {
            nameMap = new Set();
            map.set(item.value, nameMap);
        }
        if (nameMap.has(item.name)) {
            const conflicts = items.filter(i => i.value === item.value);
            throw new Error([
                `Duplicate plugin/preset detected.`,
                `If you'd like to use two separate instances of a plugin,`,
                `they need separate names, e.g.`,
                ``,
                `  plugins: [`,
                `    ['some-plugin', {}],`,
                `    ['some-plugin', {}, 'some unique name'],`,
                `  ]`,
                ``,
                `Duplicates detected are:`,
                `${JSON.stringify(conflicts, null, 2)}`,
            ].join("\n"));
        }
        nameMap.add(item.name);
    }
}
