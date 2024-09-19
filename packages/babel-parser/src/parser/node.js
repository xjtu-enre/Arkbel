import UtilParser from "./util.ts";
import { SourceLocation } from "../util/location.ts";
// Start an AST node, attaching a start offset.
class Node {
    constructor(parser, pos, loc) {
        this.start = pos;
        this.end = 0;
        this.loc = new SourceLocation(loc);
        if (parser?.options.ranges)
            this.range = [pos, 0];
        if (parser?.filename)
            this.loc.filename = parser.filename;
    }
    type = "";
}
const NodePrototype = Node.prototype;
if (!process.env.BABEL_8_BREAKING) {
    // @ts-expect-error __clone is not defined in Node prototype
    NodePrototype.__clone = function () {
        const newNode = new Node(undefined, this.start, this.loc.start);
        const keys = Object.keys(this);
        for (let i = 0, length = keys.length; i < length; i++) {
            const key = keys[i];
            // Do not clone comments that are already attached to the node
            if (key !== "leadingComments" &&
                key !== "trailingComments" &&
                key !== "innerComments") {
                // @ts-expect-error cloning this to newNode
                newNode[key] = this[key];
            }
        }
        return newNode;
    };
}
function clonePlaceholder(node) {
    return cloneIdentifier(node);
}
export function cloneIdentifier(node) {
    // We don't need to clone `typeAnnotations` and `optional`: because
    // cloneIdentifier is only used in object shorthand and named import/export.
    // Neither of them allow type annotations after the identifier or optional identifier
    const { type, start, end, loc, range, extra, name } = node;
    const cloned = Object.create(NodePrototype);
    cloned.type = type;
    cloned.start = start;
    cloned.end = end;
    cloned.loc = loc;
    cloned.range = range;
    cloned.extra = extra;
    cloned.name = name;
    if (type === "Placeholder") {
        cloned.expectedNode = node.expectedNode;
    }
    return cloned;
}
export function cloneStringLiteral(node) {
    const { type, start, end, loc, range, extra } = node;
    if (type === "Placeholder") {
        return clonePlaceholder(node);
    }
    const cloned = Object.create(NodePrototype);
    cloned.type = type;
    cloned.start = start;
    cloned.end = end;
    cloned.loc = loc;
    cloned.range = range;
    if (node.raw !== undefined) {
        // estree set node.raw instead of node.extra
        cloned.raw = node.raw;
    }
    else {
        cloned.extra = extra;
    }
    cloned.value = node.value;
    return cloned;
}
export class NodeUtils extends UtilParser {
    startNode() {
        const loc = this.state.startLoc;
        return new Node(this, loc.index, loc);
    }
    startNodeAt(loc) {
        return new Node(this, loc.index, loc);
    }
    /** Start a new node with a previous node's location. */
    startNodeAtNode(type) {
        return this.startNodeAt(type.loc.start);
    }
    // Finish an AST node, adding `type` and `end` properties.
    finishNode(node, type) {
        return this.finishNodeAt(node, type, this.state.lastTokEndLoc);
    }
    // Finish node at given position
    finishNodeAt(node, type, endLoc) {
        if (process.env.NODE_ENV !== "production" && node.end > 0) {
            throw new Error("Do not call finishNode*() twice on the same node." +
                " Instead use resetEndLocation() or change type directly.");
        }
        // @ts-expect-error migrate to Babel types AST typings
        node.type = type;
        // @ts-expect-error migrate to Babel types AST typings
        node.end = endLoc.index;
        node.loc.end = endLoc;
        if (this.options.ranges)
            node.range[1] = endLoc.index;
        if (this.options.attachComment)
            this.processComment(node);
        return node;
    }
    resetStartLocation(node, startLoc) {
        node.start = startLoc.index;
        node.loc.start = startLoc;
        if (this.options.ranges)
            node.range[0] = startLoc.index;
    }
    resetEndLocation(node, endLoc = this.state.lastTokEndLoc) {
        node.end = endLoc.index;
        node.loc.end = endLoc;
        if (this.options.ranges)
            node.range[1] = endLoc.index;
    }
    /**
     * Reset the start location of node to the start location of locationNode
     */
    resetStartLocationFromNode(node, locationNode) {
        this.resetStartLocation(node, locationNode.loc.start);
    }
}
