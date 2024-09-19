import SourceMap from "./source-map.ts";
import Printer from "./printer.ts";
/**
 * Normalize generator options, setting defaults.
 *
 * - Detects code indentation.
 * - If `opts.compact = "auto"` and the code is over 500KB, `compact` will be set to `true`.
 */
function normalizeOptions(code, opts) {
    const format = {
        auxiliaryCommentBefore: opts.auxiliaryCommentBefore,
        auxiliaryCommentAfter: opts.auxiliaryCommentAfter,
        shouldPrintComment: opts.shouldPrintComment,
        retainLines: opts.retainLines,
        retainFunctionParens: opts.retainFunctionParens,
        comments: opts.comments == null || opts.comments,
        compact: opts.compact,
        minified: opts.minified,
        concise: opts.concise,
        indent: {
            adjustMultilineComment: true,
            style: "  ",
        },
        jsescOption: {
            quotes: "double",
            wrap: true,
            minimal: process.env.BABEL_8_BREAKING ? true : false,
            ...opts.jsescOption,
        },
        recordAndTupleSyntaxType: opts.recordAndTupleSyntaxType ?? "hash",
        topicToken: opts.topicToken,
        importAttributesKeyword: opts.importAttributesKeyword,
    };
    if (!process.env.BABEL_8_BREAKING) {
        format.decoratorsBeforeExport = opts.decoratorsBeforeExport;
        format.jsescOption.json = opts.jsonCompatibleStrings;
    }
    if (format.minified) {
        format.compact = true;
        format.shouldPrintComment =
            format.shouldPrintComment || (() => format.comments);
    }
    else {
        format.shouldPrintComment =
            format.shouldPrintComment ||
                (value => format.comments ||
                    value.includes("@license") ||
                    value.includes("@preserve"));
    }
    if (format.compact === "auto") {
        format.compact = typeof code === "string" && code.length > 500_000; // 500KB
        if (format.compact) {
            console.error("[BABEL] Note: The code generator has deoptimised the styling of " +
                `${opts.filename} as it exceeds the max of ${"500KB"}.`);
        }
    }
    if (format.compact) {
        format.indent.adjustMultilineComment = false;
    }
    const { auxiliaryCommentBefore, auxiliaryCommentAfter, shouldPrintComment } = format;
    if (auxiliaryCommentBefore && !shouldPrintComment(auxiliaryCommentBefore)) {
        format.auxiliaryCommentBefore = undefined;
    }
    if (auxiliaryCommentAfter && !shouldPrintComment(auxiliaryCommentAfter)) {
        format.auxiliaryCommentAfter = undefined;
    }
    return format;
}
if (!process.env.BABEL_8_BREAKING && !USE_ESM) {
    /**
     * We originally exported the Generator class above, but to make it extra clear that it is a private API,
     * we have moved that to an internal class instance and simplified the interface to the two public methods
     * that we wish to support.
     */
    // eslint-disable-next-line no-restricted-globals
    exports.CodeGenerator = class CodeGenerator {
        _ast;
        _format;
        _map;
        constructor(ast, opts = {}, code) {
            this._ast = ast;
            this._format = normalizeOptions(code, opts);
            this._map = opts.sourceMaps ? new SourceMap(opts, code) : null;
        }
        generate() {
            const printer = new Printer(this._format, this._map);
            return printer.generate(this._ast);
        }
    };
}
/**
 * Turns an AST into code, maintaining sourcemaps, user preferences, and valid output.
 * @param ast - the abstract syntax tree from which to generate output code.
 * @param opts - used for specifying options for code generation.
 * @param code - the original source code, used for source maps.
 * @returns - an object containing the output code and source map.
 */
export default function generate(ast, opts = {}, code) {
    const format = normalizeOptions(code, opts);
    const map = opts.sourceMaps ? new SourceMap(opts, code) : null;
    const printer = new Printer(format, map);
    return printer.generate(ast);
}
