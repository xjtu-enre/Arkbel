export default class BaseParser {
    sawUnambiguousESM = false;
    ambiguousScriptDifferentAst = false;
    // This method accepts either a string (plugin name) or an array pair
    // (plugin name and options object). If an options object is given,
    // then each value is non-recursively checked for identity with that
    // plugin’s actual option value.
    hasPlugin(pluginConfig) {
        if (typeof pluginConfig === "string") {
            return this.plugins.has(pluginConfig);
        }
        else {
            const [pluginName, pluginOptions] = pluginConfig;
            if (!this.hasPlugin(pluginName)) {
                return false;
            }
            const actualOptions = this.plugins.get(pluginName);
            for (const key of Object.keys(pluginOptions)) {
                if (actualOptions?.[key] !== pluginOptions[key]) {
                    return false;
                }
            }
            return true;
        }
    }
    getPluginOption(plugin, name) {
        return this.plugins.get(plugin)?.[name];
    }
}
