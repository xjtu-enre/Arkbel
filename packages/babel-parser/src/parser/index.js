import { getOptions } from "../options.ts";
import StatementParser from "./statement.ts";
import ScopeHandler from "../util/scope.ts";
export default class Parser extends StatementParser {
    // Forward-declaration so typescript plugin can override jsx plugin
    // todo(flow->ts) - this probably can be removed
    // abstract jsxParseOpeningElementAfterName(
    //   node: N.JSXOpeningElement,
    // ): N.JSXOpeningElement;
    constructor(options, input) {
        options = getOptions(options);
        super(options, input);
        this.options = options;
        this.initializeScopes();
        this.plugins = pluginsMap(this.options.plugins);
        this.filename = options.sourceFilename;
    }
    // This can be overwritten, for example, by the TypeScript plugin.
    getScopeHandler() {
        return ScopeHandler;
    }
    parse() {
        this.enterInitialScopes();
        const file = this.startNode();
        const program = this.startNode();
        this.nextToken();
        file.errors = null;
        this.parseTopLevel(file, program);
        file.errors = this.state.errors;
        file.comments.length = this.state.commentsLen;
        return file;
    }
}
function pluginsMap(plugins) {
    const pluginMap = new Map();
    for (const plugin of plugins) {
        const [name, options] = Array.isArray(plugin) ? plugin : [plugin, {}];
        if (!pluginMap.has(name))
            pluginMap.set(name, options || {});
    }
    return pluginMap;
}
