import toIdentifier from "./toIdentifier.ts";
export default function toBindingIdentifierName(name) {
    name = toIdentifier(name);
    if (name === "eval" || name === "arguments")
        name = "_" + name;
    return name;
}
