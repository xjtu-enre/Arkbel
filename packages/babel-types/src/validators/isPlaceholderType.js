import { PLACEHOLDERS_ALIAS } from "../definitions/index.ts";
/**
 * Test if a `placeholderType` is a `targetType` or if `targetType` is an alias of `placeholderType`.
 */
export default function isPlaceholderType(placeholderType, targetType) {
    if (placeholderType === targetType)
        return true;
    const aliases = PLACEHOLDERS_ALIAS[placeholderType];
    if (aliases) {
        for (const alias of aliases) {
            if (targetType === alias)
                return true;
        }
    }
    return false;
}
