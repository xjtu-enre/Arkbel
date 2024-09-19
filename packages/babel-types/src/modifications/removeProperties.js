import { COMMENT_KEYS } from "../constants/index.ts";
const CLEAR_KEYS = [
    "tokens", // only exist in t.File
    "start",
    "end",
    "loc",
    // Fixme: should be extra.raw / extra.rawValue?
    "raw",
    "rawValue",
];
const CLEAR_KEYS_PLUS_COMMENTS = [
    ...COMMENT_KEYS,
    "comments",
    ...CLEAR_KEYS,
];
/**
 * Remove all of the _* properties from a node along with the additional metadata
 * properties like location data and raw token data.
 */
export default function removeProperties(node, opts = {}) {
    const map = opts.preserveComments ? CLEAR_KEYS : CLEAR_KEYS_PLUS_COMMENTS;
    for (const key of map) {
        // @ts-expect-error tokens only exist in t.File
        if (node[key] != null)
            node[key] = undefined;
    }
    for (const key of Object.keys(node)) {
        // @ts-expect-error string can not index node
        if (key[0] === "_" && node[key] != null)
            node[key] = undefined;
    }
    const symbols = Object.getOwnPropertySymbols(node);
    for (const sym of symbols) {
        // @ts-expect-error Fixme: document symbol properties
        node[sym] = null;
    }
}
