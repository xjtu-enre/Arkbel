import { findSuggestion } from "./find-suggestion.ts";
export class OptionValidator {
    constructor(descriptor) {
        this.descriptor = descriptor;
    }
    /**
     * Validate if the given `options` follow the name of keys defined in the `TopLevelOptionShape`
     *
     * @param {Object} options
     * @param {Object} TopLevelOptionShape
     *   An object with all the valid key names that `options` should be allowed to have
     *   The property values of `TopLevelOptionShape` can be arbitrary
     * @memberof OptionValidator
     */
    validateTopLevelOptions(options, TopLevelOptionShape) {
        const validOptionNames = Object.keys(TopLevelOptionShape);
        for (const option of Object.keys(options)) {
            if (!validOptionNames.includes(option)) {
                throw new Error(this.formatMessage(`'${option}' is not a valid top-level option.
- Did you mean '${findSuggestion(option, validOptionNames)}'?`));
            }
        }
    }
    // note: we do not consider rewrite them to high order functions
    // until we have to support `validateNumberOption`.
    validateBooleanOption(name, value, defaultValue) {
        if (value === undefined) {
            return defaultValue;
        }
        else {
            this.invariant(typeof value === "boolean", `'${name}' option must be a boolean.`);
        }
        return value;
    }
    validateStringOption(name, value, defaultValue) {
        if (value === undefined) {
            return defaultValue;
        }
        else {
            this.invariant(typeof value === "string", `'${name}' option must be a string.`);
        }
        return value;
    }
    /**
     * A helper interface copied from the `invariant` npm package.
     * It throws given `message` when `condition` is not met
     *
     * @param {boolean} condition
     * @param {string} message
     * @memberof OptionValidator
     */
    invariant(condition, message) {
        if (!condition) {
            throw new Error(this.formatMessage(message));
        }
    }
    formatMessage(message) {
        return `${this.descriptor}: ${message}`;
    }
}
