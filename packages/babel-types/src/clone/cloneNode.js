import { NODE_FIELDS } from "../definitions/index.ts";
import { isFile, isIdentifier } from "../validators/generated/index.ts";
const has = Function.call.bind(Object.prototype.hasOwnProperty);
// This function will never be called for comments, only for real nodes.
function cloneIfNode(obj, deep, withoutLoc, commentsCache) {
    if (obj && typeof obj.type === "string") {
        return cloneNodeInternal(obj, deep, withoutLoc, commentsCache);
    }
    return obj;
}
function cloneIfNodeOrArray(obj, deep, withoutLoc, commentsCache) {
    if (Array.isArray(obj)) {
        return obj.map(node => cloneIfNode(node, deep, withoutLoc, commentsCache));
    }
    return cloneIfNode(obj, deep, withoutLoc, commentsCache);
}
/**
 * Create a clone of a `node` including only properties belonging to the node.
 * If the second parameter is `false`, cloneNode performs a shallow clone.
 * If the third parameter is true, the cloned nodes exclude location properties.
 */
export default function cloneNode(node, deep = true, withoutLoc = false) {
    return cloneNodeInternal(node, deep, withoutLoc, new Map());
}
function cloneNodeInternal(node, deep = true, withoutLoc = false, commentsCache) {
    if (!node)
        return node;
    const { type } = node;
    const newNode = { type: node.type };
    // Special-case identifiers since they are the most cloned nodes.
    if (isIdentifier(node)) {
        newNode.name = node.name;
        if (has(node, "optional") && typeof node.optional === "boolean") {
            newNode.optional = node.optional;
        }
        if (has(node, "typeAnnotation")) {
            newNode.typeAnnotation = deep
                ? cloneIfNodeOrArray(node.typeAnnotation, true, withoutLoc, commentsCache)
                : node.typeAnnotation;
        }
    }
    else if (!has(NODE_FIELDS, type)) {
        throw new Error(`Unknown node type: "${type}"`);
    }
    else {
        for (const field of Object.keys(NODE_FIELDS[type])) {
            if (has(node, field)) {
                if (deep) {
                    newNode[field] =
                        isFile(node) && field === "comments"
                            ? maybeCloneComments(node.comments, deep, withoutLoc, commentsCache)
                            : cloneIfNodeOrArray(
                            // @ts-expect-error node[field] has been guarded by has check
                            node[field], true, withoutLoc, commentsCache);
                }
                else {
                    newNode[field] =
                        // @ts-expect-error node[field] has been guarded by has check
                        node[field];
                }
            }
        }
    }
    if (has(node, "loc")) {
        if (withoutLoc) {
            newNode.loc = null;
        }
        else {
            newNode.loc = node.loc;
        }
    }
    if (has(node, "leadingComments")) {
        newNode.leadingComments = maybeCloneComments(node.leadingComments, deep, withoutLoc, commentsCache);
    }
    if (has(node, "innerComments")) {
        newNode.innerComments = maybeCloneComments(node.innerComments, deep, withoutLoc, commentsCache);
    }
    if (has(node, "trailingComments")) {
        newNode.trailingComments = maybeCloneComments(node.trailingComments, deep, withoutLoc, commentsCache);
    }
    if (has(node, "extra")) {
        newNode.extra = {
            ...node.extra,
        };
    }
    return newNode;
}
function maybeCloneComments(comments, deep, withoutLoc, commentsCache) {
    if (!comments || !deep) {
        return comments;
    }
    return comments.map(comment => {
        const cache = commentsCache.get(comment);
        if (cache)
            return cache;
        const { type, value, loc } = comment;
        const ret = { type, value, loc };
        if (withoutLoc) {
            ret.loc = null;
        }
        commentsCache.set(comment, ret);
        return ret;
    });
}
