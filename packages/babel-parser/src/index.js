import { hasPlugin, validatePlugins, mixinPluginNames, mixinPlugins, } from "./plugin-utils.ts";
import Parser from "./parser/index.ts";
import { getExportedToken, tt as internalTokenTypes, } from "./tokenizer/types.ts";
export function parse(input, options) {
    if (options?.sourceType === "unambiguous") {
        options = {
            ...options,
        };
        try {
            options.sourceType = "module";
            const parser = getParser(options, input);
            const ast = parser.parse();
            if (parser.sawUnambiguousESM) {
                return ast;
            }
            if (parser.ambiguousScriptDifferentAst) {
                // Top level await introduces code which can be both a valid script and
                // a valid module, but which produces different ASTs:
                //    await
                //    0
                // can be parsed either as an AwaitExpression, or as two ExpressionStatements.
                try {
                    options.sourceType = "script";
                    return getParser(options, input).parse();
                }
                catch { }
            }
            else {
                // This is both a valid module and a valid script, but
                // we parse it as a script by default
                ast.program.sourceType = "script";
            }
            return ast;
        }
        catch (moduleError) {
            try {
                options.sourceType = "script";
                return getParser(options, input).parse();
            }
            catch { }
            throw moduleError;
        }
    }
    else {
        return getParser(options, input).parse();
    }
}
export function parseExpression(input, options) {
    const parser = getParser(options, input);
    if (parser.options.strictMode) {
        parser.state.strict = true;
    }
    return parser.getExpression();
}
function generateExportedTokenTypes(internalTokenTypes) {
    const tokenTypes = {};
    for (const typeName of Object.keys(internalTokenTypes)) {
        tokenTypes[typeName] = getExportedToken(internalTokenTypes[typeName]);
    }
    return tokenTypes;
}
export const tokTypes = generateExportedTokenTypes(internalTokenTypes);
function getParser(options, input) {
    let cls = Parser;
    if (options?.plugins) {
        validatePlugins(options.plugins);
        cls = getParserClass(options.plugins);
    }
    return new cls(options, input);
}
const parserClassCache = {};
/** Get a Parser class with plugins applied. */
function getParserClass(pluginsFromOptions) {
    const pluginList = mixinPluginNames.filter(name => hasPlugin(pluginsFromOptions, name));
    const key = pluginList.join("/");
    let cls = parserClassCache[key];
    if (!cls) {
        cls = Parser;
        for (const plugin of pluginList) {
            /**
             * ArkTS parser is a subclass of TypeScript parser, given TypeScript parser is created by mixin,
             * ArkTS parser follows the same way by first create a TypeScript parser, then mixin ArkTS parser.
             */
            if (plugin === 'arkts'
                // TODO: Online visualization only, should be removed for final release
                || plugin === 'typescript') {
                // @ts-ignore
                const tsCls = mixinPlugins["typescript"](cls);
                // @ts-ignore
                cls = mixinPlugins['arkts'](tsCls);
            }
            else {
                // @ts-expect-error todo(flow->ts)
                cls = mixinPlugins[plugin](cls);
            }
        }
        parserClassCache[key] = cls;
    }
    return cls;
}
