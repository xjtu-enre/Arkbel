import inheritTrailingComments from "./inheritTrailingComments.ts";
import inheritLeadingComments from "./inheritLeadingComments.ts";
import inheritInnerComments from "./inheritInnerComments.ts";
/**
 * Inherit all unique comments from `parent` node to `child` node.
 */
export default function inheritsComments(child, parent) {
    inheritTrailingComments(child, parent);
    inheritLeadingComments(child, parent);
    inheritInnerComments(child, parent);
    return child;
}
