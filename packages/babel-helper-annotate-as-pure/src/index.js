import { addComment } from "@babel/types";
const PURE_ANNOTATION = "#__PURE__";
const isPureAnnotated = ({ leadingComments }) => !!leadingComments &&
    leadingComments.some(comment => /[@#]__PURE__/.test(comment.value));
export default function annotateAsPure(pathOrNode) {
    const node = 
    // @ts-expect-error Node will not have `node` property
    (pathOrNode["node"] || pathOrNode);
    if (isPureAnnotated(node)) {
        return;
    }
    addComment(node, "leading", PURE_ANNOTATION);
}
