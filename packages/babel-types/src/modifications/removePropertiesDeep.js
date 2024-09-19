import traverseFast from "../traverse/traverseFast.ts";
import removeProperties from "./removeProperties.ts";
export default function removePropertiesDeep(tree, opts) {
    traverseFast(tree, removeProperties, opts);
    return tree;
}
