import { unionTypeAnnotation } from "../generated/index.ts";
import removeTypeDuplicates from "../../modifications/flow/removeTypeDuplicates.ts";
/**
 * Takes an array of `types` and flattens them, removing duplicates and
 * returns a `UnionTypeAnnotation` node containing them.
 */
export default function createFlowUnionType(types) {
    const flattened = removeTypeDuplicates(types);
    if (flattened.length === 1) {
        return flattened[0];
    }
    else {
        return unionTypeAnnotation(flattened);
    }
}
