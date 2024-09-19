// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.
export class Position {
    line;
    column;
    index;
    constructor(line, col, index) {
        this.line = line;
        this.column = col;
        this.index = index;
    }
}
export class SourceLocation {
    start;
    end;
    filename;
    identifierName;
    constructor(start, end) {
        this.start = start;
        // (may start as null, but initialized later)
        this.end = end;
    }
}
/**
 * creates a new position with a non-zero column offset from the given position.
 * This function should be only be used when we create AST node out of the token
 * boundaries, such as TemplateElement ends before tt.templateNonTail. This
 * function does not skip whitespaces.
 */
export function createPositionWithColumnOffset(position, columnOffset) {
    const { line, column, index } = position;
    return new Position(line, column + columnOffset, index + columnOffset);
}
