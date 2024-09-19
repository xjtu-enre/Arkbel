import inherit from "../utils/inherit.ts";
export default function inheritTrailingComments(child, parent) {
    inherit("trailingComments", child, parent);
}
