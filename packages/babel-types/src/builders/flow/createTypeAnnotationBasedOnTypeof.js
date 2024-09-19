import { anyTypeAnnotation, stringTypeAnnotation, numberTypeAnnotation, voidTypeAnnotation, booleanTypeAnnotation, genericTypeAnnotation, identifier, } from "../generated/index.ts";
export default createTypeAnnotationBasedOnTypeof;
/**
 * Create a type annotation based on typeof expression.
 */
function createTypeAnnotationBasedOnTypeof(type) {
    switch (type) {
        case "string":
            return stringTypeAnnotation();
        case "number":
            return numberTypeAnnotation();
        case "undefined":
            return voidTypeAnnotation();
        case "boolean":
            return booleanTypeAnnotation();
        case "function":
            return genericTypeAnnotation(identifier("Function"));
        case "object":
            return genericTypeAnnotation(identifier("Object"));
        case "symbol":
            return genericTypeAnnotation(identifier("Symbol"));
        case "bigint":
            // todo: use BigInt annotation when Flow supports BigInt
            // https://github.com/facebook/flow/issues/6639
            return anyTypeAnnotation();
    }
    throw new Error("Invalid typeof value: " + type);
}
