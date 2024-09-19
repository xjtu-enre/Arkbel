/**
 * A small utility to check if a file qualifies as a module.
 */
export default function isModule(path) {
    return path.node.sourceType === "module";
}
