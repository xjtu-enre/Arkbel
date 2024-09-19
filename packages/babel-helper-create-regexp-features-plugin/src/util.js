import { FEATURES, hasFeature } from "./features.ts";
export function generateRegexpuOptions(pattern, toTransform) {
    const feat = (name, ok = "transform") => {
        return hasFeature(toTransform, FEATURES[name]) ? ok : false;
    };
    const featDuplicateNamedGroups = () => {
        if (!feat("duplicateNamedCaptureGroups"))
            return false;
        // This can return false positive, for example for /\(?<a>\)/.
        // However, it's such a rare occurrence that it's ok to compile
        // the regexp even if we only need to compile regexps with
        // duplicate named capturing groups.
        const regex = /\(\?<([^>]+)>/g;
        const seen = new Set();
        for (let match; (match = regex.exec(pattern)); seen.add(match[1])) {
            if (seen.has(match[1]))
                return "transform";
        }
        return false;
    };
    return {
        unicodeFlag: feat("unicodeFlag"),
        unicodeSetsFlag: feat("unicodeSetsFlag") || "parse",
        dotAllFlag: feat("dotAllFlag"),
        unicodePropertyEscapes: feat("unicodePropertyEscape"),
        namedGroups: feat("namedCaptureGroups") || featDuplicateNamedGroups(),
        onNamedGroup: () => { },
        modifiers: feat("modifiers"),
    };
}
export function canSkipRegexpu(node, options) {
    const { flags, pattern } = node;
    if (flags.includes("v")) {
        if (options.unicodeSetsFlag === "transform")
            return false;
    }
    if (flags.includes("u")) {
        if (options.unicodeFlag === "transform")
            return false;
        if (options.unicodePropertyEscapes === "transform" &&
            /\\[pP]{/.test(pattern)) {
            return false;
        }
    }
    if (flags.includes("s")) {
        if (options.dotAllFlag === "transform")
            return false;
    }
    if (options.namedGroups === "transform" && /\(\?<(?![=!])/.test(pattern)) {
        return false;
    }
    if (options.modifiers === "transform" && /\(\?[\w-]+:/.test(pattern)) {
        return false;
    }
    return true;
}
export function transformFlags(regexpuOptions, flags) {
    if (regexpuOptions.unicodeSetsFlag === "transform") {
        flags = flags.replace("v", "u");
    }
    if (regexpuOptions.unicodeFlag === "transform") {
        flags = flags.replace("u", "");
    }
    if (regexpuOptions.dotAllFlag === "transform") {
        flags = flags.replace("s", "");
    }
    return flags;
}
