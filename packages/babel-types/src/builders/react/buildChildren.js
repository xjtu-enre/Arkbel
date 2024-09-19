import { isJSXText, isJSXExpressionContainer, isJSXEmptyExpression, } from "../../validators/generated/index.ts";
import cleanJSXElementLiteralChild from "../../utils/react/cleanJSXElementLiteralChild.ts";
export default function buildChildren(node) {
    const elements = [];
    for (let i = 0; i < node.children.length; i++) {
        let child = node.children[i];
        if (isJSXText(child)) {
            cleanJSXElementLiteralChild(child, elements);
            continue;
        }
        if (isJSXExpressionContainer(child))
            child = child.expression;
        if (isJSXEmptyExpression(child))
            continue;
        elements.push(child);
    }
    return elements;
}
