import isValidIdentifier from "../validators/isValidIdentifier.ts";
import { identifier, booleanLiteral, nullLiteral, stringLiteral, numericLiteral, regExpLiteral, arrayExpression, objectProperty, objectExpression, unaryExpression, binaryExpression, } from "../builders/generated/index.ts";
export default valueToNode;
// @ts-expect-error: Object.prototype.toString must return a string
const objectToString = Function.call.bind(Object.prototype.toString);
function isRegExp(value) {
    return objectToString(value) === "[object RegExp]";
}
function isPlainObject(value) {
    if (typeof value !== "object" ||
        value === null ||
        Object.prototype.toString.call(value) !== "[object Object]") {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    // Object.prototype's __proto__ is null. Every other class's __proto__.__proto__ is
    // not null by default. We cannot check if proto === Object.prototype because it
    // could come from another realm.
    return proto === null || Object.getPrototypeOf(proto) === null;
}
function valueToNode(value) {
    // undefined
    if (value === undefined) {
        return identifier("undefined");
    }
    // boolean
    if (value === true || value === false) {
        return booleanLiteral(value);
    }
    // null
    if (value === null) {
        return nullLiteral();
    }
    // strings
    if (typeof value === "string") {
        return stringLiteral(value);
    }
    // numbers
    if (typeof value === "number") {
        let result;
        if (Number.isFinite(value)) {
            result = numericLiteral(Math.abs(value));
        }
        else {
            let numerator;
            if (Number.isNaN(value)) {
                // NaN
                numerator = numericLiteral(0);
            }
            else {
                // Infinity / -Infinity
                numerator = numericLiteral(1);
            }
            result = binaryExpression("/", numerator, numericLiteral(0));
        }
        if (value < 0 || Object.is(value, -0)) {
            result = unaryExpression("-", result);
        }
        return result;
    }
    // regexes
    if (isRegExp(value)) {
        const pattern = value.source;
        const flags = value.toString().match(/\/([a-z]+|)$/)[1];
        return regExpLiteral(pattern, flags);
    }
    // array
    if (Array.isArray(value)) {
        return arrayExpression(value.map(valueToNode));
    }
    // object
    if (isPlainObject(value)) {
        const props = [];
        for (const key of Object.keys(value)) {
            let nodeKey;
            if (isValidIdentifier(key)) {
                nodeKey = identifier(key);
            }
            else {
                nodeKey = stringLiteral(key);
            }
            props.push(objectProperty(nodeKey, valueToNode(
            // @ts-expect-error key must present in value
            value[key])));
        }
        return objectExpression(props);
    }
    throw new Error("don't know how to turn this value into a node");
}
