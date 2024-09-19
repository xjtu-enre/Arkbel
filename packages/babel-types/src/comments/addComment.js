import addComments from "./addComments.ts";
/**
 * Add comment of certain type to a node.
 */
export default function addComment(node, type, content, line) {
    return addComments(node, type, [
        {
            type: line ? "CommentLine" : "CommentBlock",
            value: content,
        },
    ]);
}
