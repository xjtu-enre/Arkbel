import { memberExpression } from "../builders/generated/index.ts";
import { isSuper } from "../index.ts";
/**
 * Prepend a node to a member expression.
 */
export default function prependToMemberExpression(member, prepend) {
    if (isSuper(member.object)) {
        throw new Error("Cannot prepend node to super property access (`super.foo`).");
    }
    member.object = memberExpression(prepend, member.object);
    return member;
}
