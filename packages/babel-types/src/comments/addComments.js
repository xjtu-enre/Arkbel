/**
 * Add comments of certain type to a node.
 */
export default function addComments(node, type, comments) {
    if (!comments || !node)
        return node;
    const key = `${type}Comments`;
    if (node[key]) {
        if (type === "leading") {
            node[key] = comments.concat(node[key]);
        }
        else {
            node[key].push(...comments);
        }
    }
    else {
        node[key] = comments;
    }
    return node;
}
