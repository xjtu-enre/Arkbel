export default function inherit(key, child, parent) {
    if (child && parent) {
        // @ts-expect-error Could further refine key definitions
        child[key] = Array.from(new Set([].concat(child[key], parent[key]).filter(Boolean)));
    }
}
