import { FLIPPED_ALIAS_KEYS, ALIAS_KEYS } from "../definitions/index.ts";
/**
 * Test if a `nodeType` is a `targetType` or if `targetType` is an alias of `nodeType`.
 */
export default function isType(nodeType, targetType) {
    if (nodeType === targetType)
        return true;
    // If nodeType is nullish, it can't be an alias of targetType.
    if (nodeType == null)
        return false;
    // This is a fast-path. If the test above failed, but an alias key is found, then the
    // targetType was a primary node type, so there's no need to check the aliases.
    // @ts-expect-error targetType may not index ALIAS_KEYS
    if (ALIAS_KEYS[targetType])
        return false;
    const aliases = FLIPPED_ALIAS_KEYS[targetType];
    if (aliases) {
        if (aliases[0] === nodeType)
            return true;
        for (const alias of aliases) {
            if (nodeType === alias)
                return true;
        }
    }
    return false;
}
