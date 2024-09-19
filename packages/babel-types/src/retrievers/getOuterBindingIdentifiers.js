import getBindingIdentifiers from "./getBindingIdentifiers.ts";
export default getOuterBindingIdentifiers;
function getOuterBindingIdentifiers(node, duplicates) {
    return getBindingIdentifiers(node, duplicates, true);
}
