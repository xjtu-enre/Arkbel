import { memberExpression } from "../builders/generated/index.ts";
/**
 * Append a node to a member expression.
 */
export default function appendToMemberExpression(member, append, computed = false) {
    member.object = memberExpression(member.object, member.property, member.computed);
    member.property = append;
    member.computed = !!computed;
    return member;
}
