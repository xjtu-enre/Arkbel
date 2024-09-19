/**
 * This class is responsible for a binding inside of a scope.
 *
 * It tracks the following:
 *
 *  * Node path.
 *  * Amount of times referenced by other nodes.
 *  * Paths to nodes that reassign or modify this binding.
 *  * The kind of binding. (Is it a parameter, declaration etc)
 */
export default class Binding {
    identifier;
    scope;
    path;
    kind;
    constructor({ identifier, scope, path, kind, }) {
        this.identifier = identifier;
        this.scope = scope;
        this.path = path;
        this.kind = kind;
        if ((kind === "var" || kind === "hoisted") && isDeclaredInLoop(path)) {
            this.reassign(path);
        }
        this.clearValue();
    }
    constantViolations = [];
    constant = true;
    referencePaths = [];
    referenced = false;
    references = 0;
    deoptValue() {
        this.clearValue();
        this.hasDeoptedValue = true;
    }
    setValue(value) {
        if (this.hasDeoptedValue)
            return;
        this.hasValue = true;
        this.value = value;
    }
    clearValue() {
        this.hasDeoptedValue = false;
        this.hasValue = false;
        this.value = null;
    }
    /**
     * Register a constant violation with the provided `path`.
     */
    reassign(path) {
        this.constant = false;
        if (this.constantViolations.indexOf(path) !== -1) {
            return;
        }
        this.constantViolations.push(path);
    }
    /**
     * Increment the amount of references to this binding.
     */
    reference(path) {
        if (this.referencePaths.indexOf(path) !== -1) {
            return;
        }
        this.referenced = true;
        this.references++;
        this.referencePaths.push(path);
    }
    /**
     * Decrement the amount of references to this binding.
     */
    dereference() {
        this.references--;
        this.referenced = !!this.references;
    }
}
function isDeclaredInLoop(path) {
    for (let { parentPath, key } = path; parentPath; { parentPath, key } = parentPath) {
        if (parentPath.isFunctionParent())
            return false;
        if (parentPath.isWhile() ||
            parentPath.isForXStatement() ||
            (parentPath.isForStatement() && key === "body")) {
            return true;
        }
    }
    return false;
}
