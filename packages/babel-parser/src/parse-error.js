import { Position } from "./util/location.ts";
function defineHidden(obj, key, value) {
    Object.defineProperty(obj, key, {
        enumerable: false,
        configurable: true,
        value,
    });
}
function toParseErrorConstructor({ toMessage, ...properties }) {
    return function constructor(loc, details) {
        const error = new SyntaxError();
        Object.assign(error, properties, { loc, pos: loc.index });
        if ("missingPlugin" in details) {
            Object.assign(error, { missingPlugin: details.missingPlugin });
        }
        defineHidden(error, "clone", function clone(overrides = {}) {
            const { line, column, index } = overrides.loc ?? loc;
            return constructor(new Position(line, column, index), {
                ...details,
                ...overrides.details,
            });
        });
        defineHidden(error, "details", details);
        Object.defineProperty(error, "message", {
            configurable: true,
            get() {
                const message = `${toMessage(details)} (${loc.line}:${loc.column})`;
                this.message = message;
                return message;
            },
            set(value) {
                Object.defineProperty(this, "message", { value, writable: true });
            },
        });
        return error;
    };
}
// You call `ParseErrorEnum` with a mapping from `ReasonCode`'s to either:
//
// 1. a static error message,
// 2. `toMessage` functions that define additional necessary `details` needed by
//    the `ParseError`, or
// 3. Objects that contain a `message` of one of the above and overridden `code`
//    and/or `reasonCode`:
//
// ParseErrorEnum `optionalSyntaxPlugin` ({
//   ErrorWithStaticMessage: "message",
//   ErrorWithDynamicMessage: ({ type } : { type: string }) => `${type}`),
//   ErrorWithOverriddenCodeAndOrReasonCode: {
//     message: ({ type }: { type: string }) => `${type}`),
//     code: "AN_ERROR_CODE",
//     ...(BABEL_8_BREAKING ? { } : { reasonCode: "CustomErrorReasonCode" })
//   }
// });
//
export function ParseErrorEnum(argument, syntaxPlugin) {
    // If the first parameter is an array, that means we were called with a tagged
    // template literal. Extract the syntaxPlugin from this, and call again in
    // the "normalized" form.
    if (Array.isArray(argument)) {
        return (parseErrorTemplates) => ParseErrorEnum(parseErrorTemplates, argument[0]);
    }
    const ParseErrorConstructors = {};
    for (const reasonCode of Object.keys(argument)) {
        const template = argument[reasonCode];
        const { message, ...rest } = typeof template === "string"
            ? { message: () => template }
            : typeof template === "function"
                ? { message: template }
                : template;
        const toMessage = typeof message === "string" ? () => message : message;
        ParseErrorConstructors[reasonCode] = toParseErrorConstructor({
            code: "BABEL_PARSER_SYNTAX_ERROR",
            reasonCode,
            toMessage,
            ...(syntaxPlugin ? { syntaxPlugin } : {}),
            ...rest,
        });
    }
    return ParseErrorConstructors;
}
import ModuleErrors from "./parse-error/module-errors.ts";
import StandardErrors from "./parse-error/standard-errors.ts";
import StrictModeErrors from "./parse-error/strict-mode-errors.ts";
import PipelineOperatorErrors from "./parse-error/pipeline-operator-errors.ts";
export const Errors = {
    ...ParseErrorEnum(ModuleErrors),
    ...ParseErrorEnum(StandardErrors),
    ...ParseErrorEnum(StrictModeErrors),
    ...ParseErrorEnum `pipelineOperator`(PipelineOperatorErrors),
};
