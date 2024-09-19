import { isIdentifier, isImportDefaultSpecifier } from "./generated/index.ts";
/**
 * Check if the input `specifier` is a `default` import or export.
 */
export default function isSpecifierDefault(specifier) {
    return (isImportDefaultSpecifier(specifier) ||
        // @ts-expect-error todo(flow->ts): stricter type for specifier
        isIdentifier(specifier.imported || specifier.exported, {
            name: "default",
        }));
}
