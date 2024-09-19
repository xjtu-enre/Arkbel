import isNode from "../validators/isNode.ts";
export default function assertNode(node) {
    if (!isNode(node)) {
        const type = node?.type ?? JSON.stringify(node);
        throw new TypeError(`Not a valid node of type "${type}"`);
    }
}
